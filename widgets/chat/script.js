/* ФАЙЛ: widgets/chat/script.js — v4 (тонкий вход: сборка модулей + WidgetCore) */
import { WidgetCore } from '../shared/WidgetCore.js';
import './custom/index.js';
import { createChatApp } from './runtime/chatApp.js';
import { fromTwitch } from './runtime/messageSource.js';
import { handleChatCommand } from './runtime/commands.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get('preview') === '1';
const SOURCE = IS_PREVIEW ? 'preview' : 'obs';

const app = createChatApp({
	container: document.getElementById('chat-container'),
	list: document.getElementById('chat-messages'),
	source: SOURCE
});

app.init();

WidgetCore.init({
	onConfigUpdate: (config) => { if (config?.widgets?.chat) app.applyConfig(config.widgets.chat); },
	onTwitchMessage: (tags, message) => app.push(fromTwitch(tags, message)),
	onTwitchCommand: (cmd, args) => handleChatCommand(cmd, args, app),
	onWidgetAction: (action, payload) => app.handleAction(action, payload)
});