/* ФАЙЛ: js/app.js — v3 (error boundary вместо чёрного экрана + безопасный bootstrap пака) */
import { store } from './store.js';
import { Router } from './router.js';
import { Sidebar } from './components/sidebar.js';
import { HomeView } from './views/homeView.js';
import { WidgetsView } from './views/widgetsView.js';
import { WidgetsV2View } from './views/widgetsV2View.js';
import { RemoteView } from './views/remoteView.js';
import { SettingsView } from './views/settingsView.js';
import { GuideView } from './views/guideView.js';
const appContainer = document.getElementById('app');
const routes = {
'#/home': HomeView,
'#/widgets': WidgetsView,
'#/widgets-v2': WidgetsV2View,
'#/remote': RemoteView,
'#/settings': SettingsView,
'#/guide': GuideView
};
function escapeHtml(str) {
return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Никогда не оставляем пустой #app: любая ошибка экрана превращается в читаемую карточку. */
function renderAppLayout(path, ViewObj, params, state) {
let viewHtml = '';
try {
viewHtml = ViewObj.render(state, params);
} catch (e) {
console.error('[App] Экран упал при рендере:', e);
try { store.addLog(`Ошибка экрана ${path}: ${e.message}`, 'error'); } catch (e2) {}
viewHtml = `
<header class="view-header">
<h1 class="view-title">Экран не собрался</h1>
<p class="view-subtitle">Ядро лаунчера работает — упал только этот экран. Ниже текст ошибки.</p>
</header>
<section class="card" style="border-color: var(--color-danger-dim);">
<h3 class="text-lg text-bold mb-sm" style="color: var(--color-danger);">${escapeHtml(path)}</h3>
<pre style="white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); font-size: 12px; color: var(--color-warning); background: var(--bg-input); border: 1px solid var(--border-subtle); border-left: 3px solid var(--color-danger); padding: 14px; border-radius: var(--radius-sm); max-height: 260px; overflow: auto;">${escapeHtml((e && e.stack) || (e && e.message) || e)}</pre>
<div class="d-flex gap-sm mt-md flex-wrap">
<a href="#/home" class="btn btn-primary">На дашборд</a>
<button class="btn btn-secondary" onclick="location.reload()">Перезагрузить интерфейс</button>
</div>
<p class="text-secondary text-sm mt-md">Если ошибка повторяется — пришлите текст из консоли (Ctrl+Shift+I).</p>
</section>`;
}
appContainer.innerHTML = `
${Sidebar(path)}
<main class="main-wrapper" id="main-wrapper">${viewHtml}</main>`;
}
function monitorOBSConnection() {
const checkConnection = () => {
let ws;
try { ws = new WebSocket('ws://127.0.0.1:4455'); }
catch (e) { setTimeout(checkConnection, 5000); return; }
ws.onopen = () => {
if (store.getState().obsStatus !== 'connected') store.setState({ obsStatus: 'connected' });
try { ws.close(); } catch (e) {}
};
ws.onerror = () => {
if (store.getState().obsStatus !== 'disconnected') store.setState({ obsStatus: 'disconnected' });
};
ws.onclose = () => setTimeout(checkConnection, 5000);
};
checkConnection();
}
function api() { return window.obsAPI || null; }
function has(name) { const a = api(); return Boolean(a && typeof a[name] === 'function'); }
async function checkBackgroundUpdates() {
if (!store.state.isElectronEnv) return;
if (has('checkForUpdates')) {
try {
const updateInfo = await api().checkForUpdates();
store.setUpdateInfo(updateInfo);
if (updateInfo && updateInfo.hasUpdate) store.addLog(`Доступна новая версия ядра: v${updateInfo.latestVersion}!`, 'info');
} catch (err) {
console.warn('[BOOTSTRAP] Проверка обновлений ядра пропущена:', err.message);
}
}
if (has('checkPackUpdate')) {
try {
const packInfo = await api().checkPackUpdate();
store.setPackInfo({ ...packInfo, isChecking: false, supported: true });
if (packInfo && packInfo.hasUpdate) store.addLog(`Доступен пак сцен v${packInfo.latestVersion} — обновляется без перезапуска!`, 'info');
} catch (err) {
console.warn('[BOOTSTRAP] Проверка пака сцен пропущена:', err.message);
store.setPackInfo({ supported: false, isChecking: false });
}
} else {
store.setPackInfo({ supported: false });
}
}
function subscribeServerActions() {
store.onAction((action, payload) => {
if (action === 'SCENES_REFRESH_RESULT' || action === 'SCENES_ENSURE_RESULT') {
const p = payload || {};
store.addLog(p.message || 'Перезагрузка сцен завершена', p.ok ? 'success' : 'warn');
store.setPackInfo({ isRefreshing: false, lastRefresh: { ok: Boolean(p.ok), message: p.message || '', ts: p.ts || Date.now() } });
return;
}
if (action === 'PACK_UPDATED') {
const p = payload || {};
store.addLog(p.kind === 'rollback' ? `Пак сцен откачен к v${p.version}` : `Пак сцен обновлён до v${p.version}`, 'success');
store.setPackInfo({ hasUpdate: false, isApplying: false, statusText: '' });
if (has('getPackStatus')) {
api().getPackStatus().then(st => store.setPackInfo({
installedVersion: st.installedVersion,
baselineVersion: st.baselineVersion,
previousVersion: st.previousVersion,
canRollback: st.canRollback,
repo: st.repo
})).catch(() => {});
}
}
});
}
async function bootstrap() {
if (store.state.isElectronEnv) {
const a = api();
if (a && typeof a.onLog === 'function') a.onLog((data) => store.addLog(data.message, data.type));
if (a && typeof a.onRemoteConfigUpdate === 'function') a.onRemoteConfigUpdate((config) => store.syncFromRemote(config));
if (a && typeof a.onUpdateProgress === 'function') {
a.onUpdateProgress((status) => {
store.setUpdateInfo({
isUpdating: status.stage !== 'completed' && status.stage !== 'error',
progressPercent: status.percent,
statusText: status.text
});
if (status.stage === 'completed') store.setUpdateInfo({ hasUpdate: false, isUpdating: false });
});
}
if (a && typeof a.onPackProgress === 'function') {
a.onPackProgress((status) => {
store.setPackInfo({
isApplying: status.stage !== 'completed' && status.stage !== 'error',
progressPercent: status.percent,
statusText: status.text
});
if (status.stage === 'completed') store.setPackInfo({ hasUpdate: false, isApplying: false });
});
}
if (has('getConfig')) {
try {
const config = await a.getConfig();
if (config) store.updateConfig(config);
} catch (e) { store.addLog('Не удалось загрузить конфиг при старте', 'warn'); }
}
if (has('getPackStatus')) {
try {
const st = await a.getPackStatus();
store.setPackInfo({
installedVersion: st.installedVersion,
baselineVersion: st.baselineVersion,
previousVersion: st.previousVersion,
canRollback: st.canRollback,
repo: st.repo,
supported: true
});
console.log('[BOOTSTRAP] Пак сцен:', st.installedVersion ? `v${st.installedVersion}` : 'встроенный');
} catch (e) {
console.warn('[BOOTSTRAP] Статус пака сцен недоступен:', e.message);
store.setPackInfo({ supported: false });
}
} else {
store.setPackInfo({ supported: false });
}
} else {
store.setPackInfo({ supported: false });
}
subscribeServerActions();
monitorOBSConnection();
const router = new Router(routes, store, renderAppLayout);
router.init();
setTimeout(checkBackgroundUpdates, 1500);
}
bootstrap();