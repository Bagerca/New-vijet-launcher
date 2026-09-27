import { store } from './store.js';
import { Router } from './router.js';
import { Sidebar } from './components/sidebar.js';

import { HomeView } from './views/homeView.js';
import { WidgetsView } from './views/widgetsView.js';
import { RemoteView } from './views/remoteView.js';
import { SettingsView } from './views/settingsView.js';
import { GuideView } from './views/guideView.js';

const appContainer = document.getElementById('app');

const routes = {
  '#/home': HomeView,
  '#/widgets': WidgetsView,
  '#/remote': RemoteView,
  '#/settings': SettingsView,
  '#/guide': GuideView
};

function renderAppLayout(path, ViewObj, params, state) {
  const viewHtml = ViewObj.render(state, params);
  
  appContainer.innerHTML = `
    ${Sidebar(path)}
    <main class="main-wrapper" id="main-wrapper">
      ${viewHtml}
    </main>
  `;
}

function monitorOBSConnection() {
  const checkConnection = () => {
    const ws = new WebSocket('ws://127.0.0.1:4455');
    
    ws.onopen = () => {
      if (store.getState().obsStatus !== 'connected') {
        store.setState({ obsStatus: 'connected' });
      }
      ws.close();
    };
    
    ws.onerror = () => {
      if (store.getState().obsStatus !== 'disconnected') {
        store.setState({ obsStatus: 'disconnected' });
      }
    };
    
    ws.onclose = () => {
      setTimeout(checkConnection, 5000);
    };
  };
  
  checkConnection();
}

async function checkBackgroundUpdates() {
  if (!store.state.isElectronEnv) return;
  try {
    const updateInfo = await window.obsAPI.checkForUpdates();
    store.setUpdateInfo(updateInfo);
    if (updateInfo.hasUpdate) {
      store.addLog(`Доступна новая версия виджетов: v${updateInfo.latestVersion}!`, 'info');
    }
  } catch (err) {
    console.warn('[BOOTSTRAP] Фоновая проверка обновлений пропущена:', err.message);
  }
}

async function bootstrap() {
  if (store.state.isElectronEnv) {
    window.obsAPI.onLog((data) => store.addLog(data.message, data.type));
    window.obsAPI.onRemoteConfigUpdate((config) => store.syncFromRemote(config));
    
    window.obsAPI.onUpdateProgress((status) => {
      store.setUpdateInfo({
        isUpdating: status.stage !== 'completed' && status.stage !== 'error',
        progressPercent: status.percent,
        statusText: status.text
      });
      if (status.stage === 'completed') {
        store.setUpdateInfo({ hasUpdate: false, isUpdating: false });
      }
    });

    try {
      const config = await window.obsAPI.getConfig();
      if (config) store.updateConfig(config); 
    } catch (e) {
      store.addLog('Не удалось загрузить конфиг при старте', 'warn');
    }
  }
  
  monitorOBSConnection();
  
  const router = new Router(routes, store, renderAppLayout);
  router.init();

  setTimeout(checkBackgroundUpdates, 1500);
}

bootstrap();