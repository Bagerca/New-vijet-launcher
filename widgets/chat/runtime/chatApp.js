/* ФАЙЛ: widgets/chat/runtime/chatApp.js — v2 (лента + детект фото перед рендером + телеметрия с images) */
import { WidgetCore } from '../../shared/WidgetCore.js';
import { normalizeChatConfig, chatTokens, chatFlags, splitList, CHAT_DEFAULTS } from '../config.js';
import { getSkin, ensureSkinCss } from '../skins.js';
import { createBubble, repaintBubble, unmountEffects } from './bubbleRenderer.js';
import { esc, nowTime, fromTest, detectImages, stripImageUrls } from './messageSource.js';

const OUT_MS = 420;
const HEARTBEAT_MS = 4000;
const ACTION_KEY = 'stream_pack_action';

export function createChatApp({ container, list, source }) {
	const App = {
		config: normalizeChatConfig(CHAT_DEFAULTS),
		alive: new Map(),
		queue: [],
		seen: new Set(),
		unique: new Set(),
		counters: { total: 0, emotes: 0, dropped: 0 },

		init() {
			if (!container || !list) { console.error('[Chat] Контейнер виджета не найден.'); return; }
			container.dataset.preview = source === 'preview' ? 'on' : 'off';
			this.applyConfig(CHAT_DEFAULTS);
			console.log(`[Chat] v4 старт (${source}), модульный рантайм + фото`);
		},

		send(action, payload) {
			const body = { ...payload, source };
			if (WidgetCore.ws && WidgetCore.ws.readyState === 1) {
				try {
					WidgetCore.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action, payload: body }));
					return;
				} catch (e) { console.warn('[Chat] WS send:', e); }
			}
			try {
				localStorage.setItem(ACTION_KEY, JSON.stringify({ action, payload: body, _n: Date.now() + Math.random() }));
			} catch (e) {}
		},

		report() {
			this.send('CHAT_STATE', {
				visible: this.config.isActive,
				count: this.alive.size,
				unique: this.unique.size,
				emotes: this.counters.emotes,
				dropped: this.counters.dropped,
				skin: this.config.skin,
				paused: this.config.paused,
				queued: this.queue.length,
				ts: Date.now()
			});
		},

		warmSkinCss(c) {
			const ids = new Set([c.skin]);
			for (const v of Object.values(c.userSkins)) ids.add(typeof v === 'string' ? v : v.skin);
			ids.forEach(id => ensureSkinCss(getSkin(id)).catch(() => {}));
		},

		applyConfig(raw) {
			if (!container || !list) return;
			try {
				const prevLife = this.config.messageLife;
				const prevMax = this.config.maxMessages;
				const wasPaused = this.config.paused;
				this.config = normalizeChatConfig(raw);
				const c = this.config;
				Object.entries(chatTokens(c)).forEach(([k, v]) => container.style.setProperty(k, v));
				container.dataset.dir = c.direction;
				container.dataset.mask = c.fadeMask ? 'on' : 'off';
				container.dataset.paused = c.paused ? 'on' : 'off';
				container.classList.toggle('is-hidden', !c.isActive);
				Object.entries(chatFlags(c)).forEach(([k, v]) => list.setAttribute(k, v));
				this.warmSkinCss(c);
				for (const entry of this.alive.values()) repaintBubble(entry.el, entry.meta, c);
				if (c.maxMessages < prevMax) this.cap();
				if (c.messageLife !== prevLife) for (const e of this.alive.values()) this.schedule(e);
				if (wasPaused && !c.paused) this.flush();
				this.report();
			} catch (e) {
				console.error('[Chat] applyConfig провален:', e);
			}
		},

		reason(meta) {
			const c = this.config;
			if (!c.isActive) return 'чат скрыт';
			const nick = String(meta.user || '').toLowerCase();
			if (splitList(c.blockedUsers).includes(nick)) return 'игнор-лист';
			const low = String(meta.text || '').toLowerCase();
			if (splitList(c.blockedWords).some(w => w && low.includes(w))) return 'бан-слово';
			if (c.hideCommands && String(meta.text || '').trim().startsWith('!')) return 'команда';
			const b = meta.badges || {};
			const isMod = b.mod || b.broadcaster;
			if (c.allowMode === 'mods' && !isMod) return 'только модераторы';
			if (c.allowMode === 'subs' && !isMod && !b.subscriber && !b.founder) return 'только сабы';
			if (c.allowMode === 'vip' && !isMod && !b.subscriber && !b.founder && !b.vip) return 'только VIP/сабы';
			return null;
		},

		push(meta) {
			if (!meta || this.seen.has(meta.id)) return;
			this.seen.add(meta.id);
			if (this.seen.size > 600) this.seen.clear();
			const why = this.reason(meta);
			if (why) {
				this.counters.dropped++;
				this.send('CHAT_FILTERED', { user: meta.user, color: meta.color, text: meta.text, reason: why, ts: Date.now() });
				this.report();
				return;
			}
			try {
				const found = detectImages(meta.text, this.config);
				meta.images = found;
				if (found.length) {
					meta.html = stripImageUrls(meta.html, found);
					console.log(`[Chat] Фото распознано: ${found.length} (${found.map(f => f.host).join(', ')})`);
				}
			} catch (e) {
				console.warn('[Chat] Детект фото упал, показываю текстом:', e);
				meta.images = [];
			}
			if (this.config.paused) {
				this.queue.push(meta);
				if (this.queue.length > 40) this.queue.shift();
				this.report();
				return;
			}
			this.render(meta);
		},

		render(meta) {
			try {
				const c = this.config;
				const el = createBubble(meta, c);
				if (c.direction === 'top') list.prepend(el);
				else list.appendChild(el);
				const entry = { el, meta, timer: null };
				this.alive.set(meta.id, entry);
				this.unique.add(String(meta.user || '').toLowerCase());
				if (this.unique.size > 400) this.unique.clear();
				this.counters.total++;
				this.counters.emotes += meta.emoteCount || 0;
				this.schedule(entry);
				this.cap();
				this.send('CHAT_MESSAGE', {
					id: meta.id, user: meta.user, color: meta.color, text: meta.text,
					skin: el.dataset.skin, kind: meta.kind, emotes: meta.emoteCount || 0,
					images: (meta.images || []).length,
					reply: meta.reply ? meta.reply.user : null, ts: Date.now()
				});
				this.report();
			} catch (e) {
				console.error('[Chat] Рендер сообщения провален:', e, meta);
			}
		},

		schedule(entry) {
			if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
			const life = this.config.messageLife;
			if (!life) return;
			entry.timer = setTimeout(() => this.remove(entry.meta.id, true), life * 1000);
		},

		remove(id, animate) {
			const entry = this.alive.get(id);
			if (!entry) return;
			this.alive.delete(id);
			if (entry.timer) clearTimeout(entry.timer);
			unmountEffects(entry.el);
			if (!animate) { entry.el.remove(); this.report(); return; }
			entry.el.classList.remove('is-in');
			entry.el.classList.add('is-out');
			setTimeout(() => { entry.el.remove(); this.report(); }, OUT_MS);
		},

		cap() {
			while (this.alive.size > this.config.maxMessages) {
				this.remove(this.alive.keys().next().value, true);
			}
		},

		clear(silent) {
			for (const id of Array.from(this.alive.keys())) this.remove(id, true);
			this.queue = [];
			if (!silent) this.system('Чат очищен модератором.');
			this.report();
		},

		flush() {
			const pending = this.queue.splice(0, this.queue.length);
			pending.forEach(m => this.render(m));
			if (pending.length) console.log(`[Chat] Пауза снята — выпущено ${pending.length}`);
		},

		system(text) {
			this.render({
				id: 'sys-' + Date.now() + Math.random().toString(36).slice(2, 6),
				user: 'Система', color: '#00e5ff', text, html: esc(text),
				time: nowTime(), kind: 'system', badges: {}, emoteCount: 0, reply: null, images: []
			});
		},

		handleAction(action, payload) {
			if (action === 'CHAT_TEST') { this.push(fromTest(payload)); return; }
			if (action === 'CHAT_CLEAR') { this.clear(false); return; }
			if (action === 'CHAT_REQUEST_STATE') { this.report(); return; }
			if (action === 'CHAT_FLUSH') { this.flush(); }
		}
	};

	App.heartbeat = setInterval(() => App.report(), HEARTBEAT_MS);
	setTimeout(() => App.report(), 600);
	return App;
}