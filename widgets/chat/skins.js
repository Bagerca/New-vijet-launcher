/* ФАЙЛ: widgets/chat/skins.js — v4 (РЕЕСТР СКИНОВ: registerSkin + css/template/effects, фундамент персональных баблов)
 *
 * Контракт кастомного скина (descriptor):
 *   id       — уникальный, /^[a-z0-9-]{2,24}$/ (built-in id защищены от перезаписи)
 *   title    — имя для UI
 *   hint     — короткое описание для галереи
 *   tone     — 'dark' | 'light' (подсказка для UI)
 *   usesBg   — использует ли скин пользовательские цвета фона/текста
 *   css      — (опц.) АБСОЛЮТНЫЙ href стилей: new URL('./my.css', import.meta.url).href
 *   template — (опц.) (meta, parts) => innerHTML бабла. parts = { flag, reply, badges } (готовые безопасные фрагменты).
 *              Обязательные hook-классы внутри шаблона: .chat-user, .chat-time, .chat-text-inner,
 *              .chat-avatar, .chat-avatar-slot (опц.), .chat-reply-name/.chat-reply-text/.chat-reply-avatar (если есть reply).
 *              meta.html УЖЕ экранирован (WidgetCore.parseMessageToHTML). Сырой текст — только через textContent.
 *   effects  — (опц.) { onMount(el, ctx), onUnmount(el) }. onMount может вернуть функцию очистки.
 *              Любая ошибка шаблона/эффекта изолируется: бабл падает обратно на дефолтный скелет, чат живёт.
 *
 * Токен-контракт для CSS скина (наследуются от .chat-block):
 *   --u / --u-rgb / --u2-rgb — акцент зрителя; --chat-pad, --chat-radius, --chat-border,
 *   --chat-blur, --chat-shadow, --chat-font, --chat-font-size, --chat-nick-size, --chat-avatar, --chat-line.
 */

const registry = new Map();
const cssPromises = new Map();
const BUILTIN_IDS = new Set();

export const DEFAULT_SKIN = 'glass';
export const SKIN_SAMPLE = { user: 'ksusha__sher', color: '#ff4d85', text: 'го катку, я уже в лобби', time: '21:04' };

export function registerSkin(descriptor) {
	try {
		if (!descriptor || typeof descriptor !== 'object') throw new Error('descriptor не объект');
		const id = String(descriptor.id || '').toLowerCase();
		if (!/^[a-z0-9-]{2,24}$/.test(id)) throw new Error(`некорректный id "${id}"`);
		if (registry.has(id)) {
			if (BUILTIN_IDS.has(id)) console.warn(`[Skins] "${id}" — встроенный скин, перезапись запрещена.`);
			else console.warn(`[Skins] "${id}" уже зарегистрирован, пропускаю.`);
			return false;
		}
		const skin = {
			id,
			title: String(descriptor.title || id),
			hint: String(descriptor.hint || ''),
			tone: descriptor.tone === 'light' ? 'light' : 'dark',
			usesBg: descriptor.usesBg === true,
			css: typeof descriptor.css === 'string' && descriptor.css ? descriptor.css : null,
			template: typeof descriptor.template === 'function' ? descriptor.template : null,
			effects: null,
			builtin: descriptor.builtin === true
		};
		if (descriptor.effects && typeof descriptor.effects === 'object') {
			skin.effects = {
				onMount: typeof descriptor.effects.onMount === 'function' ? descriptor.effects.onMount : null,
				onUnmount: typeof descriptor.effects.onUnmount === 'function' ? descriptor.effects.onUnmount : null
			};
		}
		registry.set(id, skin);
		if (skin.builtin) BUILTIN_IDS.add(id);
		console.log(`[Skins] зарегистрирован: ${id}${skin.builtin ? ' (builtin)' : ' (custom)'}`);
		return true;
	} catch (e) {
		console.error('[Skins] Регистрация скина провалена:', e);
		return false;
	}
}

export function listSkins() { return Array.from(registry.values()); }
export function skinIds() { return listSkins().map(s => s.id); }
export function isKnownSkin(id) { return registry.has(String(id || '').toLowerCase()); }
export function getSkin(id) { return registry.get(String(id || '').toLowerCase()) || registry.get(DEFAULT_SKIN); }
export function normalizeSkinId(id) { return getSkin(id).id; }

/** Персональное назначение v2: значение — строка (legacy) или { skin, accent?, params? }. */
export function resolvePersonal(config, username) {
	const map = (config && config.userSkins) || {};
	const entry = map[String(username || '').toLowerCase()];
	if (!entry) return null;
	if (typeof entry === 'string') return { skin: normalizeSkinId(entry), accent: null, params: {} };
	return {
		skin: normalizeSkinId(entry.skin),
		accent: typeof entry.accent === 'string' ? entry.accent : null,
		params: (entry.params && typeof entry.params === 'object') ? entry.params : {}
	};
}

/** Идемпотентная ленивая загрузка CSS скина. Никогда не реджектится. */
export function ensureSkinCss(skin) {
	if (!skin || !skin.css) return Promise.resolve(true);
	if (cssPromises.has(skin.id)) return cssPromises.get(skin.id);
	const p = new Promise((resolve) => {
		const linkId = `chat-skin-css-${skin.id}`;
		const existing = document.getElementById(linkId);
		if (existing) {
			if (existing.dataset.loaded === '1') { resolve(true); return; }
			existing.addEventListener('load', () => resolve(true), { once: true });
			existing.addEventListener('error', () => resolve(false), { once: true });
			return;
		}
		const link = document.createElement('link');
		link.id = linkId;
		link.rel = 'stylesheet';
		link.href = skin.css;
		link.dataset.loaded = '0';
		let timer = setTimeout(() => {
			console.warn(`[Skins] CSS "${skin.id}" не успел за 3с — рендерю без ожидания.`);
			cssPromises.delete(skin.id);
			resolve(false);
		}, 3000);
		link.onload = () => { clearTimeout(timer); link.dataset.loaded = '1'; resolve(true); };
		link.onerror = () => {
			clearTimeout(timer);
			console.error(`[Skins] CSS "${skin.id}" не загрузился: ${skin.css}`);
			link.remove();
			cssPromises.delete(skin.id);
			resolve(false);
		};
		document.head.appendChild(link);
	});
	cssPromises.set(skin.id, p);
	return p;
}

/* ================= ВСТРОЕННЫЕ 7 СКИНОВ (CSS-only, стили в bubble.css) ================= */
registerSkin({ id: 'glass', builtin: true, title: 'Стекло', hint: 'Светлый матовый бабл пака. Использует ваши цвета фона и текста.', tone: 'light', usesBg: true });
registerSkin({ id: 'neon', builtin: true, title: 'Неон', hint: 'Тёмная плашка с неоновым контуром по цвету ника.', tone: 'dark', usesBg: false });
registerSkin({ id: 'aurora', builtin: true, title: 'Аврора', hint: 'Двухцветное градиентное свечение: цвет ника + комплементарный.', tone: 'dark', usesBg: false });
registerSkin({ id: 'outline', builtin: true, title: 'Контур', hint: 'Прозрачный бабл: рамка и ник-плашка, максимум воздуха.', tone: 'dark', usesBg: false });
registerSkin({ id: 'sticker', builtin: true, title: 'Стикер', hint: 'Плотная плашка с жёсткой офсетной тенью — комикс.', tone: 'light', usesBg: true });
registerSkin({ id: 'terminal', builtin: true, title: 'Терминал', hint: 'Моноширинный лог со сканлайном. Для техно-стримов.', tone: 'dark', usesBg: false });
registerSkin({ id: 'minimal', builtin: true, title: 'Минимал', hint: 'Без бабла: строка, разделитель, тень для читаемости.', tone: 'dark', usesBg: false });