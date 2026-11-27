/* ФАЙЛ: backend/player/configBridge.js — v5 */
const EventEmitter = require('events');
const configManager = require('../configManager');

class ConfigBridge extends EventEmitter {
constructor() {
super();
this.cfg = configManager.getConfig();
}

get() { return this.cfg; }

player() {
return (this.cfg && this.cfg.widgets && this.cfg.widgets.player) ? this.cfg.widgets.player : {};
}

isEnabled() {
const v = this.player().enabled;
return !(v === false || String(v) === 'false');
}

isBgEnabled() {
const v = this.player().playlistEnabled;
return v === true || String(v) === 'true';
}

isShuffle() {
const v = this.player().playlistShuffle;
return v === true || String(v) === 'true';
}

update(newConfig, { persist = true } = {}) {
if (!newConfig) return;
this.cfg = newConfig;
if (persist) {
try { configManager.saveConfig(newConfig); }
catch (e) { console.error('[ConfigBridge] Ошибка сохранения:', e.message); }
}
this.emit('change', this.cfg);
}

reload() {
this.cfg = configManager.getConfig();
this.emit('change', this.cfg);
return this.cfg;
}
}

module.exports = ConfigBridge;