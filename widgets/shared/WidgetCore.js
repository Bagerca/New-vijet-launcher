/* ====================================================================
WIDGET CORE — v4.1
Leader Election, автономная работа (file://), Event Bus.
+ sendAction: WS → localStorage fallback.
+ onTwitchEvent: событие канала рассылается всем экземплярам по шине.
+ WIDGET_HELLO: регистрация виджета на сервере.
+ onSocketOpen: колбэк сразу после открытия WS — телеметрия уходит без задержки.
==================================================================== */
const INSTANCE_ID = Math.random().toString(36).substring(2, 9);
const IS_LOCAL_FILE = window.location.protocol === 'file:';
const HOST = window.location.host || 'localhost:42069';
const IS_PREVIEW = window.location.search.includes('preview=1');
const FOLLOW_POLL_MS = 60000;

function detectWidgetId() {
try {
const m = window.location.pathname.match(/\/([a-z0-9_-]+)\/index\.html$/i);
if (m) return m[1].toLowerCase();
} catch (e) {}
return 'unknown';
}

export const WidgetCore = {
globalConfig: null,
ws: null,
tmiClient: null,
currentChannel: null,
thirdPartyEmotes: new Map(),
isMaster: false,
bus: null,
widgetId: detectWidgetId(),
source: IS_PREVIEW ? 'preview' : 'obs',
instanceId: INSTANCE_ID,
_electionInterval: null,
_wsUpdateTimer: null,
_helloTimer: null,
_followTimer: null,
_eventsBound: false,
callbacks: {
onConfigUpdate: (config) => {},
onTwitchCommand: (cmd, args, tags, message) => {},
onTwitchMessage: (tags, message) => {},
onTwitchEvent: (kind, payload) => {},
onWidgetAction: (action, payload) => {},
onMasterStatusChange: (isMaster) => {},
onSocketOpen: () => {}
},
init: function(callbacks = {}) {
const { widgetId, source, ...rest } = callbacks;
if (widgetId) this.widgetId = String(widgetId);
if (source) this.source = String(source);
this.callbacks = { ...this.callbacks, ...rest };
this._setupStorageListeners();
this._loadConfig();
},
updateWidgetConfig: function(widgetId, newWidgetData) {
if (!this.globalConfig) return;
if (!this.globalConfig.widgets) this.globalConfig.widgets = {};
if (!this.globalConfig.widgets[widgetId]) this.globalConfig.widgets[widgetId] = {};
this.globalConfig.widgets[widgetId] = { ...this.globalConfig.widgets[widgetId], ...newWidgetData };
if (this.callbacks.onConfigUpdate) this.callbacks.onConfigUpdate(this.globalConfig);
if (!IS_LOCAL_FILE && this.ws && this.ws.readyState === 1) {
if (this._wsUpdateTimer) clearTimeout(this._wsUpdateTimer);
this._wsUpdateTimer = setTimeout(() => {
try { this.ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: this.globalConfig })); }
catch (e) { console.warn('[WidgetCore] UPDATE_CONFIG не отправлен:', e); }
}, 50);
} else {
try { localStorage.setItem('stream_pack_config', JSON.stringify(this.globalConfig)); } catch (e) {}
}
},
sendAction: function(action, payload) {
if (this.ws && this.ws.readyState === 1) {
try {
this.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action, payload }));
return true;
} catch (e) { console.warn('[WidgetCore] WS send упал, пробую шину:', e); }
}
try {
localStorage.setItem('stream_pack_action', JSON.stringify({ action, payload, _n: Date.now() + Math.random() }));
return true;
} catch (e) { return false; }
},
broadcastState: function(payload) {
if (this.isMaster && this.bus) this.bus.postMessage({ type: 'SYNC_STATE', payload });
},
_emitEvent: function(kind, payload) {
if (!this.isMaster || !payload) return;
const body = { ...payload, kind, eventId: `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}` };
console.log(`[WidgetCore:${this.widgetId}] Событие канала → ${kind}`, body);
try { if (this.callbacks.onTwitchEvent) this.callbacks.onTwitchEvent(kind, body); }
catch (e) { console.error('[WidgetCore] onTwitchEvent:', e); }
if (this.bus) { try { this.bus.postMessage({ type: 'EVENT', kind, payload: body }); } catch (e) {} }
},
_setupTMI: async function(channel) {
if (typeof tmi === 'undefined' || !channel) return;
this.currentChannel = channel;
if (!this.bus) {
try {
this.bus = new BroadcastChannel('stream_pack_tmi_bus');
this.bus.onmessage = (e) => {
const d = e.data || {};
if (d.type === 'EVENT') {
try { if (this.callbacks.onTwitchEvent) this.callbacks.onTwitchEvent(d.kind, d.payload); }
catch (err) { console.error('[WidgetCore] EVENT:', err); }
return;
}
if (this.isMaster) return;
if (d.type === 'MSG') { if (this.callbacks.onTwitchMessage) this.callbacks.onTwitchMessage(d.tags, d.message); }
else if (d.type === 'CMD') { if (this.callbacks.onTwitchCommand) this.callbacks.onTwitchCommand(d.cmd, d.args, d.tags, d.message); }
else if (d.type === 'SYNC_STATE') { if (this.callbacks.onWidgetAction) this.callbacks.onWidgetAction('SYNC_STATE', d.payload); }
};
} catch (e) { console.warn('[WidgetCore] BroadcastChannel недоступен:', e); }
}
if (this._electionInterval) clearInterval(this._electionInterval);
this._electionInterval = setInterval(() => this._checkMaster(), 2000);
this._checkMaster();
this._startFollowWatcher();
},
_checkMaster: function() {
const now = Date.now();
if (!IS_PREVIEW) { try { localStorage.setItem('TMI_OBS_HEARTBEAT', now.toString()); } catch (e) {} }
if (IS_PREVIEW) {
const obsHb = parseInt(localStorage.getItem('TMI_OBS_HEARTBEAT') || '0', 10);
if (now - obsHb < 4000) {
if (this.isMaster) {
this.isMaster = false;
if (this.tmiClient) { try { this.tmiClient.disconnect(); } catch (e) {} }
if (this.callbacks.onMasterStatusChange) this.callbacks.onMasterStatusChange(false);
}
return;
}
}
const lastHb = parseInt(localStorage.getItem('TMI_HEARTBEAT') || '0', 10);
if (this.isMaster) { try { localStorage.setItem('TMI_HEARTBEAT', now.toString()); } catch (e) {} return; }
if (now - lastHb > 4000) {
this.isMaster = true;
try {
localStorage.setItem('TMI_MASTER_ID', INSTANCE_ID);
localStorage.setItem('TMI_HEARTBEAT', now.toString());
} catch (e) {}
console.log(`[WidgetCore:${this.widgetId}] Стал мастером (${this.source})`);
if (this.callbacks.onMasterStatusChange) this.callbacks.onMasterStatusChange(true);
this._connectTMI();
}
},
_bindTmiEvents: function() {
if (this._eventsBound || !this.tmiClient) return;
this._eventsBound = true;
const nameOf = (tags, fb) => (tags && (tags['display-name'] || tags.login || tags.username)) || fb || 'Зритель';
try {
this.tmiClient.on('subscription', (ch, username, method, message, tags) => {
this._emitEvent('sub', { user: nameOf(tags, username), message: String(message || ''), value: 0 });
});
this.tmiClient.on('resub', (ch, username, months, message, tags) => {
this._emitEvent('resub', { user: nameOf(tags, username), message: String(message || ''), value: parseInt(months, 10) || 1 });
});
this.tmiClient.on('subgift', (ch, username, streak, recipient, methods, tags) => {
this._emitEvent('gift', { user: nameOf(tags, username), message: recipient ? `для ${recipient}` : '', value: 1 });
});
this.tmiClient.on('submysterygift', (ch, username, count, methods, tags) => {
const n = parseInt(count, 10) || 1;
this._emitEvent('gift', { user: nameOf(tags, username), message: `раздал ${n} подписок`, value: n });
});
this.tmiClient.on('cheer', (ch, tags, message) => {
this._emitEvent('cheer', { user: nameOf(tags), message: String(message || ''), value: parseInt(tags && tags.bits, 10) || 0 });
});
this.tmiClient.on('raided', (ch, username, viewers) => {
this._emitEvent('raid', { user: username || 'Стример', message: '', value: parseInt(viewers, 10) || 0 });
});
console.log(`[WidgetCore:${this.widgetId}] Слушатели событий канала подключены`);
} catch (e) {
console.error('[WidgetCore] События канала не подключились:', e);
this._eventsBound = false;
}
},
_startFollowWatcher: function() {
if (this._followTimer) return;
const key = () => `uso_follow_count_${this.currentChannel}`;
const poll = async () => {
if (!this.isMaster || !this.currentChannel) return;
try {
const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${this.currentChannel}`);
if (!res.ok) return;
const data = await res.json();
const count = data && data[0] ? Number(data[0].followers) : NaN;
if (isNaN(count)) return;
let prev = null;
try { prev = parseInt(localStorage.getItem(key()) || '', 10); } catch (e) {}
try { localStorage.setItem(key(), String(count)); } catch (e) {}
if (prev === null || isNaN(prev)) return;
const delta = count - prev;
if (delta > 0) {
this._emitEvent('follow', { user: delta > 1 ? `${delta} новых фолловеров` : 'Новый фолловер', message: '', value: delta });
}
} catch (e) { /* сеть недоступна — молчим */ }
};
this._followTimer = setInterval(poll, FOLLOW_POLL_MS);
setTimeout(poll, 4000);
},
_connectTMI: async function() {
if (this.tmiClient) { try { await this.tmiClient.disconnect(); } catch (e) {} }
this._eventsBound = false;
this.tmiClient = new tmi.Client({ channels: [this.currentChannel] });
this.tmiClient.on('message', (chan, tags, message) => {
if (this.callbacks.onTwitchMessage) this.callbacks.onTwitchMessage(tags, message);
if (this.bus) { try { this.bus.postMessage({ type: 'MSG', tags, message }); } catch (e) {} }
const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1') || tags.username === this.currentChannel;
const t = message.trim();
if (isMod && t.startsWith('!')) {
const parts = t.split(' ');
const cmd = parts[0].toLowerCase();
const args = parts.slice(1);
if (this.callbacks.onTwitchCommand) this.callbacks.onTwitchCommand(cmd, args, tags, message);
if (this.bus) { try { this.bus.postMessage({ type: 'CMD', cmd, args, tags, message }); } catch (e) {} }
}
});
this._bindTmiEvents();
try {
await this.tmiClient.connect();
console.log(`[WidgetCore:${this.widgetId}] TMI подключён к #${this.currentChannel}`);
} catch (e) { console.warn('[WidgetCore] TMI не подключился:', e && e.message); }
},
parseMessageToHTML: function(text, twitchEmotes) {
let tokens = [];
let nativePositions = [];
if (twitchEmotes) {
Object.entries(twitchEmotes).forEach(([id, positions]) => {
positions.forEach(pos => {
const [start, end] = pos.split('-').map(Number);
nativePositions.push({ start, end, id });
});
});
}
nativePositions.sort((a, b) => a.start - b.start);
let currentIndex = 0;
const processTextFor3rdParty = (textPart) => {
textPart.split(/(\s+)/).forEach(part => {
if (part.trim() === '') tokens.push({ type: 'text', content: part });
else if (this.thirdPartyEmotes.has(part)) tokens.push({ type: 'emote', url: this.thirdPartyEmotes.get(part), alt: part });
else tokens.push({ type: 'text', content: part });
});
};
nativePositions.forEach(({ start, end, id }) => {
if (start > currentIndex) processTextFor3rdParty(text.substring(currentIndex, start));
tokens.push({ type: 'emote', url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`, alt: text.substring(start, end + 1) });
currentIndex = end + 1;
});
if (currentIndex < text.length) processTextFor3rdParty(text.substring(currentIndex));
const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
return tokens.map(t => t.type === 'emote' ? `<img class="chat-emote" src="${t.url}" alt="${t.alt}">` : escapeHtml(t.content)).join('');
},
getEmotesFromMessage: function(text, twitchEmotes) {
let result = [];
if (twitchEmotes) {
Object.entries(twitchEmotes).forEach(([id, positions]) => {
result.push({ url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`, count: positions.length });
});
}
const counts = {};
text.split(/\s+/).forEach(w => { if (this.thirdPartyEmotes.has(w)) counts[w] = (counts[w] || 0) + 1; });
Object.entries(counts).forEach(([name, count]) => result.push({ url: this.thirdPartyEmotes.get(name), count }));
return result;
},
async _loadThirdPartyEmotes(channelLogin) {
const cacheKey = `uso_emotes_cache_${channelLogin}`;
try {
const cached = localStorage.getItem(cacheKey);
if (cached) {
const parsed = JSON.parse(cached);
if (Date.now() - parsed.ts < 6 * 3600 * 1000) { this.thirdPartyEmotes = new Map(parsed.emotes); return; }
}
} catch (e) {}
this.thirdPartyEmotes.clear();
try {
const ivrRes = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${channelLogin}`);
const ivrData = await ivrRes.json();
const twitchId = ivrData[0]?.id;
if (!twitchId) return;
await Promise.allSettled([
fetch('https://7tv.io/v3/emote-sets/global').then(r=>r.json()).then(d => d.emotes?.forEach(e => this.thirdPartyEmotes.set(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`))),
fetch(`https://7tv.io/v3/users/twitch/${twitchId}`).then(r=>r.json()).then(d => d.emote_set?.emotes?.forEach(e => this.thirdPartyEmotes.set(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`))),
fetch('https://api.betterttv.net/3/cached/emotes/global').then(r=>r.json()).then(d => d.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`))),
fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`).then(r=>r.json()).then(d => { d.channelEmotes?.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)); d.sharedEmotes?.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`)); }),
fetch('https://api.frankerfacez.com/v1/set/global').then(r=>r.json()).then(d => { if(d.sets) Object.values(d.sets).forEach(s => s.emoticons?.forEach(e => this.thirdPartyEmotes.set(e.name, e.urls['2']||e.urls['1']))) }),
fetch(`https://api.frankerfacez.com/v1/room/id/${twitchId}`).then(r=>r.json()).then(d => { if(d.sets) Object.values(d.sets).forEach(s => s.emoticons?.forEach(e => this.thirdPartyEmotes.set(e.name, e.urls['2']||e.urls['1']))) })
]);
try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), emotes: Array.from(this.thirdPartyEmotes.entries()) })); } catch (e) {}
} catch (e) {}
},
_loadConfig: function() {
try {
const saved = localStorage.getItem('stream_pack_config');
if (saved) this._handleNewConfig(JSON.parse(saved));
} catch (e) {}
if (!IS_LOCAL_FILE) {
fetch(`http://${HOST}/api/config`)
.then(res => res.json())
.then(config => { this._handleNewConfig(config); this._setupWS(); })
.catch(() => this._setupWS());
}
},
_handleNewConfig: function(config) {
this.globalConfig = config;
if (this.callbacks.onConfigUpdate) this.callbacks.onConfigUpdate(this.globalConfig);
const newChannel = (config.twitchChannel || '').replace(/[@#]/g, '').trim().toLowerCase();
if (newChannel && newChannel !== this.currentChannel) {
this._loadThirdPartyEmotes(newChannel);
this._setupTMI(newChannel);
}
},
_hello: function() {
if (!this.ws || this.ws.readyState !== 1) return;
try {
this.ws.send(JSON.stringify({
event: 'WIDGET_HELLO',
widget: this.widgetId,
source: this.source,
instanceId: this.instanceId,
master: this.isMaster
}));
} catch (e) {}
},
_setupWS: function() {
if (IS_LOCAL_FILE) return;
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
this.ws = new WebSocket(`${protocol}//${HOST}`);
this.ws.onopen = () => {
this._hello();
if (this._helloTimer) clearInterval(this._helloTimer);
this._helloTimer = setInterval(() => this._hello(), 5000);
// Виджет отдаёт своё состояние сразу, а не ждёт ближайшего heartbeat.
try { if (this.callbacks.onSocketOpen) this.callbacks.onSocketOpen(); }
catch (e) { console.error('[WidgetCore] onSocketOpen:', e); }
};
this.ws.onmessage = (event) => {
try {
const message = JSON.parse(event.data);
if (message.event === 'CONFIG_UPDATED') {
try { localStorage.setItem('stream_pack_config', JSON.stringify(message.data)); } catch (e) {}
this._handleNewConfig(message.data);
} else if (message.event === 'WIDGET_ACTION' && this.callbacks.onWidgetAction) {
this.callbacks.onWidgetAction(message.action, message.payload);
}
} catch (e) {}
};
this.ws.onclose = () => {
if (this._helloTimer) { clearInterval(this._helloTimer); this._helloTimer = null; }
setTimeout(() => this._setupWS(), 3000);
};
},
_setupStorageListeners: function() {
window.addEventListener('storage', (e) => {
if (e.key === 'stream_pack_config' && e.newValue) {
if (!IS_LOCAL_FILE && this.ws && this.ws.readyState === 1) return;
try { this._handleNewConfig(JSON.parse(e.newValue)); } catch (err) {}
}
if (e.key === 'stream_pack_action' && e.newValue) {
if (!IS_LOCAL_FILE && this.ws && this.ws.readyState === 1) return;
try {
const data = JSON.parse(e.newValue);
if (this.callbacks.onWidgetAction) this.callbacks.onWidgetAction(data.action, data.payload);
} catch (err) {}
}
});
}
};