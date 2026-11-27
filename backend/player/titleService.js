/* ФАЙЛ: backend/player/titleService.js — v5 */
const EventEmitter = require('events');
const https = require('https');

const CONCURRENCY = 2;
const TIMEOUT = 6000;
const MAX_CACHE = 500;

class TitleService extends EventEmitter {
constructor() {
super();
this.cache = new Map();
this.jobs = [];
this.active = 0;
}

fetchTitle(id) {
return new Promise((resolve) => {
const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${id}&format=json`;
const req = https.get(url, { headers: { 'User-Agent': 'StreamLauncher/5.0' }, timeout: TIMEOUT }, (res) => {
if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
let raw = '';
res.setEncoding('utf8');
res.on('data', (c) => { raw += c; if (raw.length > 200000) req.destroy(); });
res.on('end', () => {
try {
const data = JSON.parse(raw);
resolve(data.title || null);
} catch (e) { resolve(null); }
});
});
req.on('timeout', () => { req.destroy(); resolve(null); });
req.on('error', () => resolve(null));
});
}

request(tracks) {
if (!Array.isArray(tracks)) return;
tracks.forEach((t) => {
if (!t || !t.id) return;
if (t.type === 'playlist') {
this.emit('title', { id: t.id, title: 'Плейлист YouTube' });
return;
}
const cached = this.cache.get(t.id);
if (cached) {
this.emit('title', { id: t.id, title: cached });
return;
}
if (!this.jobs.some(j => j.id === t.id)) this.jobs.push({ id: t.id });
});
this._pump();
}

_pump() {
while (this.active < CONCURRENCY && this.jobs.length > 0) {
const job = this.jobs.shift();
this.active++;
this.fetchTitle(job.id).then((title) => {
this.active--;
const finalTitle = title || `YouTube ${job.id}`;
if (title) {
this.cache.set(job.id, title);
this._trim();
}
this.emit('title', { id: job.id, title: finalTitle });
this._pump();
}).catch(() => {
this.active--;
this.emit('title', { id: job.id, title: `YouTube ${job.id}` });
this._pump();
});
}
}

_trim() {
while (this.cache.size > MAX_CACHE) {
const first = this.cache.keys().next().value;
this.cache.delete(first);
}
}
}

module.exports = TitleService;