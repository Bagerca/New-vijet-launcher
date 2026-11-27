/* ФАЙЛ: widgets/socials/dashboard/Dashboard.js — v2 (CSS-first: параллельные стили + preload, кэш линков в head) */
import { store } from '../../../js/store.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { NetworksPanel } from './networksPanel.js';
import { RotationPanel } from './rotationPanel.js';
import { Toast } from '../../../js/components/toast.js';
import { icons } from '../../../js/utils/icons.js';
import { activeNetworks, normalizeNetworks, getPlatform } from '../networks.js';
const LIVE_TTL = 15000;
let ctx = null;
// === CSS-first загрузчик: параллельные <link> вместо @import-водопада ===
const CSS_VERSION = 'v2';
const CSS_TIMEOUT = 3000;
const CSS_FILES = [
{ id: 'sd-css-base', href: `widgets/socials/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'sd-css-stage', href: `widgets/socials/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'sd-css-panels', href: `widgets/socials/dashboard/styles/panels.css?${CSS_VERSION}` }
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
console.error(`[SocialsDash:css] Файл стиля не загрузился: ${href}`);
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
console.log('[SocialsDash:css] preload: параллельная загрузка стилей...');
const loadAll = Promise.all(CSS_FILES.map(loadOneCss)).then((results) => {
const ok = results.every(Boolean);
if (ok) console.log(`[SocialsDash:css] Стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[SocialsDash:css] Часть стилей недоступна — возможен деградированный вид.');
return ok;
});
let guardTimer = null;
const guard = new Promise((resolve) => {
guardTimer = setTimeout(() => {
console.warn(`[SocialsDash:css] Таймаут ${CSS_TIMEOUT}мс — рендерим без ожидания стилей.`);
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
const obs = ctx.live.obs;
const preview = ctx.live.preview;
if (obs && now - obs.ts < LIVE_TTL) return obs;
if (preview && now - preview.ts < LIVE_TTL) return preview;
return null;
}
function setBadge(id, cls, text) {
const el = document.getElementById(id);
if (!el) return;
el.className = `sd-badge ${cls}`;
el.innerHTML = `<span class="sd-badge-dot"></span>${text}`;
}
function setText(id, text) {
const el = document.getElementById(id);
if (el && el.textContent !== text) el.textContent = text;
}
function renderStatus(state, live) {
const c = state.config.widgets.socials || {};
const isOn = c.isActive === true || String(c.isActive) === 'true';
const list = activeNetworks(c);
const online = Boolean(state.serverOnline);
const visible = isOn && list.length > 0;
setBadge('sd-badge-server', online ? 'sd-badge-live' : 'sd-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
setBadge('sd-badge-state', visible ? 'sd-badge-live' : 'sd-badge-warn', visible ? 'НА ЭКРАНЕ' : (isOn ? 'НЕТ СОЦСЕТЕЙ' : 'СКРЫТА'));
setBadge('sd-badge-source',
live ? (live.source === 'obs' ? 'sd-badge-live' : 'sd-badge-info') : 'sd-badge-off',
live ? (live.source === 'obs' ? 'СИГНАЛ ИЗ OBS' : 'СИГНАЛ ИЗ ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
const current = live && live.id ? list.find(n => n.id === live.id) : null;
const item = current || list[0] || null;
const p = item ? getPlatform(item.id) : null;
const iconEl = document.getElementById('sd-now-icon');
if (iconEl) {
const key = p ? p.id : 'none';
if (iconEl.dataset.key !== key) {
iconEl.dataset.key = key;
iconEl.innerHTML = p && typeof icons[p.icon] === 'function' ? icons[p.icon]() : icons.noSignal();
}
iconEl.style.setProperty('--now-accent', item ? item.color : 'var(--sd-ink-3)');
}
setText('sd-now-title', p ? p.title : (list.length ? 'Ожидание виджета' : 'Соцсети не добавлены'));
setText('sd-now-handle', item ? (item.handle || '—') : (list.length ? 'Откройте OBS или подождите превью' : 'Добавьте платформу слева'));
setText('sd-now-pos', live && live.total > 0 && live.index >= 0 ? `${live.index + 1} / ${live.total}` : `${list.length} в списке`);
const strip = document.getElementById('sd-now');
if (strip) {
strip.classList.toggle('is-off', !visible);
strip.style.setProperty('--now-accent', item ? item.color : 'var(--sd-ink-3)');
}
}
function evaluate() {
if (!ctx) return;
const state = store.getState();
const live = pickLive();
renderStatus(state, live);
ctx.stage.evaluate(state, live);
ctx.networks.render(state);
ctx.rotation.render(state, live);
}
function mount(params, state) {
const root = document.getElementById('sd-main');
if (!root) return;
unmount();
// V2-вью уже дождалась preload() — здесь мгновенный no-op (страховка для прямого монтажа).
preload();
const toast = new Toast(document.getElementById('sd-toasts'), { className: 'sd-toast' });
const stage = new StageController({ root, store, toast });
const networks = new NetworksPanel({ root, store, toast });
const rotation = new RotationPanel({ root, store, toast });
ctx = { root, toast, stage, networks, rotation, live: { obs: null, preview: null }, unsub: null, unsubAction: null, tick: null };
stage.mount();
networks.mount();
rotation.mount();
ctx.unsub = store.subscribe(() => evaluate());
ctx.unsubAction = store.onAction((action, payload) => {
if (action !== 'SOCIALS_STATE' || !payload) return;
const source = payload.source === 'obs' ? 'obs' : 'preview';
ctx.live[source] = {
source,
id: payload.id || null,
index: Number(payload.index ?? -1),
total: Number(payload.total ?? 0),
interval: Number(payload.interval ?? 30),
enabled: payload.enabled !== false,
ts: Number(payload.ts || Date.now())
};
evaluate();
});
ctx.tick = setInterval(() => evaluate(), 2000);
evaluate();
store.broadcastAction('SOCIALS_REQUEST_STATE', {});
console.log('[SocialsDash] v2 смонтирован', params);
}
function onParamsChange(params) {
if (!ctx) return false;
return (params?.id || 'player') === 'socials';
}
function unmount() {
if (!ctx) return;
console.log('[SocialsDash] Размонтирование');
if (ctx.unsub) ctx.unsub();
if (ctx.unsubAction) ctx.unsubAction();
if (ctx.tick) clearInterval(ctx.tick);
ctx.stage.unmount();
ctx.networks.unmount();
ctx.rotation.unmount();
ctx = null;
// Стили (sd-css-*) намеренно остаются в <head> — кэш между вкладками против FOUC.
document.querySelectorAll('iframe#sd-preview-iframe').forEach(f => f.remove());
}
export default {
render: (state, params) => renderTemplate(state, params),
preload,
mount,
onParamsChange,
unmount
};