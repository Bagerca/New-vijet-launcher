const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('obsAPI', {
  setup: (customPath) => ipcRenderer.invoke('setup-obs', customPath),
  selectObsPath: () => ipcRenderer.invoke('select-obs-path'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  toggleTunnel: () => ipcRenderer.invoke('toggle-tunnel'),
  getTunnelStatus: () => ipcRenderer.invoke('get-tunnel-status'),
  exportLayout: () => ipcRenderer.invoke('export-layout'),

  // Внешние источники (локальный ключ стримера)
  getExternalSources: () => ipcRenderer.invoke('external-status'),
  createExternalSources: () => ipcRenderer.invoke('external-create'),
  importExternalSources: (text, fileName) => ipcRenderer.invoke('external-import', text, fileName),
  revealExternalSources: () => ipcRenderer.invoke('external-reveal'),
  applyExternalSources: (customPath) => ipcRenderer.invoke('external-apply', customPath),

  // Обновление ядра
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  startUpdate: (downloadUrl) => ipcRenderer.invoke('start-update', downloadUrl),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),

  // Пак сцен (горячее обновление без перезапуска)
  getPackStatus: () => ipcRenderer.invoke('pack-status'),
  checkPackUpdate: () => ipcRenderer.invoke('pack-check'),
  applyPackUpdate: (opts) => ipcRenderer.invoke('pack-apply', opts),
  rollbackPack: () => ipcRenderer.invoke('pack-rollback'),
  onPackProgress: (callback) => ipcRenderer.on('pack-progress', (event, data) => callback(data)),

  // Горячий рефреш браузер-источников OBS
  refreshScenes: (payload) => ipcRenderer.invoke('scenes-refresh', payload),

  onLog: (callback) => ipcRenderer.on('obs-log', (event, data) => callback(data)),
  onRemoteConfigUpdate: (callback) => ipcRenderer.on('remote-config-update', (event, config) => callback(config))
});