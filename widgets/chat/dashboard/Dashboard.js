/* ФАЙЛ: widgets/chat/dashboard/Dashboard.js — v5 (тонкий оркестратор: ctx, CSS-preload, статус, маршрутизация событий, жизненный цикл) */
import { store } from '../../../js/store.js';
import { Toast } from '../../../js/components/toast.js';
import { setHashParams } from '../../../js/utils/hashParams.js';
import '../custom/index.js';
import { normalizeChatConfig } from '../config.js';
import { getSkin } from '../skins.js';
import { renderTemplate } from './template.js';
import { StageController } from './stage.js';
import { SkinsPanel } from './skinsPanel.js';
import { ControlsController } from './controls.js';
import { ComposerPanel } from './composer.js';
import { LogPanel } from './logPanel.js';
import { CSS_FILES, CSS_TIMEOUT, LIVE_TTL, setText } from './constants.js';

/* Экспорт вверху: ниже только hoisted function declarations. */
export default { render: renderTemplate, preload, mount, onParamsChange, unmount };

let ctx = null;
let cssPromise = null;

/* ---------- стили (CSS-first, идемпотентно, никогда не реджектится) ---------- */
function loadOneCss({ id, href }) {
	return new Promise((resolve) => {
		const ex = document.getElementById(id);
		if (ex) {
			if (ex.dataset.loaded === '1') { resolve(true); return; }
			ex.addEventListener('load', () => resolve(true), { once: true });
			ex.addEventListener('error', () => resolve(false), { once: true });
			return;
		}
		const link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.loaded = '0';
		link.onload = () => { link.dataset.loaded = '1'; resolve(true); };
		link.onerror = () => { console.error('[ChatDash:css] не загрузился:', href); link.remove(); resolve(false); };
		document.head.appendChild(link);
	});
}

function preload() {
	if (cssPromise) return cssPromise;
	const t0 = performance.now();
	const all = Promise.all(CSS_FILES.map(loadOneCss)).then((res) => {
		const ok = res.every(Boolean);
		if (ok) console.log(`[ChatDash:css] стили готовы за ${Math.round(performance.now() - t0)}мс`);
		else console.warn('[ChatDash:css] часть стилей недоступна');
		return ok;
	});
	let timer = null;
	const guard = new Promise((resolve) => {
		timer = setTimeout(() => { console.warn('[ChatDash:css] таймаут стилей'); resolve(false); }, CSS_TIMEOUT);
	});
	cssPromise = Promise.race([all, guard]).then((ok) => {
		if (timer) { clearTimeout(timer); timer = null; }
		if (!ok) cssPromise = null;
		return ok;
	});
	return cssPromise;
}

/* ---------- helpers ---------- */
function set(patch) {
	try { store.updateConfig({ widgets: { chat: patch } }); }
	catch (e) {
		console.error('[ChatDash] Настройка не сохранилась:', e);
		if (ctx) ctx.toast.error('Настройка не сохранилась.');
	}
}

function setBadge(id, cls, text) {
	const el = document.getElementById(id);
	if (!el) return;
	el.className = `cd-badge ${cls}`;
	el.innerHTML = `<span class="cd-badge-dot"></span>${text}`;
}

function pickLive() {
	if (!ctx) return null;
	const now = Date.now();
	const { obs, preview } = ctx.live;
	if (obs && now - obs.ts < LIVE_TTL) return obs;
	if (preview && now - preview.ts < LIVE_TTL) return preview;
	return null;
}

/* ---------- статус-бейджи и полоса «сейчас» ---------- */
function renderStatus(state, live) {
	const c = normalizeChatConfig(state.config.widgets.chat);
	const online = Boolean(state.serverOnline);
	const skin = getSkin(c.skin);
	setBadge('cd-badge-server', online ? 'cd-badge-live' : 'cd-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
	setBadge('cd-badge-state', c.isActive ? 'cd-badge-live' : 'cd-badge-warn', c.isActive ? 'НА ЭКРАНЕ' : 'СКРЫТ');
	setBadge('cd-badge-source',
		live ? (live.source === 'obs' ? 'cd-badge-live' : 'cd-badge-info') : 'cd-badge-off',
		live ? (live.source === 'obs' ? 'СИГНАЛ ИЗ OBS' : 'СИГНАЛ ИЗ ПРЕВЬЮ') : 'НЕТ СИГНАЛА');
	setBadge('cd-badge-count', 'cd-badge-info', `${live ? live.count : 0} В КАДРЕ`);
	setText('cd-now-skin-title', skin.title);
	setText('cd-stat-msg', live ? live.count : 0);
	setText('cd-stat-uniq', live ? live.unique : 0);
	setText('cd-stat-emote', live ? live.emotes : 0);
	setText('cd-hud-skin', skin.title);
	const now = document.getElementById('cd-now');
	if (now) {
		now.classList.toggle('is-off', !c.isActive);
		now.style.setProperty('--now-accent', c.accentMode === 'fixed' ? c.accentColor : '#ff4d85');
	}
	setText('cd-now-user', ctx.last ? ctx.last.user : '—');
	setText('cd-now-text', ctx.last ? ctx.last.text : 'ждём сигнал из виджета');
}

function evaluate() {
	if (!ctx) return;
	try {
		const state = store.getState();
		const c = normalizeChatConfig(state.config.widgets.chat);
		renderStatus(state, pickLive());
		ctx.controls.sync(c);
		ctx.skins.render(state);
		ctx.composer.render(state);
		ctx.stage.evaluate(state);
	} catch (e) {
		console.error('[ChatDash] evaluate провален:', e);
	}
}

/* ---------- единый маршрутизатор кликов (один слушатель на root) ---------- */
function onClick(e) {
	if (!ctx) return;
	const t = e.target;
	const setBtn = t.closest('[data-cd-set]');
	if (setBtn) {
		e.preventDefault();
		const key = setBtn.getAttribute('data-cd-set');
		const value = setBtn.getAttribute('data-cd-value');
		if (key === 'skin') ctx.skins.pickSkin(value, setBtn);
		else ctx.controls.setSegment(key, value);
		return;
	}
	const btn = t.closest('[data-cd-act]');
	if (!btn) return;
	const act = btn.getAttribute('data-cd-act');
	const arg = btn.getAttribute('data-arg');
	e.preventDefault();
	switch (act) {
		case 'view':
			if (arg !== ctx.stage.view) setHashParams({ view: arg === 'focus' ? null : arg, id: 'chat' });
			return;
		case 'refresh':
			btn.classList.add('is-spin');
			setTimeout(() => { if (btn.isConnected) btn.classList.remove('is-spin'); }, 900);
			ctx.stage.refresh();
			ctx.toast.info('Превью перезапущено.');
			return;
		case 'show': set({ isActive: true }); ctx.toast.success('Чат снова на экране.'); return;
		case 'reset': ctx.controls.reset(); return;
		case 'random': ctx.controls.randomize(); return;
		case 'export': ctx.controls.exportJson(); return;
		case 'copy': ctx.controls.copyChip(btn, arg || ''); return;
		case 'preset': ctx.composer.applyPreset(arg); return;
		case 'emote': ctx.composer.addEmote(arg); return;
		case 'randcolor': ctx.composer.randColor(); return;
		case 'send': ctx.composer.send(); return;
		case 'burst': ctx.composer.burst(); return;
		case 'pause': ctx.composer.togglePause(); return;
		case 'clear': ctx.composer.clearChat(); return;
		case 'us-add': ctx.skins.addUserSkin(); return;
		case 'us-del': ctx.skins.removeUserSkin(arg); return;
		case 'log-pause':
		case 'log-clear': ctx.log.handleAction(act, btn); return;
		default: return;
	}
}

function onInput(e) { if (ctx) ctx.controls.onInput(e); }
function onChange(e) {
	if (!ctx) return;
	if (ctx.composer.onChange(e)) return;
	ctx.controls.onChange(e);
}
function onKey(e) {
	if (!ctx) return;
	if (ctx.composer.onKey(e)) return;
	ctx.skins.onKey(e);
}

/* ---------- жизненный цикл ---------- */
function mount(params, state) {
	const root = document.getElementById('cd-main');
	if (!root) return;
	unmount();
	preload();
	const toast = new Toast(document.getElementById('cd-toasts'), { className: 'cd-toast' });
	ctx = {
		root, toast,
		stage: new StageController({ root, store, toast }),
		skins: new SkinsPanel({ root, store, toast }),
		controls: new ControlsController({ root, store, toast }),
		composer: new ComposerPanel({ root, store, toast }),
		log: new LogPanel({ root, toast }),
		live: { obs: null, preview: null }, last: null, seen: new Set(),
		tick: null, unsub: null, unsubAction: null, handlers: {}
	};
	ctx.stage.mount(params, state);
	ctx.skins.mount();
	ctx.controls.mount();
	ctx.composer.mount();
	ctx.log.mount();

	ctx.handlers.click = (e) => onClick(e);
	ctx.handlers.input = (e) => onInput(e);
	ctx.handlers.change = (e) => onChange(e);
	ctx.handlers.key = (e) => onKey(e);
	root.addEventListener('click', ctx.handlers.click);
	root.addEventListener('input', ctx.handlers.input);
	root.addEventListener('change', ctx.handlers.change);
	root.addEventListener('keydown', ctx.handlers.key);

	ctx.unsub = store.subscribe(() => evaluate());
	ctx.unsubAction = store.onAction((action, payload) => {
		if (!ctx || !payload) return;
		if (action === 'CHAT_STATE') {
			const source = payload.source === 'obs' ? 'obs' : 'preview';
			ctx.live[source] = {
				source,
				count: Number(payload.count ?? 0),
				unique: Number(payload.unique ?? 0),
				emotes: Number(payload.emotes ?? 0),
				ts: Number(payload.ts || Date.now())
			};
			evaluate();
			return;
		}
		if (action === 'CHAT_MESSAGE') {
			const key = `${payload.source}:${payload.id}`;
			if (ctx.seen.has(key)) return;
			ctx.seen.add(key);
			if (ctx.seen.size > 500) ctx.seen.clear();
			ctx.last = { user: String(payload.user || '—'), text: String(payload.text || '') };
			ctx.log.pushMessage(payload);
			evaluate();
			return;
		}
		if (action === 'CHAT_FILTERED') {
			const key = `drop:${payload.source}:${payload.ts}:${payload.user}`;
			if (ctx.seen.has(key)) return;
			ctx.seen.add(key);
			ctx.log.pushFiltered(payload);
		}
	});
	ctx.tick = setInterval(() => evaluate(), 2500);
	evaluate();
	store.broadcastAction('CHAT_REQUEST_STATE', {});
	console.log('[ChatDash] v5 смонтирован (модульный)', params);
}

function onParamsChange(params) {
	if (!ctx) return false;
	if ((params?.id || 'player') !== 'chat') return false;
	ctx.stage.setParams(params);
	return true;
}

function unmount() {
	if (!ctx) return;
	console.log('[ChatDash] Размонтирование');
	if (ctx.unsub) ctx.unsub();
	if (ctx.unsubAction) ctx.unsubAction();
	if (ctx.tick) clearInterval(ctx.tick);
	if (ctx.root && ctx.handlers) {
		ctx.root.removeEventListener('click', ctx.handlers.click);
		ctx.root.removeEventListener('input', ctx.handlers.input);
		ctx.root.removeEventListener('change', ctx.handlers.change);
		ctx.root.removeEventListener('keydown', ctx.handlers.key);
	}
	ctx.log.unmount();
	ctx.composer.unmount();
	ctx.controls.unmount();
	ctx.skins.unmount();
	ctx.stage.unmount();
	ctx = null;
	document.querySelectorAll('iframe#cd-preview-iframe').forEach(f => f.remove());
}