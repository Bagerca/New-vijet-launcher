import { store } from '../store.js';
import { icons } from '../utils/icons.js';

export const SettingsView = {
  _saveTwitchHandler: null,
  _browseObsHandler: null,
  _exportLayoutHandler: null,
  _checkUpdateHandler: null,
  _saveRepoHandler: null,

  render: (state) => {
    const twitchChannel = state.config.twitchChannel || '';
    const obsPath = state.config.obsPath || '';
    const githubRepo = state.config.githubRepo || 'ksusha-sher/stream-launcher';
    const isEnvOK = state.isElectronEnv;
    const upd = state.updateInfo;

    return `
      <header class="view-header">
        <h1 class="view-title">Настройки ядра</h1>
        <p class="view-subtitle">Системные параметры, интеграции и центр обновлений.</p>
      </header>

      <!-- Центр обновлений -->
      <section class="card mb-md">
        <header class="mb-md border-bottom pb-md">
          <div class="d-flex justify-between align-center">
            <div>
              <h3 class="text-lg mb-xs d-flex align-center gap-sm">🔄 Обновление виджетов и оверлеев</h3>
              <p class="text-secondary text-sm">Горячее скачивание новых кодов виджетов с сохранением ваших настроек.</p>
            </div>
            <span class="badge ${upd.hasUpdate ? 'badge-update' : 'badge-success'}">
              v${escapeHtml(upd.currentVersion)}
            </span>
          </div>
        </header>

        <div class="mb-md">
          <label class="text-muted text-sm text-bold mb-xs" style="display:block;">РЕПОЗИТОРИЙ GITHUB (owner/repo)</label>
          <div class="input-row">
            <input type="text" id="repo-input" class="text-input" value="${escapeHtml(githubRepo)}" placeholder="ksusha-sher/stream-launcher" />
            <button id="btn-save-repo" class="btn btn-secondary">Сохранить</button>
            <button id="btn-check-update" class="btn btn-primary" ${!isEnvOK ? 'disabled' : ''}>
              Проверить обновления
            </button>
          </div>
        </div>

        <div id="update-status-msg" class="text-sm text-secondary">
          ${upd.hasUpdate ? `Доступна новая версия: <strong>${escapeHtml(upd.latestVersion)}</strong>! Вернитесь на Дашборд для установки.` : 'Установлена последняя версия виджетов.'}
        </div>
      </section>

      <!-- Twitch -->
      <section class="card mb-md">
        <header class="mb-md border-bottom pb-md">
          <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.twitch()} Интеграция Twitch</h3>
          <p class="text-secondary text-sm">Имя канала для парсинга чата, алертов и команд модераторов.</p>
        </header>
        <form class="input-row" onsubmit="return false;">
          <input type="text" id="twitch-input" class="text-input" value="${escapeHtml(twitchChannel)}" placeholder="Например: ksusha__sher" />
          <button id="btn-save-twitch" class="btn btn-primary" type="button">Сохранить</button>
        </form>
      </section>

      <!-- OBS Path -->
      <section class="card mb-md">
        <header class="mb-md border-bottom pb-md">
          <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.settings()} Путь к OBS Studio (obs64.exe)</h3>
          <p class="text-secondary text-sm">Если автопоиск при инициализации не сработал, укажите путь вручную.</p>
        </header>
        <div class="input-row">
          <input type="text" id="obs-path-input" class="text-input" readonly value="${escapeHtml(obsPath || 'Автопоиск активен')}" />
          <button id="btn-browse" class="btn btn-secondary" ${!isEnvOK ? 'disabled' : ''}>Обзор...</button>
        </div>
      </section>

      <!-- Developer Tools -->
      <section class="card mb-md">
        <header class="mb-md border-bottom pb-md">
          <h3 class="text-lg mb-xs">Инструменты разработчика</h3>
          <p class="text-secondary text-sm">Создание бэкапов и кастомных лейаутов.</p>
        </header>
        <div class="input-row">
          <button id="btn-export-layout" class="btn btn-secondary" ${!isEnvOK ? 'disabled' : ''}>
            📥 Экспорт текущей раскладки сцен OBS (JSON)
          </button>
        </div>
      </section>
    `;
  },

  mount: (params, state) => {
    const btnSaveTwitch = document.getElementById('btn-save-twitch');
    const inputTwitch = document.getElementById('twitch-input');
    const btnBrowse = document.getElementById('btn-browse');
    const inputObs = document.getElementById('obs-path-input');
    const btnExportLayout = document.getElementById('btn-export-layout');
    const btnCheckUpdate = document.getElementById('btn-check-update');
    const btnSaveRepo = document.getElementById('btn-save-repo');
    const inputRepo = document.getElementById('repo-input');
    const statusMsg = document.getElementById('update-status-msg');

    SettingsView._saveTwitchHandler = () => {
      const channel = inputTwitch.value.trim();
      if (!channel) return;
      store.updateConfig({ twitchChannel: channel });
      store.addLog(`Канал Twitch изменен на: ${channel}`, 'success');
    };

    SettingsView._saveRepoHandler = () => {
      const repo = inputRepo.value.trim();
      if (!repo) return;
      store.updateConfig({ githubRepo: repo });
      store.addLog(`Репозиторий обновлений изменен на: ${repo}`, 'info');
    };

    SettingsView._browseObsHandler = async () => {
      if (!state.isElectronEnv) return;
      const selectedPath = await window.obsAPI.selectObsPath();
      if (selectedPath) {
        inputObs.value = selectedPath;
        store.updateConfig({ obsPath: selectedPath });
        store.addLog(`Путь к OBS установлен: ${selectedPath}`, 'info');
      }
    };

    SettingsView._exportLayoutHandler = async () => {
      if (!state.isElectronEnv) return;
      btnExportLayout.disabled = true;
      store.addLog('Сбор координат из OBS...', 'info');
      
      const result = await window.obsAPI.exportLayout();
      if (result.status === 'ok') store.addLog(`Раскладка сохранена: ${result.filePath}`, 'success');
      else if (result.status === 'error') store.addLog(`Ошибка экспорта: ${result.message}`, 'error');
      
      btnExportLayout.disabled = false;
    };

    SettingsView._checkUpdateHandler = async () => {
      if (!state.isElectronEnv) return;
      btnCheckUpdate.disabled = true;
      statusMsg.textContent = 'Проверка обновлений на GitHub...';
      
      try {
        const info = await window.obsAPI.checkForUpdates();
        store.setUpdateInfo(info);
        if (info.hasUpdate) {
          statusMsg.innerHTML = `<span style="color: var(--accent-secondary)">Доступна версия ${info.latestVersion}! Вернитесь на Дашборд для установки.</span>`;
          store.addLog(`Найдено обновление: v${info.latestVersion}`, 'info');
        } else {
          statusMsg.textContent = `У вас актуальная версия (${info.currentVersion}).`;
          store.addLog('Обновлений не найдено. Установлена последняя версия.', 'success');
        }
      } catch (e) {
        statusMsg.textContent = `Ошибка проверки: ${e.message}`;
      } finally {
        btnCheckUpdate.disabled = false;
      }
    };

    if (btnSaveTwitch && inputTwitch) btnSaveTwitch.addEventListener('click', SettingsView._saveTwitchHandler);
    if (btnSaveRepo && inputRepo) btnSaveRepo.addEventListener('click', SettingsView._saveRepoHandler);
    if (btnBrowse) btnBrowse.addEventListener('click', SettingsView._browseObsHandler);
    if (btnExportLayout) btnExportLayout.addEventListener('click', SettingsView._exportLayoutHandler);
    if (btnCheckUpdate) btnCheckUpdate.addEventListener('click', SettingsView._checkUpdateHandler);
  },

  unmount: () => {
    const btnSaveTwitch = document.getElementById('btn-save-twitch');
    const btnSaveRepo = document.getElementById('btn-save-repo');
    const btnBrowse = document.getElementById('btn-browse');
    const btnExportLayout = document.getElementById('btn-export-layout');
    const btnCheckUpdate = document.getElementById('btn-check-update');

    if (btnSaveTwitch && SettingsView._saveTwitchHandler) btnSaveTwitch.removeEventListener('click', SettingsView._saveTwitchHandler);
    if (btnSaveRepo && SettingsView._saveRepoHandler) btnSaveRepo.removeEventListener('click', SettingsView._saveRepoHandler);
    if (btnBrowse && SettingsView._browseObsHandler) btnBrowse.removeEventListener('click', SettingsView._browseObsHandler);
    if (btnExportLayout && SettingsView._exportLayoutHandler) btnExportLayout.removeEventListener('click', SettingsView._exportLayoutHandler);
    if (btnCheckUpdate && SettingsView._checkUpdateHandler) btnCheckUpdate.removeEventListener('click', SettingsView._checkUpdateHandler);
  }
};

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}