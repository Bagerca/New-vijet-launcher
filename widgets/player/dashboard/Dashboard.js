/* ФАЙЛ: widgets/player/dashboard/Dashboard.js — v6.2 (CSS-first: параллельные стили + preload, кэш линков в head) */
import { store } from '../../../js/store.js';
import { renderTemplate } from './template.js';
import { DashboardState } from './state.js';
import { DashboardTransport } from './transport.js';
import { StageController } from './stage.js';
import { QueueList } from './queueList.js';
import { ControlsController } from './controls.js';
import { ConfigBindings } from './configBindings.js';
import { Toast } from '../../../js/components/toast.js';
import { setHashParams } from '../../../js/utils/hashParams.js';
import { extractYouTubeId } from '../queue.js';
const WS_URL = 'ws://127.0.0.1:42069';
let ctx = null;
// === CSS-first загрузчик: параллельные <link> вместо @import-водопада ===
const CSS_VERSION = 'v7';
const CSS_TIMEOUT = 3000;
const CSS_FILES = [
{ id: 'pd-css-base', href: `widgets/player/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'pd-css-stage', href: `widgets/player/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'pd-css-controls', href: `widgets/player/dashboard/styles/controls.css?${CSS_VERSION}` },
{ id: 'pd-css-queue', href: `widgets/player/dashboard/styles/queue.css?${CSS_VERSION}` }
];
let cssPromise = null;
function loadOneCss({ id, href }) {
return new Promise((resolve) => {
const existing = document.getElementById(id);
if (existing) {
if (existing.dataset.loaded === '1') { resolve(true); return; }
// Линк ещё грузится — подписываемся на тот же результат.
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
console.error(`[PlayerDash:css] Файл стиля не загрузился: ${href}`);
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
console.log('[PlayerDash:css] preload: параллельная загрузка стилей...');
const loadAll = Promise.all(CSS_FILES.map(loadOneCss)).then((results) => {
const ok = results.every(Boolean);
if (ok) console.log(`[PlayerDash:css] Стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[PlayerDash:css] Часть стилей недоступна — возможен деградированный вид.');
return ok;
});
let guardTimer = null;
const guard = new Promise((resolve) => {
guardTimer = setTimeout(() => {
console.warn(`[PlayerDash:css] Таймаут ${CSS_TIMEOUT}мс — рендерим без ожидания стилей.`);
resolve(false);
}, CSS_TIMEOUT);
});
cssPromise = Promise.race([loadAll, guard]).then((ok) => {
if (guardTimer) { clearTimeout(guardTimer); guardTimer = null; }
if (!ok) cssPromise = null; // ошибка/таймаут → повторная попытка при следующем открытии
return ok;
});
return cssPromise;
}
function evaluate() {
if (!ctx) return;
const online = ctx.transport.isOnline();
ctx.stage.evaluate(online);
ctx.queueList.render(online);
ctx.controls.evaluate(online);
}
function mount(params, state) {
const root = document.getElementById('pd-main');
if (!root) return;
unmount();
// В нормальном потоке V2-вью уже дождалась preload() — здесь мгновенный no-op.
// Вызов оставлен для совместимости, если дашборд монтируют напрямую.
preload();
const dashState = new DashboardState();
dashState.setDemoWanted(params?.demo === '1');
const toast = new Toast(document.getElementById('pd-toasts'));
const transport = new DashboardTransport({
url: WS_URL,
onAction: (action, payload) => {
if (action === 'PLAYER_ROSTER') dashState.applyRoster(payload);
else if (action === 'PLAYER_QUEUE_STATE') dashState.applyQueue(payload);
else if (action === 'PLAYER_TRANSPORT') dashState.applyTransport(payload);
else if (action === 'PLAYER_NOTICE') {
const level = payload && payload.level === 'error' ? 'error' : (payload && payload.level === 'warn' ? 'info' : 'info');
toast.show((payload && payload.text) || 'Событие плеера', level);
}
},
onStatus: () => evaluate(),
onAck: ({ ok, message, silent, okToast }) => {
if (!ok && !silent) toast.error(message || 'Команда отклонена.');
else if (ok && okToast) toast.success(okToast);
}
});
transport.setConfigHandler((data) => store.syncFromRemote(data));
const stage = new StageController({
root,
state: dashState,
toast,
onSetSource: (mode) => {
if (!transport.sendRaw({ event: 'PLAYER_SET_ACTIVE', mode })) {
toast.error('Нет связи с сервером.');
return;
}
toast.success(mode === 'demo'
? 'Музыка переключена в лаунчер без потери позиции.'
: 'Музыка возвращена в OBS без потери позиции.');
},
// Присутствие демо-плеера управляет URL (?demo=1) — роутер создаёт/закрывает iframe.
onSpawnDemo: () => setHashParams({ demo: '1', id: 'player' }),
onDespawnDemo: () => setHashParams({ demo: null, id: 'player' }),
onReconnect: () => {
const btn = document.getElementById('pd-reconnect');
if (btn) { btn.classList.add('is-spin'); setTimeout(() => btn.classList.remove('is-spin'), 900); }
transport.connect();
if (dashState.demoWanted && !dashState.has('demo')) {
stage.destroyIframe();
stage.createIframe();
stage.expectDemoHandoff();
}
setTimeout(() => transport.requestSync(), 600);
toast.info('Переподключение к серверу...');
},
onRequestSync: () => transport.requestSync()
});
const queueList = new QueueList({
root,
state: dashState,
mountAt: Date.now(),
onPlay: (uid) => transport.cmd('PLAYER_PLAY_SPECIFIC', { uid }, { silent: true }),
onRemove: (uid) => transport.cmd('PLAYER_REMOVE_TRACK', { uid }, { silent: true }),
onRestore: (uid) => transport.cmd('PLAYER_RESTORE_TRACK', { uid }, { silent: true }),
onRestart: () => transport.cmd('PLAYER_PLAYLIST_RESTART', {}, { okToast: 'Плейлист запущен с начала.' })
});
const controls = new ControlsController({
root,
state: dashState,
toast,
onCmd: (action, payload, opts) => transport.cmd(action, payload, opts),
onAddTrack: (url) => {
if (!extractYouTubeId(url)) {
toast.error('Не распознал ссылку YouTube.');
return false;
}
return transport.cmd('PLAYER_ADD_TRACK', { url, user: 'Стример' }, { okToast: 'Трек добавлен в очередь.' });
}
});
const configBindings = new ConfigBindings({
root,
store,
onAfterChange: () => setTimeout(() => transport.requestSync(), 350)
});
ctx = {
root,
state: dashState,
transport,
stage,
queueList,
controls,
config: configBindings,
toast,
tickTimer: null,
unsubState: null,
lastPing: 0
};
stage.mount();
queueList.mount();
controls.mount();
configBindings.mount();
configBindings.sync(store.getState());
ctx.unsubState = dashState.subscribe(() => evaluate());
transport.connect();
// Deep link ?demo=1: создаём плеер и сразу планируем авто-эстафету в лаунчер.
if (dashState.demoWanted) {
stage.createIframe();
stage.expectDemoHandoff();
}
ctx.tickTimer = setInterval(() => {
if (!transport.isOnline()) transport.connect();
evaluate();
const q = dashState.queue;
const now = Date.now();
if ((!q.hasSnapshot || now - q.receivedAt > 8000) && now - ctx.lastPing > 4000) {
ctx.lastPing = now;
transport.requestSync();
}
}, 1000);
evaluate();
console.log('[Dashboard] v6.2 смонтирован', params);
}
function onParamsChange(params) {
if (!ctx) return false;
if ((params?.id || 'player') !== 'player') return false;
const want = params?.demo === '1';
if (want !== ctx.state.demoWanted) {
ctx.state.setDemoWanted(want);
if (want) {
ctx.stage.createIframe();
ctx.stage.expectDemoHandoff();
} else {
ctx.stage.cancelPending();
ctx.stage.destroyIframe();
}
}
return true;
}
function unmount() {
if (!ctx) return;
console.log('[Dashboard] Размонтирование');
if (ctx.tickTimer) clearInterval(ctx.tickTimer);
if (ctx.unsubState) ctx.unsubState();
ctx.stage.unmount();
ctx.queueList.unmount();
ctx.controls.unmount();
ctx.config.unmount();
ctx.transport.close();
ctx = null;
// Стили (pd-css-*) намеренно остаются в <head>: кэш между вкладками
// убивает FOUC при повторном открытии. Селекторы изолированы префиксом pd-.
document.querySelectorAll('iframe#pd-demo-iframe').forEach(f => f.remove());
}
export default {
render: (state, params) => renderTemplate(state, params),
preload,
mount,
onParamsChange,
unmount
};