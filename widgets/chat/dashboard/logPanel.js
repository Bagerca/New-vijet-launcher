/* ФАЙЛ: widgets/chat/dashboard/logPanel.js — v2 (+ тег «фото» для сообщений с картинками) */
import { getSkin } from '../skins.js';
import { ic, esc, setText, LOG_KEY, LOG_MAX, ARM_MS } from './constants.js';

function fmtTime(ts) {
	try { return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
	catch (e) { return '--:--:--'; }
}

export class LogPanel {
	constructor({ root, toast }) {
		this.root = root;
		this.toast = toast;
		this.entries = [];
		this.stats = { total: 0, emotes: 0, dropped: 0 };
		this.users = new Set();
		this.paused = false;
		this.armed = false;
		this.armTimer = null;
		this._sig = '';
		this._mounted = false;
	}

	mount() {
		this._mounted = true;
		this.load();
		this.render();
	}

	unmount() {
		this._mounted = false;
		if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
		this.armed = false;
	}

	load() {
		try {
			const raw = localStorage.getItem(LOG_KEY);
			if (!raw) return;
			const p = JSON.parse(raw);
			if (!p || !Array.isArray(p.entries)) return;
			this.entries = p.entries.slice(0, LOG_MAX);
			this.stats = { total: Number(p.total) || 0, emotes: Number(p.emotes) || 0, dropped: Number(p.dropped) || 0 };
			this.users = new Set(Array.isArray(p.users) ? p.users : []);
			console.log(`[ChatDash:log] записей: ${this.entries.length}`);
		} catch (e) {
			console.warn('[ChatDash:log] журнал не читается:', e);
			this.entries = [];
		}
	}

	save() {
		try {
			localStorage.setItem(LOG_KEY, JSON.stringify({
				entries: this.entries.slice(0, LOG_MAX),
				total: this.stats.total, emotes: this.stats.emotes, dropped: this.stats.dropped,
				users: Array.from(this.users).slice(0, 200)
			}));
		} catch (e) { console.warn('[ChatDash:log] не сохранился:', e); }
	}

	trim() {
		if (this.entries.length > LOG_MAX) this.entries.length = LOG_MAX;
		if (this.users.size > 200) this.users = new Set(Array.from(this.users).slice(-200));
	}

	pushMessage(p) {
		if (!this._mounted || this.paused || !p) return;
		this.stats.total++;
		this.stats.emotes += Number(p.emotes) || 0;
		this.users.add(String(p.user || '').toLowerCase());
		this.entries.unshift({
			kind: 'msg', ts: Number(p.ts) || Date.now(),
			source: p.source === 'obs' ? 'obs' : 'preview',
			user: String(p.user || '—'),
			color: /^#[0-9a-f]{6}$/i.test(String(p.color || '')) ? p.color : '#a1a1aa',
			text: String(p.text || ''),
			skin: getSkin(p.skin).id,
			tag: p.kind && p.kind !== 'normal' ? p.kind : null,
			images: Number(p.images) || 0,
			reply: p.reply || null
		});
		this.trim(); this.save(); this.render();
	}

	pushFiltered(p) {
		if (!this._mounted || this.paused || !p) return;
		this.stats.dropped++;
		this.entries.unshift({
			kind: 'drop', ts: Number(p.ts) || Date.now(),
			source: p.source === 'obs' ? 'obs' : 'preview',
			user: String(p.user || '—'), color: '#6b7280',
			text: String(p.text || ''), skin: null, images: 0,
			reason: String(p.reason || 'фильтр')
		});
		this.trim(); this.save(); this.render();
	}

	disarm() {
		this.armed = false;
		if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
		const btn = document.getElementById('cd-log-clear');
		if (btn) { btn.classList.remove('is-armed'); btn.innerHTML = ic('trash'); }
	}

	handleAction(act, btn) {
		if (act === 'log-pause') {
			this.paused = !this.paused;
			if (btn) {
				btn.classList.toggle('is-armed', this.paused);
				btn.innerHTML = this.paused ? ic('play') : ic('pause');
			}
			this.toast.info(this.paused ? 'Журнал на паузе.' : 'Журнал снова пишет.');
			return true;
		}
		if (act === 'log-clear') {
			if (this.entries.length === 0 && this.stats.total === 0) { this.toast.info('Журнал уже пуст.'); return true; }
			if (!this.armed) {
				this.armed = true;
				if (btn) { btn.classList.add('is-armed'); btn.innerHTML = ic('check'); }
				this.toast.info('Очистка журнала — подтвердите повторным нажатием.');
				if (this.armTimer) clearTimeout(this.armTimer);
				this.armTimer = setTimeout(() => this.disarm(), ARM_MS);
				return true;
			}
			this.disarm();
			this.entries = [];
			this.stats = { total: 0, emotes: 0, dropped: 0 };
			this.users.clear();
			this._sig = '';
			this.save(); this.render();
			this.toast.success('Журнал очищен.');
			return true;
		}
		return false;
	}

	render() {
		if (!this._mounted) return;
		setText('cd-lstat-total', this.stats.total);
		setText('cd-lstat-uniq', this.users.size);
		setText('cd-lstat-emote', this.stats.emotes);
		setText('cd-lstat-drop', this.stats.dropped);
		setText('cd-log-count', this.entries.length);
		const empty = document.getElementById('cd-log-empty');
		if (empty) empty.classList.toggle('is-hidden', this.entries.length > 0);
		const sig = `${this.entries.length}:${this.entries[0]?.ts || 0}`;
		if (sig === this._sig) return;
		this._sig = sig;
		const listEl = document.getElementById('cd-log');
		if (!listEl) return;
		listEl.innerHTML = this.entries.map(e => {
			const drop = e.kind === 'drop';
			const tag = drop
				? `<span class="cd-log-tag is-drop">${esc(e.reason)}</span>`
				: `<span class="cd-log-tag">${esc(getSkin(e.skin).title)}</span>`;
			const extra = e.tag === 'first' ? '<span class="cd-log-tag is-first">1st</span>'
				: e.tag === 'highlight' ? '<span class="cd-log-tag is-hl">HL</span>'
				: e.reply ? '<span class="cd-log-tag is-reply">ответ</span>' : '';
			const imgTag = e.images > 0 ? `<span class="cd-log-tag is-hl">фото${e.images > 1 ? ' ×' + e.images : ''}</span>` : '';
			return `
<div class="cd-log-row ${drop ? 'is-filtered' : ''}" style="--row-color:${esc(e.color)}">
	<span class="cd-log-time">${fmtTime(e.ts)}</span>
	<span class="cd-log-dot"></span>
	<span class="cd-log-body">
		<span class="cd-log-user">${esc(e.user)}<em class="cd-log-src">${e.source === 'obs' ? 'OBS' : 'PREVIEW'}</em></span>
		<span class="cd-log-text">${esc(e.text)}</span>
	</span>
	<span class="cd-log-tags">${imgTag}${extra}${tag}</span>
</div>`;
		}).join('');
		const scroll = document.getElementById('cd-log-scroll');
		if (scroll) scroll.scrollTop = 0;
	}
}