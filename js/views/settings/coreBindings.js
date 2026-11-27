/* ФАЙЛ: js/views/settings/coreBindings.js — v1 (обработчики системных настроек: Twitch, репозиторий, путь OBS, экспорт) */
import { store } from '../../store.js';

class CoreBindings {
  constructor() {
    this._saveTwitch = null;
    this._saveRepo = null;
    this._browseObs = null;
    this._exportLayout = null;
  }

  mount(state) {
    const btnSaveTwitch = document.getElementById('btn-save-twitch');
    const inputTwitch = document.getElementById('twitch-input');
    const btnSaveRepo = document.getElementById('btn-save-repo');
    const inputRepo = document.getElementById('repo-input');
    const btnBrowse = document.getElementById('btn-browse');
    const inputObs = document.getElementById('obs-path-input');
    const btnExport = document.getElementById('btn-export-layout');
    const isEnvOK = Boolean(state && state.isElectronEnv);

    this._saveTwitch = () => {
      if (!inputTwitch) return;
      const channel = inputTwitch.value.trim();
      if (!channel) { store.addLog('Имя канала Twitch не может быть пустым.', 'warn'); return; }
      store.updateConfig({ twitchChannel: channel });
      store.addLog(`Канал Twitch изменен на: ${channel}`, 'success');
    };

    this._saveRepo = () => {
      if (!inputRepo) return;
      const repo = inputRepo.value.trim();
      if (!repo) { store.addLog('Репозиторий обновлений не может быть пустым.', 'warn'); return; }
      store.updateConfig({ githubRepo: repo });
      store.addLog(`Репозиторий обновлений изменен на: ${repo}`, 'info');
    };

    this._browseObs = async () => {
      if (!isEnvOK || !window.obsAPI || typeof window.obsAPI.selectObsPath !== 'function') return;
      try {
        const selectedPath = await window.obsAPI.selectObsPath();
        if (!selectedPath) return;
        if (inputObs) inputObs.value = selectedPath;
        store.updateConfig({ obsPath: selectedPath });
        store.addLog(`Путь к OBS установлен: ${selectedPath}`, 'info');
      } catch (err) {
        store.addLog(`Не удалось выбрать путь: ${err.message}`, 'error');
      }
    };

    this._exportLayout = async () => {
      if (!isEnvOK || !window.obsAPI || typeof window.obsAPI.exportLayout !== 'function') return;
      if (btnExport) btnExport.disabled = true;
      store.addLog('Сбор координат из OBS...', 'info');
      try {
        const result = await window.obsAPI.exportLayout();
        if (result && result.status === 'ok') store.addLog(`Раскладка сохранена: ${result.filePath}`, 'success');
        else if (result && result.status === 'error') store.addLog(`Ошибка экспорта: ${result.message}`, 'error');
        else store.addLog('Экспорт отменён.', 'info');
      } catch (err) {
        store.addLog(`Ошибка экспорта: ${err.message}`, 'error');
      } finally {
        if (btnExport && btnExport.isConnected) btnExport.disabled = false;
      }
    };

    if (btnSaveTwitch) btnSaveTwitch.addEventListener('click', this._saveTwitch);
    if (btnSaveRepo) btnSaveRepo.addEventListener('click', this._saveRepo);
    if (btnBrowse) btnBrowse.addEventListener('click', this._browseObs);
    if (btnExport) btnExport.addEventListener('click', this._exportLayout);
  }

  unmount() {
    const pairs = [
      ['btn-save-twitch', this._saveTwitch],
      ['btn-save-repo', this._saveRepo],
      ['btn-browse', this._browseObs],
      ['btn-export-layout', this._exportLayout]
    ];
    pairs.forEach(([id, handler]) => {
      const el = document.getElementById(id);
      if (el && handler) el.removeEventListener('click', handler);
    });
    this._saveTwitch = null;
    this._saveRepo = null;
    this._browseObs = null;
    this._exportLayout = null;
  }
}

export const coreBindings = new CoreBindings();