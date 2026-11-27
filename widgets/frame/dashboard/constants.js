/* ФАЙЛ: widgets/frame/dashboard/constants.js — v1 (общие данные дашборда рамки и лисы) */
import { icons } from '../../../js/utils/icons.js';

export const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const LIVE_TTL = 12000;
export const WIDGET_W = 1400;
export const WIDGET_H = 850;
export const CAM_W = 1280;
export const CAM_H = 720;
export const BRAND_1 = '#00ff66';
export const BRAND_2 = '#ff007f';
export const SLEEP_MIN = 5;
export const SLEEP_MAX = 3600;
export const SLEEP_RANGE_MAX = 300;
export const DUR_MIN = 2;
export const DUR_MAX = 15;

export const CSS_VERSION = 'v1';
export const CSS_TIMEOUT = 3000;
export const CSS_FILES = [
{ id: 'fd-css-base', href: `widgets/frame/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'fd-css-stage', href: `widgets/frame/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'fd-css-panels', href: `widgets/frame/dashboard/styles/panels.css?${CSS_VERSION}` }
];

export const PRESETS = [
{ id: 'acid', title: 'Кислота', c1: '#00ff66', c2: '#ff007f' },
{ id: 'cyber', title: 'Киберпанк', c1: '#00e5ff', c2: '#ff007f' },
{ id: 'sunset', title: 'Закат', c1: '#ff6a00', c2: '#ee0979' },
{ id: 'matrix', title: 'Матрица', c1: '#00ff66', c2: '#00e5ff' },
{ id: 'lava', title: 'Лава', c1: '#ff0050', c2: '#ff8c00' },
{ id: 'ice', title: 'Лёд', c1: '#00e5ff', c2: '#6a11cb' }
];

export const EMOTIONS = [
{ id: 'idle', label: 'Покой', emoji: '🦊' },
{ id: 'sleep', label: 'Сон', emoji: '💤' },
{ id: 'alert', label: 'Тревога', emoji: '❗' },
{ id: 'hype', label: 'Хайп', emoji: '🔥' },
{ id: 'love', label: 'Любовь', emoji: '💖' },
{ id: 'scared', label: 'Испуг', emoji: '😱' },
{ id: 'angry', label: 'Злость', emoji: '😠' },
{ id: 'greet', label: 'Привет', emoji: '👋' },
{ id: 'bye', label: 'Пока', emoji: '💜' },
{ id: 'jam', label: 'Танец', emoji: '🎵' },
{ id: 'listen', label: 'Слух', emoji: '👂' },
{ id: 'nom', label: 'Ням', emoji: '🍪' }
];

export const EMOTION_LABELS = EMOTIONS.reduce((acc, e) => { acc[e.id] = e.label; return acc; }, { off: 'выключена' });

export const FRAME_COMMANDS = [
{ cmd: '!color1', copy: '!color1 00ff66', title: 'Первый цвет градиента: hex без решётки' },
{ cmd: '!color2', copy: '!color2 ff007f', title: 'Второй цвет градиента: hex без решётки' },
{ cmd: '!frame', copy: '!frame on', title: 'Показать / скрыть рамку: on, off (вместе с лисой)' }
];

export const PET_COMMANDS = [
{ cmd: '!peton', copy: '!peton on', title: 'Показать / скрыть лису: on, off' },
{ cmd: '!petsleep', copy: '!petsleep 120', title: 'Через сколько секунд тишины лиса засыпает (5–3600)' },
{ cmd: '!petfeed', copy: '!petfeed Покормить лису', title: 'Название награды за баллы, которая кормит лису' },
{ cmd: '!petvip', copy: '!petvip bagercaa, to_be_ang', title: 'VIP-зрители через запятую — лиса им радуется' },
{ cmd: '!petban', copy: '!petban слово1, слово2', title: 'Бан-слова через запятую — лиса злится' },
{ cmd: '!fox', copy: '!fox jam', title: 'Эмоция из чата: idle, sleep, alert, hype, love, scared, angry, greet, bye, jam, listen, nom' }
];

export function isTrue(v) { return v === true || String(v) === 'true'; }

export function normalizeHex(value, fallback) {
let h = String(value ?? '').trim();
if (!h) return fallback;
if (!h.startsWith('#')) h = '#' + h;
if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : fallback;
}

export function clampInt(value, min, max, fallback) {
const n = parseInt(value, 10);
if (isNaN(n)) return fallback;
return Math.max(min, Math.min(max, n));
}

export function splitList(value) {
return String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

export function setText(id, value) {
const el = document.getElementById(id);
const next = String(value);
if (el && el.textContent !== next) el.textContent = next;
}

export function paintRange(input) {
if (!input) return;
const min = Number(input.min || 0);
const max = Number(input.max || 100);
const val = Number(input.value);
const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, pct)).toFixed(2)}%`);
}

export function frameOf(state) { return state.config.widgets.frame || {}; }
export function petOf(state) { return state.config.widgets.pet || {}; }

export function frameVisible(conf) {
return conf.isVisible === undefined ? true : isTrue(conf.isVisible);
}
export function petEnabled(conf) {
return conf.enabled === undefined ? true : isTrue(conf.enabled);
}

/** Случайная неоновая пара: два разнесённых по кругу оттенка. */
export function randomPair() {
const h1 = Math.floor(Math.random() * 360);
const h2 = (h1 + 120 + Math.floor(Math.random() * 100)) % 360;
const toHex = (h) => {
const s = 0.92, l = 0.55;
const a = s * Math.min(l, 1 - l);
const f = (n) => {
const k = (n + h / 30) % 12;
const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
return Math.round(255 * c).toString(16).padStart(2, '0');
};
return `#${f(0)}${f(8)}${f(4)}`;
};
return { c1: toHex(h1), c2: toHex(h2) };
}