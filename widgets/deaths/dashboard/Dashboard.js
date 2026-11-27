/* ФАЙЛ: widgets/deaths/dashboard/Dashboard.js — v2 (CSS-first: параллельные стили + preload, кэш линков в head) */
import { store } from '../../../js/store.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { CounterPanel } from './counterPanel.js';
import { TuningPanel } from './tuningPanel.js';
import { LogPanel } from './logPanel.js';
import { Toast } from '../../../js/components/toast.js';
const LIVE_TTL = 12000;
let ctx = null;
// === CSS-first загрузчик: параллельные <link> вместо @import-водопада ===
const CSS_VERSION = 'v2';
const CSS_TIMEOUT = 3000;
const CSS_FILES = [
{ id: 'dd-css-base', href: `widgets/deaths/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'dd-css-stage', href: `widgets/deaths/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'dd-css-panels', href: `widgets/deaths/dashboard/styles/panels.css?${CSS_VERSION}` }
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
console.error(`[DeathsDash:css] Файл стиля не загрузился: ${href}`);
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
console.log('[DeathsDash:css] preload: параллельная загрузка стилей...');
const loadAll = Promise.all(CSS_FILES.map(loadOneCss)).then((results) => {
const ok = results.every(Boolean);
if (ok) console.log(`[DeathsDash:css] Стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[DeathsDash:css] Часть стилей недоступна — возможен деградированный вид.');
return ok;
});
let guardTimer = null;
const guard = new Promise((resolve) => {
guardTimer = setTimeout(() => {
console.warn(`[DeathsDash:css] Таймаут ${CSS_TIMEOUT}мс — рендерим без ожидания стилей.`);
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
function pickLive() {
if (!ctx) return null;
const now = Date.now();
const { obs, preview } = ctx.live;
if (obs && now - obs.ts < LIVE_TTL) return obs;
if (preview && now - preview.ts < LIVE_TTL) return preview;
return null;
}
function setBadge(id, cls, text) {
const el = document.getElementById(id);
if (!el) return;
el.className = `dd-badge ${cls}`;
el.innerHTML = `<span class="dd-badge-dot"></span>${text}`;
}
function setText(id, text) {
const el = document.getElementById(id);
if (el && el.textContent !== text) el.textContent = text;
}
function renderStatus(state, live) {
const c = state.config.widgets.deaths || {};
const enabled = c.enabled === true || String(c.enabled) === 'true';
const online = Boolean(state.serverOnline);
setBadge('dd-badge-server', online ? 'dd-badge-live' : 'dd-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
setBadge('dd-badge-state', enabled ? 'dd-badge-live' : 'dd-badge-warn', enabled ? 'НА ЭКРАНЕ' : 'СКРЫТ');
setBadge('dd-badge-source',
live ? (live.source === 'obs' ? 'dd-badge-live' : 'dd-badge-info') : 'dd-badge-off',
live ? (live.source === 'obs' ? 'СИГНАЛ ИЗ OBS' : 'СИГНАЛ ИЗ ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
const configCount = Math.max(0, parseInt(c.deathsCount, 10) || 0);
const shown = live ? live.count : configCount;
setText('dd-now-count', String(shown));
setText('dd-now-label', live && live.label ? live.label : String(c.label ?? 'DEATHS'));
setText('dd-now-source', live ? (live.source === 'obs' ? 'OBS STUDIO' : 'ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
const combo = live ? live.combo : 0;
const comboEl = document.getElementById('dd-now-combo');
if (comboEl) {
comboEl.textContent = combo > 1 ? `x${combo} COMBO` : 'КОМБО НЕТ';
comboEl.classList.toggle('is-active', combo > 1);
}
const strip = document.getElementById('dd-now');
if (strip) {
strip.classList.toggle('is-off', !enabled);
strip.style.setProperty('--now-accent', String(c.color || '#ff0050'));
strip.style.setProperty('--now-combo', String(c.comboColor || '#ff8c00'));
}
}
function evaluate() {
if (!ctx) return;
const state = store.getState();
const live = pickLive();
renderStatus(state, live);
ctx.stage.evaluate(state, live);
ctx.counter.render(state, live);
ctx.tuning.render(state);
ctx.log.render();
}
function mount(params, state) {
const root = document.getElementById('dd-main');
if (!root) return;
unmount();
// V2-вью уже дождалась preload() — здесь мгновенный no-op (страховка для прямого монтажа).
preload();
const toast = new Toast(document.getElementById('dd-toasts'), { className: 'dd-toast' });
const stage = new StageController({ root, store, toast });
const counter = new CounterPanel({ root, store, toast });
const tuning = new TuningPanel({ root, store, toast });
const log = new LogPanel({ root, toast });
ctx = {
root, toast, stage, counter, tuning, log,
live: { obs: null, preview: null },
seen: new Set(),
unsub: null, unsubAction: null, tick: null
};
stage.mount();
counter.mount();
tuning.mount();
log.mount();
ctx.unsub = store.subscribe(() => evaluate());
ctx.unsubAction = store.onAction((action, payload) => {
if (!payload) return;
if (action === 'DEATHS_STATE') {
const source = payload.source === 'obs' ? 'obs' : 'preview';
ctx.live[source] = {
source,
count: Number(payload.count ?? 0),
visible: payload.visible !== false,
combo: Number(payload.combo ?? 0),
label: payload.label || 'DEATHS',
ts: Number(payload.ts || Date.now())
};
evaluate();
return;
}
if (action === 'DEATHS_CHANGE') {
const source = payload.source === 'obs' ? 'obs' : 'preview';
const obsFresh = ctx.live.obs && Date.now() - ctx.live.obs.ts < LIVE_TTL;
if (source === 'preview' && obsFresh) return;
const ts = Number(payload.ts || Date.now());
const key = `${source}:${ts}:${payload.count}:${payload.delta}`;
if (ctx.seen.has(key)) return;
ctx.seen.add(key);
if (ctx.seen.size > 400) ctx.seen.clear();
ctx.log.push({
ts,
delta: Number(payload.delta ?? 0),
count: Number(payload.count ?? 0),
combo: Number(payload.combo ?? 0)
});
evaluate();
}
});
ctx.tick = setInterval(() => evaluate(), 2000);
evaluate();
store.broadcastAction('DEATHS_REQUEST_STATE', {});
console.log('[DeathsDash] v2 смонтирован', params);
}
function onParamsChange(params) {
if (!ctx) return false;
return (params?.id || 'player') === 'deaths';
}
function unmount() {
if (!ctx) return;
console.log('[DeathsDash] Размонтирование');
if (ctx.unsub) ctx.unsub();
if (ctx.unsubAction) ctx.unsubAction();
if (ctx.tick) clearInterval(ctx.tick);
ctx.stage.unmount();
ctx.counter.unmount();
ctx.tuning.unmount();
ctx.log.unmount();
ctx = null;
// Стили (dd-css-*) намеренно остаются в <head> — кэш между вкладками против FOUC.
document.querySelectorAll('iframe#dd-preview-iframe').forEach(f => f.remove());
}
export default {
render: (state, params) => renderTemplate(state, params),
preload,
mount,
onParamsChange,
unmount
};