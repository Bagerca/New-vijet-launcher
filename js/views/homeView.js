import { store } from '../store.js';
import { icons } from '../utils/icons.js';

function escapeHtml(str) { 
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
}

// Inline SVG для иконок обновления
const syncIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>`;
const boxIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

export const HomeView = {
  _unsubStore: null,
  _renderedLogsCount: 0,
  _setupHandler: null,
  _filterHandler: null,
  _clearHandler: null,
  _updateBtnHandler: null,
  _checkUpdateHandler: null,

  render: (state) => {
    HomeView._renderedLogsCount = state.logs.length;
    const isBtnDisabled = state.isProcessing || !state.isElectronEnv;
    const btnText = state.isProcessing ? 'Инициализация...' : 'Авто-настройка OBS';
    
    const obsStatusClass = state.obsStatus === 'connected' ? 'color: var(--color-success);' : 'color: var(--color-danger);';
    const obsStatusText = state.obsStatus === 'connected' ? 'Подключен' : 'Отключен (порт 4455)';
    const obsIcon = state.obsStatus === 'connected' ? icons.obs() : icons.power();

    const upd = state.updateInfo;
    const isEnvOK = state.isElectronEnv;

    return `
      <header class="view-header">
        <h1 class="view-title">Главная панель</h1>
        <p class="view-subtitle">Мониторинг систем, оверлеев и управление сценами.</p>
      </header>

      <!-- ЦЕНТР ОБНОВЛЕНИЙ -->
      <section class="card mb-md update-center-card ${upd.hasUpdate ? 'has-update' : ''}">
        <div class="d-flex justify-between align-center">
          <div class="d-flex align-center gap-md">
            <div class="update-icon-wrapper">
              ${upd.hasUpdate ? boxIcon : syncIcon}
            </div>
            <div>
              <h3 class="text-lg text-bold mb-xs d-flex align-center gap-sm">
                Сборка виджетов: v${escapeHtml(upd.currentVersion)}
                ${upd.hasUpdate ? `<span class="badge badge-update">Доступна v${escapeHtml(upd.latestVersion)}</span>` : `<span class="badge badge-success">Актуально</span>`}
              </h3>
              <p class="text-secondary text-sm">
                ${upd.isChecking ? 'Поиск новых версий на GitHub...' : (upd.hasUpdate ? 'Доступны новые дизайны и исправления ошибок.' : 'У вас установлена самая последняя версия виджетов.')}
              </p>
            </div>
          </div>
          <div>
            ${upd.hasUpdate
              ? `<button id="btn-apply-update" class="btn btn-accent" ${upd.isUpdating ? 'disabled' : ''}>
                  ${upd.isUpdating ? 'Установка...' : '⚡ Обновить виджеты'}
                 </button>`
              : `<button id="btn-check-update" class="btn btn-secondary" ${upd.isChecking || !isEnvOK ? 'disabled' : ''}>
                  <span class="${upd.isChecking ? 'spin-anim' : ''} d-flex align-center gap-sm">${syncIcon} ${upd.isChecking ? 'Проверка...' : 'Проверить'}</span>
                 </button>`
            }
          </div>
        </div>
        ${upd.hasUpdate ? `
          <div class="update-details mt-md pt-md" style="border-top: 1px solid rgba(255,255,255,0.1);">
            <p class="text-secondary text-sm mb-sm"><strong style="color: #fff;">Что нового:</strong> ${escapeHtml(upd.releaseNotes || 'Улучшения производительности')}</p>
            ${upd.isUpdating ? `
              <div class="update-progress-bar">
                <div class="update-progress-fill" style="width: ${upd.progressPercent}%;"></div>
              </div>
              <div class="text-muted text-sm mt-xs text-right">${escapeHtml(upd.statusText)}</div>
            ` : ''}
          </div>
        ` : ''}
      </section>
      
      <!-- Статус-панели -->
      <div class="d-flex gap-md mb-md flex-wrap">
        <div class="card flex-1" style="margin-bottom: 0;">
          <div class="text-muted text-sm mb-xs text-bold">СТАТУС OBS STUDIO</div>
          <div class="text-lg text-bold d-flex align-center gap-sm" style="${obsStatusClass}">
            ${obsIcon} ${obsStatusText}
          </div>
        </div>
        <div class="card flex-1" style="margin-bottom: 0;">
          <div class="text-muted text-sm mb-xs text-bold">КАНАЛ TWITCH</div>
          <div class="text-lg text-bold d-flex align-center gap-sm" style="color: var(--text-primary);">
            ${icons.twitch()} ${state.config.twitchChannel || 'Не указан'}
          </div>
        </div>
      </div>

      <!-- Главная кнопка -->
      <section class="card d-flex justify-between align-center mb-lg" style="border-color: var(--accent-glow); box-shadow: 0 4px 30px rgba(145, 70, 255, 0.1);">
        <div>
          <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.obs()} Master Scene Architecture</h3>
          <p class="text-secondary" style="max-width: 500px; line-height: 1.5;">
            Создает 4 готовые стрим-сцены в OBS, обновляет слои виджетов и принудительно очищает их кэш.
          </p>
        </div>
        <button id="btn-setup" class="btn btn-primary" style="padding: 14px 24px; font-size: 15px;" ${isBtnDisabled ? 'disabled' : ''}>
          ${btnText}
        </button>
      </section>

      <!-- Терминал -->
      <section>
        <div class="d-flex justify-between align-center mb-sm">
          <h3 class="text-md text-bold d-flex align-center gap-sm" style="margin: 0;">${icons.search()} Журнал событий</h3>
          <div class="d-flex gap-sm">
            <select id="log-filter" class="text-input" style="width: 140px; padding: 6px 12px;">
              <option value="all" ${state.logFilter === 'all' ? 'selected' : ''}>Все логи</option>
              <option value="info" ${state.logFilter === 'info' ? 'selected' : ''}>Инфо</option>
              <option value="success" ${state.logFilter === 'success' ? 'selected' : ''}>Успех</option>
              <option value="warn" ${state.logFilter === 'warn' ? 'selected' : ''}>Варнинги</option>
              <option value="error" ${state.logFilter === 'error' ? 'selected' : ''}>Ошибки</option>
            </select>
            <button id="btn-clear-logs" class="btn btn-danger" style="padding: 6px 12px;">${icons.trash()} Очистить</button>
          </div>
        </div>
        <div class="terminal" id="terminal-box">
          ${state.logs.length === 0 ? '<span class="log-time" id="log-placeholder">Система готова. Ожидание действий...</span>' : ''}
          ${state.logs.map(log => `
            <div class="log-entry ${state.logFilter !== 'all' && log.type !== state.logFilter ? 'hidden' : ''}" data-type="${log.type}">
              <span class="log-time">[${log.time}]</span>
              <span class="log-msg-${log.type}">${escapeHtml(log.message)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  mount: (params, state) => {
    const terminalBox = document.getElementById('terminal-box');
    const btnSetup = document.getElementById('btn-setup');
    const logFilter = document.getElementById('log-filter');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const btnApplyUpdate = document.getElementById('btn-apply-update');
    const btnCheckUpdate = document.getElementById('btn-check-update');
    
    if (terminalBox) terminalBox.scrollTop = terminalBox.scrollHeight;

    HomeView._filterHandler = (e) => {
      const filter = e.target.value;
      store.setState({ logFilter: filter });
      const entries = terminalBox.querySelectorAll('.log-entry');
      entries.forEach(entry => {
        if (filter === 'all' || entry.getAttribute('data-type') === filter) {
          entry.classList.remove('hidden');
        } else {
          entry.classList.add('hidden');
        }
      });
      terminalBox.scrollTop = terminalBox.scrollHeight;
    };
    if (logFilter) logFilter.addEventListener('change', HomeView._filterHandler);

    HomeView._clearHandler = () => { store.clearLogs(); };
    if (btnClearLogs) btnClearLogs.addEventListener('click', HomeView._clearHandler);

    HomeView._setupHandler = async () => {
      store.setState({ isProcessing: true });
      store.addLog('Инициализация сцен в OBS...', 'info');
      try {
        const response = await window.obsAPI.setup(store.getState().config.obsPath);
        if (response.status === 'error') store.addLog(`Ошибка OBS: ${response.message}`, 'error');
      } catch (error) {
        store.addLog(`Сбой: ${error.message}`, 'error');
      } finally {
        store.setState({ isProcessing: false });
      }
    };
    if (btnSetup && state.isElectronEnv) btnSetup.addEventListener('click', HomeView._setupHandler);

    HomeView._checkUpdateHandler = async () => {
      if (!state.isElectronEnv) return;
      store.setUpdateInfo({ isChecking: true });
      store.addLog('Поиск новых версий на GitHub...', 'info');
      
      try {
        const info = await window.obsAPI.checkForUpdates();
        store.setUpdateInfo({ ...info, isChecking: false });
        
        if (info.hasUpdate) {
          store.addLog(`Найдено обновление: v${info.latestVersion}!`, 'success');
        } else {
          store.addLog('Установлена самая актуальная версия виджетов.', 'success');
        }
      } catch (e) {
        store.setUpdateInfo({ isChecking: false });
        store.addLog(`Ошибка проверки обновлений: ${e.message}`, 'error');
      }
    };
    if (btnCheckUpdate) btnCheckUpdate.addEventListener('click', HomeView._checkUpdateHandler);

    HomeView._updateBtnHandler = async () => {
      const upd = store.getState().updateInfo;
      if (!upd.downloadUrl || !state.isElectronEnv) return;

      store.setUpdateInfo({ isUpdating: true, progressPercent: 5, statusText: 'Старт загрузки...' });
      store.addLog(`Запуск обновления виджетов до ${upd.latestVersion}...`, 'info');

      try {
        const result = await window.obsAPI.startUpdate(upd.downloadUrl);
        if (result.success) {
          store.addLog('Пакет виджетов успешно обновлен!', 'success');
          store.setUpdateInfo({ hasUpdate: false, isUpdating: false, currentVersion: upd.latestVersion });
          
          await window.obsAPI.setup(store.getState().config.obsPath);
        } else {
          store.addLog(`Ошибка обновления: ${result.error}`, 'error');
          store.setUpdateInfo({ isUpdating: false, statusText: 'Сбой' });
        }
      } catch (err) {
        store.addLog(`Критическая ошибка обновления: ${err.message}`, 'error');
        store.setUpdateInfo({ isUpdating: false });
      }
    };
    if (btnApplyUpdate) btnApplyUpdate.addEventListener('click', HomeView._updateBtnHandler);

    HomeView._unsubStore = store.subscribe((newState) => {
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
            
            if (newState.logFilter !== 'all' && log.type !== newState.logFilter) {
              entry.classList.add('hidden');
            }

            entry.innerHTML = `<span class="log-time">[${log.time}]</span> <span class="log-msg-${log.type}">${escapeHtml(log.message)}</span>`;
            terminalBox.appendChild(entry);
          });
          
          while (terminalBox.childElementCount > 100) {
            terminalBox.removeChild(terminalBox.firstElementChild);
          }
          
          HomeView._renderedLogsCount = newState.logs.length;
          terminalBox.scrollTop = terminalBox.scrollHeight;
        }
      }
    });
  },

  unmount: () => {
    if (HomeView._unsubStore) HomeView._unsubStore();
    const btnSetup = document.getElementById('btn-setup');
    const logFilter = document.getElementById('log-filter');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const btnApplyUpdate = document.getElementById('btn-apply-update');
    const btnCheckUpdate = document.getElementById('btn-check-update');
    
    if (btnSetup && HomeView._setupHandler) btnSetup.removeEventListener('click', HomeView._setupHandler);
    if (logFilter && HomeView._filterHandler) logFilter.removeEventListener('change', HomeView._filterHandler);
    if (btnClearLogs && HomeView._clearHandler) btnClearLogs.removeEventListener('click', HomeView._clearHandler);
    if (btnApplyUpdate && HomeView._updateBtnHandler) btnApplyUpdate.removeEventListener('click', HomeView._updateBtnHandler);
    if (btnCheckUpdate && HomeView._checkUpdateHandler) btnCheckUpdate.removeEventListener('click', HomeView._checkUpdateHandler);
  }
};