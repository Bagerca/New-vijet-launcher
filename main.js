const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const configManager = require('./backend/configManager');
const serverManager = require('./backend/serverManager');
const obsManager = require('./backend/obsManager');
const updateManager = require('./backend/updateManager');
const externalSources = require('./backend/externalSources');

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.setPath('userData', path.join(__dirname, '.electron-data'));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080, height: 750, minWidth: 900, minHeight: 650,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true
  });
  mainWindow.loadFile('index.html');
}

function sendLog(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('obs-log', { message, type });
}

app.whenReady().then(() => {
  serverManager.startServers();
  createWindow();
  serverManager.setRemoteUpdateCallback((newConfig) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('remote-config-update', newConfig);
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('get-config', () => configManager.getConfig());
ipcMain.handle('save-config', (event, newConfig) => {
  configManager.saveConfig(newConfig);
  serverManager.broadcastToWidgets({ event: 'CONFIG_UPDATED', data: newConfig });
  return { status: 'ok' };
});

ipcMain.handle('select-obs-path', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файл obs64.exe', properties: ['openFile'], filters: [{ name: 'Executable', extensions: ['exe'] }]
  });
  return (canceled || filePaths.length === 0) ? null : filePaths[0];
});

ipcMain.handle('setup-obs', async (event, customPath) => await obsManager.runObsSetup(customPath, sendLog, serverManager.PORT_HTTP));
ipcMain.handle('get-local-ip', () => serverManager.getLocalIP());
ipcMain.handle('toggle-tunnel', async () => await serverManager.toggleTunnel());
ipcMain.handle('get-tunnel-status', () => serverManager.getTunnelStatus());

ipcMain.handle('export-layout', async () => {
  const layoutData = await obsManager.exportLayout(sendLog);
  if (!layoutData) return { status: 'error', message: 'Не удалось получить данные из OBS' };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Сохранить раскладку сцен (layout.json)', defaultPath: 'layout.json', filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { status: 'canceled' };
  try {
    fs.writeFileSync(filePath, JSON.stringify(layoutData, null, 2), 'utf-8');
    return { status: 'ok', filePath };
  } catch (err) { return { status: 'error', message: err.message }; }
});

// === IPC: ВНЕШНИЕ ИСТОЧНИКИ (локальный ключ стримера, в репозиторий не попадает) ===
ipcMain.handle('external-status', () => {
  try {
    return externalSources.getStatus();
  } catch (e) {
    console.error('[EXTERNAL] getStatus упал:', e);
    return { supported: true, exists: false, ok: false, enabled: false, count: 0, activeCount: 0, sources: [], scenes: [], errors: [e.message], warnings: [] };
  }
});

ipcMain.handle('external-create', () => {
  try {
    const res = externalSources.createFromExample();
    if (res.status === 'ok') sendLog(`Создан локальный ключ: ${res.path}`, 'success');
    else sendLog(res.message || 'Файл уже существует.', res.status === 'error' ? 'error' : 'warn');
    return res;
  } catch (e) {
    sendLog(`Не удалось создать ключ: ${e.message}`, 'error');
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('external-import', (event, text, fileName) => {
  try {
    const safeName = String(fileName || '').slice(0, 120);
    const res = externalSources.importFromText(text, safeName);
    if (res.status === 'ok') {
      sendLog(`Ключ внешних источников импортирован${safeName ? ` из «${safeName}»` : ''}: ${res.count} источник(ов), активных ${res.activeCount}.${res.replaced ? ' Предыдущий ключ сохранён в external-sources.backup.json.' : ''}`, 'success');
      (res.warnings || []).forEach(w => sendLog(`Импорт ключа: ${w}`, 'warn'));
    } else {
      sendLog(`Импорт ключа отклонён: ${res.message || 'неизвестная ошибка'}`, 'error');
      (res.errors || []).slice(0, 5).forEach(err => sendLog(`Импорт ключа: ${err}`, 'error'));
    }
    return res;
  } catch (e) {
    sendLog(`Импорт ключа упал: ${e.message}`, 'error');
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('external-reveal', async () => {
  try {
    if (fs.existsSync(externalSources.FILE_PATH)) {
      shell.showItemInFolder(externalSources.FILE_PATH);
    } else {
      const dir = path.dirname(externalSources.FILE_PATH);
      fs.mkdirSync(dir, { recursive: true });
      await shell.openPath(dir);
    }
    return { status: 'ok' };
  } catch (e) {
    console.error('[EXTERNAL] reveal:', e);
    return { status: 'error', message: e.message };
  }
});

ipcMain.handle('external-apply', async (event, customPath) => await obsManager.runExternalApply(customPath, sendLog));

// === IPC: ОБНОВЛЕНИЕ ЯДРА ===
ipcMain.handle('check-updates', async () => {
  const conf = configManager.getConfig();
  return await updateManager.checkForUpdates(conf.githubRepo || null);
});

ipcMain.handle('start-update', async (event, downloadUrl) => await updateManager.performUpdate(downloadUrl, (status) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-progress', status);
}));

// === IPC: ПАК СЦЕН И ГОРЯЧИЙ РЕФРЕШ OBS ===
ipcMain.handle('pack-status', () => {
  try { return serverManager.getPackStatus(); }
  catch (e) { return { installedVersion: null, baselineVersion: '1.0.0', canRollback: false, error: e.message }; }
});

ipcMain.handle('pack-check', async () => {
  try { return await serverManager.checkPackUpdate(); }
  catch (e) { return { hasUpdate: false, error: e.message }; }
});

ipcMain.handle('pack-apply', async (event, opts) => {
  sendLog(`Обновление пака сцен до v${(opts && opts.version) || '?'}...`, 'info');
  const result = await serverManager.applyPackUpdate(opts || {}, (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pack-progress', status);
  });
  sendLog(result.success ? `Пак сцен v${result.version} установлен. Сцены перезагружаются.` : `Ошибка пака сцен: ${result.error}`, result.success ? 'success' : 'error');
  return result;
});

ipcMain.handle('pack-rollback', async () => {
  const result = await serverManager.rollbackPack();
  sendLog(result.success ? `Откат пака сцен → v${result.version}` : `Откат не выполнен: ${result.error}`, result.success ? 'success' : 'warn');
  return result;
});

ipcMain.handle('scenes-refresh', async (event, payload) => await serverManager.refreshScenes(payload || {}));