/* ФАЙЛ: widgets/chat/runtime/commands.js — v1 (модераторские !chat*-команды; скины проверяются по реестру) */
import { WidgetCore } from '../../shared/WidgetCore.js';
import { isTrue, CHAT_LIMITS } from '../config.js';
import { isKnownSkin } from '../skins.js';

export function handleChatCommand(cmd, args, app) {
	if (!WidgetCore.isMaster) return;
	const conf = { ...(WidgetCore.globalConfig?.widgets?.chat || {}) };
	const arg = (args[0] || '').toLowerCase();
	let changed = false;

	const numCmd = (key) => {
		const [min, max] = CHAT_LIMITS[key] || [0, 100];
		const n = parseInt(args[0], 10);
		if (!isNaN(n)) { conf[key] = Math.max(min, Math.min(max, n)); changed = true; }
	};
	const colorCmd = (key) => {
		let h = String(args[0] || '').trim();
		if (!h) return;
		if (!h.startsWith('#')) h = '#' + h;
		if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) { conf[key] = h; changed = true; }
	};

	if (cmd === '!chat') {
		const cur = conf.isActive === undefined ? true : isTrue(conf.isActive);
		conf.isActive = arg === 'on' ? true : (arg === 'off' ? false : !cur);
		changed = true;
	} else if (cmd === '!chatskin') {
		if (isKnownSkin(arg)) { conf.skin = arg; changed = true; }
	} else if (cmd === '!chatlife') numCmd('messageLife');
	else if (cmd === '!chatmax') numCmd('maxMessages');
	else if (cmd === '!chatsz') numCmd('fontSize');
	else if (cmd === '!chatop') numCmd('bgOpacity');
	else if (cmd === '!chatbg') colorCmd('bgColor');
	else if (cmd === '!chatc') colorCmd('textColor');
	else if (cmd === '!chatpause') {
		const cur = isTrue(conf.paused);
		conf.paused = arg === 'on' ? true : (arg === 'off' ? false : !cur);
		changed = true;
	} else if (cmd === '!chatclear') { app.clear(false); return; }

	if (changed) {
		WidgetCore.updateWidgetConfig('chat', conf);
		console.log(`[Chat] ${cmd} применена`);
	}
}