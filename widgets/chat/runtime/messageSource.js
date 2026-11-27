/* ФАЙЛ: widgets/chat/runtime/messageSource.js — v2 (Twitch/тест → meta + детект фото-ссылок из расширений) */
import { WidgetCore } from '../../shared/WidgetCore.js';
import { splitList } from '../config.js';

export const BADGE_DEFS = [
	{ key: 'broadcaster', id: 'broadcaster', label: 'HOST', title: 'Стример' },
	{ key: 'mod', id: 'mod', label: 'MOD', title: 'Модератор' },
	{ key: 'vip', id: 'vip', label: 'VIP', title: 'VIP' },
	{ key: 'artist', id: 'artist', label: 'ART', title: 'Художник' },
	{ key: 'founder', id: 'founder', label: 'FND', title: 'Основатель' },
	{ key: 'subscriber', id: 'sub', label: 'SUB', title: 'Подписчик' }
];

const TEST_EMOTES = {
	Kappa: '25', LUL: '425618', Keepo: '1902', Kreygasm: '41',
	BibleThump: '86', WutFace: '28087', HeyGuys: '30259', SeemGood: '64138',
	PogChamp: '305954156', CoolStoryBob: '123171'
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const DIRECT_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp)(\?|#|$)/i;
const MAX_IMAGES_PER_MESSAGE = 4;

export function esc(s) {
	return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function nowTime() {
	try { return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
	catch (e) { return '--:--'; }
}

export function countEmotes(emotes) {
	if (!emotes) return 0;
	return Object.values(emotes).reduce((s, p) => s + (Array.isArray(p) ? p.length : 0), 0);
}

export function buildTestEmotes(text) {
	const emotes = {};
	Object.keys(TEST_EMOTES).forEach(name => {
		let from = 0;
		while (true) {
			const idx = text.indexOf(name, from);
			if (idx < 0) break;
			const before = idx === 0 ? ' ' : text[idx - 1];
			const after = idx + name.length >= text.length ? ' ' : text[idx + name.length];
			if (/\s/.test(before) && /\s/.test(after)) {
				const id = TEST_EMOTES[name];
				emotes[id] = emotes[id] || [];
				emotes[id].push(`${idx}-${idx + name.length - 1}`);
			}
			from = idx + name.length;
		}
	});
	return Object.keys(emotes).length ? emotes : null;
}

/**
 * Классификация ссылки как «фото из чата».
 * kind 'direct' — URL уже указывает на файл картинки;
 * kind 'page'   — страница доверенного хоста (img.hishi.icu/post/… от расширения),
 *                 рендерер пробует загрузить её как img и резолвит og:image.
 */
export function classifyImageUrl(url, c) {
	let u;
	try { u = new URL(url); } catch (e) { return null; }
	if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
	const host = u.hostname.toLowerCase().replace(/^www\./, '');
	const trusted = splitList(c.imageHosts).some(h => h && (host === h || host.endsWith('.' + h)));
	const direct = DIRECT_EXT_RE.test(u.pathname);
	if (direct && (c.imageAllHosts || trusted)) return { url: u.href, host, kind: 'direct' };
	if (trusted) return { url: u.href, host, kind: 'page' };
	return null;
}

export function detectImages(text, c) {
	if (!c || c.showImages === false) return [];
	const out = [];
	const seen = new Set();
	const src = String(text || '');
	URL_RE.lastIndex = 0;
	let m;
	while ((m = URL_RE.exec(src)) !== null) {
		if (out.length >= MAX_IMAGES_PER_MESSAGE) break;
		const url = m[0].replace(/[.,!?;:]+$/, '');
		if (seen.has(url)) continue;
		const entry = classifyImageUrl(url, c);
		if (entry) { seen.add(url); out.push(entry); }
	}
	return out;
}

/** Убирает фото-ссылки из уже собранного HTML, не трогая позиции смайлов. */
export function stripImageUrls(html, images) {
	let out = String(html || '');
	(images || []).forEach(entry => {
		[out, out] = [out.split(entry.url).join(''), out];
		out = out.split(esc(entry.url)).join('');
	});
	return out.replace(/\s{2,}/g, ' ').trim();
}

export function fromTwitch(tags, message) {
	const user = tags['display-name'] || tags.username || 'Зритель';
	const color = tags.color || '#ff4d85';
	let text = String(message || '').trim();
	let reply = null;
	if (tags['reply-parent-msg-id']) {
		const rUser = tags['reply-parent-display-name'] || tags['reply-parent-user-login'] || 'зритель';
		let rBody = String(tags['reply-parent-msg-body'] || '').replace(/\\s/g, ' ');
		const m1 = `@${rUser}`;
		const m2 = `@${tags['reply-parent-user-login']}`;
		if (text.toLowerCase().startsWith(m1.toLowerCase())) text = text.substring(m1.length).trim();
		else if (m2 && text.toLowerCase().startsWith(m2.toLowerCase())) text = text.substring(m2.length).trim();
		rBody = rBody.replace(/^@[a-zA-Z0-9_]+\s+/, '').trim();
		reply = { user: rUser, text: rBody, color: tags['reply-parent-user-color'] || '#a1a1aa' };
	}
	const b = tags.badges || {};
	return {
		id: tags.id || ('tw-' + Date.now() + Math.random().toString(36).slice(2, 6)),
		user, color, text,
		html: WidgetCore.parseMessageToHTML(text, tags.emotes),
		time: nowTime(),
		kind: tags['first-msg'] === '1' ? 'first' : (tags['msg-id'] === 'highlighted-message' ? 'highlight' : 'normal'),
		badges: {
			broadcaster: b.broadcaster === '1',
			mod: tags.mod === true || b.moderator === '1',
			vip: b.vip === '1',
			subscriber: tags.subscriber === true || Boolean(b.subscriber || b.founder),
			founder: b.founder === '1',
			artist: b.artist === '1'
		},
		emoteCount: countEmotes(tags.emotes),
		reply,
		images: []
	};
}

export function fromTest(p) {
	const d = p || {};
	const user = String(d.user || 'Зритель').trim().substring(0, 28) || 'Зритель';
	const color = /^#[0-9a-f]{6}$/i.test(String(d.color || '')) ? String(d.color) : '#00e5ff';
	const text = String(d.text || 'Привет, стрим!').substring(0, 400);
	const emotes = buildTestEmotes(text);
	const b = d.badges || {};
	return {
		id: 'test-' + Date.now() + Math.random().toString(36).slice(2, 7),
		user, color, text,
		html: WidgetCore.parseMessageToHTML(text, emotes),
		time: nowTime(),
		kind: d.first ? 'first' : (d.highlighted ? 'highlight' : 'normal'),
		badges: {
			broadcaster: !!b.broadcaster, mod: !!b.mod, vip: !!b.vip,
			subscriber: !!b.subscriber, founder: !!b.founder, artist: !!b.artist
		},
		emoteCount: countEmotes(emotes),
		reply: d.reply && d.reply.text ? {
			user: String(d.reply.user || 'зритель').substring(0, 28),
			text: String(d.reply.text).substring(0, 160),
			color: /^#[0-9a-f]{6}$/i.test(String(d.reply.color || '')) ? String(d.reply.color) : '#a1a1aa'
		} : null,
		images: []
	};
}