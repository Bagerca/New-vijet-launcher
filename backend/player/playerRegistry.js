/* ФАЙЛ: backend/player/playerRegistry.js — v6 */
const EventEmitter = require('events');

const PLAYER_TTL = 12000;

class PlayerRegistry extends EventEmitter {
constructor() {
super();
this.players = new Map();
this.preferred = null;
}

computeActive() {
const modes = new Set();
this.players.forEach(p => modes.add(p.mode));
if (this.preferred && modes.has(this.preferred)) return this.preferred;
if (modes.has('obs')) return 'obs';
if (modes.has('demo')) return 'demo';
return null;
}

hasActive() { return this.computeActive() !== null; }

findWs(mode) {
let found = null;
this.players.forEach((info, ws) => {
if (info.mode === mode && ws.readyState === 1) found = ws;
});
return found;
}

activeInstanceId() {
const mode = this.computeActive();
if (!mode) return null;
const ws = this.findWs(mode);
if (!ws) return null;
const info = this.players.get(ws);
return info ? info.instanceId : null;
}

payload() {
const list = [];
this.players.forEach(p => list.push({ mode: p.mode, instanceId: p.instanceId }));
return { players: list, active: this.computeActive(), preferred: this.preferred, ts: Date.now() };
}

register(ws, mode, instanceId) {
const previous = this.computeActive();
const prev = this.players.get(ws);
const info = { mode, instanceId, lastSeen: Date.now() };
this.players.set(ws, info);
const changed = !prev || prev.mode !== mode || prev.instanceId !== instanceId;
const active = this.computeActive();
if (changed) this.emit('change', { payload: this.payload(), active, previous });
return { changed, info, active, previous };
}

unregister(ws) {
const previous = this.computeActive();
const info = this.players.get(ws);
const had = this.players.delete(ws);
if (had) {
const active = this.computeActive();
console.log(`[Players] Отключился плеер: ${info.mode} (${info.instanceId}) → активен: ${active || 'нет'}`);
this.emit('change', { payload: this.payload(), active, previous });
}
return had ? info : null;
}

setPreferred(mode) {
const previous = this.computeActive();
this.preferred = mode;
const active = this.computeActive();
this.emit('change', { payload: this.payload(), active, previous, force: true });
return { active, previous };
}

sweep() {
const now = Date.now();
const previous = this.computeActive();
let changed = false;
this.players.forEach((info, ws) => {
if (now - info.lastSeen > PLAYER_TTL || ws.readyState !== 1) {
console.log(`[Players] Таймаут плеера: ${info.mode} (${info.instanceId})`);
this.players.delete(ws);
changed = true;
}
});
if (changed) {
const active = this.computeActive();
this.emit('change', { payload: this.payload(), active, previous });
}
return changed;
}

getInfo(ws) { return this.players.get(ws) || null; }
}

module.exports = PlayerRegistry;