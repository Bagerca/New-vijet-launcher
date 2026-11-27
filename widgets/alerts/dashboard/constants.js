/* ФАЙЛ: widgets/alerts/dashboard/constants.js — v3 (каталог внутри: дашборд не зависит от types.js) */
import { icons } from '../../../js/utils/icons.js';

export const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const ALERT_DEFAULTS = { enabled: true, soundEnabled: true, volume: 40, duration: 5, scale: 100, position: 'top' };
export const ALERT_LIMITS = { volume: [0, 100], duration: [1, 30], scale: [60, 150] };
export const POSITIONS = [{ id: 'top', label: 'Сверху' }, { id: 'center', label: 'По центру' }, { id: 'bottom', label: 'Снизу' }];

export const ALERT_TYPES = [
{ id: 'follow', kind: 'standard', label: 'Фолловер', emoji: '💖', icon: null, color: '#ff69b4', sound: 'follow.mp3', live: true, valueLabel: null, defaultValue: 0, sample: { user: 'НовыйФолловер', message: '', value: 0 } },
{ id: 'sub', kind: 'standard', label: 'Подписка', emoji: '⭐', icon: null, color: '#00ff66', sound: 'sub.mp3', live: true, valueLabel: null, defaultValue: 0, sample: { user: 'СуперФанат', message: 'Обожаю твои стримы!', value: 0 } },
{ id: 'resub', kind: 'standard', label: 'Ресаб', emoji: '🔥', icon: null, color: '#ff4500', sound: 'resub.mp3', live: true, valueLabel: 'Месяцев подряд', defaultValue: 12, sample: { user: 'ОлдРесабер', message: 'Обожаю этот стрим!', value: 12 } },
{ id: 'gift', kind: 'standard', label: 'Подарок', emoji: '🎁', icon: null, color: '#ff007f', sound: 'gift.mp3', live: true, valueLabel: null, defaultValue: 0, sample: { user: 'Богач', message: 'для СлучайныйЗритель', value: 0 } },
{ id: 'streak', kind: 'standard', label: 'Стрик', emoji: '📺', icon: null, color: '#00e5ff', sound: 'streak.mp3', live: false, valueLabel: 'Стримов подряд', defaultValue: 5, sample: { user: 'ПреданныйЗритель', message: 'Смотрю каждый день!', value: 5 } },
{ id: 'cheer', kind: 'standard', label: 'Биты', emoji: '💎', icon: null, color: '#9146ff', sound: 'cheer.mp3', live: true, valueLabel: 'Битов', defaultValue: 100, sample: { user: 'Донатер', message: 'держись там!', value: 100 } },
{ id: 'raid', kind: 'standard', label: 'Рейд', emoji: '🚀', icon: null, color: '#00ff66', sound: 'raid.mp3', live: true, valueLabel: 'Зрителей', defaultValue: 42, sample: { user: 'ДружественныйСтример', message: '', value: 42 } },
{ id: 'reward_series', kind: 'reward', label: 'Сериал', emoji: null, icon: 'alert_series', color: '#a29bfe', sound: 'series.mp3', live: false, valueLabel: null, defaultValue: 0, sample: { user: 'Киноман', message: 'Во все тяжкие', value: 0 } },
{ id: 'reward_movie', kind: 'reward', label: 'Фильм', emoji: null, icon: 'alert_movie', color: '#fdcb6e', sound: 'movie.mp3', live: false, valueLabel: null, defaultValue: 0, sample: { user: 'Зритель', message: 'Гарри Поттер', value: 0 } },
{ id: 'reward_video', kind: 'reward', label: 'Видео', emoji: null, icon: 'alert_video', color: '#74b9ff', sound: 'video.mp3', live: false, valueLabel: null, defaultValue: 0, sample: { user: 'Кекус', message: 'Смешные коты', value: 0 } },
{ id: 'reward_game', kind: 'reward', label: 'Игра', emoji: null, icon: 'alert_game', color: '#55efc4', sound: 'game.mp3', live: false, valueLabel: null, defaultValue: 0, sample: { user: 'Геймер', message: 'Го в Доту?', value: 0 } },
{ id: 'reward_music', kind: 'reward', label: 'Музыка', emoji: null, icon: 'alert_music', color: '#ff7675', sound: 'music.mp3', live: false, valueLabel: null, defaultValue: 0, sample: { user: 'Меломан', message: 'Врубай фонк', value: 0 } }
];

export const LIVE_EVENTS = [
{ kind: 'follow', label: 'Фолловеры', note: 'по приросту счётчика, раз в минуту' },
{ kind: 'sub', label: 'Подписки', note: 'мгновенно из чата канала' },
{ kind: 'resub', label: 'Ресабы', note: 'с количеством месяцев' },
{ kind: 'gift', label: 'Подарки сабов', note: 'включая массовые раздачи' },
{ kind: 'cheer', label: 'Биты', note: 'с суммой доната' },
{ kind: 'raid', label: 'Рейды', note: 'с числом зрителей' }
];

export function isTrue(v) { return v === true || String(v) === 'true'; }
export function clampInt(v, min, max, fb) { const n = parseInt(v, 10); return isNaN(n) ? fb : Math.max(min, Math.min(max, n)); }
export function getType(id) { return ALERT_TYPES.find(t => t.id === String(id || '').toLowerCase()) || null; }
export const typeIcon = (t) => (t && t.icon ? ic(t.icon) : `<span class="ad-type-emoji">${esc((t && t.emoji) || '🔔')}</span>`);

export function normalizeAlertConfig(raw) {
const c = { ...ALERT_DEFAULTS, ...(raw || {}) };
const n = (k) => clampInt(c[k], ALERT_LIMITS[k][0], ALERT_LIMITS[k][1], ALERT_DEFAULTS[k]);
return {
enabled: c.enabled === undefined ? ALERT_DEFAULTS.enabled : isTrue(c.enabled),
soundEnabled: c.soundEnabled === undefined ? ALERT_DEFAULTS.soundEnabled : isTrue(c.soundEnabled),
volume: n('volume'), duration: n('duration'), scale: n('scale'),
position: POSITIONS.some(p => p.id === String(c.position)) ? String(c.position) : ALERT_DEFAULTS.position
};
}

export const LIVE_TTL = 14000;
export const WIDGET_W = 1920;
export const WIDGET_H = 1080;
export const LOG_KEY = 'ad_alerts_log_v1';
export const LOG_MAX = 80;
export const ARM_MS = 3000;
export const STORM_GAP = 700;

export const CSS_VERSION = 'v3';
export const CSS_TIMEOUT = 3000;
export const CSS_FILES = [
{ id: 'ad-css-base', href: `widgets/alerts/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'ad-css-stage', href: `widgets/alerts/dashboard/styles/stage.css?v1` },
{ id: 'ad-css-panels', href: `widgets/alerts/dashboard/styles/panels.css?v1` }
];

export const TARGETS = [
{ id: 'preview', label: 'Превью', title: 'Только превью лаунчера — на стрим ничего не уйдёт' },
{ id: 'obs', label: 'OBS', title: 'Только OBS — на живой стрим' },
{ id: 'all', label: 'Везде', title: 'И превью, и OBS' }
];

export const PRESETS = [
{ id: 'follow', label: 'Фолловер', type: 'follow', user: 'ksusha_fan', message: '', value: 0 },
{ id: 'sub', label: 'Подписка', type: 'sub', user: 'СуперФанат', message: 'Обожаю твои стримы!', value: 0 },
{ id: 'resub', label: 'Ресаб ×24', type: 'resub', user: 'ОлдРесабер', message: 'Два года вместе!', value: 24 },
{ id: 'gift', label: 'Подарок', type: 'gift', user: 'Богач', message: 'для СлучайныйЗритель', value: 0 },
{ id: 'cheer', label: 'Биты ×500', type: 'cheer', user: 'Донатер', message: 'держись там!', value: 500 },
{ id: 'raid', label: 'Рейд ×42', type: 'raid', user: 'ДружественныйСтример', message: '', value: 42 },
{ id: 'game', label: 'Заказ игры', type: 'reward_game', user: 'Геймер', message: 'Го в Доту?', value: 0 }
];

export const STORM = [
{ type: 'follow', user: 'fast_one', message: '', value: 0 },
{ type: 'sub', user: 'loyal_sub', message: 'первый саб на стриме!', value: 0 },
{ type: 'gift', user: 'Богач', message: 'для night_fox', value: 0 },
{ type: 'cheer', user: 'bit_lord', message: 'на удачу', value: 250 },
{ type: 'raid', user: 'stream_friend', message: '', value: 37 }
];

export const COMMANDS = [
{ cmd: '!alerts', copy: '!alerts on', title: 'Показать / скрыть оповещения: on, off' },
{ cmd: '!alert', copy: '!alert sub', title: 'Тест: follow, sub, resub, gift, streak, cheer, raid, series, movie, video, game, music' },
{ cmd: '!alertvol', copy: '!alertvol 40', title: 'Громкость звука (0–100)' },
{ cmd: '!alertdur', copy: '!alertdur 5', title: 'Длительность показа в секундах (1–30)' }
];

export function setText(id, value) {
const el = document.getElementById(id);
const next = String(value);
if (el && el.textContent !== next) el.textContent = next;
}
export function val(id, fb = '') { const el = document.getElementById(id); return el ? el.value : fb; }
export function paintRange(input) {
if (!input) return;
const min = Number(input.min || 0);
const max = Number(input.max || 100);
const value = Number(input.value);
const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, pct)).toFixed(2)}%`);
}
export function alertsOf(state) { return state.config.widgets.alerts || {}; }