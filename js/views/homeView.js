/* ФАЙЛ: js/views/homeView.js — v5 (стили вынесены в css/views/home.css; карточка пака + рефреш OBS) */
import { store, PACK_DEFAULTS } from '../store.js';
import { icons } from '../utils/icons.js';
function escapeHtml(str) {
return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function cleanVer(v) {
return v ? String(v).replace(/^(?:pack-)?v+/i, '') : '';
}
function packOf(state) {
const p = (state && state.packInfo) || null;
return { ...PACK_DEFAULTS, ...(p || {}) };
}
function renderUpdateCardHtml(updRaw, isEnvOK) {
const upd = updRaw || {};
const current = cleanVer(upd.currentVersion) || '1.0.0';
const latest = cleanVer(upd.latestVersion) || current;
return `
<section class="card mb-md update-center-card ${upd.hasUpdate ? 'has-update' : ''}">
<div class="d-flex justify-between align-center flex-wrap gap-md">
<div class="d-flex align-center gap-md">
<div class="update-icon-wrapper">${upd.hasUpdate ? icons.box() : icons.sync()}</div>
<div>
<h3 class="text-lg text-bold mb-xs d-flex align-center gap-sm flex-wrap">
Ядро лаунчера: v${escapeHtml(current)}
${upd.hasUpdate ? `<span class="badge badge-update">Доступна v${escapeHtml(latest)}</span>` : `<span class="badge badge-success">Актуально</span>`}
</h3>
<p class="text-secondary text-sm">
${upd.isChecking ? 'Поиск новых версий на GitHub...' : (upd.hasUpdate ? 'Полное обновление лаунчера (может потребоваться перезапуск).' : 'У вас установлена самая последняя версия ядра.')}
</p>
</div>
</div>
<div>
${upd.hasUpdate
? `<button id="btn-apply-update" class="btn btn-accent" ${upd.isUpdating || !isEnvOK ? 'disabled' : ''}>${upd.isUpdating ? 'Установка...' : '⚡ Обновить лаунчер'}</button>`
: `<button id="btn-check-update" class="btn btn-secondary" ${upd.isChecking || !isEnvOK ? 'disabled' : ''}>
<span class="${upd.isChecking ? 'spin-anim' : ''} d-flex align-center gap-sm">${icons.sync()} ${upd.isChecking ? 'Проверка...' : 'Проверить'}</span>
</button>`}
</div>
</div>
${upd.hasUpdate ? `
<div class="mt-md pt-md" style="border-top: 1px solid var(--border-subtle);">
<p class="text-secondary text-sm mb-sm"><strong style="color: var(--text-primary);">Что нового:</strong> ${escapeHtml(upd.releaseNotes || 'Улучшения виджетов')}</p>
${upd.isUpdating ? `
<div class="update-progress-bar"><div class="update-progress-fill" style="width: ${Number(upd.progressPercent) || 0}%;"></div></div>
<div class="text-muted text-sm mt-xs">${escapeHtml(upd.statusText)}</div>` : ''}
</div>` : ''}
</section>`;
}
function renderPackCardHtml(packRaw, serverOnline, isEnvOK) {
const pack = { ...PACK_DEFAULTS, ...(packRaw || {}) };
const supported = pack.supported !== false && isEnvOK;
const installed = pack.installedVersion
? `v${cleanVer(pack.installedVersion)}`
: `встроенный v${cleanVer(pack.baselineVersion) || '1.0.0'}`;
const latest = cleanVer(pack.latestVersion);
const canRefresh = Boolean(serverOnline) || isEnvOK;
const last = pack.lastRefresh;
return `
<section class="card mb-md update-center-card ${pack.hasUpdate ? 'has-update' : ''}">
<div class="d-flex justify-between align-center flex-wrap gap-md">
<div class="d-flex align-center gap-md">
<div class="update-icon-wrapper">${pack.hasUpdate ? icons.box() : icons.layers()}</div>
<div>
<h3 class="text-lg text-bold mb-xs d-flex align-center gap-sm flex-wrap">
Пак сцен: ${escapeHtml(installed)}
${pack.hasUpdate ? `<span class="badge badge-update">Доступен v${escapeHtml(latest)}</span>` : `<span class="badge badge-success">Актуально</span>`}
</h3>
<p class="text-secondary text-sm">
${!supported ? 'Обновление сцен доступно в лаунчере (Electron).'
: pack.isChecking ? 'Поиск пак-релизов (pack-vX.Y.Z) на GitHub...'
: pack.hasUpdate ? 'Обновление сцен на живом стриме — без перезапуска лаунчера и OBS.'
: 'Сцены и виджеты обновляются отдельно от ядра лаунчера.'}
</p>
</div>
</div>
<div class="d-flex gap-sm flex-wrap">
${pack.hasUpdate ? `
<button id="btn-pack-apply" class="btn btn-accent" ${pack.isApplying || !supported ? 'disabled' : ''}>${pack.isApplying ? 'Установка...' : '⚡ Обновить сцены'}</button>` : `
<button id="btn-pack-check" class="btn btn-secondary" ${pack.isChecking || !supported ? 'disabled' : ''}>
<span class="${pack.isChecking ? 'spin-anim' : ''} d-flex align-center gap-sm">${icons.sync()} ${pack.isChecking ? 'Проверка...' : 'Проверить'}</span>
</button>`}
${pack.canRollback ? `
<button id="btn-pack-rollback" class="btn btn-secondary" ${pack.isApplying || !supported ? 'disabled' : ''} title="Вернуть предыдущую версию пака">↩ Откат${pack.previousVersion ? ` к v${escapeHtml(cleanVer(pack.previousVersion))}` : ''}</button>` : ''}
</div>
</div>
${pack.hasUpdate ? `
<div class="mt-md pt-md" style="border-top: 1px solid var(--border-subtle);">
<p class="text-secondary text-sm mb-sm"><strong style="color: var(--text-primary);">Что нового:</strong> ${escapeHtml(pack.releaseNotes || 'Улучшения сцен и виджетов')}</p>
${pack.isApplying ? `
<div class="update-progress-bar"><div class="update-progress-fill" style="width: ${Number(pack.progressPercent) || 0}%;"></div></div>
<div class="text-muted text-sm mt-xs">${escapeHtml(pack.statusText)}</div>` : ''}
</div>` : ''}
<div class="scene-refresh-row">
<div class="pack-note">
Горячая перезагрузка браузер-источников OBS. Плеер пропускается — музыка не прервётся.
Команда модератора в чате: <code class="pack-cmd">!refresh</code> · точечно: <code class="pack-cmd">!refresh media chat</code>
</div>
<button id="btn-scenes-refresh" class="btn btn-secondary" ${!canRefresh || pack.isRefreshing ? 'disabled' : ''}>
<span class="${pack.isRefreshing ? 'spin-anim' : ''} d-flex align-center gap-sm">${icons.sync()} ${pack.isRefreshing ? 'Перезагрузка...' : 'Перезагрузить сцены'}</span>
</button>
</div>
${last && last.message ? `<div class="pack-last ${last.ok ? 'is-ok' : 'is-warn'}">${escapeHtml(last.message)}</div>` : ''}
</section>`;
}
export const HomeView = {
_unsubStore: null,
_renderedLogsCount: 0,
_setupHandler: null,
_filterHandler: null,
_clearHandler: null,
_lastUpdateStateStr: '',
_lastPackStateStr: '',
_refreshWatchdog: null,
render: (state, params) => {
HomeView._renderedLogsCount = state.logs.length;
const logFilter = params?.logFilter || state.logFilter;
const isBtnDisabled = state.isProcessing || !state.isElectronEnv;
const btnText = state.isProcessing ? 'Инициализация...' : 'Авто-настройка OBS';
const obsStatusClass = state.obsStatus === 'connected' ? 'color: var(--color-success);' : 'color: var(--color-danger);';
const obsStatusText = state.obsStatus === 'connected' ? 'Подключен' : 'Отключен (порт 4455)';
const obsIcon = state.obsStatus === 'connected' ? icons.obs() : icons.power();
return `
<header class="view-header">
<h1 class="view-title">Главная панель</h1>
<p class="view-subtitle">Мониторинг систем, оверлеев и управление сценами.</p>
</header>
<div id="update-card-slot">${renderUpdateCardHtml(state.updateInfo, state.isElectronEnv)}</div>
<div id="pack-card-slot">${renderPackCardHtml(packOf(state), state.serverOnline, state.isElectronEnv)}</div>
<div class="d-flex gap-md mb-md flex-wrap">
<div class="card flex-1" style="margin-bottom: 0;">
<div class="text-muted text-sm mb-xs text-bold">СТАТУС OBS STUDIO</div>
<div class="text-lg text-bold d-flex align-center gap-sm" style="${obsStatusClass}">${obsIcon} ${obsStatusText}</div>
</div>
<div class="card flex-1" style="margin-bottom: 0;">
<div class="text-muted text-sm mb-xs text-bold">КАНАЛ TWITCH</div>
<div class="text-lg text-bold d-flex align-center gap-sm" style="color: var(--text-primary);">${icons.twitch()} ${escapeHtml(state.config.twitchChannel || 'Не указан')}</div>
</div>
</div>
<section class="card d-flex justify-between align-center mb-lg flex-wrap gap-md" style="border-color: var(--accent-glow); box-shadow: 0 4px 30px var(--accent-primary-dim);">
<div>
<h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.obs()} Master Scene Architecture</h3>
<p class="text-secondary" style="max-width: 500px; line-height: 1.5;">Создает 4 готовые стрим-сцены в OBS, обновляет слои виджетов и принудительно очищает их кэш.</p>
</div>
<button id="btn-setup" class="btn btn-primary" style="padding: 14px 24px; font-size: 15px;" ${isBtnDisabled ? 'disabled' : ''}>${btnText}</button>
</section>
<section>
<div class="d-flex justify-between align-center mb-sm flex-wrap gap-sm">
<h3 class="text-md text-bold d-flex align-center gap-sm" style="margin: 0;">${icons.search()} Журнал событий</h3>
<div class="d-flex gap-sm">
<select id="log-filter" class="form-input" style="width: 140px; padding: 6px 12px;">
<option value="all" ${logFilter === 'all' ? 'selected' : ''}>Все логи</option>
<option value="info" ${logFilter === 'info' ? 'selected' : ''}>Инфо</option>
<option value="success" ${logFilter === 'success' ? 'selected' : ''}>Успех</option>
<option value="warn" ${logFilter === 'warn' ? 'selected' : ''}>Варнинги</option>
<option value="error" ${logFilter === 'error' ? 'selected' : ''}>Ошибки</option>
</select>
<button id="btn-clear-logs" class="btn btn-danger" style="padding: 6px 12px;">${icons.trash()} Очистить</button>
</div>
</div>
<div class="terminal" id="terminal-box">
${state.logs.length === 0 ? '<span class="log-time" id="log-placeholder">Система готова. Ожидание действий...</span>' : ''}
${state.logs.map(log => `
<div class="log-entry ${logFilter !== 'all' && log.type !== logFilter ? 'hidden' : ''}" data-type="${log.type}">
<span class="log-time">[${log.time}]</span>
<span class="log-msg-${log.type}">${escapeHtml(log.message)}</span>
</div>`).join('')}
</div>
</section>`;
},
onParamsChange: (params, state) => {
if (params.logFilter && state.logFilter !== params.logFilter) {
store.setState({ logFilter: params.logFilter });
const terminalBox = document.getElementById('terminal-box');
if (terminalBox) {
terminalBox.querySelectorAll('.log-entry').forEach(entry => {
if (params.logFilter === 'all' || entry.getAttribute('data-type') === params.logFilter) entry.classList.remove('hidden');
else entry.classList.add('hidden');
});
terminalBox.scrollTop = terminalBox.scrollHeight;
}
}
},
_bindUpdateCardEvents: (state) => {
const btnCheckUpdate = document.getElementById('btn-check-update');
const btnApplyUpdate = document.getElementById('btn-apply-update');
const api = window.obsAPI;
if (btnCheckUpdate) {
btnCheckUpdate.onclick = async () => {
if (!state.isElectronEnv || !api || typeof api.checkForUpdates !== 'function') return;
store.setUpdateInfo({ isChecking: true });
store.addLog('Поиск новых версий ядра на GitHub...', 'info');
try {
const info = await api.checkForUpdates();
store.setUpdateInfo({ ...info, isChecking: false });
store.addLog(info && info.hasUpdate ? `Найдено обновление ядра: v${cleanVer(info.latestVersion)}!` : 'Установлена самая актуальная версия ядра.', 'success');
} catch (e) {
store.setUpdateInfo({ isChecking: false });
store.addLog(`Ошибка проверки обновлений: ${e.message}`, 'error');
}
};
}
if (btnApplyUpdate) {
btnApplyUpdate.onclick = async () => {
const upd = store.getState().updateInfo;
if (!upd.downloadUrl || !api || typeof api.startUpdate !== 'function') return;
store.setUpdateInfo({ isUpdating: true, progressPercent: 10, statusText: 'Старт загрузки...' });
store.addLog(`Запуск обновления ядра до v${cleanVer(upd.latestVersion)}...`, 'info');
try {
const result = await api.startUpdate(upd.downloadUrl);
if (result && result.success) {
store.addLog('Пакет лаунчера успешно обновлён!', 'success');
store.setUpdateInfo({ hasUpdate: false, isUpdating: false, currentVersion: cleanVer(upd.latestVersion) });
if (typeof api.setup === 'function') await api.setup(store.getState().config.obsPath);
} else {
store.addLog(`Ошибка обновления: ${(result && result.error) || 'неизвестно'}`, 'error');
store.setUpdateInfo({ isUpdating: false, statusText: 'Сбой' });
}
} catch (err) {
store.addLog(`Критическая ошибка обновления: ${err.message}`, 'error');
store.setUpdateInfo({ isUpdating: false });
}
};
}
},
_bindPackCardEvents: (state) => {
const api = window.obsAPI;
const has = (n) => Boolean(api && typeof api[n] === 'function');
const btnCheck = document.getElementById('btn-pack-check');
const btnApply = document.getElementById('btn-pack-apply');
const btnRollback = document.getElementById('btn-pack-rollback');
const btnRefresh = document.getElementById('btn-scenes-refresh');
if (btnCheck) {
btnCheck.onclick = async () => {
if (!has('checkPackUpdate')) { store.addLog('Проверка пака сцен недоступна в этой сборке.', 'warn'); return; }
store.setPackInfo({ isChecking: true });
store.addLog('Поиск пак-релизов сцен на GitHub...', 'info');
try {
const info = await api.checkPackUpdate();
store.setPackInfo({ ...info, isChecking: false });
if (info && info.hasUpdate) store.addLog(`Найден пак сцен v${cleanVer(info.latestVersion)}!`, 'success');
else if (info && info.error) store.addLog(`Проверка пака: ${info.error}`, 'warn');
else store.addLog((info && info.message) || 'Пак сцен актуален.', 'success');
} catch (e) {
store.setPackInfo({ isChecking: false, supported: false });
store.addLog(`Ошибка проверки пака: ${e.message}`, 'error');
}
};
}
if (btnApply) {
btnApply.onclick = async () => {
const pack = packOf(store.getState());
if (!pack.downloadUrl || !has('applyPackUpdate')) return;
store.setPackInfo({ isApplying: true, progressPercent: 5, statusText: 'Старт загрузки пака...' });
store.addLog(`Установка пака сцен v${cleanVer(pack.latestVersion)}...`, 'info');
try {
const result = await api.applyPackUpdate({ downloadUrl: pack.downloadUrl, tag: pack.tag, version: pack.latestVersion });
if (result && result.success) {
store.addLog(`Пак сцен v${result.version} активирован. Авто-перезагрузка сцен...`, 'success');
store.setPackInfo({ hasUpdate: false, isApplying: false, installedVersion: result.version });
} else {
store.addLog(`Ошибка пака сцен: ${(result && result.error) || 'неизвестно'}`, 'error');
store.setPackInfo({ isApplying: false, statusText: 'Сбой' });
}
} catch (err) {
store.addLog(`Критическая ошибка пака: ${err.message}`, 'error');
store.setPackInfo({ isApplying: false });
}
};
}
if (btnRollback) {
btnRollback.onclick = async () => {
if (!has('rollbackPack')) return;
store.addLog('Откат пака сцен к предыдущей версии...', 'info');
try {
const result = await api.rollbackPack();
if (!result || !result.success) store.addLog(`Откат: ${(result && result.error) || 'не выполнен'}`, 'warn');
} catch (e) { store.addLog(`Ошибка отката: ${e.message}`, 'error'); }
};
}
if (btnRefresh) {
btnRefresh.onclick = async () => {
const s = store.getState();
if (packOf(s).isRefreshing) return;
store.setPackInfo({ isRefreshing: true });
if (HomeView._refreshWatchdog) clearTimeout(HomeView._refreshWatchdog);
HomeView._refreshWatchdog = setTimeout(() => {
HomeView._refreshWatchdog = null;
if (packOf(store.getState()).isRefreshing) {
store.setPackInfo({ isRefreshing: false, lastRefresh: { ok: false, message: 'Таймаут: ответ о перезагрузке не получен', ts: Date.now() } });
}
}, 15000);
if (s.serverOnline) {
store.broadcastAction('SCENES_REFRESH', { widgets: 'all', origin: 'launcher' });
} else if (has('refreshScenes')) {
try {
const result = await api.refreshScenes({ widgets: 'all', origin: 'launcher' });
store.setPackInfo({ isRefreshing: false, lastRefresh: { ok: Boolean(result && result.ok), message: (result && result.message) || '', ts: Date.now() } });
} catch (e) {
store.setPackInfo({ isRefreshing: false, lastRefresh: { ok: false, message: e.message, ts: Date.now() } });
}
} else {
store.setPackInfo({ isRefreshing: false, lastRefresh: { ok: false, message: 'Нет связи с сервером', ts: Date.now() } });
}
};
}
},
mount: (params, state) => {
const terminalBox = document.getElementById('terminal-box');
const btnSetup = document.getElementById('btn-setup');
const logFilter = document.getElementById('log-filter');
const btnClearLogs = document.getElementById('btn-clear-logs');
HomeView._bindUpdateCardEvents(state);
HomeView._bindPackCardEvents(state);
HomeView._lastUpdateStateStr = JSON.stringify(state.updateInfo || {});
HomeView._lastPackStateStr = JSON.stringify(packOf(state)) + '|' + state.serverOnline;
if (terminalBox) terminalBox.scrollTop = terminalBox.scrollHeight;
HomeView._filterHandler = (e) => {
const hashBase = window.location.hash.split('?')[0];
const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
searchParams.set('logFilter', e.target.value);
window.location.hash = `${hashBase}?${searchParams.toString()}`;
};
if (logFilter) logFilter.addEventListener('change', HomeView._filterHandler);
HomeView._clearHandler = () => store.clearLogs();
if (btnClearLogs) btnClearLogs.addEventListener('click', HomeView._clearHandler);
HomeView._setupHandler = async () => {
if (!window.obsAPI || typeof window.obsAPI.setup !== 'function') return;
store.setState({ isProcessing: true });
store.addLog('Инициализация сцен в OBS...', 'info');
try {
const response = await window.obsAPI.setup(store.getState().config.obsPath);
if (response && response.status === 'error') store.addLog(`Ошибка OBS: ${response.message}`, 'error');
} catch (error) {
store.addLog(`Сбой: ${error.message}`, 'error');
} finally {
store.setState({ isProcessing: false });
}
};
if (btnSetup && state.isElectronEnv) btnSetup.addEventListener('click', HomeView._setupHandler);
HomeView._unsubStore = store.subscribe((newState) => {
const currentUpdateStr = JSON.stringify(newState.updateInfo || {});
if (currentUpdateStr !== HomeView._lastUpdateStateStr) {
HomeView._lastUpdateStateStr = currentUpdateStr;
const slot = document.getElementById('update-card-slot');
if (slot) {
slot.innerHTML = renderUpdateCardHtml(newState.updateInfo, newState.isElectronEnv);
HomeView._bindUpdateCardEvents(newState);
}
}
const packStr = JSON.stringify(packOf(newState)) + '|' + newState.serverOnline;
if (packStr !== HomeView._lastPackStateStr) {
HomeView._lastPackStateStr = packStr;
if (!packOf(newState).isRefreshing && HomeView._refreshWatchdog) {
clearTimeout(HomeView._refreshWatchdog);
HomeView._refreshWatchdog = null;
}
const packSlot = document.getElementById('pack-card-slot');
if (packSlot) {
packSlot.innerHTML = renderPackCardHtml(packOf(newState), newState.serverOnline, newState.isElectronEnv);
HomeView._bindPackCardEvents(newState);
}
}
if (terminalBox) {
if (newState.logs.length === 0 && HomeView._renderedLogsCount > 0) {
terminalBox.innerHTML = '<span class="log-time" id="log-placeholder">Журнал очищен...</span>';
HomeView._renderedLogsCount = 0;
} else if (newState.logs.length > HomeView._renderedLogsCount) {
const placeholder = document.getElementById('log-placeholder');
if (placeholder) placeholder.remove();
const newLogs = newState.logs.slice(HomeView._renderedLogsCount);
newLogs.forEach(log => {
const entry = document.createElement('div');
entry.className = 'log-entry';
entry.setAttribute('data-type', log.type);
if (newState.logFilter !== 'all' && log.type !== newState.logFilter) entry.classList.add('hidden');
entry.innerHTML = `<span class="log-time">[${log.time}]</span> <span class="log-msg-${log.type}">${escapeHtml(log.message)}</span>`;
terminalBox.appendChild(entry);
});
while (terminalBox.childElementCount > 100) terminalBox.removeChild(terminalBox.firstElementChild);
HomeView._renderedLogsCount = newState.logs.length;
terminalBox.scrollTop = terminalBox.scrollHeight;
}
}
});
},
unmount: () => {
if (HomeView._unsubStore) HomeView._unsubStore();
if (HomeView._refreshWatchdog) { clearTimeout(HomeView._refreshWatchdog); HomeView._refreshWatchdog = null; }
const btnSetup = document.getElementById('btn-setup');
const logFilter = document.getElementById('log-filter');
const btnClearLogs = document.getElementById('btn-clear-logs');
if (btnSetup && HomeView._setupHandler) btnSetup.removeEventListener('click', HomeView._setupHandler);
if (logFilter && HomeView._filterHandler) logFilter.removeEventListener('change', HomeView._filterHandler);
if (btnClearLogs && HomeView._clearHandler) btnClearLogs.removeEventListener('click', HomeView._clearHandler);
}
};