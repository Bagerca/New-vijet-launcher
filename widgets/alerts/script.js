/* ФАЙЛ: widgets/alerts/script.js — v4.1 (самодостаточный; телеметрия уходит сразу после открытия WS) */
import { WidgetCore } from '../shared/WidgetCore.js';
import { icons } from '../../js/utils/icons.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get('preview') === '1';
const DEBUG = PARAMS.get('debug') === '1';
const SOURCE = IS_PREVIEW ? 'preview' : 'obs';
const HEARTBEAT_MS = 4000;
const OUT_MS = 500;
const QUEUE_MAX = 50;

const DEFAULTS = { enabled: true, soundEnabled: true, volume: 40, duration: 5, scale: 100, position: 'top' };
const LIMITS = { volume: [0, 100], duration: [1, 30], scale: [60, 150] };
const POSITIONS = ['top', 'center', 'bottom'];

const TYPES = [
{ id: 'follow', kind: 'standard', emoji: '💖', color: '#ff69b4', sound: 'follow.mp3', chat: 'follow', phrase: 'отслеживает канал!', many: 'новых фолловеров!' },
{ id: 'sub', kind: 'standard', emoji: '⭐', color: '#00ff66', sound: 'sub.mp3', chat: 'sub', phrase: 'оформил подписку!' },
{ id: 'resub', kind: 'standard', emoji: '🔥', color: '#ff4500', sound: 'resub.mp3', chat: 'resub', phrase: 'с нами уже {v} мес.!' },
{ id: 'gift', kind: 'standard', emoji: '🎁', color: '#ff007f', sound: 'gift.mp3', chat: 'gift', phrase: 'подарил подписку!' },
{ id: 'streak', kind: 'standard', emoji: '📺', color: '#00e5ff', sound: 'streak.mp3', chat: 'streak', phrase: 'смотрит {v} стримов подряд!' },
{ id: 'cheer', kind: 'standard', emoji: '💎', color: '#9146ff', sound: 'cheer.mp3', chat: 'cheer', phrase: 'задонатил {v} битов!' },
{ id: 'raid', kind: 'standard', emoji: '🚀', color: '#00ff66', sound: 'raid.mp3', chat: 'raid', phrase: 'привёл {v} зрителей!' },
{ id: 'reward_series', kind: 'reward', icon: 'alert_series', color: '#a29bfe', sound: 'series.mp3', chat: 'series', badge: 'СЕРИАЛ' },
{ id: 'reward_movie', kind: 'reward', icon: 'alert_movie', color: '#fdcb6e', sound: 'movie.mp3', chat: 'movie', badge: 'ФИЛЬМ' },
{ id: 'reward_video', kind: 'reward', icon: 'alert_video', color: '#74b9ff', sound: 'video.mp3', chat: 'video', badge: 'ВИДЕО' },
{ id: 'reward_game', kind: 'reward', icon: 'alert_game', color: '#55efc4', sound: 'game.mp3', chat: 'game', badge: 'ИГРА' },
{ id: 'reward_music', kind: 'reward', icon: 'alert_music', color: '#ff7675', sound: 'music.mp3', chat: 'music', badge: 'МУЗЫКА' }
];

function isTrue(v) { return v === true || String(v) === 'true'; }
function clampInt(v, min, max, fb) { const n = parseInt(v, 10); return isNaN(n) ? fb : Math.max(min, Math.min(max, n)); }
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function typeOf(id) { return TYPES.find(t => t.id === String(id || '').toLowerCase()) || null; }
function typeByChat(arg) {
const a = String(arg || '').toLowerCase();
if (!a) return null;
return typeOf(a) || TYPES.find(t => t.chat === a) || null;
}
function normalize(raw) {
const c = { ...DEFAULTS, ...(raw || {}) };
const n = (k) => clampInt(c[k], LIMITS[k][0], LIMITS[k][1], DEFAULTS[k]);
return {
enabled: c.enabled === undefined ? DEFAULTS.enabled : isTrue(c.enabled),
soundEnabled: c.soundEnabled === undefined ? DEFAULTS.soundEnabled : isTrue(c.soundEnabled),
volume: n('volume'), duration: n('duration'), scale: n('scale'),
position: POSITIONS.includes(String(c.position)) ? String(c.position) : DEFAULTS.position
};
}
function phrase(t, value) {
if (!t || !t.phrase) return '';
const v = Math.max(0, parseInt(value, 10) || 0);
if (t.many && v > 1) return `${v} ${t.many}`;
return t.phrase.replace('{v}', String(v));
}

const Dbg = {
el: null,
init() {
if (!DEBUG) return;
this.el = document.createElement('div');
this.el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;padding:8px 12px;border-radius:10px;background:rgba(6,7,10,.9);border:1px solid #00ff66;color:#00ff66;font:700 12px/1.5 monospace;pointer-events:none;max-width:520px;';
document.body.appendChild(this.el);
this.set('загрузка…');
},
set(text) {
if (!this.el) return;
this.el.textContent = `ALERTS ${SOURCE} · ${text}`;
}
};

const AppAlerts = {
container: document.getElementById('alert-container'),
config: normalize({}),
queue: [],
current: null,
isPlaying: false,
shown: 0,
dropped: 0,
lastEventAt: 0,
seen: new Set(),
_outTimer: null,
_endTimer: null,
_lastSoundAt: 0,
_lastReport: 0,
_reportTimer: null,

applyConfig(raw) {
if (!this.container) return;
this.config = normalize(raw);
const c = this.config;
document.documentElement.style.setProperty('--alert-scale', (c.scale / 100).toFixed(3));
this.container.dataset.pos = c.position;
if (!c.enabled) this.reset(true);
this.report();
this.debug();
},

debug() {
if (!DEBUG) return;
const c = this.config;
Dbg.set(`enabled=${c.enabled} sound=${c.soundEnabled} queue=${this.queue.length} shown=${this.shown} master=${WidgetCore.isMaster} ws=${WidgetCore.ws ? WidgetCore.ws.readyState : 'null'}`);
},

_clearTimers() {
if (this._outTimer) { clearTimeout(this._outTimer); this._outTimer = null; }
if (this._endTimer) { clearTimeout(this._endTimer); this._endTimer = null; }
},

reset(dropQueue) {
this._clearTimers();
if (dropQueue) this.queue = [];
this.isPlaying = false;
this.current = null;
if (this.container) {
this.container.classList.remove('alert-in', 'alert-out');
this.container.classList.add('hidden');
this.container.innerHTML = '';
}
this.report();
},

add(user, type, message = '', value = 0, origin = 'test', eventId = null) {
if (eventId) {
if (this.seen.has(eventId)) return false;
this.seen.add(eventId);
if (this.seen.size > 400) this.seen.clear();
}
if (!this.config.enabled) {
this.dropped++;
console.warn('[Alerts] Событие отброшено: мастер-тумблер выключен.');
this.report();
return false;
}
const meta = typeOf(type);
if (!meta) { console.warn('[Alerts] Неизвестный тип:', type); return false; }
if (this.queue.length >= QUEUE_MAX) { this.dropped++; this.report(); return false; }
this.lastEventAt = Date.now();
this.queue.push({
id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
user: String(user || 'Зритель').substring(0, 40),
type: meta.id,
message: String(message || '').substring(0, 160),
value: Math.max(0, parseInt(value, 10) || 0),
origin
});
console.log(`[Alerts:${SOURCE}] Принято «${meta.id}» от ${user} (${origin}), очередь ${this.queue.length}`);
if (!this.isPlaying) this.playNext();
this.report();
return true;
},

playNext() {
if (!this.config.enabled) { this.reset(true); return; }
if (this.queue.length === 0) { this.isPlaying = false; this.current = null; this.report(); return; }
this.isPlaying = true;
this.render(this.queue.shift());
},

render(data) {
const meta = typeOf(data.type);
if (!meta || !this.container) { this.playNext(); return; }
this._clearTimers();
this.current = data;
const color = meta.color;
const user = esc(data.user);
const message = esc(data.message);
const isReward = meta.kind === 'reward';
const iconHtml = meta.icon && typeof icons[meta.icon] === 'function' ? icons[meta.icon]() : esc(meta.emoji || '🔔');
const title = isReward
? `<span class="alert-user" style="color: ${color}">${user}</span>`
: `<span class="alert-user" style="color: ${color}">${user}</span> ${esc(phrase(meta, data.value))}`;

this.container.style.setProperty('--alert-color', color);
this.container.style.setProperty('--alert-glow', `${color}55`);
this.container.innerHTML = isReward ? `
<div class="alert-card reward-card">
<div class="alert-icon-wrap reward-icon-wrap" style="border-color: ${color};"><div class="alert-icon reward-svg" style="color: ${color}; filter: drop-shadow(0 0 8px ${color});">${iconHtml}</div></div>
<div class="alert-info">
<div class="reward-badge" style="color: ${color};">ЗАКАЗ ЗА БАЛЛЫ: ${esc(meta.badge || '')}</div>
<div class="alert-title reward-title">${title}</div>
${message ? `<div class="alert-message reward-msg">"${message}"</div>` : ''}
</div>
</div>` : `
<div class="alert-card">
<div class="alert-icon-wrap"><div class="alert-icon" style="text-shadow: 0 0 15px ${color};">${iconHtml}</div></div>
<div class="alert-info">
<div class="alert-title">${title}</div>
${message ? `<div class="alert-message">"${message}"</div>` : ''}
</div>
</div>`;

this.container.classList.remove('hidden', 'alert-out', 'alert-in');
void this.container.offsetWidth;
this.container.classList.add('alert-in');

if (data.origin === 'live' && IS_PREVIEW) { /* живые события озвучивает только OBS */ }
else this.playSound(data.type);

this.shown++;
WidgetCore.sendAction('PET_EMOTION', { emotion: isReward ? 'hype' : 'love', duration: 4000 });
WidgetCore.sendAction('ALERTS_EVENT', {
source: SOURCE, id: data.id, type: data.type, user: data.user,
message: data.message, value: data.value, origin: data.origin, ts: Date.now()
});
this.report();
this.debug();

this._outTimer = setTimeout(() => {
this._outTimer = null;
if (!this.container) return;
this.container.classList.remove('alert-in');
this.container.classList.add('alert-out');
this._endTimer = setTimeout(() => {
this._endTimer = null;
if (this.container) {
this.container.classList.add('hidden');
this.container.classList.remove('alert-out');
this.container.innerHTML = '';
}
this.current = null;
this.isPlaying = false;
this.playNext();
}, OUT_MS);
}, this.config.duration * 1000);
},

skip() {
if (!this.isPlaying && !this.current) return false;
this._clearTimers();
if (this.container) {
this.container.classList.add('hidden');
this.container.classList.remove('alert-in', 'alert-out');
this.container.innerHTML = '';
}
this.current = null;
this.isPlaying = false;
this.playNext();
return true;
},

clearQueue() {
const n = this.queue.length;
this.queue = [];
console.log(`[Alerts] Очередь очищена: ${n}`);
this.report();
return n;
},

playSound(type) {
if (!this.config.soundEnabled || this.config.volume <= 0) return;
if (document.hidden) return;
const now = Date.now();
if (now - this._lastSoundAt < 100) return;
this._lastSoundAt = now;
const meta = typeOf(type);
const path = `../../data/sounds/${meta ? meta.sound : 'sub.mp3'}`;
try {
const audio = new Audio(path);
audio.volume = Math.max(0, Math.min(1, this.config.volume / 100));
audio.onerror = () => console.warn('[Alerts] Нет файла звука:', path);
audio.onended = () => { audio.src = ''; };
audio.play().catch(e => console.warn('[Alerts] Звук не проигрался:', e && e.message));
} catch (e) { console.warn('[Alerts] Audio не создан:', e); }
},

report(force) {
const now = Date.now();
if (!force && now - this._lastReport < 300) {
if (this._reportTimer) return;
this._reportTimer = setTimeout(() => { this._reportTimer = null; this.report(true); }, 320);
return;
}
this._lastReport = now;
WidgetCore.sendAction('ALERTS_STATE', {
source: SOURCE,
enabled: this.config.enabled,
soundEnabled: this.config.soundEnabled,
volume: this.config.volume,
duration: this.config.duration,
scale: this.config.scale,
position: this.config.position,
playing: this.isPlaying,
queue: this.queue.length,
current: this.current ? { type: this.current.type, user: this.current.user } : null,
shown: this.shown,
dropped: this.dropped,
master: WidgetCore.isMaster,
channel: WidgetCore.currentChannel || null,
lastEventAt: this.lastEventAt,
ts: now
});
this.debug();
},

handleAction(action, payload = {}) {
if (action === 'ALERTS_REQUEST_STATE') { this.report(true); return; }
if (action === 'ALERTS_SKIP') { this.skip(); return; }
if (action === 'ALERTS_CLEAR') { this.clearQueue(); return; }
if (action === 'TEST_ALERT' || action === 'ALERTS_EMIT') {
const target = String(payload.target || 'all').toLowerCase();
if (target !== 'all' && target !== SOURCE) return;
this.add(payload.user, payload.type, payload.message, payload.value, 'test', payload.emitId || null);
return;
}
if (action === 'TWITCH_EVENT') {
this.add(payload.user, payload.kind, payload.message, payload.value, 'live', payload.eventId || null);
}
},

handleEvent(kind, payload = {}) {
this.add(payload.user, kind, payload.message, payload.value, 'live', payload.eventId || null);
},

handleChat(cmd, args) {
if (!WidgetCore.isMaster) return;
if (cmd === '!alert') {
const t = typeByChat(args[0]);
if (!t) return;
this.add('ТестИзЧата', t.id, '', t.id === 'resub' ? 12 : (t.id === 'cheer' ? 100 : 0), 'chat');
return;
}
const conf = { ...(WidgetCore.globalConfig?.widgets?.alerts || {}) };
if (cmd === '!alerts') {
const a = (args[0] || '').toLowerCase();
const cur = conf.enabled === undefined ? true : isTrue(conf.enabled);
conf.enabled = a === 'on' ? true : (a === 'off' ? false : !cur);
WidgetCore.updateWidgetConfig('alerts', conf);
return;
}
if (cmd === '!alertvol') {
const v = clampInt(args[0], 0, 100, NaN);
if (!isNaN(v)) WidgetCore.updateWidgetConfig('alerts', { volume: v });
return;
}
if (cmd === '!alertdur') {
const v = clampInt(args[0], 1, 30, NaN);
if (!isNaN(v)) WidgetCore.updateWidgetConfig('alerts', { duration: v });
}
}
};

Dbg.init();

window.addEventListener('error', (e) => {
console.error('[Alerts] Необработанная ошибка:', e.message);
Dbg.set('ОШИБКА: ' + e.message);
});
window.addEventListener('unhandledrejection', (e) => {
console.error('[Alerts] Отклонённый промис:', e.reason);
});

if (!AppAlerts.container) {
console.error('[Alerts] В DOM нет #alert-container — проверь widgets/alerts/index.html');
Dbg.set('НЕТ КОНТЕЙНЕРА');
} else {
WidgetCore.init({
widgetId: 'alerts',
source: SOURCE,
onConfigUpdate: (config) => {
if (config?.widgets?.alerts) AppAlerts.applyConfig(config.widgets.alerts);
},
onSocketOpen: () => AppAlerts.report(true),
onTwitchEvent: (kind, payload) => AppAlerts.handleEvent(kind, payload),
onWidgetAction: (action, payload) => AppAlerts.handleAction(action, payload),
onTwitchCommand: (cmd, args) => AppAlerts.handleChat(cmd, args)
});
setInterval(() => AppAlerts.report(true), HEARTBEAT_MS);
setTimeout(() => AppAlerts.report(true), 500);
setTimeout(() => AppAlerts.report(true), 2500);
if (DEBUG) setTimeout(() => AppAlerts.add('DebugUser', 'sub', 'Виджет жив и рендерит', 0, 'test'), 900);
console.log(`[Alerts] v4.1 запущен (${SOURCE}). Каталог встроен, внешних зависимостей нет.`);
}