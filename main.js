const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const configManager = require('./backend/configManager');
const serverManager = require('./backend/serverManager');
const obsManager = require('./backend/obsManager');
const updateManager = require('./backend/updateManager');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.setPath('userData', path.join(__dirname, '.electron-data'));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 750,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });
  mainWindow.loadFile('index.html');
}

function sendLog(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('obs-log', { message, type });
  }
}

app.whenReady().then(() => {
  serverManager.startServers();
  createWindow();

  serverManager.setRemoteUpdateCallback((newConfig) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('remote-config-update', newConfig);
    }
  });

  app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
  });
});

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') app.quit(); 
});

ipcMain.handle('get-config', () => configManager.getConfig());

ipcMain.handle('save-config', (event, newConfig) => {
  configManager.saveConfig(newConfig);
  serverManager.broadcastToWidgets({ event: 'CONFIG_UPDATED', data: newConfig });
  return { status: 'ok' };
});

ipcMain.handle('select-obs-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файл obs64.exe',
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }]
  });
  return (canceled || filePaths.length === 0) ? null : filePaths[0];
});

ipcMain.handle('setup-obs', async (event, customPath) => {
  return await obsManager.runObsSetup(customPath, sendLog, serverManager.PORT_HTTP);
});

ipcMain.handle('get-local-ip', () => serverManager.getLocalIP());

ipcMain.handle('toggle-tunnel', async () => await serverManager.toggleTunnel());
ipcMain.handle('get-tunnel-status', () => serverManager.getTunnelStatus());

ipcMain.handle('export-layout', async () => {
  const layoutData = await obsManager.exportLayout(sendLog);
  if (!layoutData) return { status: 'error', message: 'Не удалось получить данные из OBS' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить раскладку сцен (layout.json)',
    defaultPath: 'layout.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (canceled || !filePath) return { status: 'canceled' };

  try {
    fs.writeFileSync(filePath, JSON.stringify(layoutData, null, 2), 'utf-8');
    return { status: 'ok', filePath };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
});

// === IPC ОБРАБОТЧИКИ ОБНОВЛЕНИЯ ===
ipcMain.handle('check-updates', async () => {
  const conf = configManager.getConfig();
  const repo = conf.githubRepo || null;
  return await updateManager.checkForUpdates(repo);
});

ipcMain.handle('start-update', async (event, downloadUrl) => {
  return await updateManager.performUpdate(downloadUrl, (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', status);
    }
  });
});