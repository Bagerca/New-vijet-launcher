/* ФАЙЛ: backend/obs/connection.js — v1 (ЕДИНСТВЕННЫЙ экземпляр сокета OBS + запуск процесса + коннект) */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const OBSWebSocket = require('obs-websocket-js').default;

const OBS_URL = 'ws://127.0.0.1:4455';

/**
 * Один сокет на всё приложение. Node кэширует модули, поэтому любой require('./connection')
 * получает тот же инстанс. НЕ создавать new OBSWebSocket() в других модулях.
 */
const obs = new OBSWebSocket();

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const POSSIBLE_PATHS = [
  'D:\\PORTABLE\\obs-studio\\bin\\64bit\\obs64.exe',
  'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
  'D:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'
];

function launchOBS(customPath, sendLog) {
  return new Promise((resolve) => {
    let obsPath = null;
    let obsDir = null;

    if (customPath && fs.existsSync(customPath)) {
      obsPath = customPath;
      obsDir = path.dirname(customPath);
    } else {
      for (const checkPath of POSSIBLE_PATHS) {
        if (fs.existsSync(checkPath)) {
          obsPath = checkPath;
          obsDir = path.dirname(checkPath);
          break;
        }
      }
    }

    if (!obsPath) {
      sendLog('OBS не найден! Укажите путь вручную в настройках.', 'error');
      return resolve(false);
    }

    sendLog(`Запускаем OBS из: ${obsPath}`, 'info');
    try {
      const obsProcess = spawn(obsPath, [], { cwd: obsDir, detached: true, stdio: 'ignore' });
      obsProcess.unref();
    } catch (e) {
      sendLog(`Не удалось запустить OBS: ${e.message}`, 'error');
      return resolve(false);
    }
    setTimeout(() => resolve(true), 2000);
  });
}

/** Единая точка подключения: сначала пробуем сокет, потом запускаем OBS и ждём плагины. */
async function connectObs(customPath, sendLog) {
  try {
    await obs.connect(OBS_URL, undefined, { rpcVersion: 1 });
    sendLog('Успешное подключение!', 'success');
    return true;
  } catch (e) {
    sendLog('OBS не отвечает. Пытаемся запустить процесс...', 'warn');
    const isLaunched = await launchOBS(customPath, sendLog);
    if (!isLaunched) return false;

    sendLog('Ожидание загрузки плагинов OBS (до 15 сек)...', 'info');
    for (let i = 0; i < 5; i++) {
      await delay(3000);
      sendLog(`Попытка подключения ${i + 1}/5...`, 'info');
      try {
        await obs.connect(OBS_URL, undefined, { rpcVersion: 1 });
        sendLog('Успешное подключение после запуска!', 'success');
        return true;
      } catch (retryError) {}
    }
    return false;
  }
}

async function safeDisconnect() {
  try { await obs.disconnect(); } catch (e) {}
}

module.exports = { obs, OBS_URL, delay, launchOBS, connectObs, safeDisconnect };