/* ФАЙЛ: widgets/chat/dashboard/stage.js — v1 (стенд: iframe, layout, режимы focus/scene, loading/off/pause) */
import { normalizeChatConfig } from '../config.js';
import { WIDGET_W, WIDGET_H, SCENE_W, SCENE_H, OBS_X } from './constants.js';

export class StageController {
	constructor({ root, store, toast }) {
		this.root = root;
		this.store = store;
		this.toast = toast;
		this.iframe = null;
		this.loaded = false;
		this.loadTimer = null;
		this.resizeObs = null;
		this.view = 'focus';
		this.direction = 'bottom';
	}

	mount(params, state) {
		this.view = params?.view === 'scene' ? 'scene' : 'focus';
		this.direction = normalizeChatConfig(state.config.widgets.chat).direction;
		const stage = document.getElementById('cd-stage');
		this.resizeObs = new ResizeObserver(() => this.layout());
		if (stage) this.resizeObs.observe(stage);
		this.createIframe();
		this.layout();
		console.log('[ChatDash:stage] смонтирован', this.view);
	}

	unmount() {
		if (this.resizeObs) { this.resizeObs.disconnect(); this.resizeObs = null; }
		this.destroyIframe();
	}

	setParams(params) {
		const next = params?.view === 'scene' ? 'scene' : 'focus';
		if (next !== this.view) { this.view = next; this.layout(); }
	}

	refresh() {
		this.destroyIframe();
		this.createIframe();
	}

	createIframe() {
		if (this.iframe) return;
		const host = document.getElementById('cd-frame-host');
		if (!host) return;
		this.loaded = false;
		const loading = document.getElementById('cd-stage-loading');
		if (loading) loading.classList.remove('is-hidden');
		const f = document.createElement('iframe');
		f.id = 'cd-preview-iframe';
		f.className = 'cd-iframe';
		f.title = 'Превью виджета чата';
		f.setAttribute('scrolling', 'no');
		f.src = `widgets/chat/index.html?preview=1&cb=${Date.now()}`;
		f.onload = () => {
			if (this.iframe !== f) return;
			this.loaded = true;
			const l = document.getElementById('cd-stage-loading');
			if (l) l.classList.add('is-hidden');
			this.layout();
			this.store.broadcastAction('CHAT_REQUEST_STATE', {});
		};
		f.onerror = () => {
			if (this.iframe !== f) return;
			const l = document.getElementById('cd-stage-loading');
			if (l) l.classList.add('is-hidden');
			this.toast.error('Не удалось загрузить превью виджета.');
		};
		host.appendChild(f);
		this.iframe = f;
		clearTimeout(this.loadTimer);
		this.loadTimer = setTimeout(() => {
			if (!this.loaded) {
				const l = document.getElementById('cd-stage-loading');
				if (l) l.classList.add('is-hidden');
			}
		}, 6000);
		this.layout();
	}

	destroyIframe() {
		clearTimeout(this.loadTimer);
		this.loadTimer = null;
		if (this.iframe) {
			const f = this.iframe;
			this.iframe = null;
			try { f.src = 'about:blank'; } catch (e) {}
			f.remove();
		}
		document.querySelectorAll('iframe#cd-preview-iframe').forEach(f => f.remove());
		this.loaded = false;
	}

	layout() {
		const stage = document.getElementById('cd-stage');
		const inner = document.getElementById('cd-stage-inner');
		const host = document.getElementById('cd-frame-host');
		if (!stage || !inner || !host) return;
		const rect = stage.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return;
		stage.dataset.view = this.view;
		this.root.querySelectorAll('[data-cd-act="view"]').forEach(b => {
			const on = b.getAttribute('data-arg') === this.view;
			b.classList.toggle('is-active', on);
			b.setAttribute('aria-pressed', on ? 'true' : 'false');
		});
		if (this.view === 'scene') {
			const s = Math.min(rect.width / SCENE_W, rect.height / SCENE_H) * 0.97;
			inner.style.width = `${SCENE_W}px`;
			inner.style.height = `${SCENE_H}px`;
			inner.style.left = '50%';
			inner.style.top = '50%';
			inner.style.bottom = 'auto';
			inner.style.transformOrigin = 'center center';
			inner.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
			host.style.left = `${OBS_X}px`;
			host.style.top = '0px';
			host.style.transform = 'none';
		} else {
			const s = Math.min(1, (rect.width - 32) / WIDGET_W);
			const top = this.direction === 'top';
			inner.style.width = `${WIDGET_W}px`;
			inner.style.height = `${WIDGET_H}px`;
			inner.style.left = '50%';
			inner.style.top = top ? '0px' : 'auto';
			inner.style.bottom = top ? 'auto' : '0px';
			inner.style.transformOrigin = top ? 'top center' : 'bottom center';
			inner.style.transform = `translateX(-50%) scale(${s.toFixed(4)})`;
			host.style.left = '0px';
			host.style.top = '0px';
			host.style.transform = 'none';
		}
		host.style.width = `${WIDGET_W}px`;
		host.style.height = `${WIDGET_H}px`;
		host.style.transformOrigin = 'top left';
	}

	evaluate(state) {
		const c = normalizeChatConfig(state.config.widgets.chat);
		const stage = document.getElementById('cd-stage');
		if (stage) stage.classList.toggle('is-off', !c.isActive);
		const off = document.getElementById('cd-stage-off');
		if (off) off.classList.toggle('is-hidden', c.isActive);
		const loading = document.getElementById('cd-stage-loading');
		if (loading && this.loaded) loading.classList.add('is-hidden');
		const chip = document.getElementById('cd-hud-pause');
		if (chip) chip.classList.toggle('is-hidden', !c.paused);
		if (c.direction !== this.direction) { this.direction = c.direction; this.layout(); }
	}
}