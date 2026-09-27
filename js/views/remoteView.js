import { store } from '../store.js';
import { icons } from '../utils/icons.js';
import { generateQRSvg } from '../utils/qr.js';

export const RemoteView = {
  _copyHandler: null,
  _tunnelHandler: null,

  render: (state) => {
    const isEnvOK = state.isElectronEnv;
    const warning = isEnvOK ? '' : '<div class="card mb-md text-danger border-danger">Режим браузера. Доступ к API сервера заблокирован.</div>';

    return `
      <header class="view-header">
        <h1 class="view-title">Удаленное управление</h1>
        <p class="view-subtitle">Подключите телефон модератора для управления стримом.</p>
      </header>
      
      ${warning}

      <div class="d-flex gap-lg flex-wrap align-start">
        
        <section class="card flex-1" style="min-width: 400px;">
          <header class="mb-md border-bottom pb-md d-flex justify-between align-center">
            <div>
              <h3 class="text-lg text-bold d-flex align-center gap-sm">
                ${icons.smartphone()} Подключение
              </h3>
              <p class="text-muted text-sm mt-xs" id="panel-desc">Локальная сеть (Wi-Fi)</p>
            </div>
            <button id="btn-toggle-tunnel" class="btn btn-secondary" ${!isEnvOK ? 'disabled' : ''}>
              🌐 Открыть в Интернет
            </button>
          </header>
          
          <div class="input-row mb-lg">
            <input type="url" id="panel-url-input" class="text-input" readonly value="${isEnvOK ? 'Загрузка...' : 'Недоступно'}" />
            <button id="btn-copy-link" class="btn btn-primary" ${!isEnvOK ? 'disabled' : ''}>${icons.copy()} Копировать</button>
          </div>

          <div class="guide-list text-secondary text-sm">
            <li><strong>Local Mode:</strong> Телефон должен быть подключен к тому же Wi-Fi, что и компьютер.</li>
            <li><strong>Internet Mode:</strong> Генерирует безопасную публичную ссылку для модератора из другого города.</li>
            <li>Не показывайте QR-код на трансляции!</li>
          </div>
        </section>

        <section class="card d-flex flex-column align-center justify-center" style="width: 280px; min-height: 320px;">
          <div id="qr-container" style="display: none; width: 100%; display: flex; flex-direction: column; align-items: center;">
            <div id="qr-image" style="width: 200px; height: 200px; padding: 10px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></div>
            <p class="text-muted mt-md text-sm text-bold text-center">Отсканируйте камерой телефона</p>
          </div>
          <div id="qr-loader" class="text-muted">Генерация ключа...</div>
        </section>

      </div>
    `;
  },

  mount: async (params, state) => {
    const inputPanelUrl = document.getElementById('panel-url-input');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const qrContainer = document.getElementById('qr-container');
    const qrImage = document.getElementById('qr-image');
    const qrLoader = document.getElementById('qr-loader');
    const btnToggleTunnel = document.getElementById('btn-toggle-tunnel');
    const panelDesc = document.getElementById('panel-desc');

    let localUrl = '';
    let isTunnelActive = false;

    const updateLinkUI = (url, isPublic) => {
      inputPanelUrl.value = url;
      qrImage.innerHTML = generateQRSvg(url);
      
      qrLoader.style.display = 'none';
      qrContainer.style.display = 'flex';
      
      if (isPublic) {
        btnToggleTunnel.innerHTML = '🛑 Закрыть доступ';
        btnToggleTunnel.classList.replace('btn-secondary', 'btn-danger');
        panelDesc.innerHTML = '<span style="color: var(--color-success)">Публичная ссылка (Internet)</span>';
      } else {
        btnToggleTunnel.innerHTML = '🌐 Открыть в Интернет';
        btnToggleTunnel.classList.replace('btn-danger', 'btn-secondary');
        panelDesc.innerHTML = 'Локальная сеть (Wi-Fi)';
      }
    };

    if (state.isElectronEnv) {
      try {
        const ip = await window.obsAPI.getLocalIP();
        localUrl = `http://${ip}:42069/panel/index.html`;
        
        const tunnelStatus = await window.obsAPI.getTunnelStatus();
        isTunnelActive = tunnelStatus.active;
        
        updateLinkUI(tunnelStatus.active ? tunnelStatus.url : localUrl, tunnelStatus.active);

        RemoteView._tunnelHandler = async () => {
          btnToggleTunnel.disabled = true;
          btnToggleTunnel.innerHTML = '⏳ Соединение...';
          
          const result = await window.obsAPI.toggleTunnel();
          isTunnelActive = result.active;
          
          if (result.error) {
            store.addLog(`Ошибка туннеля: ${result.error}`, 'error');
            updateLinkUI(localUrl, false);
          } else {
            if (isTunnelActive) store.addLog('Публичный доступ открыт!', 'success');
            else store.addLog('Публичный доступ закрыт', 'info');
            
            updateLinkUI(isTunnelActive ? result.url : localUrl, isTunnelActive);
          }
          btnToggleTunnel.disabled = false;
        };

        RemoteView._copyHandler = () => {
          navigator.clipboard.writeText(inputPanelUrl.value);
          store.addLog('Ссылка скопирована', 'success');
        };

        btnToggleTunnel.addEventListener('click', RemoteView._tunnelHandler);
        btnCopyLink.addEventListener('click', RemoteView._copyHandler);

      } catch (e) {
        inputPanelUrl.value = 'Ошибка инициализации сети';
      }
    }
  },

  unmount: () => {
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnToggleTunnel = document.getElementById('btn-toggle-tunnel');
    if (btnCopyLink && RemoteView._copyHandler) btnCopyLink.removeEventListener('click', RemoteView._copyHandler);
    if (btnToggleTunnel && RemoteView._tunnelHandler) btnToggleTunnel.removeEventListener('click', RemoteView._tunnelHandler);
  }
};