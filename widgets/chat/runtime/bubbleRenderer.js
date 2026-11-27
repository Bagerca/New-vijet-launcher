/* ФАЙЛ: widgets/chat/runtime/bubbleRenderer.js — v4 (data-media для режима ширины + image-proxy для страниц расширений) */
import { AvatarManager } from '../../shared/AvatarManager.js';
import { icons } from '../../../js/utils/icons.js';
import { rgbString, shiftHue } from '../config.js';
import { getSkin, resolvePersonal, ensureSkinCss, DEFAULT_SKIN } from '../skins.js';
import { esc, BADGE_DEFS } from './messageSource.js';
const effectCleanups = new WeakMap();
const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const PROXY_BASE = (() => {
try {
if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
return `${window.location.protocol}//${window.location.host}/api/imgproxy`;
}
} catch (e) {}
return 'http://localhost:42069/api/imgproxy';
})();
const proxyUrl = (u) => `${PROXY_BASE}?url=${encodeURIComponent(u)}`;
/** Безопасные HTML-фрагменты для шаблонов (custom-скины собирают из них свою структуру). */
export function buildBubbleParts(meta) {
const flagLabel = meta.kind === 'first' ? 'ПЕРВОЕ СООБЩЕНИЕ'
: meta.kind === 'highlight' ? 'ВЫДЕЛЕННОЕ СООБЩЕНИЕ'
: meta.kind === 'system' ? 'СИСТЕМА' : '';
const flag = flagLabel
? `<div class="chat-flag"><span class="chat-flag-dot"></span><span class="chat-flag-text">${flagLabel}</span></div>`
: '';
const reply = meta.reply ? `
<div class="chat-reply" style="--reply-color:${esc(meta.reply.color)};--reply-rgb:${rgbString(meta.reply.color)}">
<span class="chat-reply-bar"></span><span class="chat-reply-avatar"></span>
<span class="chat-reply-name"></span><span class="chat-reply-text"></span>
</div>` : '';
const badges = BADGE_DEFS
.filter(b => meta.badges && meta.badges[b.key])
.map(b => `<span class="chat-badge" data-b="${b.id}" title="${b.title}">${b.label}</span>`)
.join('');
const images = Array.isArray(meta.images) ? meta.images : [];
const media = images.length ? `
<div class="chat-media">${images.map((im, i) => `
<figure class="chat-img-box" data-state="loading" data-idx="${i}">
<img class="chat-img" alt="Фото из чата" decoding="async">
<span class="chat-img-skeleton"></span>
<span class="chat-img-fallback">
<span class="chat-img-fallback-ic">${ic('noSignal')}</span>
<span class="chat-img-fallback-text">Фото не загрузилось</span>
<span class="chat-img-fallback-host">${esc(im.host)}</span>
</span>
<span class="chat-img-host">${esc(im.host)}</span>
</figure>`).join('')}
</div>` : '';
return { flag, reply, badges, media };
}
/** Стандартный скелет бабла (используется и как fallback для сломанных custom-шаблонов). */
export function defaultBubbleTemplate(meta, parts) {
const textBlock = meta.html
? `<div class="chat-text"><span class="chat-text-inner">${meta.html}</span></div>`
: '';
return `
<div class="chat-inner">
${parts.flag}${parts.reply}
<header class="chat-head">
<span class="chat-avatar-slot"><span class="chat-avatar"></span><span class="chat-avatar-ring"></span></span>
<span class="chat-identity"><span class="chat-user"></span><span class="chat-badges">${parts.badges}</span></span>
<time class="chat-time">${esc(meta.time)}</time>
</header>
${textBlock}
${parts.media}
</div>`;
}
function resolveFor(meta, config) {
const personal = resolvePersonal(config, meta.user);
const descriptor = getSkin((personal && personal.skin) || config.skin);
return { descriptor, personal };
}
function fillTexts(el, meta) {
const userEl = el.querySelector('.chat-user');
if (userEl) userEl.textContent = meta.user;
const timeEl = el.querySelector('.chat-time');
if (timeEl && !timeEl.textContent) timeEl.textContent = meta.time;
if (meta.reply) {
const rn = el.querySelector('.chat-reply-name');
const rt = el.querySelector('.chat-reply-text');
if (rn) rn.textContent = meta.reply.user;
if (rt) rt.textContent = meta.reply.text;
}
}
function wireAvatars(el, meta) {
const av = el.querySelector('.chat-avatar');
if (av) {
const initials = String(meta.user || '?').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').substring(0, 2) || '?';
av.style.setProperty('--avatar-initials', `"${initials}"`);
AvatarManager.get(meta.user, meta.color).then(url => {
if (!av.isConnected || !url) return;
av.style.setProperty('--avatar-img', `url("${url}")`);
av.classList.add('is-ready');
}).catch(() => {});
}
if (meta.reply) {
const ra = el.querySelector('.chat-reply-avatar');
if (ra) {
AvatarManager.get(meta.reply.user, meta.reply.color).then(url => {
if (ra.isConnected && url) ra.style.setProperty('--reply-avatar', `url("${url}")`);
}).catch(() => {});
}
}
}
/* ================= ФОТО ИЗ ЧАТА ================= */
function candidatesFor(entry) {
// Прокси первым: резолвит страницы расширений (og:image) и обходит CORS/hotlink.
const list = [proxyUrl(entry.url)];
if (entry.kind === 'direct') list.push(entry.url);
const hishi = entry.url.match(/^https?:\/\/(?:www\.)?img\.hishi\.icu\/post\/([\w-]+)/i);
if (hishi) {
list.push(
`https://img.hishi.icu/img/${hishi[1]}`,
`https://img.hishi.icu/i/${hishi[1]}.png`,
`https://img.hishi.icu/post/${hishi[1]}.png`
);
}
const imgur = entry.url.match(/^https?:\/\/(?:www\.)?imgur\.com\/(\w+)$/i);
if (imgur) list.push(`https://i.imgur.com/${imgur[1]}.png`, `https://i.imgur.com/${imgur[1]}.jpg`);
return list;
}
function wireImage(box, entry) {
const img = box.querySelector('.chat-img');
if (!img || !entry) { box.dataset.state = 'error'; return; }
const token = (box._imgToken = (box._imgToken || 0) + 1);
const list = candidatesFor(entry);
let i = 0;
let resolving = false;
// ВАЖНО: не гейтим по isConnected — бабл ещё не в DOM в момент первого next().
const current = () => box._imgToken === token;
const fail = () => { if (current()) box.dataset.state = 'error'; };
const next = () => {
if (!current()) return;
if (i < list.length) { img.src = list[i++]; return; }
if (entry.kind === 'page' && !resolving) {
resolving = true;
// Прокси уже пробовал og:image; здесь прямой fetch как последний шанс.
fetch(entry.url, { mode: 'cors' })
.then(r => (r.ok ? r.text() : ''))
.then(html => {
const m = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)
|| html.match(/<img[^>]+src=["']([^"']+)["']/i);
if (m && current()) img.src = new URL(m[1], entry.url).href;
else fail();
})
.catch(fail);
return;
}
fail();
};
img.onload = () => { if (current()) box.dataset.state = 'ready'; };
img.onerror = next;
next();
}
function wireImages(el, meta) {
const images = Array.isArray(meta.images) ? meta.images : [];
el.querySelectorAll('.chat-img-box').forEach(box => {
const idx = Number(box.dataset.idx || 0);
wireImage(box, images[idx]);
});
}
/** Акцент: личный → fixed → цвет ника Twitch. */
export function paintBubble(el, meta, config) {
const personal = resolvePersonal(config, meta.user);
const accent = (personal && personal.accent)
|| (config.accentMode === 'fixed' ? config.accentColor : meta.color);
el.dataset.skin = el._skinId || config.skin;
el.dataset.kind = meta.kind;
el.dataset.user = String(meta.user || '').toLowerCase();
el.style.setProperty('--user-color', accent);
el.style.setProperty('--user-rgb', rgbString(accent));
el.style.setProperty('--user2-rgb', rgbString(shiftHue(accent, 140)));
}
export function mountEffects(el, meta, config) {
const skin = getSkin(el._skinId);
if (!skin.effects || typeof skin.effects.onMount !== 'function') return;
try {
const ret = skin.effects.onMount(el, {
meta, config,
accent: el.style.getPropertyValue('--user-color')
});
if (typeof ret === 'function') effectCleanups.set(el, ret);
} catch (e) {
console.error(`[Chat:skin] Эффект "${skin.id}" не запустился:`, e);
}
}
export function unmountEffects(el) {
const skin = getSkin(el._skinId);
const fn = effectCleanups.get(el);
effectCleanups.delete(el);
try {
if (fn) fn();
else if (skin.effects && typeof skin.effects.onUnmount === 'function') skin.effects.onUnmount(el);
} catch (e) {
console.warn(`[Chat:skin] Очистка эффекта "${skin.id}" упала:`, e);
}
}
function buildContent(el, meta, config) {
const { descriptor } = resolveFor(meta, config);
ensureSkinCss(descriptor).catch(() => {});
const parts = buildBubbleParts(meta);
let skinId = descriptor.id;
let html;
try {
const tpl = descriptor.template || defaultBubbleTemplate;
html = tpl(meta, parts);
if (typeof html !== 'string' || !html) throw new Error('template вернул не строку');
} catch (e) {
console.error(`[Chat:skin] Шаблон "${descriptor.id}" упал — fallback на дефолтный скелет:`, e);
skinId = DEFAULT_SKIN;
html = defaultBubbleTemplate(meta, parts);
}
el.innerHTML = html;
el._skinId = skinId;
// Режим «По тексту»: баблы с фото остаются на полную ширину (картинке нужен холст).
el.dataset.media = (meta.images && meta.images.length) ? 'on' : 'off';
fillTexts(el, meta);
wireAvatars(el, meta);
wireImages(el, meta);
paintBubble(el, meta, config);
mountEffects(el, meta, config);
}
export function createBubble(meta, config) {
const el = document.createElement('article');
el.className = 'chat-block is-in';
el.dataset.id = meta.id;
buildContent(el, meta, config);
return el;
}
/** Живой апдейт при смене конфига: сменился скин — пересборка структуры, иначе только перекраска. */
export function repaintBubble(el, meta, config) {
const { descriptor } = resolveFor(meta, config);
if (descriptor.id !== el._skinId) {
unmountEffects(el);
buildContent(el, meta, config);
return;
}
paintBubble(el, meta, config);
}