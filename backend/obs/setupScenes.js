/* ФАЙЛ: backend/obs/setupScenes.js — v1 (авто-настройка коллекции, сцен, виджетов и лейаута пака) */
const { obs, delay, connectObs, safeDisconnect } = require('./connection');
const { enforceSingleItem, removeIfPresent, listItems } = require('./sceneItems');
const {
  COLLECTION_NAME, SYS_AUDIO_SCENE, MIC_AUDIO_SCENE, LEGACY_AUDIO_SCENE,
  PACK_SCENES, BROWSER_CSS, WIDGETS, INPUT_KINDS, LAYOUT
} = require('./layout');
const externalSources = require('../externalSources');
const { applyExternalSources } = require('./applyExternal');

/** Ищет уже существующее железо стримера, чтобы не плодить дубликаты устройств. */
function detectHardware(inputs) {
  const found = { micName: null, desktopName: null, webcamName: null, screenName: null };
  for (const input of inputs || []) {
    const kind = input.unversionedInputKind || input.inputKind;
    if (!found.micName && INPUT_KINDS.mic.includes(kind)) found.micName = input.inputName;
    if (!found.desktopName && INPUT_KINDS.desktop.includes(kind)) found.desktopName = input.inputName;
    if (!found.webcamName && INPUT_KINDS.webcam.includes(kind)) found.webcamName = input.inputName;
    if (!found.screenName && INPUT_KINDS.screen.includes(kind)) found.screenName = input.inputName;
  }
  return found;
}

function resolvePlaceholder(placeholder, ctx) {
  if (placeholder === '__SYS_AUDIO__') return ctx.sysAudioScene;
  if (placeholder === '__MIC_AUDIO__') return ctx.micAudioScene;
  if (placeholder === '__WEBCAM__') return ctx.webcamName;
  if (placeholder === '__SCREEN__') return ctx.screenName;
  return placeholder;
}

async function setupScenes(sendLog, portHttp) {
  try {
    const { sceneCollections, currentSceneCollectionName } = await obs.call('GetSceneCollectionList');
    if (!sceneCollections.includes(COLLECTION_NAME)) {
      await obs.call('CreateSceneCollection', { sceneCollectionName: COLLECTION_NAME });
      await delay(1000);
    } else if (currentSceneCollectionName !== COLLECTION_NAME) {
      await obs.call('SetCurrentSceneCollection', { sceneCollectionName: COLLECTION_NAME });
      await delay(1000);
    }

    sendLog('Поиск оборудования стримера...', 'info');
    const { inputs } = await obs.call('GetInputList');
    const { micName, desktopName, webcamName, screenName } = detectHardware(inputs);
    if (micName) sendLog(`✅ Найден микрофон: "${micName}"`, 'success');
    if (webcamName) sendLog(`✅ Найдена камера: "${webcamName}"`, 'success');

    const { scenes } = await obs.call('GetSceneList');
    const existingSceneNames = (scenes || []).map(s => s.sceneName);
    const allScenesToCreate = [SYS_AUDIO_SCENE, MIC_AUDIO_SCENE, ...PACK_SCENES];
    for (const sName of allScenesToCreate) {
      if (!existingSceneNames.includes(sName)) await obs.call('CreateScene', { sceneName: sName });
    }
    await obs.call('SetCurrentProgramScene', { sceneName: PACK_SCENES[0] });

    if (desktopName) await enforceSingleItem(SYS_AUDIO_SCENE, desktopName);
    if (micName) await enforceSingleItem(MIC_AUDIO_SCENE, micName);

    for (const [sourceName, config] of Object.entries(WIDGETS)) {
      const url = `http://localhost:${portHttp}${config.url}?nocache=${Date.now()}`;
      const exists = (inputs || []).some(i => i.inputName === sourceName);
      if (!exists) {
        await obs.call('CreateInput', {
          sceneName: PACK_SCENES[0],
          inputName: sourceName,
          inputKind: 'browser_source',
          inputSettings: {
            url, width: config.w, height: config.h,
            css: BROWSER_CSS, shutdown: false, reroute_audio: true
          }
        });
      } else {
        await obs.call('SetInputSettings', {
          inputName: sourceName,
          inputSettings: { url, width: config.w, height: config.h }
        });
      }
    }

    for (const sceneName of PACK_SCENES) {
      await removeIfPresent(sceneName, LEGACY_AUDIO_SCENE);
    }

    // Префикс внешних источников читаем один раз — он может быть переопределён в ключе.
    const extManifest = externalSources.load();
    const extPrefix = extManifest.namePrefix || externalSources.EXTERNAL_PREFIX;
    const hardwareNames = [micName, desktopName, webcamName, screenName].filter(Boolean);
    const placeholderCtx = { sysAudioScene: SYS_AUDIO_SCENE, micAudioScene: MIC_AUDIO_SCENE, webcamName, screenName };

    for (const sceneName of PACK_SCENES) {
      const layoutItems = LAYOUT[sceneName] || {};
      const layoutWidgetNames = [];

      for (const [placeholderName, transform] of Object.entries(layoutItems)) {
        const actualName = resolvePlaceholder(placeholderName, placeholderCtx);
        if (!actualName) continue;
        layoutWidgetNames.push(actualName);
        try {
          const itemId = await enforceSingleItem(sceneName, actualName);
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
          console.warn(`[OBS] ${sceneName} / ${actualName}:`, e.message);
        }
      }

      // Чистка мусора. НЕ трогаем: наши виджеты, железо стримера и внешние источники.
      const protectedNames = new Set([...layoutWidgetNames, ...hardwareNames]);
      const sceneItems = await listItems(sceneName);
      for (const item of sceneItems) {
        if (protectedNames.has(item.sourceName)) continue;
        if (externalSources.isExternalName(item.sourceName, extPrefix)) continue;
        try {
          await obs.call('RemoveSceneItem', { sceneName, sceneItemId: item.sceneItemId });
          console.log(`[OBS] ${sceneName}: удалён лишний источник "${item.sourceName}"`);
        } catch (e) {
          console.warn('[OBS] Не удалось удалить источник:', item.sourceName, e.message);
        }
      }
    }

    sendLog('✅ Сцены перестроены! Выгруженный конфиг применен успешно.', 'success');
    await applyExternalSources(sendLog);
  } catch (error) {
    sendLog(`Ошибка настройки сцен: ${error.message}`, 'error');
  }
}

async function runObsSetup(customPath, sendLog, portHttp) {
  try {
    sendLog('Подключение к OBS WebSocket...', 'info');
    const isConnected = await connectObs(customPath, sendLog);
    if (!isConnected) {
      throw new Error('Убедитесь, что в OBS -> Инструменты -> Настройки WebSocket -> Порт: 4455 и СНЯТА галочка "Аутентификация"!');
    }
    await setupScenes(sendLog, portHttp);
    await safeDisconnect();
    return { status: 'ok' };
  } catch (error) {
    sendLog(error.message, 'error');
    await safeDisconnect();
    return { status: 'error', message: error.message };
  }
}

module.exports = { setupScenes, runObsSetup };