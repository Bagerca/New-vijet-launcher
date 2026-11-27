/* ФАЙЛ: backend/serverManager.js — v7 (фасад + пак сцен + менеджер сцен OBS + реестр виджетов) */
const path = require('path');
const ConfigBridge = require('./player/configBridge');
const TitleService = require('./player/titleService');
const QueueStore = require('./player/queueStore');
const TransportState = require('./player/transportState');
const PlayerRegistry = require('./player/playerRegistry');
const PlayerCommands = require('./player/playerCommands');
const WsHub = require('./wsHub');
const SceneManager = require('./sceneManager');
const PackManager = require('./packManager');
const updateManager = require('./updateManager');
const { createHttpServer } = require('./httpServer');
const tunnelService = require('./tunnelService');
const PORT = 42069;
const config = new ConfigBridge();
const titles = new TitleService();
const queue = new QueueStore(config, titles);
const transport = new TransportState();
const registry = new PlayerRegistry();
const commands = new PlayerCommands({ config, queue, transport, registry });
const scenes = new SceneManager({ port: PORT });
const pack = new PackManager({
rootDir: path.join(__dirname, '..'),
getLauncherVersion: () => updateManager.getLocalVersionInfo().version
});
let httpServer = null;
let hub = null;
let remoteUpdateCallback = null;
let wired = false;
let packWired = false;
function wire() {
if (wired) return;
wired = true;
queue.on('change', () => { if (hub) hub.broadcastQueue(); });
transport.on('change', () => { if (hub) hub.broadcastTransport(); });
registry.on('change', ({ payload, active, previous }) => {
if (hub) hub.broadcastRoster(payload);
if (active !== previous) commands.onActiveChanged(active, previous);
});
commands.on('load', (payload) => { if (hub) hub.sendToActive('PLAYER_LOAD_TRACK', payload); });
commands.on('loadTo', ({ mode, ...payload }) => { if (hub) hub.sendToMode(mode, 'PLAYER_LOAD_TRACK', payload); });
commands.on('stop', () => { if (hub) hub.sendToActive('PLAYER_STOP', {}); });
commands.on('stopTo', ({ mode }) => { if (hub) hub.sendToMode(mode, 'PLAYER_STOP', {}); });
commands.on('pause', (payload) => { if (hub) hub.sendToActive('PLAYER_PAUSE', payload); });
commands.on('mute', (payload) => { if (hub) hub.sendToActive('PLAYER_MUTE', payload); });
commands.on('seek', (payload) => { if (hub) hub.sendToActive('PLAYER_SEEK', payload); });
commands.on('notice', (payload) => {
if (hub) hub.broadcast({ event: 'WIDGET_ACTION', action: 'PLAYER_NOTICE', payload });
});
console.log('[Server] Модули плеера связаны (v7)');
}
function packRepo() {
const conf = config.get() || {};
return conf.scenePackRepo || conf.githubRepo || updateManager.getLocalVersionInfo().githubRepo || null;
}
async function refreshScenes(payload = {}) {
const result = await scenes.refresh(payload, { force: payload.force === true });
console.log(`[Scenes] refresh (${payload.origin || 'ipc'}) → ${result.ok ? 'ok' : 'fail'}: ${result.message}`);
if (hub) {
hub.broadcast({ event: 'WIDGET_ACTION', action: 'SCENES_REFRESH_RESULT', payload: { ...result, origin: payload.origin || 'ipc', ts: Date.now() } });
}
return result;
}
function onPackChanged(info, kind) {
console.log(`[Server] Пак сцен ${kind === 'rollback' ? 'откачен' : 'применён'}: v${info.version}`);
if (hub) hub.broadcast({ event: 'WIDGET_ACTION', action: 'PACK_UPDATED', payload: { ...info, kind, ts: Date.now() } });
refreshScenes({ widgets: 'all', origin: 'pack', force: true }).catch(e => console.error('[Server] Авто-рефреш после пака:', e.message));
}
function startServers() {
wire();
httpServer = createHttpServer({
config,
resolvePackPath: (rel) => pack.resolve(rel),
getDiagnostics: () => ({
ok: true,
clients: hub ? hub.clientCount() : 0,
widgets: hub ? hub.widgetPayload() : { widgets: [] },
pack: pack.info(),
roster: registry.payload(),
queue: queue.payload(),
transport: transport.payload(),
guard: {
userStopped: commands.userStopped,
pendingAdvance: commands.pendingAdvance,
consecutiveFailures: commands._consecutiveFailures
}
})
});
httpServer.listen(PORT, () => {
console.log(`[HTTP/WS] Сервер запущен на порту ${PORT} (v7, пак сцен + сцены OBS)`);
queue.init();
});
hub = new WsHub({
server: httpServer, config, queue, transport, registry, commands, scenes,
onRemoteConfig: (data) => { if (remoteUpdateCallback) remoteUpdateCallback(data); }
});
if (!packWired) {
packWired = true;
pack.on('applied', (info) => onPackChanged(info, 'apply'));
pack.on('rolledBack', (info) => onPackChanged(info, 'rollback'));
}
}
function broadcastToWidgets(data) {
if (data && data.event === 'CONFIG_UPDATED' && data.data) {
config.update(data.data, { persist: false });
commands.onConfigChange({ autostart: false });
}
if (hub) hub.broadcast(data);
}
function setRemoteUpdateCallback(cb) {
remoteUpdateCallback = cb;
if (hub) hub.onRemoteConfig = cb;
}
function getLocalIP() { return tunnelService.getLocalIP(); }
async function toggleTunnel() { return tunnelService.toggleTunnel(PORT); }
function getTunnelStatus() { return tunnelService.getTunnelStatus(); }
function getPackStatus() { return { ...pack.info(), repo: packRepo() }; }
async function checkPackUpdate() { return pack.checkForUpdate(packRepo()); }
async function applyPackUpdate(opts, onStatus) { return pack.apply(opts || {}, onStatus); }
async function rollbackPack() { return pack.rollback(); }
module.exports = {
startServers, broadcastToWidgets, setRemoteUpdateCallback,
getLocalIP, toggleTunnel, getTunnelStatus,
getPackStatus, checkPackUpdate, applyPackUpdate, rollbackPack, refreshScenes,
PORT_HTTP: PORT
};