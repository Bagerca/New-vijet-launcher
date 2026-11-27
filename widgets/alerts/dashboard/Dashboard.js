/* ФАЙЛ: widgets/alerts/dashboard/Dashboard.js — v3.1 (честная диагностика: живая телеметрия важнее реестра, без ложных тревог) */
import { store } from '../../../js/store.js';
import { Toast } from '../../../js/components/toast.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { LabPanel } from './labPanel.js';
import { SettingsPanel } from './settingsPanel.js';
import { LogPanel } from './logPanel.js';
import {
CSS_FILES, CSS_TIMEOUT, LIVE_TTL, normalizeAlertConfig, getType,
ic, esc, typeIcon, setText, alertsOf
} from './constants.js';

export default { render: renderTemplate, preload, mount, onParamsChange, unmount };

const RELOAD_GRACE_MS = 9000;
const ROSTER_POLL_MS = 5000;

let ctx = null;
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
link.onerror = () => { console.error('[AlertsDash:css] не загрузился:', href); link.remove(); resolve(false); };
document.head.appendChild(link);
});
}

function preload() {
if (cssPromise) return cssPromise;
const t0 = performance.now();
const all = Promise.all(CSS_FILES.map(loadOneCss)).then((r) => {
const ok = r.every(Boolean);
if (ok) console.log(`[AlertsDash:css] стили готовы за ${Math.round(performance.now() - t0)}мс`);
else console.warn('[AlertsDash:css] часть стилей недоступна');
return ok;
});
let timer = null;
const guard = new Promise((resolve) => { timer = setTimeout(() => { console.warn('[AlertsDash:css] таймаут'); resolve(false); }, CSS_TIMEOUT); });
cssPromise = Promise.race([all, guard]).then((ok) => {
if (timer) { clearTimeout(timer); timer = null; }
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
el.className = `ad-badge ${cls}`;
el.innerHTML = `<span class="ad-badge-dot"></span>${text}`;
}
function obsWidgets() {
if (!ctx) return [];
return ctx.roster.filter(w => w.source === 'obs');
}
function hasObsAlerts() { return obsWidgets().some(w => w.widget === 'alerts'); }
function obsStateFresh() { return Boolean(ctx && ctx.live.obs && Date.now() - ctx.live.obs.ts < LIVE_TTL); }
function inGrace() { return Boolean(ctx && Date.now() < ctx.busyUntil); }

function renderRoster(state) {
const el = document.getElementById('ad-roster');
if (!el) return;
const obs = obsWidgets();
const sig = `${state.serverOnline}|${obs.map(w => w.widget + (w.master ? '*' : '')).join(',')}`;
if (sig === ctx._rosterSig) return;
ctx._rosterSig = sig;
if (!obs.length) {
const text = !state.serverOnline
? 'Нет связи с сервером лаунчера.'
: (inGrace() ? 'Перезапускаю источник — список обновится через пару секунд…' : 'Получаю список виджетов из OBS…');
el.innerHTML = `<span class="ad-roster-empty">${esc(text)}</span>`;
return;
}
const html = obs.map(w => `
<span class="ad-roster-chip ${w.widget === 'alerts' ? 'is-alerts' : ''}">${esc(w.widget)}${w.master ? '<em>master</em>' : ''}</span>`).join('');
el.innerHTML = `<span class="ad-roster-label">В OBS сейчас:</span>${html}`;
}

function renderDiag(state) {
const el = document.getElementById('ad-diag');
if (!el) return;
const online = state.serverOnline;
const fresh = obsStateFresh();
const listed = hasObsAlerts();
const total = obsWidgets().length;
let text, level = 'ok';

if (!online) {
text = 'Сервер лаунчера недоступен. Запустите лаунчер через npm start — сервер поднимается вместе с ним.';
level = 'error';
} else if (fresh) {
// Живая телеметрия — главный аргумент. Реестр может отставать, это не поломка.
const ch = ctx.live.obs.channel ? `#${ctx.live.obs.channel}` : 'канал не задан';
text = ctx.live.obs.master
? `OBS-виджет на связи (${ch}), мастер. Подписки, ресабы, подарки, биты и рейды показываются автоматически.`
: `OBS-виджет на связи (${ch}). Мастером стал другой виджет — это нормально: события канала приходят по шине всем.`;
} else if (inGrace()) {
text = 'Перезапускаю источник в OBS. Первый пакет состояния придёт в течение 5 секунд.';
} else if (listed) {
text = 'Источник alerts в OBS подключён, ждём первый пакет состояния (до 5 секунд). Если статус не меняется — откройте http://localhost:42069/alerts/index.html?debug=1 и посмотрите индикатор внизу слева.';
level = 'warn';
} else if (total === 0) {
text = 'Реестр виджетов ещё не получен. Откройте OBS со сценами пака; если сцены не созданы — «Авто-настройка OBS» на Дашборде.';
level = 'warn';
} else {
text = `В OBS живут ${total} виджетов, но «alerts» среди них нет. Нажмите «Починить источник» — он создаст источник, добавит на все сцены, поднимет наверх и включит видимость.`;
level = 'error';
}
if (el.textContent !== text) el.textContent = text;
el.classList.toggle('is-error', level === 'error');
el.classList.toggle('is-warn', level === 'warn');
}

function renderStatus(state, live) {
const c = normalizeAlertConfig(alertsOf(state));
const online = Boolean(state.serverOnline);
const queue = live ? live.queue : 0;
const obsLive = obsStateFresh();
setBadge('ad-badge-server', online ? 'ad-badge-live' : 'ad-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
setBadge('ad-badge-state', c.enabled ? 'ad-badge-live' : 'ad-badge-warn', c.enabled ? 'НА ЭКРАНЕ' : 'ВЫКЛЮЧЕНЫ');
setBadge('ad-badge-source',
live ? (live.source === 'obs' ? 'ad-badge-live' : 'ad-badge-info') : 'ad-badge-off',
live ? (live.source === 'obs' ? 'СИГНАЛ ИЗ OBS' : 'СИГНАЛ ИЗ ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
setBadge('ad-badge-queue', queue > 0 ? 'ad-badge-warn' : 'ad-badge-info', `ОЧЕРЕДЬ ${queue}`);

const current = live && live.current ? live.current : null;
const meta = current ? getType(current.type) : null;
const iconEl = document.getElementById('ad-now-ic');
if (iconEl) {
const key = meta ? meta.id : 'idle';
if (iconEl.dataset.key !== key) {
iconEl.dataset.key = key;
iconEl.innerHTML = meta ? typeIcon(meta) : ic('target');
}
iconEl.style.setProperty('--now-accent', meta ? meta.color : 'var(--ad-ink-3)');
}
setText('ad-now-title', current ? `${meta ? meta.label : current.type} · ${current.user}` : (c.enabled ? 'Ничего не показывается' : 'Оповещения выключены'));
setText('ad-now-meta', current ? (queue > 0 ? `В очереди ещё ${queue}` : 'Очередь пуста') : (c.enabled ? 'Отправьте тест из лаборатории ниже' : 'Включите мастер-тумблер'));
setText('ad-now-source', live ? (live.source === 'obs' ? 'OBS STUDIO' : 'ПРЕВЬЮ') : 'НЕТ СИГНАЛА');

const now = document.getElementById('ad-now');
if (now) {
now.classList.toggle('is-off', !c.enabled);
now.style.setProperty('--now-accent', meta ? meta.color : 'var(--ad-line-2)');
}
const skip = document.getElementById('ad-skip');
if (skip) skip.disabled = !current;
const clear = document.getElementById('ad-clear-queue');
if (clear) clear.disabled = queue <= 0;
['ad-obs-refresh', 'ad-obs-fix'].forEach(id => {
const b = document.getElementById(id);
if (b && !b.classList.contains('is-spin')) b.disabled = !online;
});
const fix = document.getElementById('ad-obs-fix');
if (fix) fix.classList.toggle('ad-btn-primary', !obsLive && !inGrace());
}

function evaluate() {
if (!ctx) return;
try {
const state = store.getState();
const live = pickLive();
renderDiag(state);
renderRoster(state);
renderStatus(state, live);
ctx.stage.evaluate(state, live);
ctx.settings.render(state);
ctx.lab.render(state, live);
} catch (e) { console.error('[AlertsDash] evaluate провален:', e); }
}

function requestRoster() { store.broadcastAction('WIDGET_ROSTER_REQUEST', {}); }

function onClick(e) {
if (!ctx) return;
const btn = e.target.closest('[data-ad-act]');
if (!btn || btn.disabled) return;
const act = btn.getAttribute('data-ad-act');
const arg = btn.getAttribute('data-arg');
e.preventDefault();
switch (act) {
case 'refresh':
btn.classList.add('is-spin');
setTimeout(() => { if (btn.isConnected) btn.classList.remove('is-spin'); }, 900);
ctx.stage.refresh();
ctx.toast.info('Превью перезапущено.');
return;
case 'obs-refresh':
if (!store.getState().serverOnline) { ctx.toast.error('Нет связи с сервером лаунчера.'); return; }
ctx.busyUntil = Date.now() + RELOAD_GRACE_MS;
ctx._rosterSig = '';
btn.classList.add('is-spin');
setTimeout(() => { if (btn.isConnected) btn.classList.remove('is-spin'); }, 1200);
store.broadcastAction('SCENES_REFRESH', { widgets: ['alerts'], origin: 'alerts-dash' });
ctx.toast.info('Перезагружаю источник в OBS…');
evaluate();
return;
case 'obs-fix':
if (!store.getState().serverOnline) { ctx.toast.error('Нет связи с сервером лаунчера.'); return; }
ctx.busyUntil = Date.now() + RELOAD_GRACE_MS;
ctx._rosterSig = '';
btn.classList.add('is-spin');
setTimeout(() => { if (btn.isConnected) btn.classList.remove('is-spin'); }, 1600);
store.broadcastAction('SCENES_ENSURE', { id: 'alerts', origin: 'alerts-dash' });
ctx.toast.info('Проверяю и чиню источник оповещений в OBS…');
evaluate();
return;
case 'show': ctx.settings._set({ enabled: true }); ctx.toast.success('Оповещения снова на экране.'); return;
case 'skip': store.broadcastAction('ALERTS_SKIP', {}); ctx.toast.info('Текущее оповещение пропущено.'); return;
case 'clear-queue': store.broadcastAction('ALERTS_CLEAR', {}); ctx.toast.info('Очередь очищена.'); return;
case 'type': ctx.lab.pickType(arg); return;
case 'target': ctx.lab.setTarget(arg); return;
case 'preset': ctx.lab.applyPreset(arg); return;
case 'send': ctx.lab.send(); return;
case 'send-obs': ctx.lab.sendObs(); return;
case 'storm': ctx.lab.storm(); return;
case 'pos': ctx.settings.setPosition(arg); return;
case 'reset': ctx.settings.reset(); return;
case 'copy': ctx.settings.copyChip(btn, arg || ''); return;
case 'log-pause':
case 'log-clear': ctx.log.handleAction(act); return;
default: return;
}
}

function mount(params, state) {
const root = document.getElementById('ad-main');
if (!root) return;
unmount();
preload();
const toast = new Toast(document.getElementById('ad-toasts'), { className: 'ad-toast' });
ctx = {
root, toast,
stage: new StageController({ root, store, toast }),
lab: new LabPanel({ root, store, toast }),
settings: new SettingsPanel({ root, store, toast }),
log: new LogPanel({ root, toast }),
live: { obs: null, preview: null },
roster: [],
seen: new Set(),
busyUntil: 0,
_rosterSig: '',
_lastRosterPoll: 0,
unsub: null, unsubAction: null, tick: null, handlers: {}
};
ctx.stage.mount();
ctx.lab.mount();
ctx.settings.mount();
ctx.log.mount();
ctx.handlers.click = (e) => onClick(e);
ctx.handlers.input = (e) => ctx.settings.onInput(e);
ctx.handlers.change = (e) => ctx.settings.onChange(e);
ctx.handlers.key = (e) => ctx.lab.onKey(e);
root.addEventListener('click', ctx.handlers.click);
root.addEventListener('input', ctx.handlers.input);
root.addEventListener('change', ctx.handlers.change);
root.addEventListener('keydown', ctx.handlers.key);
ctx.unsub = store.subscribe(() => evaluate());
ctx.unsubAction = store.onAction((action, payload) => {
if (!ctx) return;
if (action === 'WIDGET_ROSTER') {
ctx.roster = Array.isArray(payload && payload.widgets) ? payload.widgets : [];
evaluate();
return;
}
if (action === 'SCENES_REFRESH_RESULT' || action === 'SCENES_ENSURE_RESULT') {
const p = payload || {};
ctx.busyUntil = Date.now() + 6000;
ctx._rosterSig = '';
ctx.toast.show(p.message || 'Готово', p.ok ? 'success' : 'error');
setTimeout(() => {
if (!ctx) return;
store.broadcastAction('ALERTS_REQUEST_STATE', {});
requestRoster();
}, 1400);
evaluate();
return;
}
if (!payload) return;
if (action === 'ALERTS_STATE') {
const source = payload.source === 'obs' ? 'obs' : 'preview';
ctx.live[source] = {
source,
enabled: payload.enabled !== false,
soundEnabled: payload.soundEnabled !== false,
queue: Number(payload.queue ?? 0),
playing: Boolean(payload.playing),
current: payload.current || null,
shown: Number(payload.shown ?? 0),
master: Boolean(payload.master),
channel: payload.channel || null,
ts: Number(payload.ts || Date.now())
};
if (source === 'obs') ctx.busyUntil = 0;
evaluate();
return;
}
if (action === 'ALERTS_EVENT') {
const key = `${payload.source}:${payload.id}`;
if (ctx.seen.has(key)) return;
ctx.seen.add(key);
if (ctx.seen.size > 500) ctx.seen.clear();
const obsFresh = obsStateFresh();
if (payload.source === 'preview' && obsFresh) return;
ctx.log.push(payload);
evaluate();
}
});
ctx.tick = setInterval(() => {
evaluate();
const now = Date.now();
if (now - ctx._lastRosterPoll >= ROSTER_POLL_MS) {
ctx._lastRosterPoll = now;
requestRoster();
}
}, 2000);
evaluate();
store.broadcastAction('ALERTS_REQUEST_STATE', {});
requestRoster();
ctx._lastRosterPoll = Date.now();
console.log('[AlertsDash] v3.1 смонтирован', params);
}

function onParamsChange(params) {
if (!ctx) return false;
return (params?.id || 'player') === 'alerts';
}

function unmount() {
if (!ctx) return;
console.log('[AlertsDash] Размонтирование');
if (ctx.unsub) ctx.unsub();
if (ctx.unsubAction) ctx.unsubAction();
if (ctx.tick) clearInterval(ctx.tick);
if (ctx.root && ctx.handlers) {
ctx.root.removeEventListener('click', ctx.handlers.click);
ctx.root.removeEventListener('input', ctx.handlers.input);
ctx.root.removeEventListener('change', ctx.handlers.change);
ctx.root.removeEventListener('keydown', ctx.handlers.key);
}
ctx.log.unmount();
ctx.settings.unmount();
ctx.lab.unmount();
ctx.stage.unmount();
ctx = null;
document.querySelectorAll('iframe#ad-preview-iframe').forEach(f => f.remove());
}