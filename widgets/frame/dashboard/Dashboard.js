/* ФАЙЛ: widgets/frame/dashboard/Dashboard.js — v1 (оркестратор: CSS-first, живой сигнал, статус, жизненный цикл) */
import { store } from '../../../js/store.js';
import { Toast } from '../../../js/components/toast.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { FramePanel } from './framePanel.js';
import { PetPanel } from './petPanel.js';
import {
CSS_FILES, CSS_TIMEOUT, LIVE_TTL, BRAND_1, BRAND_2, EMOTION_LABELS,
normalizeHex, setText, frameOf, petOf, frameVisible, petEnabled
} from './constants.js';

export default { render: renderTemplate, preload, mount, onParamsChange, unmount };

let ctx = null;
let cssPromise = null;

/* ---------- стили: параллельные <link>, идемпотентно, никогда не реджектится ---------- */
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
console.error(`[FrameDash:css] Файл стиля не загрузился: ${href}`);
link.remove();
resolve(false);
};
document.head.appendChild(link);
});
}

function preload() {
if (cssPromise) return cssPromise;
const t0 = performance.now();
console.log('[FrameDash:css] preload: параллельная загрузка стилей...');
const loadAll = Promise.all(CSS_FILES.map(loadOneCss)).then((results) => {
const ok = results.every(Boolean);
if (ok) console.log(`[FrameDash:css] Стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[FrameDash:css] Часть стилей недоступна — возможен деградированный вид.');
return ok;
});
let guardTimer = null;
const guard = new Promise((resolve) => {
guardTimer = setTimeout(() => {
console.warn(`[FrameDash:css] Таймаут ${CSS_TIMEOUT}мс — рендерим без ожидания стилей.`);
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

/* ---------- helpers ---------- */
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
el.className = `fd-badge ${cls}`;
el.innerHTML = `<span class="fd-badge-dot"></span>${text}`;
}

function renderStatus(state, live) {
const f = frameOf(state);
const p = petOf(state);
const visible = frameVisible(f);
const on = petEnabled(p);
const online = Boolean(state.serverOnline);
const c1 = normalizeHex(f.color1, BRAND_1);
const c2 = normalizeHex(f.color2, BRAND_2);

setBadge('fd-badge-server', online ? 'fd-badge-live' : 'fd-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
setBadge('fd-badge-state', visible ? 'fd-badge-live' : 'fd-badge-warn', visible ? 'НА ЭКРАНЕ' : 'СКРЫТА');
setBadge('fd-badge-source',
live ? (live.source === 'obs' ? 'fd-badge-live' : 'fd-badge-info') : 'fd-badge-off',
live ? (live.source === 'obs' ? 'СИГНАЛ ИЗ OBS' : 'СИГНАЛ ИЗ ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
setBadge('fd-badge-pet', on ? 'fd-badge-info' : 'fd-badge-off', on ? 'ЛИСА ВКЛ' : 'ЛИСА ВЫКЛ');

const swatch = document.getElementById('fd-now-swatch');
if (swatch) swatch.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
setText('fd-now-title', visible ? 'Рамка видна на стриме' : 'Рамка скрыта вместе с лисой');
setText('fd-now-hex', `${c1} → ${c2}`);

const petState = live ? live.petState : (on ? 'idle' : 'off');
const label = on ? (EMOTION_LABELS[petState] || petState) : 'выключена';
setText('fd-now-pet', `ЛИСА: ${String(label).toUpperCase()}`);
setText('fd-now-source', live ? (live.source === 'obs' ? 'OBS STUDIO' : 'ПРЕВЬЮ') : 'НЕТ СИГНАЛА');

const now = document.getElementById('fd-now');
if (now) {
now.classList.toggle('is-off', !visible);
now.style.setProperty('--now-1', c1);
now.style.setProperty('--now-2', c2);
}
const petChip = document.getElementById('fd-now-pet');
if (petChip) petChip.classList.toggle('is-off', !on);
}

function evaluate() {
if (!ctx) return;
try {
const state = store.getState();
const live = pickLive();
renderStatus(state, live);
ctx.stage.evaluate(state, live);
ctx.frame.render(state);
ctx.pet.render(state, live);
} catch (e) {
console.error('[FrameDash] evaluate провален:', e);
}
}

/* ---------- жизненный цикл ---------- */
function mount(params, state) {
const root = document.getElementById('fd-main');
if (!root) return;
unmount();
// V2-вью уже дождалась preload() — здесь мгновенный no-op (страховка для прямого монтажа).
preload();
const toast = new Toast(document.getElementById('fd-toasts'), { className: 'fd-toast' });
ctx = {
root,
toast,
stage: new StageController({ root, store, toast }),
frame: new FramePanel({ root, store, toast }),
pet: new PetPanel({ root, store, toast }),
live: { obs: null, preview: null },
unsub: null,
unsubAction: null,
tick: null
};
ctx.stage.mount();
ctx.frame.mount();
ctx.pet.mount();
ctx.unsub = store.subscribe(() => evaluate());
ctx.unsubAction = store.onAction((action, payload) => {
if (!ctx || action !== 'FRAME_STATE' || !payload) return;
const source = payload.source === 'obs' ? 'obs' : 'preview';
ctx.live[source] = {
source,
visible: payload.visible !== false,
color1: normalizeHex(payload.color1, BRAND_1),
color2: normalizeHex(payload.color2, BRAND_2),
petEnabled: payload.petEnabled !== false,
petState: String(payload.petState || 'idle'),
ts: Number(payload.ts || Date.now())
};
evaluate();
});
ctx.tick = setInterval(() => evaluate(), 2500);
evaluate();
store.broadcastAction('FRAME_REQUEST_STATE', {});
console.log('[FrameDash] v1 смонтирован', params);
}

function onParamsChange(params) {
if (!ctx) return false;
return (params?.id || 'player') === 'frame';
}

function unmount() {
if (!ctx) return;
console.log('[FrameDash] Размонтирование');
if (ctx.unsub) ctx.unsub();
if (ctx.unsubAction) ctx.unsubAction();
if (ctx.tick) clearInterval(ctx.tick);
ctx.stage.unmount();
ctx.frame.unmount();
ctx.pet.unmount();
ctx = null;
// Стили (fd-css-*) намеренно остаются в <head> — кэш между вкладками против FOUC.
document.querySelectorAll('iframe#fd-preview-iframe').forEach(f => f.remove());
}