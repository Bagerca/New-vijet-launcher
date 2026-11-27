/* ФАЙЛ: js/store.js — v3.3 (срез packInfo + тихие служебные опросы + атомарная замена userSkins) */
import { widgetsManifest } from '../data/widgetsManifest.js';
function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
function deepMerge(target, ...sources) {
if (!sources.length) return target;
const source = sources.shift();
if (isObject(target) && isObject(source)) {
for (const key in source) {
if (isObject(source[key])) {
if (!target[key]) Object.assign(target, { [key]: {} });
deepMerge(target[key], source[key]);
} else Object.assign(target, { [key]: source[key] });
}
}
return deepMerge(target, ...sources);
}
/* Пути-«словари»: заменяются целиком, а не сливаются по ключам. */
const ATOMIC_PATHS = [
['widgets', 'chat', 'userSkins']
];
/* Служебные опросы состояния: не пишутся в журнал и не пугают предупреждениями. */
const QUIET_ACTIONS = new Set([
'REQUEST_PLAYER_SYNC', 'REQUEST_SYNC_STATE',
'WIDGET_ROSTER_REQUEST',
'ALERTS_REQUEST_STATE', 'CHAT_REQUEST_STATE',
'DEATHS_REQUEST_STATE', 'SOCIALS_REQUEST_STATE', 'FRAME_REQUEST_STATE'
]);
export const PACK_DEFAULTS = {
installedVersion: null,
baselineVersion: '1.0.0',
previousVersion: null,
canRollback: false,
repo: null,
hasUpdate: false,
isChecking: false,
latestVersion: null,
tag: null,
releaseNotes: '',
downloadUrl: null,
isApplying: false,
progressPercent: 0,
statusText: '',
isRefreshing: false,
lastRefresh: null,
supported: true
};
function applyAtomicKeys(merged, source) {
if (!isObject(source)) return;
for (const path of ATOMIC_PATHS) {
let src = source;
let found = true;
for (const k of path) {
if (isObject(src) && Object.prototype.hasOwnProperty.call(src, k)) src = src[k];
else { found = false; break; }
}
if (!found) continue;
let dst = merged;
for (let i = 0; i < path.length - 1; i++) {
const k = path[i];
if (!isObject(dst[k])) dst[k] = {};
dst = dst[k];
}
const last = path[path.length - 1];
try {
dst[last] = isObject(src) ? JSON.parse(JSON.stringify(src)) : src;
} catch (e) {
console.error('[Store] Атомарная замена не удалась:', path.join('.'), e);
dst[last] = src;
}
console.log(`[Store] Атомарная замена: ${path.join('.')}`);
}
}
export class Store {
constructor() {
this.STORAGE_KEY = 'stream_pack_config';
this.ACTION_KEY = 'stream_pack_action';
this.state = {
isProcessing: false,
obsStatus: 'disconnected',
serverOnline: false,
logs: [],
logFilter: 'all',
widgetsManifest: widgetsManifest,
config: { obsPath: '', twitchChannel: 'ksusha__sher', githubRepo: 'Bagerca/New-vijet-launcher', widgets: {} },
updateInfo: { hasUpdate: false, isChecking: false, currentVersion: '1.0.0', latestVersion: '1.0.0', releaseNotes: '', downloadUrl: null, isUpdating: false, progressPercent: 0, statusText: '' },
packInfo: { ...PACK_DEFAULTS },
isElectronEnv: typeof window !== 'undefined' && Boolean(window.obsAPI)
};
this.listeners = new Set();
this.actionListeners = new Set();
this._lastSaveTime = 0;
this._saveTimeout = null;
this._lastConfigJson = '';
this.ws = null;
this._retry = 1500;
this._timer = null;
this._wasOnline = false;
this._initializeDefaults();
this._loadStandaloneConfig();
this._initWS();
window.addEventListener('storage', (e) => {
if (e.key === this.STORAGE_KEY && e.newValue) {
try { this.syncFromRemote(JSON.parse(e.newValue)); } catch (err) {}
}
if (e.key === this.ACTION_KEY && e.newValue) {
try {
const d = JSON.parse(e.newValue);
if (d && d.action) this._dispatch(d.action, d.payload || {});
} catch (err) {}
}
});
console.log('[Store] v3.3 готов. Electron:', this.state.isElectronEnv);
}
_initWS() {
if (this._timer) { clearTimeout(this._timer); this._timer = null; }
if (this.ws) {
const old = this.ws;
this.ws = null;
old.onopen = old.onmessage = old.onerror = old.onclose = null;
try { old.close(); } catch (e) {}
}
let sock;
try { sock = new WebSocket('ws://127.0.0.1:42069'); }
catch (e) { this._schedule(); return; }
this.ws = sock;
sock.onopen = () => {
if (this.ws !== sock) return;
this._retry = 1500;
if (!this.state.serverOnline) this.setState({ serverOnline: true });
if (!this._wasOnline) {
this._wasOnline = true;
this.addLog('Связь с локальным сервером установлена.', 'success');
}
};
sock.onmessage = (e) => {
if (this.ws !== sock) return;
try {
const msg = JSON.parse(e.data);
if (msg.event === 'WIDGET_ACTION') this._dispatch(msg.action, msg.payload || {});
else if (msg.event === 'CONFIG_UPDATED' && msg.data) this.syncFromRemote(msg.data);
} catch (err) {}
};
sock.onerror = () => { try { sock.close(); } catch (e) {} };
sock.onclose = () => {
if (this.ws !== sock) return;
this.ws = null;
if (this.state.serverOnline) this.setState({ serverOnline: false });
if (this._wasOnline) {
this._wasOnline = false;
this.addLog('Связь с локальным сервером потеряна. Переподключение...', 'warn');
}
this._schedule();
};
}
_schedule() {
if (this._timer) clearTimeout(this._timer);
this._timer = setTimeout(() => { this._timer = null; this._initWS(); }, this._retry);
this._retry = Math.min(Math.round(this._retry * 1.5), 8000);
}
ensureConnection() {
if (this.ws && this.ws.readyState === 1) return true;
this._retry = 1500;
this._initWS();
return false;
}
isServerOnline() { return Boolean(this.ws && this.ws.readyState === 1); }
_dispatch(action, payload) {
this.actionListeners.forEach(l => {
try { l(action, payload); } catch (e) { console.error('[Store] слушатель действия:', e); }
});
}
_sanitize(widgetsConfig) {
if (!widgetsConfig) return {};
const s = deepMerge({}, widgetsConfig);
this.state.widgetsManifest.forEach(widget => {
if (s[widget.id]) {
widget.controls.forEach(control => {
if (control.type === 'button') return;
const val = s[widget.id][control.key];
if (val !== undefined) {
if (control.type === 'checkbox') s[widget.id][control.key] = (val === true || String(val).toLowerCase() === 'true');
else if (control.type === 'number' || control.type === 'range') {
const n = Number(val);
s[widget.id][control.key] = isNaN(n) ? control.default : n;
} else s[widget.id][control.key] = String(val);
}
});
}
});
return s;
}
_initializeDefaults() {
this.state.widgetsManifest.forEach(widget => {
if (!this.state.config.widgets[widget.id]) this.state.config.widgets[widget.id] = {};
widget.controls.forEach(control => {
if (control.type !== 'button' && this.state.config.widgets[widget.id][control.key] === undefined) {
this.state.config.widgets[widget.id][control.key] = control.default;
}
});
});
}
_loadStandaloneConfig() {
if (!this.state.isElectronEnv) {
try {
const saved = localStorage.getItem(this.STORAGE_KEY);
if (saved) {
this.state.config = deepMerge({}, this.state.config, JSON.parse(saved));
this.state.config.widgets = this._sanitize(this.state.config.widgets);
}
} catch (e) {
console.error('[Store] Локальный конфиг повреждён, стартую с дефолтов:', e);
}
}
this._lastConfigJson = JSON.stringify(this.state.config);
}
getState() { return this.state; }
setState(partial) { this.state = { ...this.state, ...partial }; this.notify(); }
setUpdateInfo(info) { this.state.updateInfo = { ...this.state.updateInfo, ...(info || {}) }; this.notify(); }
setPackInfo(info) {
this.state.packInfo = { ...PACK_DEFAULTS, ...this.state.packInfo, ...(info || {}) };
this.notify();
}
async updateConfig(partial) {
const merged = deepMerge({}, this.state.config, partial);
applyAtomicKeys(merged, partial);
if (partial.widgets) merged.widgets = this._sanitize(merged.widgets);
this.state.config = merged;
this._lastConfigJson = JSON.stringify(merged);
this.notify();
const now = Date.now();
const save = async () => {
this._lastSaveTime = Date.now();
try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state.config)); } catch (e) {}
if (this.state.isElectronEnv && window.obsAPI && typeof window.obsAPI.saveConfig === 'function') {
try { await window.obsAPI.saveConfig(this.state.config); }
catch (err) { this.addLog(`Ошибка сохранения: ${err.message}`, 'error'); }
}
};
if (now - this._lastSaveTime > 100) { clearTimeout(this._saveTimeout); await save(); }
else { clearTimeout(this._saveTimeout); this._saveTimeout = setTimeout(save, 100); }
}
syncFromRemote(newConfig) {
if (!newConfig) return;
const merged = deepMerge({}, this.state.config, newConfig);
applyAtomicKeys(merged, newConfig);
if (newConfig.widgets) merged.widgets = this._sanitize(merged.widgets);
const json = JSON.stringify(merged);
if (json === this._lastConfigJson) return;
this._lastConfigJson = json;
this.state.config = merged;
this.notify();
}
resetWidgetToDefaults(widgetId) {
const manifest = this.state.widgetsManifest.find(w => w.id === widgetId);
if (!manifest) return;
const conf = {};
manifest.controls.forEach(c => { if (c.type !== 'button') conf[c.key] = c.default; });
this.updateConfig({ widgets: { [widgetId]: conf } });
this.addLog(`Виджет "${manifest.title}" сброшен.`, 'success');
}
broadcastAction(action, payload = {}) {
let sent = false;
if (this.ws && this.ws.readyState === 1) {
try { this.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action, payload })); sent = true; } catch (e) {}
}
try { localStorage.setItem(this.ACTION_KEY, JSON.stringify({ action, payload, _n: Date.now() + Math.random() })); } catch (e) {}
if (!QUIET_ACTIONS.has(action)) {
if (sent) this.addLog(`Действие: ${action}`, 'info');
else this.addLog(`Команда ${action}: сервер недоступен`, 'warn');
}
return sent;
}
addLog(message, type = 'info') {
const time = new Date().toLocaleTimeString('ru-RU');
this.setState({ logs: [...this.state.logs, { time, message, type }] });
}
clearLogs() { this.setState({ logs: [] }); }
subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
notify() {
this.listeners.forEach(l => {
try { l(this.state); } catch (e) { console.error('[Store] слушатель:', e); }
});
}
onAction(listener) { this.actionListeners.add(listener); return () => this.actionListeners.delete(listener); }
}
export const store = new Store();