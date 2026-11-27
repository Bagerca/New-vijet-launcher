/* ФАЙЛ: widgets/chat/dashboard/skinsPanel.js — v1 (галерея из реестра, sample через общий рендерер, персональные назначения) */
import {
	normalizeChatConfig, chatTokens, chatFlags, tokensToStyle, rgbString, shiftHue
} from '../config.js';
import { listSkins, getSkin, ensureSkinCss, SKIN_SAMPLE } from '../skins.js';
import { buildBubbleParts, defaultBubbleTemplate } from '../runtime/bubbleRenderer.js';
import { ic, esc, val, checked } from './constants.js';

function entrySkinId(v) { return typeof v === 'string' ? v : (v && v.skin) || 'glass'; }
function entryAccent(v) { return (v && typeof v === 'object' && v.accent) || null; }

function sampleHTML(skin, accent) {
	const meta = {
		id: 'sample', user: SKIN_SAMPLE.user, color: accent,
		text: SKIN_SAMPLE.text, html: esc(SKIN_SAMPLE.text), time: SKIN_SAMPLE.time,
		kind: 'normal', badges: { subscriber: true }, emoteCount: 0, reply: null
	};
	const parts = buildBubbleParts(meta);
	let inner;
	try {
		inner = (skin.template || defaultBubbleTemplate)(meta, parts);
		if (typeof inner !== 'string' || !inner) throw new Error('bad template');
	} catch (e) {
		console.warn(`[ChatDash:skins] Шаблон скина "${skin.id}" упал в галерее:`, e);
		inner = defaultBubbleTemplate(meta, parts);
	}
	return `
<div class="chat-block" data-skin="${skin.id}" data-kind="normal"
	style="--user-color:${accent};--user-rgb:${rgbString(accent)};--user2-rgb:${rgbString(shiftHue(accent, 140))};--avatar-initials:'KS'">
	${inner}
</div>`;
}

export class SkinsPanel {
	constructor({ root, store, toast }) {
		this.root = root;
		this.store = store;
		this.toast = toast;
		this.cards = new Map();
		this._sigSkins = '';
		this._sigUsers = '';
		this._mounted = false;
	}

	_conf() { return normalizeChatConfig(this.store.getState().config.widgets.chat); }

	_set(patch) {
		try { this.store.updateConfig({ widgets: { chat: patch } }); }
		catch (e) {
			console.error('[ChatDash:skins] Настройка не сохранилась:', e);
			this.toast.error('Настройка не сохранилась.');
		}
	}

	mount() {
		this._mounted = true;
		this.buildCards();
		// Прогрев CSS кастомных скинов для галереи (идемпотентно, не блокирует).
		Promise.all(listSkins().map(s => ensureSkinCss(s))).then(() => {
			if (!this._mounted) return;
			this._sigSkins = '';
			this.render(this.store.getState());
		}).catch(() => {});
		console.log('[ChatDash:skins] смонтирован');
	}

	unmount() {
		this._mounted = false;
		this.cards.clear();
	}

	buildCards() {
		const grid = document.getElementById('cd-skin-grid');
		if (!grid) return;
		grid.innerHTML = '';
		this.cards.clear();
		listSkins().forEach(s => {
			const card = document.createElement('button');
			card.type = 'button';
			card.className = 'cd-skin-card';
			card.setAttribute('data-cd-set', 'skin');
			card.setAttribute('data-cd-value', s.id);
			card.title = `${s.title} — применить ко всем сообщениям`;
			card.innerHTML = `
<span class="cd-skin-stage"></span>
<span class="cd-skin-meta">
	<span class="cd-skin-title">${esc(s.title)}${s.builtin ? '' : '<em style="font-style:normal;font-size:9px;font-weight:900;letter-spacing:0.6px;color:var(--cd-hot);background:var(--cd-hot-dim);padding:1px 6px;border-radius:4px;margin-left:6px;">CUSTOM</em>'}<span class="cd-skin-check">${ic('check')}</span></span>
	<span class="cd-skin-hint">${esc(s.hint)}</span>
</span>`;
			grid.appendChild(card);
			this.cards.set(s.id, card);
		});
	}

	pickSkin(id, btn) {
		this._set({ skin: id });
		if (btn) {
			btn.classList.remove('is-picked');
			void btn.offsetWidth;
			btn.classList.add('is-picked');
		}
		this.toast.success(`Скин «${getSkin(id).title}» применён ко всем сообщениям.`);
	}

	addUserSkin() {
		const nickInput = document.getElementById('cd-us-nick');
		const skinSelect = document.getElementById('cd-us-skin');
		if (!nickInput || !skinSelect) return;
		const nick = nickInput.value.trim().toLowerCase();
		if (!nick) { this.toast.info('Введите ник зрителя.'); return; }
		if (!/^[a-z0-9_а-яё.-]{2,28}$/i.test(nick)) { this.toast.error('Ник выглядит некорректно.'); return; }
		const skinId = getSkin(skinSelect.value).id;
		const accentOn = checked('cd-us-accent-on');
		const accent = accentOn ? val('cd-us-accent', '#ff4d85') : null;
		const map = { ...this._conf().userSkins };
		map[nick] = accent ? { skin: skinId, accent } : skinId;
		this._set({ userSkins: map });
		nickInput.value = '';
		this.toast.success(`${nick} получит «${getSkin(skinId).title}»${accent ? ' с личным акцентом' : ''}.`);
	}

	removeUserSkin(nick) {
		const map = { ...this._conf().userSkins };
		delete map[nick];
		this._set({ userSkins: map });
		this.toast.info(`Личный бабл для ${nick} снят.`);
	}

	onKey(e) {
		if (e.key === 'Enter' && e.target && e.target.id === 'cd-us-nick') {
			e.preventDefault();
			this.addUserSkin();
			return true;
		}
		return false;
	}

	renderSkins(c) {
		const style = tokensToStyle({ ...chatTokens(c), '--chat-width': '420px' });
		const fl = chatFlags(c);
		const accent = c.accentMode === 'fixed' ? c.accentColor : '#ff4d85';
		const sig = JSON.stringify([style, fl, accent]);
		if (sig !== this._sigSkins) {
			this._sigSkins = sig;
			for (const [id, card] of this.cards) {
				const stage = card.querySelector('.cd-skin-stage');
				if (!stage) continue;
				stage.setAttribute('style', style);
				Object.entries(fl).forEach(([k, v]) => stage.setAttribute(k, v));
				stage.innerHTML = sampleHTML(getSkin(id), accent);
			}
		}
		for (const [id, card] of this.cards) card.classList.toggle('is-active', id === c.skin);
	}

	renderUserSkins(c) {
		const sig = JSON.stringify(c.userSkins);
		if (sig === this._sigUsers) return;
		this._sigUsers = sig;
		const listEl = document.getElementById('cd-us-list');
		const emptyEl = document.getElementById('cd-us-empty');
		const entries = Object.entries(c.userSkins);
		if (emptyEl) emptyEl.classList.toggle('is-hidden', entries.length > 0);
		if (!listEl) return;
		listEl.innerHTML = entries.map(([nick, v]) => {
			const id = entrySkinId(v);
			const accent = entryAccent(v);
			return `
<div class="cd-us-row">
	<span class="cd-us-nick">${esc(nick)}</span>
	${accent ? `<span title="Личный акцент ${esc(accent)}" style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:${esc(accent)};border:1px solid var(--cd-line-2);"></span>` : ''}
	<span class="cd-us-skin">${esc(getSkin(id).title)}</span>
	<button class="cd-mini-btn is-danger" type="button" data-cd-act="us-del" data-arg="${esc(nick)}" title="Снять личный бабл">${ic('trash')}</button>
</div>`;
		}).join('');
	}

	render(state) {
		if (!this._mounted) return;
		const c = normalizeChatConfig(state.config.widgets.chat);
		this.renderSkins(c);
		this.renderUserSkins(c);
	}
}