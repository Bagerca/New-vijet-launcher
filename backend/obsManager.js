/* ФАЙЛ: backend/obsManager.js */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const OBSWebSocket = require('obs-websocket-js').default;

const obs = new OBSWebSocket();
const delay = (ms) => new Promise(res => setTimeout(res, ms));

function launchOBS(customPath, sendLog) {
  return new Promise((resolve) => {
    let obsPath = null, obsDir = null;

    if (customPath && fs.existsSync(customPath)) {
      obsPath = customPath;
      obsDir = path.dirname(customPath);
    } else {
      const possiblePaths = [
        'D:\\PORTABLE\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'D:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'
      ];
      for (const checkPath of possiblePaths) {
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
    const obsProcess = spawn(obsPath, [], { cwd: obsDir, detached: true, stdio: 'ignore' });
    obsProcess.unref(); 
    
    setTimeout(() => { resolve(true); }, 2000);
  });
}

async function enforceSingleItem(sceneName, sourceName) {
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
  const matchingItems = sceneItems.filter(i => i.sourceName === sourceName);

  if (matchingItems.length === 0) {
    const response = await obs.call('CreateSceneItem', { sceneName, sourceName });
    return response.sceneItemId;
  } else if (matchingItems.length > 1) {
    for (let i = 1; i < matchingItems.length; i++) {
      await obs.call('RemoveSceneItem', { sceneName, sceneItemId: matchingItems[i].sceneItemId });
    }
  }
  return matchingItems[0].sceneItemId;
}

async function removeIfPresent(sceneName, sourceName) {
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
  const matchingItems = sceneItems.filter(i => i.sourceName === sourceName);
  for (const item of matchingItems) {
    await obs.call('RemoveSceneItem', { sceneName, sceneItemId: item.sceneItemId });
  }
}

// ==== ИДЕАЛЬНЫЙ ЛЕЙАУТ СТРИМЕРА + ВОЗВРАТ TTS ====
const defaultLayout = {
  "🔴 [Сцена] Начало": {
    "Виджет: Экран Начала": { "index": 0, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Неоновые частицы": { "index": 1, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Заглушка (Blur)": { "index": 2, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Оповещения (Alerts)": { "index": 3, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Реклама (Shoutout)": { "index": 4, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Летящие смайлы": { "index": 5, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Шкала цели": { "index": 6, "positionX": 472, "positionY": 0, "scaleX": 1.29, "scaleY": 1.29 },
    "Виджет: Таймер стрима (Uptime)": { "index": 7, "positionX": 606, "positionY": 980, "scaleX": 1, "scaleY": 1 },
    "Виджет: Соцсети": { "index": 8, "positionX": 0, "positionY": 960, "scaleX": 1, "scaleY": 1 },
    "Виджет: Чат Twitch": { "index": 9, "positionX": 1362, "positionY": 149, "scaleX": 0.88, "scaleY": 0.88 },
    "Виджет: Озвучка (TTS)": { "index": 10, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 }
  },
  "🗣 [Сцена] Общение": {
    "Виджет: Фон Общения": { "index": 0, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Неоновые частицы": { "index": 1, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Устройство захвата видео": { "index": 2, "positionX": 1327, "positionY": 149, "scaleX": -0.98, "scaleY": 0.97 },
    "Виджет: Рамка вебки": { "index": 3, "positionX": 0, "positionY": 140, "scaleX": 1, "scaleY": 1 },
    "Виджет: Заглушка (Blur)": { "index": 4, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Бегущая строка": { "index": 5, "positionX": 535, "positionY": 960, "scaleX": 1, "scaleY": 1 },
    "Виджет: Шкала цели": { "index": 6, "positionX": 880, "positionY": 880, "scaleX": 1, "scaleY": 1 },
    "Виджет: Таймер стрима (Uptime)": { "index": 7, "positionX": 560, "positionY": 885, "scaleX": 1, "scaleY": 1 },
    "Виджет: Медиа Инфо": { "index": 8, "positionX": 24, "positionY": 856, "scaleX": 1.08, "scaleY": 1.08 },
    "Виджет: Соцсети": { "index": 9, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: YouTube Плеер": { "index": 10, "positionX": 1410, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Счетчик смертей": { "index": 11, "positionX": 1081, "positionY": 119, "scaleX": 1, "scaleY": 1 },
    "Виджет: Чат Twitch": { "index": 12, "positionX": 1380, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Оповещения (Alerts)": { "index": 13, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Реклама (Shoutout)": { "index": 14, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Летящие смайлы": { "index": 15, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Озвучка (TTS)": { "index": 16, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 }
  },
  "🎮 [Сцена] Игра": {
    "Захват экрана 2": { "index": 1, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Неоновые частицы": { "index": 2, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Заглушка (Blur)": { "index": 3, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Бегущая строка": { "index": 4, "positionX": 535, "positionY": 960, "scaleX": 1, "scaleY": 1 },
    "Виджет: Чат Twitch": { "index": 5, "positionX": 0, "positionY": 292, "scaleX": 0.7, "scaleY": 0.7, "cropTop": 347 },
    "Устройство захвата видео": { "index": 6, "positionX": 372, "positionY": 159, "scaleX": -0.27, "scaleY": 0.27 },
    "Виджет: Рамка вебки": { "index": 7, "positionX": 0, "positionY": 159, "scaleX": 0.28, "scaleY": 0.28 },
    "Виджет: Счетчик смертей": { "index": 8, "positionX": 259, "positionY": 139, "scaleX": 0.52, "scaleY": 0.52 },
    "Виджет: Медиа Инфо": { "index": 9, "positionX": 0, "positionY": 0, "scaleX": 0.8, "scaleY": 0.8 },
    "Виджет: Таймер стрима (Uptime)": { "index": 10, "positionX": 10, "positionY": 1006, "scaleX": 0.84, "scaleY": 0.84 },
    "Виджет: Соцсети": { "index": 11, "positionX": 1600, "positionY": 0, "scaleX": 0.8, "scaleY": 0.8 },
    "Виджет: Шкала цели": { "index": 12, "positionX": 760, "positionY": -10, "scaleX": 1, "scaleY": 1 },
    "Виджет: YouTube Плеер": { "index": 13, "positionX": 1520, "positionY": 750, "scaleX": 0.8, "scaleY": 0.8 },
    "Виджет: Оповещения (Alerts)": { "index": 14, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Реклама (Shoutout)": { "index": 15, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Летящие смайлы": { "index": 16, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Озвучка (TTS)": { "index": 17, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 }
  },
  "👋 [Сцена] Конец": {
    "Виджет: Экран Конца": { "index": 0, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Неоновые частицы": { "index": 1, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Заглушка (Blur)": { "index": 2, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Оповещения (Alerts)": { "index": 3, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Реклама (Shoutout)": { "index": 4, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Летящие смайлы": { "index": 5, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 },
    "Виджет: Шкала цели": { "index": 6, "positionX": 471, "positionY": 0, "scaleX": 1.29, "scaleY": 1.29 },
    "Виджет: Таймер стрима (Uptime)": { "index": 7, "positionX": 606, "positionY": 980, "scaleX": 1, "scaleY": 1 },
    "Виджет: Соцсети": { "index": 8, "positionX": 0, "positionY": 960, "scaleX": 1, "scaleY": 1 },
    "Виджет: Чат Twitch": { "index": 9, "positionX": 1362, "positionY": 153, "scaleX": 0.88, "scaleY": 0.88 },
    "Виджет: Озвучка (TTS)": { "index": 10, "positionX": 0, "positionY": 0, "scaleX": 1, "scaleY": 1 }
  }
};

async function setupScenes(sendLog, portHttp) {
  const collectionName = 'New Stream Pack';
  const audioCoreScene = '⚙️ [Ядро] Звуки и Системы';
  const targetScenes = ['🔴 [Сцена] Начало', '🗣 [Сцена] Общение', '🎮 [Сцена] Игра', '👋 [Сцена] Конец'];

  const widgetsConfig = {
    'Виджет: Рамка вебки': { url: '/frame/index.html', w: 1400, h: 850 },
    'Виджет: Чат Twitch': { url: '/chat/index.html', w: 540, h: 1040 },
    'Виджет: YouTube Плеер': { url: '/player/index.html', w: 480, h: 380 },
    'Виджет: Шкала цели': { url: '/goal/index.html', w: 440, h: 100 },
    'Виджет: Медиа Инфо': { url: '/media/index.html', w: 520, h: 220 },
    'Виджет: Соцсети': { url: '/socials/index.html', w: 400, h: 120 },
    'Виджет: Таймер стрима (Uptime)': { url: '/uptime/index.html', w: 300, h: 100 },
    'Виджет: Счетчик смертей': { url: '/deaths/index.html', w: 250, h: 200 },
    'Виджет: Бегущая строка': { url: '/ticker/index.html', w: 860, h: 120 },
    
    'Виджет: Летящие смайлы': { url: '/emotes/index.html', w: 1920, h: 1080 },
    'Виджет: Неоновые частицы': { url: '/particles/index.html', w: 1920, h: 1080 },
    'Виджет: Реклама (Shoutout)': { url: '/shoutout/index.html', w: 1920, h: 1080 },
    'Виджет: Оповещения (Alerts)': { url: '/alerts/index.html', w: 1920, h: 1080 },
    'Виджет: Заглушка (Blur)': { url: '/blur/index.html', w: 1920, h: 1080 },
    'Виджет: Экран Начала': { url: '/startscreen/index.html', w: 1920, h: 1080 },
    'Виджет: Экран Конца': { url: '/endscreen/index.html', w: 1920, h: 1080 },
    'Виджет: Фон Общения': { url: '/bg/index.html', w: 1920, h: 1080 },
    'Виджет: Озвучка (TTS)': { url: '/tts/index.html', w: 1920, h: 1080 }
  };
  
  try {
    const { sceneCollections, currentSceneCollectionName } = await obs.call('GetSceneCollectionList');
    if (!sceneCollections.includes(collectionName)) {
      await obs.call('CreateSceneCollection', { sceneCollectionName: collectionName });
      await delay(1000);
    } else if (currentSceneCollectionName !== collectionName) {
      await obs.call('SetCurrentSceneCollection', { sceneCollectionName: collectionName });
      await delay(1000);
    }

    let { scenes } = await obs.call('GetSceneList');
    let existingSceneNames = scenes.map(s => s.sceneName);

    if (!existingSceneNames.includes(targetScenes[0])) await obs.call('CreateScene', { sceneName: targetScenes[0] });
    await obs.call('SetCurrentProgramScene', { sceneName: targetScenes[0] });

    if (!existingSceneNames.includes(audioCoreScene)) await obs.call('CreateScene', { sceneName: audioCoreScene });
    
    for (const sceneName of targetScenes) {
      if (!existingSceneNames.includes(sceneName)) await obs.call('CreateScene', { sceneName });
    }
    
    for (const [sourceName, config] of Object.entries(widgetsConfig)) {
      const url = `http://localhost:${portHttp}${config.url}?nocache=${Date.now()}`;
      const { inputs } = await obs.call('GetInputList');
      const exists = inputs.some(i => i.inputName === sourceName);
      
      if (!exists) {
        await obs.call('CreateInput', {
          sceneName: targetScenes[0], 
          inputName: sourceName,
          inputKind: 'browser_source',
          inputSettings: { 
            url, width: config.w, height: config.h, 
            css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }', 
            shutdown: false, reroute_audio: true 
          }
        });
      } else {
        await obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { url, width: config.w, height: config.h } });
      }
    }
    
    for (const w of Object.keys(widgetsConfig)) await removeIfPresent(audioCoreScene, w);

    for (const sceneName of targetScenes) {
      await enforceSingleItem(sceneName, audioCoreScene);

      const layoutItems = defaultLayout[sceneName] || {};
      const layoutWidgetNames = Object.keys(layoutItems);

      for (const [widgetName, transform] of Object.entries(layoutItems)) {
        try {
          const itemId = await enforceSingleItem(sceneName, widgetName);
          
          await obs.call('SetSceneItemTransform', {
            sceneName,
            sceneItemId: itemId,
            sceneItemTransform: {
              positionX: transform.positionX,
              positionY: transform.positionY,
              scaleX: transform.scaleX,
              scaleY: transform.scaleY,
              cropTop: transform.cropTop || 0,
              cropBottom: transform.cropBottom || 0,
              cropLeft: transform.cropLeft || 0,
              cropRight: transform.cropRight || 0
            }
          });
          
          await obs.call('SetSceneItemIndex', {
            sceneName,
            sceneItemId: itemId,
            sceneItemIndex: transform.index
          });
        } catch (e) {
          // Игнорируем ошибки для отсутствующих нативных источников (например, если камеры еще нет)
          sendLog(`Пропуск элемента: ${widgetName} (исходник еще не создан)`, 'warn');
        }
      }

      for (const widgetName of Object.keys(widgetsConfig)) {
        if (!layoutWidgetNames.includes(widgetName)) {
          await removeIfPresent(sceneName, widgetName);
        }
      }
    }

    sendLog('✅ Сцены перестроены под компонентные размеры!', 'success');
  } catch (error) {
    sendLog(`Ошибка настройки сцен: ${error.message}`, 'error');
  }
}

async function runObsSetup(customPath, sendLog, portHttp) {
  try {
    sendLog('Подключение к OBS WebSocket...', 'info');
    let isConnected = false;

    try {
      await obs.connect('ws://127.0.0.1:4455', undefined, { rpcVersion: 1 });
      isConnected = true;
      sendLog('Успешное подключение!', 'success');
    } catch (e) {
      sendLog('OBS не отвечает. Пытаемся запустить процесс...', 'warn');
      
      const isLaunched = await launchOBS(customPath, sendLog);
      if (isLaunched) {
        sendLog('Ожидание загрузки плагинов OBS (до 15 сек)...', 'info');
        
        for (let i = 0; i < 5; i++) {
          try {
            await delay(3000);
            sendLog(`Попытка подключения ${i + 1}/5...`, 'info');
            await obs.connect('ws://127.0.0.1:4455', undefined, { rpcVersion: 1 });
            isConnected = true;
            sendLog('Успешное подключение после запуска!', 'success');
            break; 
          } catch (retryError) {}
        }
      }
    }
    
    if (!isConnected) {
      throw new Error('Убедитесь, что в OBS -> Инструменты -> Настройки WebSocket -> Порт: 4455 и СНЯТА галочка "Аутентификация"!');
    }
    
    await setupScenes(sendLog, portHttp);
    await obs.disconnect();
    return { status: 'ok' };
    
  } catch (error) {
    sendLog(error.message, 'error');
    return { status: 'error', message: error.message };
  }
}

async function exportLayout(sendLog) {
  try {
    sendLog('Подключение к OBS для экспорта координат и диагностики...', 'info');
    try { await obs.call('GetVersion'); } catch (e) { await obs.connect('ws://127.0.0.1:4455', undefined, { rpcVersion: 1 }); }

    const targetScenes = ['🔴 [Сцена] Начало', '🗣 [Сцена] Общение', '🎮 [Сцена] Игра', '👋 [Сцена] Конец'];
    const layout = {};
    
    // 1. Сбор координат всех виджетов и нативных слоев
    for (const sceneName of targetScenes) {
      layout[sceneName] = {};
      try {
        const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
        for (const item of sceneItems) {
          if (item.sourceName === '⚙️ [Ядро] Звуки и Системы') continue;
          
          const { sceneItemTransform } = await obs.call('GetSceneItemTransform', { sceneName, sceneItemId: item.sceneItemId });
          
          const exportItem = {
            index: item.sceneItemIndex,
            positionX: Math.round(sceneItemTransform.positionX),
            positionY: Math.round(sceneItemTransform.positionY),
            scaleX: Number(sceneItemTransform.scaleX.toFixed(2)),
            scaleY: Number(sceneItemTransform.scaleY.toFixed(2))
          };

          if (sceneItemTransform.cropTop) exportItem.cropTop = sceneItemTransform.cropTop;
          if (sceneItemTransform.cropBottom) exportItem.cropBottom = sceneItemTransform.cropBottom;
          if (sceneItemTransform.cropLeft) exportItem.cropLeft = sceneItemTransform.cropLeft;
          if (sceneItemTransform.cropRight) exportItem.cropRight = sceneItemTransform.cropRight;

          layout[sceneName][item.sourceName] = exportItem;
        }
      } catch (err) { sendLog(`Сцена ${sceneName} не найдена или пуста.`, 'warn'); }
    }

    // 2. Сбор телеметрии устройств (Камеры, Микрофоны, Фильтры)
    const diagnostics = { audioInputs: [], videoInputs: [], specialInputs: {} };
    
    try { diagnostics.specialInputs = await obs.call('GetSpecialInputs'); } catch(e) {}
    
    try {
      const { inputs } = await obs.call('GetInputList');
      for (const input of inputs) {
        const kind = input.unversionedInputKind || input.inputKind;
        
        // Аудио (Микрофоны / Захват звука)
        if (['wasapi_input_capture','wasapi_output_capture','coreaudio_input_capture','pulse_input_capture','alsa_input_capture'].includes(kind)) {
            let volDb = 0, volMul = 1, muted = false, filters = [];
            try { const v = await obs.call('GetInputVolume', {inputName: input.inputName}); volDb = v.inputVolumeDb; volMul = v.inputVolumeMul; } catch(e){}
            try { const m = await obs.call('GetInputMute', {inputName: input.inputName}); muted = m.inputMuted; } catch(e){}
            try { const f = await obs.call('GetSourceFilterList', {sourceName: input.inputName}); filters = f.filters.map(fl => ({name: fl.filterName, kind: fl.filterKind, enabled: fl.filterEnabled})); } catch(e){}
            
            diagnostics.audioInputs.push({ 
                name: input.inputName, 
                kind, 
                volumeDb: Number(volDb.toFixed(2)), 
                volumeMul: Number(volMul.toFixed(2)), 
                muted, 
                filters 
            });
        }
        
        // Видео (Вебки, Захват игры / экранов)
        if (['dshow_input','monitor_capture','window_capture','game_capture'].includes(kind)) {
            let filters = [];
            try { const f = await obs.call('GetSourceFilterList', {sourceName: input.inputName}); filters = f.filters.map(fl => ({name: fl.filterName, kind: fl.filterKind, enabled: fl.filterEnabled})); } catch(e){}
            
            diagnostics.videoInputs.push({ 
                name: input.inputName, 
                kind, 
                filters 
            });
        }
      }
    } catch(e) {
      sendLog(`Ошибка сбора устройств: ${e.message}`, 'warn');
    }
    
    layout["_diagnostics"] = diagnostics;

    await obs.disconnect();
    return layout;
  } catch (error) {
    sendLog(`Ошибка экспорта: ${error.message}`, 'error');
    return null;
  }
}

module.exports = { runObsSetup, exportLayout };