/* ФАЙЛ: widgets/media/dashboard/Dashboard.js — v3 (CSS-first: параллельные стили + preload, кэш линков в head) */
import { store } from '../../../js/store.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { LibraryController, normalizeCover, youTubeId } from './library.js';
import { ControlsController } from './controls.js';
import { Toast } from '../../../js/components/toast.js';
import { setHashParams } from '../../../js/utils/hashParams.js';
import { MediaLibrary } from '../media-db.js';
let ctx = null;
const titleCache = new Map();
// === CSS-first загрузчик: параллельные <link> вместо @import-водопада ===
const CSS_VERSION = 'v3';
const CSS_TIMEOUT = 3000;
const CSS_FILES = [
{ id: 'md-css-base', href: `widgets/media/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'md-css-stage', href: `widgets/media/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'md-css-panels', href: `widgets/media/dashboard/styles/panels.css?${CSS_VERSION}` }
];
let cssPromise = null;
function loadOneCss({ id, href }) {
return new Promise((resolve) => {
const existing = document.getElementById(id);
if (existing) {
if (existing.dataset.loaded === '1') { resolve(true); return; }
existing.addEventListener('load', () => resolve(true), { once: true });
existing.addEventListener('error', () => resolve(false), { once: true });
return;
}
const link = document.createElement('link');
link.id = id;
link.rel = 'stylesheet';
link.href = href;
link.dataset.loaded = '0';
link.onload = () => { link.dataset.loaded = '1'; resolve(true); };
link.onerror = () => {
console.error(`[MediaDash:css] Файл стиля не загрузился: ${href}`);
link.remove();
resolve(false);
};
document.head.appendChild(link);
});
}
/** Идемпотентно грузит стили дашборда. Резолвится true/false, никогда не реджектится. */
function preload() {
if (cssPromise) return cssPromise;
const t0 = performance.now();
console.log('[MediaDash:css] preload: параллельная загрузка стилей...');
const loadAll = Promise.all(CSS_FILES.map(loadOneCss)).then((results) => {
const ok = results.every(Boolean);
if (ok) console.log(`[MediaDash:css] Стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[MediaDash:css] Часть стилей недоступна — возможен деградированный вид.');
return ok;
});
let guardTimer = null;
const guard = new Promise((resolve) => {
guardTimer = setTimeout(() => {
console.warn(`[MediaDash:css] Таймаут ${CSS_TIMEOUT}мс — рендерим без ожидания стилей.`);
resolve(false);
}, CSS_TIMEOUT);
});
cssPromise = Promise.race([loadAll, guard]).then((ok) => {
if (guardTimer) { clearTimeout(guardTimer); guardTimer = null; }
if (!ok) cssPromise = null;
return ok;
});
return cssPromise;
}
function setText(id, text) {
const el = document.getElementById(id);
if (el && el.textContent !== text) el.textContent = text;
}
function setBadge(id, cls, text) {
const el = document.getElementById(id);
if (!el) return;
el.className = `md-badge ${cls}`;
el.innerHTML = `<span class="md-badge-dot"></span>${text}`;
}
async function resolveYouTubeTitle(id) {
if (!id) return null;
if (titleCache.has(id)) return titleCache.get(id);
titleCache.set(id, null);
try {
const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
if (!res.ok) throw new Error('HTTP ' + res.status);
const data = await res.json();
const value = { title: data.title || null, author: data.author_name || null };
titleCache.set(id, value);
if (ctx) renderStatus(store.getState());
return value;
} catch (e) {
console.warn('[MediaDash] Название видео не получено:', e && e.message);
return null;
}
}
function renderStatus(state) {
const c = state.config.widgets.media || {};
const active = c.isActive === true || String(c.isActive) === 'true';
const online = Boolean(state.serverOnline);
setBadge('md-badge-server', online ? 'md-badge-live' : 'md-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
setBadge('md-badge-state', active ? 'md-badge-live' : 'md-badge-warn', active ? 'НА ЭКРАНЕ' : 'СКРЫТА');
const cover = document.getElementById('md-now-cover');
const fallback = document.getElementById('md-now-fallback');
const link = String(c.ytLink || '').trim();
const vid = youTubeId(link);
const entry = !vid ? MediaLibrary[String(c.libId || '').toLowerCase()] : null;
let title = 'Ничего не выбрано';
let meta = 'Выберите игру или вставьте ссылку';
let source = '—';
let initials = '??';
let coverUrl = null;
if (vid) {
const cached = titleCache.get(vid);
title = (cached && cached.title) || `YouTube · ${vid}`;
meta = (cached && cached.author) || 'Реакция на видео';
source = 'YOUTUBE';
coverUrl = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
initials = 'YT';
if (!titleCache.has(vid)) resolveYouTubeTitle(vid);
} else if (entry) {
title = entry.title;
meta = Array.isArray(entry.meta) ? entry.meta.filter(Boolean).join(' · ') : '';
source = entry.type === 'series' ? 'КИНО / СЕРИАЛ' : 'ИГРА';
coverUrl = normalizeCover(entry.cover);
initials = String(entry.title || '??').substring(0, 2).toUpperCase();
} else if (c.libId) {
title = String(c.libId).toUpperCase();
meta = 'Нет в библиотеке — будет заглушка';
source = 'БИБЛИОТЕКА';
}
setText('md-now-title', title);
setText('md-now-meta', meta || '—');
setText('md-now-source', active ? source : 'СКРЫТА');
if (fallback) fallback.textContent = initials;
if (cover) {
const key = coverUrl || '';
if (cover.dataset.src !== key) {
cover.dataset.src = key;
if (key) {
cover.classList.remove('is-broken');
cover.src = key;
} else {
cover.removeAttribute('src');
cover.classList.add('is-broken');
}
}
}
const strip = document.getElementById('md-now');
if (strip) strip.classList.toggle('is-off', !active);
}
function evaluate() {
if (!ctx) return;
const state = store.getState();
renderStatus(state);
ctx.stage.evaluate(state);
ctx.controls.evaluate(state);
ctx.library.render(state);
}
function mount(params, state) {
const root = document.getElementById('md-main');
if (!root) return;
unmount();
// V2-вью уже дождалась preload() — здесь мгновенный no-op (страховка для прямого монтажа).
preload();
const toast = new Toast(document.getElementById('md-toasts'), { className: 'md-toast' });
const stage = new StageController({ root, store, toast });
const controls = new ControlsController({ root, store, toast });
const library = new LibraryController({
root,
store,
toast,
params,
onPick: (id, entry) => {
store.updateConfig({ widgets: { media: { libId: id, ytLink: '', isActive: true } } });
toast.success(`На экране: ${entry ? entry.title : id}`);
},
onHash: (updates) => setHashParams({ ...updates, id: 'media' })
});
ctx = { root, toast, stage, controls, library, unsub: null };
stage.mount();
controls.mount();
library.mount();
ctx.unsub = store.subscribe(() => evaluate());
evaluate();
console.log('[MediaDash] v3 смонтирован', params);
}
function onParamsChange(params) {
if (!ctx) return false;
if ((params?.id || 'player') !== 'media') return false;
ctx.library.setParams(params);
evaluate();
return true;
}
function unmount() {
if (!ctx) return;
console.log('[MediaDash] Размонтирование');
if (ctx.unsub) ctx.unsub();
ctx.stage.unmount();
ctx.controls.unmount();
ctx.library.unmount();
ctx = null;
// Стили (md-css-*) намеренно остаются в <head> — кэш между вкладками против FOUC.
document.querySelectorAll('iframe#md-preview-iframe').forEach(f => f.remove());
}
export default {
render: (state, params) => renderTemplate(state, params),
preload,
mount,
onParamsChange,
unmount
};