import { store } from '../store.js';
import { icons } from '../utils/icons.js';

function escapeHtml(str) { 
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
}

function cleanVer(v) { 
  return v ? v.replace(/^v+/, '') : '1.0.0'; 
}

function renderUpdateCardHtml(upd, isEnvOK) {
  const current = cleanVer(upd.currentVersion);
  const latest = cleanVer(upd.latestVersion);

  return `
    <section class="card mb-md update-center-card ${upd.hasUpdate ? 'has-update' : ''}">
      <div class="d-flex justify-between align-center">
        <div class="d-flex align-center gap-md">
          <div class="update-icon-wrapper">
            ${upd.hasUpdate ? icons.box() : icons.sync()}
          </div>
          <div>
            <h3 class="text-lg text-bold mb-xs d-flex align-center gap-sm">
              Сборка виджетов: v${escapeHtml(current)}
              ${upd.hasUpdate ? `<span class="badge badge-update">Доступна v${escapeHtml(latest)}</span>` : `<span class="badge badge-success">Актуально</span>`}
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
                <span class="${upd.isChecking ? 'spin-anim' : ''} d-flex align-center gap-sm">${icons.sync()} ${upd.isChecking ? 'Проверка...' : 'Проверить'}</span>
               </button>`
          }
        </div>
      </div>
      ${upd.hasUpdate ? `
        <div class="update-details mt-md pt-md" style="border-top: 1px solid rgba(255,255,255,0.1);">
          <p class="text-secondary text-sm mb-sm"><strong style="color: #fff;">Что нового:</strong> ${escapeHtml(upd.releaseNotes || 'Улучшения виджетов')}</p>
          ${upd.isUpdating ? `
            <div class="update-progress-bar">
              <div class="update-progress-fill" style="width: ${upd.progressPercent}%;"></div>
            </div>
            <div class="text-muted text-sm mt-xs text-right">${escapeHtml(upd.statusText)}</div>
          ` : ''}
        </div>
      ` : ''}
    </section>
  `;
}

export const HomeView = {
  _unsubStore: null,
  _renderedLogsCount: 0,
  _setupHandler: null,
  _filterHandler: null,
  _clearHandler: null,
  _lastUpdateStateStr: '',

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

      <div id="update-card-slot">
        ${renderUpdateCardHtml(state.updateInfo, state.isElectronEnv)}
      </div>
      
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

      <section>
        <div class="d-flex justify-between align-center mb-sm">
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
            </div>
          `).join('')}
        </div>
      </section>
    `;
  },

  onParamsChange: (params, state) => {
    if (params.logFilter && state.logFilter !== params.logFilter) {
      store.setState({ logFilter: params.logFilter });
      const terminalBox = document.getElementById('terminal-box');
      if (terminalBox) {
        terminalBox.querySelectorAll('.log-entry').forEach(entry => {
          if (params.logFilter === 'all' || entry.getAttribute('data-type') === params.logFilter) {
            entry.classList.remove('hidden');
          } else {
            entry.classList.add('hidden');
          }
        });
        terminalBox.scrollTop = terminalBox.scrollHeight;
      }
    }
  },

  _bindUpdateCardEvents: (state) => {
    const btnCheckUpdate = document.getElementById('btn-check-update');
    const btnApplyUpdate = document.getElementById('btn-apply-update');

    if (btnCheckUpdate) {
      btnCheckUpdate.onclick = async () => {
        if (!state.isElectronEnv) return;
        store.setUpdateInfo({ isChecking: true });
        store.addLog('Поиск новых версий на GitHub...', 'info');
        
        try {
          const info = await window.obsAPI.checkForUpdates();
          store.setUpdateInfo({ ...info, isChecking: false });
          
          if (info.hasUpdate) {
            store.addLog(`Найдено обновление: v${cleanVer(info.latestVersion)}!`, 'success');
          } else {
            store.addLog('Установлена самая актуальная версия виджетов.', 'success');
          }
        } catch (e) {
          store.setUpdateInfo({ isChecking: false });
          store.addLog(`Ошибка проверки обновлений: ${e.message}`, 'error');
        }
      };
    }

    if (btnApplyUpdate) {
      btnApplyUpdate.onclick = async () => {
        const upd = store.getState().updateInfo;
        if (!upd.downloadUrl || !state.isElectronEnv) return;

        store.setUpdateInfo({ isUpdating: true, progressPercent: 10, statusText: 'Старт загрузки...' });
        store.addLog(`Запуск обновления виджетов до v${cleanVer(upd.latestVersion)}...`, 'info');

        try {
          const result = await window.obsAPI.startUpdate(upd.downloadUrl);
          if (result.success) {
            store.addLog('Пакет виджетов успешно обновлен!', 'success');
            store.setUpdateInfo({ hasUpdate: false, isUpdating: false, currentVersion: cleanVer(upd.latestVersion) });
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
    }
  },

  mount: (params, state) => {
    const terminalBox = document.getElementById('terminal-box');
    const btnSetup = document.getElementById('btn-setup');
    const logFilter = document.getElementById('log-filter');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    
    HomeView._bindUpdateCardEvents(state);

    if (terminalBox) terminalBox.scrollTop = terminalBox.scrollHeight;

    HomeView._filterHandler = (e) => {
      const hashBase = window.location.hash.split('?')[0];
      const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      searchParams.set('logFilter', e.target.value);
      window.location.hash = `${hashBase}?${searchParams.toString()}`;
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

    HomeView._unsubStore = store.subscribe((newState) => {
      const currentUpdateStr = JSON.stringify(newState.updateInfo);
      if (currentUpdateStr !== HomeView._lastUpdateStateStr) {
        HomeView._lastUpdateStateStr = currentUpdateStr;
        const slot = document.getElementById('update-card-slot');
        if (slot) {
          slot.innerHTML = renderUpdateCardHtml(newState.updateInfo, newState.isElectronEnv);
          HomeView._bindUpdateCardEvents(newState);
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
    
    if (btnSetup && HomeView._setupHandler) btnSetup.removeEventListener('click', HomeView._setupHandler);
    if (logFilter && HomeView._filterHandler) logFilter.removeEventListener('change', HomeView._filterHandler);
    if (btnClearLogs && HomeView._clearHandler) btnClearLogs.removeEventListener('click', HomeView._clearHandler);
  }
};