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

  // Обновления
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  startUpdate: (downloadUrl) => ipcRenderer.invoke('start-update', downloadUrl),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),

  onLog: (callback) => ipcRenderer.on('obs-log', (event, data) => callback(data)),
  onRemoteConfigUpdate: (callback) => ipcRenderer.on('remote-config-update', (event, config) => callback(config))
});