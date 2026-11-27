/* ФАЙЛ: widgets/chat/dashboard/composer.js — v1 (лаборатория сообщений: пресеты, шторм, смайлы, пауза/очистка, Ctrl+Enter) */
import { normalizeChatConfig } from '../config.js';
import { ic, val, checked, COLORS, PRESETS, STORM } from './constants.js';

export class ComposerPanel {
	constructor({ root, store, toast }) {
		this.root = root;
		this.store = store;
		this.toast = toast;
		this.burstTimer = null;
		this._mounted = false;
	}

	_conf() { return normalizeChatConfig(this.store.getState().config.widgets.chat); }

	_set(patch) {
		try { this.store.updateConfig({ widgets: { chat: patch } }); }
		catch (e) {
			console.error('[ChatDash:composer] Настройка не сохранилась:', e);
			this.toast.error('Настройка не сохранилась.');
		}
	}

	mount() { this._mounted = true; console.log('[ChatDash:composer] смонтирован'); }

	unmount() {
		this._mounted = false;
		if (this.burstTimer) { clearTimeout(this.burstTimer); this.burstTimer = null; }
	}

	onChange(e) {
		const t = e.target;
		if (t.id === 'cd-c-reply') {
			const box = document.getElementById('cd-reply-fields');
			if (box) box.classList.toggle('is-hidden', !t.checked);
			return true;
		}
		return false;
	}

	onKey(e) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target && e.target.id === 'cd-c-text') {
			e.preventDefault();
			this.send();
			return true;
		}
		return false;
	}

	addEmote(name) {
		const area = document.getElementById('cd-c-text');
		if (!area) return;
		const sep = area.value && !/\s$/.test(area.value) ? ' ' : '';
		area.value = `${area.value}${sep}${name} `;
		area.focus();
	}

	randColor() {
		const input = document.getElementById('cd-c-color');
		if (input) input.value = COLORS[Math.floor(Math.random() * COLORS.length)];
	}

	buildTest() {
		const text = val('cd-c-text').trim();
		if (!text) return null;
		return {
			user: val('cd-c-nick', 'Зритель').trim() || 'Зритель',
			color: val('cd-c-color', '#00e5ff'),
			text,
			badges: { mod: checked('cd-c-mod'), subscriber: checked('cd-c-sub'), vip: checked('cd-c-vip') },
			first: checked('cd-c-first'),
			highlighted: checked('cd-c-highlight'),
			reply: checked('cd-c-reply') ? {
				user: val('cd-c-reply-user', 'зритель').trim() || 'зритель',
				text: val('cd-c-reply-text', 'привет').trim() || 'привет',
				color: '#a1a1aa'
			} : null
		};
	}

	send(payload) {
		const data = payload || this.buildTest();
		if (!data) { this.toast.info('Введите текст сообщения.'); return; }
		this.store.broadcastAction('CHAT_TEST', data);
		this.toast.success('Сообщение отправлено в виджет.');
	}

	applyPreset(id) {
		const p = PRESETS.find(x => x.id === id);
		if (!p) return;
		const d = p.data;
		const put = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v; };
		const tick = (elId, v) => { const el = document.getElementById(elId); if (el) el.checked = Boolean(v); };
		put('cd-c-nick', d.user);
		put('cd-c-color', d.color);
		put('cd-c-text', d.text);
		tick('cd-c-mod', d.badges && d.badges.mod);
		tick('cd-c-sub', d.badges && d.badges.subscriber);
		tick('cd-c-vip', d.badges && d.badges.vip);
		tick('cd-c-first', d.first);
		tick('cd-c-highlight', d.highlighted);
		tick('cd-c-reply', Boolean(d.reply));
		if (d.reply) { put('cd-c-reply-user', d.reply.user); put('cd-c-reply-text', d.reply.text); }
		const box = document.getElementById('cd-reply-fields');
		if (box) box.classList.toggle('is-hidden', !d.reply);
		this.send(d);
	}

	burst() {
		let i = 0;
		const step = () => {
			if (!this._mounted) return;
			if (i >= STORM.length) { this.burstTimer = null; return; }
			this.store.broadcastAction('CHAT_TEST', STORM[i]);
			i++;
			this.burstTimer = setTimeout(step, 380);
		};
		step();
		this.toast.info('Шторм из 8 сообщений пошёл.');
	}

	togglePause() {
		const c = this._conf();
		this._set({ paused: !c.paused });
		this.toast.info(!c.paused ? 'Поток на паузе — сообщения копятся.' : 'Поток возобновлён.');
	}

	clearChat() {
		this.store.broadcastAction('CHAT_CLEAR', {});
		this.toast.info('Чат на экране очищен.');
	}

	render(state) {
		if (!this._mounted) return;
		const c = normalizeChatConfig(state.config.widgets.chat);
		const pause = document.getElementById('cd-c-pause');
		if (pause && pause.dataset.state !== String(c.paused)) {
			pause.dataset.state = String(c.paused);
			pause.classList.toggle('is-armed', c.paused);
			pause.innerHTML = c.paused ? `${ic('play')} Продолжить поток` : `${ic('pause')} Пауза потока`;
		}
	}
}