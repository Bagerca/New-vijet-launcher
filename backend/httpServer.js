/* ФАЙЛ: backend/httpServer.js — v9 (пак сцен + imgproxy + ЗАПРЕТ отдачи ключа, его бэкапа и tmp-файла) */
const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMG_PROXY_TIMEOUT = 8000;
const IMG_MAX_HTML = 400 * 1024;
const IMG_MAX_BYTES = 12 * 1024 * 1024;

/* Приватные файлы никогда не отдаются по HTTP (в том числе через localtunnel).
   Бэкап и tmp импорта содержат те же токены, что и боевой ключ. */
const PRIVATE_BASENAMES = new Set([
  'external-sources.json',
  'external-sources.backup.json',
  'external-sources.json.tmp'
]);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.map']);

function isPrivatePath(pathname) {
  const norm = String(pathname || '').replace(/\\/g, '/').toLowerCase();
  const base = norm.split('/').pop();
  return PRIVATE_BASENAMES.has(base);
}

function isInsideRoot(root, target) {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

function isPrivateHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  return false;
}

function remoteGet(urlStr, redirectsLeft) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { reject(new Error('bad url')); return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') { reject(new Error('bad protocol')); return; }
    if (isPrivateHost(u.hostname)) { reject(new Error('private host')); return; }
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(u, { headers: { 'User-Agent': 'StreamLauncher/1.0 (+imgproxy)', 'Accept': 'image/*, text/html;q=0.9, */*;q=0.8' } }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) { reject(new Error('too many redirects')); return; }
        remoteGet(new URL(res.headers.location, u).href, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (status !== 200) { res.resume(); reject(new Error('HTTP ' + status)); return; }
      resolve({ res, url: u });
    });
    req.on('error', reject);
    req.setTimeout(IMG_PROXY_TIMEOUT, () => req.destroy(new Error('timeout')));
  });
}

function readLimited(res, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    res.on('data', (c) => {
      total += c.length;
      if (total > limit) { res.destroy(); reject(new Error('too large')); return; }
      chunks.push(c);
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

function extractImageFromHtml(html, baseUrl) {
  const patterns = [
    /property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) { try { return new URL(m[1], baseUrl).href; } catch (e) {} }
  }
  return null;
}

async function handleImgProxy(req, res) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  };
  let target;
  try {
    const q = new URL(req.url, 'http://localhost').searchParams.get('url');
    target = new URL(q);
  } catch (e) { send(400, { ok: false, error: 'bad url' }); return; }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') { send(400, { ok: false, error: 'bad protocol' }); return; }
  if (isPrivateHost(target.hostname)) { send(403, { ok: false, error: 'private host' }); return; }
  try {
    let { res: upstream, url } = await remoteGet(target.href, 3);
    let ctype = String(upstream.headers['content-type'] || '').toLowerCase();
    if (!ctype.startsWith('image/')) {
      const buf = await readLimited(upstream, IMG_MAX_HTML);
      const imgUrl = extractImageFromHtml(buf.toString('utf8'), url.href);
      if (!imgUrl) { send(404, { ok: false, error: 'no image on page' }); return; }
      const second = await remoteGet(imgUrl, 3);
      upstream = second.res;
      url = second.url;
      ctype = String(second.res.headers['content-type'] || '').toLowerCase();
      if (!ctype.startsWith('image/')) { upstream.resume(); send(404, { ok: false, error: 'not an image' }); return; }
    }
    const headers = { 'Content-Type': ctype, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' };
    if (upstream.headers['content-length']) headers['Content-Length'] = upstream.headers['content-length'];
    res.writeHead(200, headers);
    let sent = 0;
    upstream.on('data', (c) => {
      sent += c.length;
      if (sent > IMG_MAX_BYTES) { upstream.destroy(); try { res.destroy(); } catch (e) {} }
    });
    upstream.on('error', () => { try { res.destroy(); } catch (e) {} });
    upstream.pipe(res);
  } catch (e) {
    send(502, { ok: false, error: String((e && e.message) || e) });
  }
}

function buildCandidates(pathname, resolvePackPath) {
  const list = [];
  const push = (p) => { if (p && !list.includes(p)) list.push(p); };
  const isRootPrefix = pathname.startsWith('/data/') || pathname.startsWith('/js/') || pathname.startsWith('/css/') || pathname.startsWith('/widgets/');
  if (isRootPrefix) {
    if (resolvePackPath) push(resolvePackPath(pathname));
    push(path.join(ROOT, pathname));
  } else {
    const widgetRel = '/widgets' + pathname;
    if (resolvePackPath) push(resolvePackPath(widgetRel));
    push(path.join(ROOT, widgetRel));
    if (resolvePackPath) push(resolvePackPath(pathname));
    push(path.join(ROOT, pathname));
  }
  return list;
}

function createHttpServer({ config, getDiagnostics, resolvePackPath }) {
  return http.createServer(async (req, res) => {
    try {
      const base = req.url.split('?')[0];
      if (base === '/api/config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
        res.end(JSON.stringify(config.get()));
        return;
      }
      if (base === '/api/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(getDiagnostics ? getDiagnostics() : { ok: true }));
        return;
      }
      if (base === '/api/imgproxy') { await handleImgProxy(req, res); return; }

      let pathname;
      try { pathname = decodeURIComponent(base); }
      catch (e) { res.writeHead(400, { 'Access-Control-Allow-Origin': '*' }); res.end('Bad path'); return; }
      if (pathname.split('/').includes('..')) {
        res.writeHead(400, { 'Access-Control-Allow-Origin': '*' }); res.end('Bad path'); return;
      }
      if (isPrivatePath(pathname)) {
        console.warn('[HTTP] Заблокирована попытка получить приватный файл:', pathname);
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
        res.end('File not found');
        return;
      }
      if (pathname === '/') pathname = '/frame/index.html';

      for (const candidate of buildCandidates(pathname, resolvePackPath)) {
        const resolved = path.resolve(candidate);
        if (!isInsideRoot(ROOT, resolved)) continue;
        if (isPrivatePath(resolved)) continue;
        let stat;
        try { stat = await fsp.stat(resolved); } catch (e) { continue; }
        if (!stat.isFile()) continue;
        const ext = path.extname(resolved).toLowerCase();
        const isText = TEXT_EXT.has(ext);
        const etag = `"${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;
        const headers = {
          'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': isText ? 'no-cache, no-store, must-revalidate' : 'no-cache',
          'ETag': etag
        };
        if (!isText && req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
        try {
          const content = await fsp.readFile(resolved);
          res.writeHead(200, { ...headers, 'Content-Length': content.length });
          res.end(content);
        } catch (e) {
          console.error('[HTTP] Ошибка чтения файла:', resolved, e.message);
          res.writeHead(500, { 'Access-Control-Allow-Origin': '*' }); res.end('Read error');
        }
        return;
      }
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      res.end('File not found');
    } catch (e) {
      console.error('[HTTP] Необработанная ошибка:', e);
      try { res.writeHead(500, { 'Access-Control-Allow-Origin': '*' }); res.end('Server error'); } catch (e2) {}
    }
  });
}

module.exports = { createHttpServer };