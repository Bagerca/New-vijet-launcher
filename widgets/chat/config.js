/* ФАЙЛ: widgets/chat/config.js — v5 (widthMode: бабл по тексту или фиксированной ширины) */
import { isKnownSkin, normalizeSkinId } from './skins.js';
export const CHAT_DEFAULTS = {
isActive: true, skin: 'glass', accentMode: 'user', accentColor: '#ff4d85',
bgColor: '#ffffff', bgOpacity: 95, textColor: '#2c2c2e', font: 'display',
fontSize: 20, nickSize: 16, avatarScale: 130, avatarShape: 'circle', uppercaseNick: false,
radius: 18, padding: 14, gap: 14, width: 500, widthMode: 'fit', borderWidth: 1, blur: 16, shadow: 60,
emoteScale: 100, lineHeight: 145,
showAvatars: true, showBadges: true, badgeStyle: 'pill', showTimestamps: true,
showReplies: true, replyStyle: 'bar', animation: 'rise', direction: 'bottom', fadeMask: true,
messageLife: 0, maxMessages: 12, hideCommands: true, allowMode: 'all',
blockedUsers: 'moobot, nightbot, streamelements, sery_bot', blockedWords: '',
paused: false, userSkins: {},
showImages: true, imageMaxHeight: 280, imageFit: 'contain', imageAllHosts: true,
imageHosts: 'img.hishi.icu, i.imgur.com, imgur.com, cdn.discordapp.com, media.discordapp.net, pbs.twimg.com, i.ibb.co, postimg.cc, tenor.com, media.tenor.com, giphy.com, media.giphy.com, i.redd.it, cdn.7tv.app'
};
export const CHAT_LIMITS = {
bgOpacity: [0, 100], fontSize: [12, 32], nickSize: [10, 26], avatarScale: [80, 300],
radius: [0, 32], padding: [6, 28], gap: [2, 32], width: [280, 640],
borderWidth: [0, 4], blur: [0, 40], shadow: [0, 100], emoteScale: [60, 200],
lineHeight: [110, 190], messageLife: [0, 300], maxMessages: [3, 60],
imageMaxHeight: [80, 480]
};
export const CHAT_FONTS = [
{ id: 'display', label: 'Montserrat', stack: "'Montserrat', 'Segoe UI', sans-serif" },
{ id: 'system', label: 'Системный', stack: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
{ id: 'mono', label: 'Моно', stack: "ui-monospace, 'JetBrains Mono', Consolas, monospace" }
];
export const CHAT_ANIMATIONS = [
{ id: 'rise', label: 'Всплытие' }, { id: 'fade', label: 'Растворение' },
{ id: 'slide', label: 'Слайд' }, { id: 'pop', label: 'Поп' }, { id: 'none', label: 'Без' }
];
export const CHAT_REPLY_STYLES = [{ id: 'bar', label: 'Полоса' }, { id: 'card', label: 'Карточка' }, { id: 'quote', label: 'Цитата' }];
export const CHAT_BADGE_STYLES = [{ id: 'pill', label: 'Плашки' }, { id: 'dot', label: 'Точки' }];
export const CHAT_AVATAR_SHAPES = [{ id: 'circle', label: 'Круг' }, { id: 'squircle', label: 'Сквиркл' }, { id: 'square', label: 'Квадрат' }];
export const CHAT_IMAGE_FITS = [{ id: 'contain', label: 'Целиком' }, { id: 'cover', label: 'Кроп' }];
export const CHAT_WIDTH_MODES = [{ id: 'fit', label: 'По тексту' }, { id: 'fixed', label: 'Фиксированная' }];
export const CHAT_ALLOW_MODES = [
{ id: 'all', label: 'Все зрители' }, { id: 'vip', label: 'VIP, сабы и модеры' },
{ id: 'subs', label: 'Сабы и модеры' }, { id: 'mods', label: 'Только модераторы' }
];
export const CHAT_DIRECTIONS = [{ id: 'bottom', label: 'Снизу вверх' }, { id: 'top', label: 'Сверху вниз' }];
export const CHAT_ACCENT_MODES = [{ id: 'user', label: 'Цвет ника' }, { id: 'fixed', label: 'Свой акцент' }];
export function isTrue(v) { return v === true || String(v) === 'true'; }
export function toInt(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function normalizeHex(value, fallback) {
let h = String(value || '').trim();
if (!h) return fallback;
if (!h.startsWith('#')) h = '#' + h;
if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : fallback;
}
export function hexToRgb(hex) {
const h = normalizeHex(hex, '#ff4d85').slice(1);
return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
export function rgbString(hex) { const c = hexToRgb(hex); return `${c.r}, ${c.g}, ${c.b}`; }
export function rgba(hex, alpha) {
const c = hexToRgb(hex);
return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(Number(alpha), 0, 1).toFixed(3)})`;
}
export function shiftHue(hex, degrees = 140) {
const c = hexToRgb(hex);
const r = c.r / 255, g = c.g / 255, b = c.b / 255;
const max = Math.max(r, g, b), min = Math.min(r, g, b);
const l = (max + min) / 2, d = max - min;
let h = 0, s = 0;
if (d !== 0) {
s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
else if (max === g) h = (b - r) / d + 2;
else h = (r - g) / d + 4;
h /= 6;
}
h = (h + degrees / 360 + 1) % 1;
s = Math.max(0.55, Math.min(1, s * 1.05));
const ll = Math.max(0.42, Math.min(0.68, l));
const hue = (p, q, t) => {
if (t < 0) t += 1;
if (t > 1) t -= 1;
if (t < 1 / 6) return p + (q - p) * 6 * t;
if (t < 1 / 2) return q;
if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
return p;
};
const q = ll < 0.5 ? ll * (1 + s) : ll + s - ll * s;
const p = 2 * ll - q;
const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
return `#${to(hue(p, q, h + 1 / 3))}${to(hue(p, q, h))}${to(hue(p, q, h - 1 / 3))}`;
}
export function fontStack(id) {
const f = CHAT_FONTS.find(x => x.id === id);
return (f || CHAT_FONTS[0]).stack;
}
export function splitList(value) {
if (Array.isArray(value)) return value.map(v => String(v).trim().toLowerCase()).filter(Boolean);
return String(value || '').split(/[,;\n]/).map(v => v.trim().toLowerCase()).filter(Boolean);
}
/** userSkins v2: "nick": "skinId" (legacy) ИЛИ "nick": { skin, accent?, params? }. */
export function normalizeUserSkins(raw) {
let src = raw;
if (typeof raw === 'string') { try { src = JSON.parse(raw); } catch (e) { src = {}; } }
if (!src || typeof src !== 'object' || Array.isArray(src)) return {};
const out = {};
let n = 0;
for (const key of Object.keys(src)) {
if (n >= 60) break;
const nick = String(key).trim().toLowerCase();
if (!nick) continue;
const v = src[key];
if (typeof v === 'string') {
const id = v.toLowerCase();
if (!isKnownSkin(id)) continue;
out[nick] = id;
} else if (v && typeof v === 'object' && !Array.isArray(v)) {
const id = String(v.skin || '').toLowerCase();
if (!isKnownSkin(id)) continue;
const entry = { skin: id };
const accent = normalizeHex(v.accent, null);
if (accent) entry.accent = accent;
if (v.params && typeof v.params === 'object' && !Array.isArray(v.params)) entry.params = { ...v.params };
out[nick] = entry;
} else continue;
n++;
}
return out;
}
/** Миграция avatarSize (px) → avatarScale (% от ника). Старый дефолт 34px → новый дефолт 130%. */
function resolveAvatarScale(rawObj, nickSize) {
if (rawObj.avatarScale !== undefined && rawObj.avatarScale !== null && rawObj.avatarScale !== '') {
return clamp(toInt(rawObj.avatarScale, CHAT_DEFAULTS.avatarScale), CHAT_LIMITS.avatarScale[0], CHAT_LIMITS.avatarScale[1]);
}
if (rawObj.avatarSize !== undefined) {
const px = toInt(rawObj.avatarSize, 34);
if (px === 34) return CHAT_DEFAULTS.avatarScale;
return clamp(Math.round((px / Math.max(1, nickSize)) * 100), CHAT_LIMITS.avatarScale[0], CHAT_LIMITS.avatarScale[1]);
}
return CHAT_DEFAULTS.avatarScale;
}
export function normalizeChatConfig(raw) {
const rawObj = raw || {};
const c = { ...CHAT_DEFAULTS, ...rawObj };
const n = (k) => clamp(toInt(c[k], CHAT_DEFAULTS[k]), CHAT_LIMITS[k][0], CHAT_LIMITS[k][1]);
const pick = (v, list, fb) => list.includes(String(v)) ? String(v) : fb;
const bool = (k) => c[k] === undefined ? CHAT_DEFAULTS[k] : isTrue(c[k]);
const nickSize = n('nickSize');
return {
isActive: bool('isActive'),
skin: normalizeSkinId(c.skin),
accentMode: pick(c.accentMode, ['user', 'fixed'], 'user'),
accentColor: normalizeHex(c.accentColor, CHAT_DEFAULTS.accentColor),
bgColor: normalizeHex(c.bgColor, CHAT_DEFAULTS.bgColor),
bgOpacity: n('bgOpacity'),
textColor: normalizeHex(c.textColor, CHAT_DEFAULTS.textColor),
font: pick(c.font, ['display', 'system', 'mono'], 'display'),
fontSize: n('fontSize'), nickSize,
avatarScale: resolveAvatarScale(rawObj, nickSize),
avatarShape: pick(c.avatarShape, ['circle', 'squircle', 'square'], 'circle'),
uppercaseNick: isTrue(c.uppercaseNick),
radius: n('radius'), padding: n('padding'), gap: n('gap'), width: n('width'),
widthMode: pick(c.widthMode, ['fit', 'fixed'], 'fit'),
borderWidth: n('borderWidth'), blur: n('blur'), shadow: n('shadow'),
emoteScale: n('emoteScale'), lineHeight: n('lineHeight'),
showAvatars: bool('showAvatars'), showBadges: bool('showBadges'),
badgeStyle: pick(c.badgeStyle, ['pill', 'dot'], 'pill'),
showTimestamps: bool('showTimestamps'), showReplies: bool('showReplies'),
replyStyle: pick(c.replyStyle, ['bar', 'card', 'quote'], 'bar'),
animation: pick(c.animation, ['rise', 'fade', 'slide', 'pop', 'none'], 'rise'),
direction: pick(c.direction, ['bottom', 'top'], 'bottom'),
fadeMask: bool('fadeMask'),
messageLife: n('messageLife'), maxMessages: n('maxMessages'),
hideCommands: bool('hideCommands'),
allowMode: pick(c.allowMode, ['all', 'vip', 'subs', 'mods'], 'all'),
blockedUsers: String(c.blockedUsers ?? CHAT_DEFAULTS.blockedUsers),
blockedWords: String(c.blockedWords ?? ''),
paused: isTrue(c.paused),
userSkins: normalizeUserSkins(c.userSkins),
showImages: bool('showImages'),
imageMaxHeight: n('imageMaxHeight'),
imageFit: pick(c.imageFit, ['contain', 'cover'], 'contain'),
imageAllHosts: bool('imageAllHosts'),
imageHosts: String(c.imageHosts ?? CHAT_DEFAULTS.imageHosts)
};
}
/** Аватар в px, вычисленный из соотношения к нику. */
export function avatarPx(c) {
return clamp(Math.round(c.nickSize * c.avatarScale / 100), 8, 80);
}
export function avatarRadius(shape, size) {
if (shape === 'square') return '4px';
if (shape === 'squircle') return `${Math.round(size * 0.32)}px`;
return '50%';
}
export function chatTokens(c) {
const av = avatarPx(c);
return {
'--chat-width': `${c.width}px`,
'--chat-font-size': `${c.fontSize}px`,
'--chat-nick-size': `${c.nickSize}px`,
'--chat-avatar': `${av}px`,
'--chat-avatar-radius': avatarRadius(c.avatarShape, av),
'--chat-radius': `${c.radius}px`,
'--chat-pad': `${c.padding}px`,
'--chat-gap': `${c.gap}px`,
'--chat-border': `${c.borderWidth}px`,
'--chat-blur': `${c.blur}px`,
'--chat-shadow': (c.shadow / 100).toFixed(2),
'--chat-bg': rgba(c.bgColor, c.bgOpacity / 100),
'--chat-text': c.textColor,
'--chat-accent': c.accentColor,
'--chat-accent-rgb': rgbString(c.accentColor),
'--chat-line': (c.lineHeight / 100).toFixed(2),
'--emote-scale': (c.emoteScale / 100).toFixed(2),
'--chat-font': fontStack(c.font),
'--chat-img-max': `${c.imageMaxHeight}px`,
'--chat-img-fit': c.imageFit
};
}
export function tokensToStyle(tokens) {
return Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(';');
}
export function chatFlags(c) {
return {
'data-avatars': c.showAvatars ? 'on' : 'off',
'data-badges': c.showBadges ? 'on' : 'off',
'data-badge-style': c.badgeStyle,
'data-time': c.showTimestamps ? 'on' : 'off',
'data-replies': c.showReplies ? 'on' : 'off',
'data-reply': c.replyStyle,
'data-anim': c.animation,
'data-upper': c.uppercaseNick ? 'on' : 'off',
'data-dir': c.direction,
'data-images': c.showImages ? 'on' : 'off',
'data-width': c.widthMode
};
}