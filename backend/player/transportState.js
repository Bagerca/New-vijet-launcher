/* ФАЙЛ: backend/player/transportState.js — v5 */
const EventEmitter = require('events');

class TransportState extends EventEmitter {
constructor() {
super();
this.state = 'IDLE';
this.currentTime = 0;
this.duration = 0;
this.muted = false;
this.ts = 0;
this.mode = null;
this.instanceId = null;
}

currentSeconds() {
let cur = this.currentTime;
if (this.state === 'PLAYING' && this.duration > 0) {
cur = Math.min(this.duration, cur + Math.max(0, (Date.now() - this.ts) / 1000));
}
return Math.max(0, cur);
}

payload() {
return {
state: this.state,
currentTime: this.currentSeconds(),
duration: this.duration,
muted: this.muted,
mode: this.mode,
instanceId: this.instanceId,
ts: Date.now()
};
}

report({ state, currentTime, duration, muted }, mode, instanceId) {
this.state = state === 'PAUSED' ? 'PAUSED' : (state === 'PLAYING' ? 'PLAYING' : 'IDLE');
this.currentTime = Number(currentTime) || 0;
this.duration = Number(duration) || 0;
this.muted = !!muted;
this.ts = Date.now();
this.mode = mode;
this.instanceId = instanceId;
this.emit('change');
}

start(track, seconds = 0, state = 'PLAYING') {
this.state = state;
this.currentTime = Math.max(0, Number(seconds) || 0);
this.duration = 0;
this.ts = Date.now();
this.emit('change');
}

stop() {
this.state = 'IDLE';
this.currentTime = 0;
this.duration = 0;
this.ts = Date.now();
this.emit('change');
}

freeze() {
this.currentTime = this.currentSeconds();
this.ts = Date.now();
}

togglePause() {
const next = this.state === 'PLAYING' ? 'PAUSED' : 'PLAYING';
this.currentTime = this.currentSeconds();
this.state = next;
this.ts = Date.now();
this.emit('change');
return next;
}

setMuted(muted) {
this.muted = !!muted;
this.emit('change');
}

seek(seconds) {
const sec = Math.max(0, Number(seconds) || 0);
this.currentTime = this.duration > 0 ? Math.min(this.duration, sec) : sec;
this.ts = Date.now();
this.emit('change');
}
}

module.exports = TransportState;