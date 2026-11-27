/* ФАЙЛ: backend/wsHub.js — v6.4 (реестр виджетов + SCENES_ENSURE/REFRESH + ALERTS_EMIT + запрос реестра) */
const WebSocket = require('ws');
class WsHub {
constructor({ server, config, queue, transport, registry, commands, scenes, onRemoteConfig }) {
this.config = config;
this.queue = queue;
this.transport = transport;
this.registry = registry;
this.commands = commands;
this.scenes = scenes || null;
this.onRemoteConfig = onRemoteConfig;
this.wss = new WebSocket.Server({ server });
this.widgets = new Map();
this._queueTimer = null;
this._configTimer = null;
this._pendingConfig = null;
this._pendingSender = null;
this._lastRosterJson = '';
this._lastWidgetJson = '';
this._bind();
this._sweepTimer = setInterval(() => { this.registry.sweep(); this._sweepWidgets(); }, 3000);
this._pingTimer = setInterval(() => this._keepalive(), 15000);
}
_bind() {
this.wss.on('connection', (ws, req) => {
ws.isAlive = true;
ws.on('pong', () => { ws.isAlive = true; });
console.log(`[WS] Подключение (${req.socket.remoteAddress}). Клиентов: ${this.wss.clients.size}`);
this.sendRaw(ws, { event: 'SERVER_HELLO', ts: Date.now() });
this.sendRoster(ws);
this.sendQueue(ws);
this.sendTransport(ws);
this.sendWidgetRoster(ws);
ws.on('message', (message) => this._onMessage(ws, message));
ws.on('close', () => {
const info = this.registry.getInfo(ws);
this.registry.unregister(ws);
if (this.widgets.delete(ws)) this.broadcastWidgetRoster();
if (!info) console.log(`[WS] Отключение клиента. Осталось: ${this.wss.clients.size}`);
});
ws.on('error', () => {});
});
}
_keepalive() {
this.wss.clients.forEach(c => {
if (c.isAlive === false) { try { c.terminate(); } catch (e) {} return; }
c.isAlive = false;
try { c.ping(); } catch (e) {}
});
}
sendRaw(client, obj) {
if (!client || client.readyState !== WebSocket.OPEN) return false;
try { client.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
}
broadcast(obj) {
const msg = JSON.stringify(obj);
this.wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) { try { c.send(msg); } catch (e) {} } });
}
widgetPayload() {
const list = [];
this.widgets.forEach(w => list.push({ widget: w.widget, source: w.source, instanceId: w.instanceId, master: !!w.master }));
list.sort((a, b) => (a.source + a.widget).localeCompare(b.source + b.widget));
return { widgets: list, ts: Date.now() };
}
sendWidgetRoster(client) {
this.sendRaw(client, { event: 'WIDGET_ACTION', action: 'WIDGET_ROSTER', payload: this.widgetPayload() });
}
broadcastWidgetRoster() {
const payload = this.widgetPayload();
const json = JSON.stringify(payload.widgets);
if (json === this._lastWidgetJson) return;
this._lastWidgetJson = json;
console.log(`[Widgets] ${payload.widgets.map(w => `${w.widget}:${w.source}`).join(', ') || 'пусто'}`);
this.broadcast({ event: 'WIDGET_ACTION', action: 'WIDGET_ROSTER', payload });
}
_sweepWidgets() {
const now = Date.now();
let changed = false;
this.widgets.forEach((w, ws) => {
if (now - w.lastSeen > 16000 || ws.readyState !== 1) { this.widgets.delete(ws); changed = true; }
});
if (changed) this.broadcastWidgetRoster();
}
broadcastRoster(payload) {
const json = JSON.stringify({ p: payload.players, a: payload.active, pr: payload.preferred });
if (json === this._lastRosterJson) return;
this._lastRosterJson = json;
console.log(`[Players] ${payload.players.map(p => `${p.mode}:${p.instanceId}`).join(', ') || 'пусто'} | активен: ${payload.active || 'нет'}`);
this.broadcast({ event: 'WIDGET_ACTION', action: 'PLAYER_ROSTER', payload });
}
broadcastQueue() {
if (this._queueTimer) clearTimeout(this._queueTimer);
this._queueTimer = setTimeout(() => {
this._queueTimer = null;
this.broadcast({ event: 'WIDGET_ACTION', action: 'PLAYER_QUEUE_STATE', payload: this.queue.payload() });
this.broadcastTransport();
}, 400);
}
broadcastTransport() {
this.broadcast({
event: 'WIDGET_ACTION', action: 'PLAYER_TRANSPORT',
payload: { ...this.transport.payload(), uid: this.queue.nowPlaying ? this.queue.nowPlaying.uid : null }
});
}
sendRoster(client) { this.sendRaw(client, { event: 'WIDGET_ACTION', action: 'PLAYER_ROSTER', payload: this.registry.payload() }); }
sendQueue(client) { this.sendRaw(client, { event: 'WIDGET_ACTION', action: 'PLAYER_QUEUE_STATE', payload: this.queue.payload() }); }
sendTransport(client) {
this.sendRaw(client, {
event: 'WIDGET_ACTION', action: 'PLAYER_TRANSPORT',
payload: { ...this.transport.payload(), uid: this.queue.nowPlaying ? this.queue.nowPlaying.uid : null }
});
}
sendToMode(mode, action, payload) {
const ws = this.registry.findWs(mode);
if (!ws) return false;
return this.sendRaw(ws, { event: 'WIDGET_ACTION', action, payload });
}
sendToActive(action, payload) {
const mode = this.registry.computeActive();
if (!mode) return false;
return this.sendToMode(mode, action, payload);
}
clientCount() { return this.wss.clients.size; }
_validateActiveReport(ws, parsed, label) {
const info = this.registry.getInfo(ws);
if (!info) return null;
if (this.registry.computeActive() !== info.mode) return null;
const activeId = this.registry.activeInstanceId();
if (activeId && parsed.instanceId && parsed.instanceId !== activeId) return null;
if (!this.queue.nowPlaying) return null;
if (!parsed.uid || parsed.uid !== this.queue.nowPlaying.uid) return null;
return info;
}
_handleScenes(action, payload) {
(async () => {
const isEnsure = action === 'SCENES_ENSURE';
const resultAction = isEnsure ? 'SCENES_ENSURE_RESULT' : 'SCENES_REFRESH_RESULT';
let result;
if (!this.scenes) result = { ok: false, message: 'Менеджер сцен не инициализирован' };
else result = isEnsure ? await this.scenes.ensure(payload) : await this.scenes.refresh(payload);
console.log(`[Scenes] ${action} → ${result.ok ? 'ok' : 'fail'}: ${result.message}`);
this.broadcast({ event: 'WIDGET_ACTION', action: resultAction, payload: { ...result, origin: payload.origin || 'ws', ts: Date.now() } });
})().catch(e => console.error('[Scenes] Ошибка:', e));
}
_onMessage(ws, message) {
let parsed;
try { parsed = JSON.parse(message); } catch (e) { return; }
try {
if (parsed.event === 'WIDGET_HELLO') {
const prev = this.widgets.get(ws);
const entry = {
widget: String(parsed.widget || 'unknown').toLowerCase(),
source: parsed.source === 'preview' ? 'preview' : 'obs',
instanceId: String(parsed.instanceId || '?'),
master: !!parsed.master,
lastSeen: Date.now()
};
this.widgets.set(ws, entry);
const changed = !prev || prev.widget !== entry.widget || prev.source !== entry.source || prev.master !== entry.master;
if (changed) this.broadcastWidgetRoster();
else this.sendWidgetRoster(ws);
return;
}
if (parsed.event === 'WIDGET_ROSTER_REQUEST') { this.sendWidgetRoster(ws); return; }
if (parsed.event === 'PLAYER_REGISTER') {
const mode = parsed.mode === 'demo' ? 'demo' : 'obs';
const instanceId = String(parsed.instanceId || 'unknown');
const res = this.registry.register(ws, mode, instanceId);
if (res.changed) {
console.log(`[Players] Регистрация: ${mode} (${instanceId})`);
if (res.active === mode && res.active === res.previous) {
if (this.queue.nowPlaying) this.commands.adopt(mode);
else this.commands.onActiveChanged(mode);
}
} else this.sendRoster(ws);
return;
}
if (parsed.event === 'PLAYER_UNREGISTER') { this.registry.unregister(ws); return; }
if (parsed.event === 'PLAYER_ROSTER_REQUEST' || parsed.event === 'PLAYER_QUEUE_REQUEST') {
this.sendRoster(ws); this.sendQueue(ws); this.sendTransport(ws); return;
}
if (parsed.event === 'PLAYER_SET_ACTIVE') {
const mode = (parsed.mode === 'demo' || parsed.mode === 'obs') ? parsed.mode : null;
this.transport.freeze();
const res = this.registry.setPreferred(mode);
console.log(`[Players] Источник: ${mode || 'auto'} (эстафета ${this.transport.currentSeconds().toFixed(1)}s)`);
this.broadcastRoster(this.registry.payload());
const active = this.registry.computeActive();
if (active && this.queue.nowPlaying && active === res.previous) this.commands.adopt(active);
return;
}
if (parsed.event === 'PLAYER_TRANSPORT') {
const info = this.registry.getInfo(ws);
if (!info || this.registry.computeActive() !== info.mode) return;
const activeId = this.registry.activeInstanceId();
if (activeId && parsed.instanceId && parsed.instanceId !== activeId) return;
const current = this.queue.nowPlaying;
const hasUid = Object.prototype.hasOwnProperty.call(parsed, 'uid');
if (current) { if (hasUid && parsed.uid !== current.uid) return; }
else if (hasUid && parsed.uid) { return; }
this.transport.report(parsed, info.mode, info.instanceId);
this.commands.onTransportReport(parsed);
return;
}
if (parsed.event === 'PLAYER_TRACK_ENDED') {
if (!this._validateActiveReport(ws, parsed, 'TRACK_ENDED')) return;
this.commands.handleTrackEnded(parsed);
return;
}
if (parsed.event === 'PLAYER_TRACK_ERROR') {
if (!this._validateActiveReport(ws, parsed, 'TRACK_ERROR')) return;
this.commands.handleTrackError(parsed);
return;
}
if (parsed.event === 'UPDATE_CONFIG' && parsed.data) {
this._pendingConfig = parsed.data;
this._pendingSender = ws;
if (this._configTimer) clearTimeout(this._configTimer);
this._configTimer = setTimeout(() => {
this.config.update(this._pendingConfig, { persist: true });
this.wss.clients.forEach(c => {
if (c !== this._pendingSender && c.readyState === WebSocket.OPEN) {
this.sendRaw(c, { event: 'CONFIG_UPDATED', data: this._pendingConfig });
}
});
if (this.onRemoteConfig) this.onRemoteConfig(this._pendingConfig);
this.commands.onConfigChange({ autostart: false });
this.broadcastQueue();
}, 100);
return;
}
if (parsed.event === 'WIDGET_ACTION') {
const action = this.commands.normalize(parsed.action);
const payload = parsed.payload || {};
if (action === 'REQUEST_PLAYER_SYNC' || action === 'REQUEST_SYNC_STATE') {
this.sendQueue(ws); this.sendTransport(ws); this.sendRoster(ws); return;
}
if (action === 'WIDGET_ROSTER_REQUEST') { this.sendWidgetRoster(ws); return; }
if (action === 'SCENES_REFRESH' || action === 'SCENES_ENSURE') { this._handleScenes(action, payload); return; }
if (action === 'ALERTS_EMIT') {
const body = { ...payload, target: 'all', emitId: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
console.log(`[Alerts] Инъекция ${body.type} от ${body.user}`);
this.broadcast({ event: 'WIDGET_ACTION', action: 'ALERTS_EMIT', payload: body });
return;
}
if (this.commands.isPlayerCommand(action)) {
if (!this.config.isEnabled() && action !== 'PLAYER_STOP' && action !== 'PLAYER_MUTE') {
if (payload.cmdId) {
this.sendRaw(ws, { event: 'WIDGET_ACTION', action: 'PLAYER_ACK', payload: { cmdId: payload.cmdId, action, ok: false, message: 'Плеер выключен в настройках' } });
}
return;
}
const result = this.commands.handle(action, payload);
if (action !== 'PLAYER_SEEK') console.log(`[Cmd] ${action} → ${result.ok ? 'ok' : 'fail'}: ${result.message}`);
if (payload.cmdId) {
this.sendRaw(ws, { event: 'WIDGET_ACTION', action: 'PLAYER_ACK', payload: { cmdId: payload.cmdId, action, ok: result.ok, message: result.message } });
}
return;
}
this.wss.clients.forEach(c => {
if (c !== ws && c.readyState === WebSocket.OPEN) { try { c.send(message); } catch (e) {} }
});
}
} catch (e) { console.error('[WS] Ошибка обработки:', e.message); }
}
}
module.exports = WsHub;