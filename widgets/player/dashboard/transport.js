/* ФАЙЛ: widgets/player/dashboard/transport.js — v5 */
const ACK_TIMEOUT = 600;

export class DashboardTransport {
constructor({ url, onAction, onStatus, onAck }) {
this.url = url;
this.onAction = onAction;
this.onStatus = onStatus;
this.onAck = onAck;
this.onConfig = null;
this.ws = null;
this.retry = 1200;
this.timer = null;
this.pending = new Map();
this.seq = 0;
this.closed = false;
}

setConfigHandler(fn) { this.onConfig = fn; }

connect() {
if (this.closed) return;
if (this.timer) { clearTimeout(this.timer); this.timer = null; }
if (this.ws) {
const old = this.ws;
this.ws = null;
old.onopen = old.onmessage = old.onerror = old.onclose = null;
try { old.close(); } catch (e) {}
}
let sock;
try { sock = new WebSocket(this.url); } catch (e) { this._schedule(); return; }
this.ws = sock;
sock.onopen = () => {
if (this.ws !== sock) return;
this.retry = 1200;
if (this.onStatus) this.onStatus(true);
this.requestSync();
};
sock.onmessage = (e) => {
if (this.ws !== sock) return;
try {
const msg = JSON.parse(e.data);
if (msg.event === 'WIDGET_ACTION') {
if (msg.action === 'PLAYER_ACK') this._handleAck(msg.payload || {});
else if (this.onAction) this.onAction(msg.action, msg.payload || {});
} else if (msg.event === 'CONFIG_UPDATED' && msg.data) {
if (this.onConfig) this.onConfig(msg.data);
} else if (msg.event === 'SERVER_HELLO') {
if (this.onStatus) this.onStatus(true);
}
} catch (err) {}
};
sock.onerror = () => { try { sock.close(); } catch (e) {} };
sock.onclose = () => {
if (this.ws !== sock) return;
this.ws = null;
if (this.onStatus) this.onStatus(false);
this._schedule();
};
}

_schedule() {
if (this.closed || this.timer) return;
this.timer = setTimeout(() => { this.timer = null; this.connect(); }, this.retry);
this.retry = Math.min(Math.round(this.retry * 1.5), 6000);
}

isOnline() { return Boolean(this.ws && this.ws.readyState === 1); }

sendRaw(obj) {
if (this.isOnline()) {
try { this.ws.send(JSON.stringify(obj)); return true; } catch (e) {}
}
return false;
}

requestSync() {
this.sendRaw({ event: 'PLAYER_ROSTER_REQUEST' });
this.sendRaw({ event: 'PLAYER_QUEUE_REQUEST' });
}

cmd(action, payload = {}, opts = {}) {
if (!this.isOnline()) {
if (this.onAck) this.onAck({ ok: false, message: 'Нет связи с сервером. Команда не доставлена.', action, silent: opts.silent });
return false;
}
const cmdId = 'c' + (++this.seq) + '-' + Date.now().toString(36);
const body = { ...payload, cmdId };
const entry = { action, body, attempts: 1, timer: null, silent: !!opts.silent, okToast: opts.okToast };
const arm = () => {
entry.timer = setTimeout(() => {
const cur = this.pending.get(cmdId);
if (!cur) return;
if (cur.attempts < 2) {
cur.attempts++;
this.sendRaw({ event: 'WIDGET_ACTION', action, payload: body });
arm();
} else {
this.pending.delete(cmdId);
if (this.onAck) this.onAck({ ok: false, message: `Команда ${action} не подтверждена сервером.`, action, silent: cur.silent });
}
}, ACK_TIMEOUT);
};
this.pending.set(cmdId, entry);
this.sendRaw({ event: 'WIDGET_ACTION', action, payload: body });
arm();
return true;
}

_handleAck(payload) {
const entry = this.pending.get(payload.cmdId);
if (!entry) return;
clearTimeout(entry.timer);
this.pending.delete(payload.cmdId);
if (this.onAck) {
this.onAck({ ok: !!payload.ok, message: payload.message, action: payload.action, silent: entry.silent, okToast: entry.okToast });
}
}

close() {
this.closed = true;
if (this.timer) clearTimeout(this.timer);
for (const entry of this.pending.values()) clearTimeout(entry.timer);
this.pending.clear();
if (this.ws) {
const s = this.ws;
this.ws = null;
s.onopen = s.onmessage = s.onerror = s.onclose = null;
try { s.close(); } catch (e) {}
}
}
}