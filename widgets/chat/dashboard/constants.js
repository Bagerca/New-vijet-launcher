/* ФАЙЛ: widgets/chat/dashboard/constants.js — v3 (CSS v5: режим ширины бабла) */
import { icons } from '../../../js/utils/icons.js';
export const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const LIVE_TTL = 14000;
export const LOG_KEY = 'cd_chat_log_v1';
export const LOG_MAX = 80;
export const ARM_MS = 3000;
export const WIDGET_W = 540, WIDGET_H = 1040;
export const SCENE_W = 1920, SCENE_H = 1080, OBS_X = 1380;
export const COLORS = ['#ff4d85', '#00e5ff', '#00ff66', '#ff8c00', '#9146ff', '#ffd166', '#ff0050', '#24a1de'];
export const EMOTE_CHIPS = ['Kappa', 'LUL', 'Keepo', 'Kreygasm', 'BibleThump', 'WutFace', 'HeyGuys', 'SeemGood'];
export const PRESETS = [
{ id: 'plain', label: 'Обычное', data: { user: 'zloy_kot', color: '#00e5ff', text: 'привет, го катку' } },
{ id: 'emotes', label: 'Смайлы', data: { user: 'emote_lord', color: '#ff8c00', text: 'Kappa LUL это было легендарно Kreygasm' } },
{ id: 'reply', label: 'Ответ', data: { user: 'ksusha__sher', color: '#ff4d85', text: 'да, сегодня до победы', reply: { user: 'zloy_kot', color: '#00e5ff', text: 'го катку сегодня?' } } },
{ id: 'first', label: 'Первое', data: { user: 'new_viewer', color: '#7cff6b', text: 'впервые на стриме, всем привет!', first: true } },
{ id: 'highlight', label: 'Хайлайт', data: { user: 'big_fan', color: '#ffd166', text: 'лучший стрим за месяц, спасибо тебе!', highlighted: true } },
{ id: 'mod', label: 'Модератор', data: { user: 'mod_helper', color: '#00ad03', text: 'напоминаю про правила в описании', badges: { mod: true } } },
{ id: 'sub', label: 'Саб', data: { user: 'loyal_sub', color: '#9146ff', text: '12 месяцев с тобой Keepo', badges: { subscriber: true, founder: true } } },
{ id: 'long', label: 'Лонгрид', data: { user: 'story_teller', color: '#ff6b9d', text: 'я вчера играл до четырёх утра и потом не мог уснуть, прокручивал в голове тот клатч на миде, где ты вытащила один в три. Пересматривал клип раз десять подряд, это было невероятно.' } },
{ id: 'command', label: 'Команда', data: { user: 'music_fan', color: '#c0c0c8', text: '!play https://youtu.be/dQw4w9WgXcQ' } },
{ id: 'photo', label: 'Фото', data: { user: 'BAGERcaa', color: '#ff0050', text: 'https://img.hishi.icu/post/niqPWkJ6QOu2FgNTQmllpQ', badges: { mod: true } } },
{ id: 'photoText', label: 'Фото+текст', data: { user: 'BAGERcaa', color: '#ff0050', text: 'смотрите что нашёл https://img.hishi.icu/post/niqPWkJ6QOu2FgNTQmllpQ', badges: { mod: true } } }
];
export const STORM = [
{ user: 'fast_one', color: '#00e5ff', text: 'первый нах Kappa' },
{ user: 'night_fox', color: '#ff8c00', text: 'ахахах что это было LUL' },
{ user: 'slowpoke', color: '#00ff66', text: 'я только зашёл, что пропустил?' },
{ user: 'emote_god', color: '#9146ff', text: 'Kreygasm Kreygasm Kreygasm' },
{ user: 'kind_soul', color: '#ffd166', text: 'лучший стрим, спасибо за вечер', highlighted: true },
{ user: 'new_face', color: '#7cff6b', text: 'всем привет, я новенький', first: true },
{ user: 'mod_helper', color: '#00ad03', text: 'правила в описании, не спамим', badges: { mod: true } },
{ user: 'loyal_sub', color: '#e005b9', text: '12 месяцев вместе Keepo', badges: { subscriber: true } }
];
export const COMMANDS = [
{ cmd: '!chat', copy: '!chat on', title: 'Показать / скрыть чат: on, off' },
{ cmd: '!chatskin', copy: '!chatskin neon', title: 'Скин бабла (включая персональные из реестра)' },
{ cmd: '!chatlife', copy: '!chatlife 30', title: 'Время жизни сообщения (0 — всегда)' },
{ cmd: '!chatmax', copy: '!chatmax 10', title: 'Максимум сообщений в кадре' },
{ cmd: '!chatsz', copy: '!chatsz 22', title: 'Размер текста' },
{ cmd: '!chatbg', copy: '!chatbg ffffff', title: 'Цвет фона бабла' },
{ cmd: '!chatop', copy: '!chatop 90', title: 'Плотность фона, %' },
{ cmd: '!chatc', copy: '!chatc 2c2c2e', title: 'Цвет текста' },
{ cmd: '!chatpause', copy: '!chatpause on', title: 'Пауза потока' },
{ cmd: '!chatclear', copy: '!chatclear', title: 'Очистить чат на экране' }
];
export const CSS_VERSION = 'v5';
export const CSS_TIMEOUT = 3000;
export const CSS_FILES = [
{ id: 'cd-css-base', href: `widgets/chat/dashboard/styles/base.css?${CSS_VERSION}` },
{ id: 'cd-css-stage', href: `widgets/chat/dashboard/styles/stage.css?${CSS_VERSION}` },
{ id: 'cd-css-panels', href: `widgets/chat/dashboard/styles/panels.css?${CSS_VERSION}` },
{ id: 'cd-css-bubble', href: `widgets/chat/bubble.css?${CSS_VERSION}` }
];
export function unitFor(k) {
if (['bgOpacity', 'shadow', 'emoteScale', 'lineHeight', 'avatarScale'].includes(k)) return '%';
if (k === 'messageLife') return 'с';
if (k === 'maxMessages') return '';
return 'px';
}
export function setText(id, v) {
const el = document.getElementById(id);
const next = String(v);
if (el && el.textContent !== next) el.textContent = next;
}
export function val(id, fb = '') { const el = document.getElementById(id); return el ? el.value : fb; }
export function checked(id) { const el = document.getElementById(id); return Boolean(el && el.checked); }