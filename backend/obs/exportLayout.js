/* ФАЙЛ: backend/obs/exportLayout.js — v1 (глубокий экспорт раскладки + диагностика аудио/видео и фильтров) */
const { obs, OBS_URL, safeDisconnect } = require('./connection');
const { listItems } = require('./sceneItems');
const { PACK_SCENES, INPUT_KINDS } = require('./layout');

async function readVolume(inputName) {
  try {
    const v = await obs.call('GetInputVolume', { inputName });
    return Number(Number(v.inputVolumeDb).toFixed(2));
  } catch (e) { return 0; }
}

async function readMute(inputName) {
  try {
    const m = await obs.call('GetInputMute', { inputName });
    return Boolean(m.inputMuted);
  } catch (e) { return false; }
}

async function readSettings(inputName) {
  try {
    const s = await obs.call('GetInputSettings', { inputName });
    return s.inputSettings || {};
  } catch (e) { return {}; }
}

async function readFilters(sourceName) {
  const detailed = [];
  try {
    const fList = await obs.call('GetSourceFilterList', { sourceName });
    for (const fl of fList.filters || []) {
      let settings = {};
      try {
        const fData = await obs.call('GetSourceFilter', { sourceName, filterName: fl.filterName });
        settings = fData.filterSettings;
      } catch (e) {}
      detailed.push({ name: fl.filterName, kind: fl.filterKind, enabled: fl.filterEnabled, settings });
    }
  } catch (e) {}
  return detailed;
}

async function collectSceneLayout(sendLog) {
  const layout = {};
  for (const sceneName of PACK_SCENES) {
    layout[sceneName] = {};
    try {
      const items = await listItems(sceneName);
      for (const item of items) {
        if (String(item.sourceName || '').startsWith('⚙️ [Ядро]')) continue;
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
    } catch (err) {
      sendLog(`Сцена ${sceneName} не найдена или пуста.`, 'warn');
    }
  }
  return layout;
}

async function collectDiagnostics() {
  const diagnostics = { globalAudio: [], localAudio: [], videoInputs: [], rawErrors: [] };

  try {
    const specialInputs = await obs.call('GetSpecialInputs');
    for (const [key, sourceName] of Object.entries(specialInputs)) {
      if (!sourceName) continue;
      diagnostics.globalAudio.push({
        type: key,
        name: sourceName,
        volumeDb: await readVolume(sourceName),
        muted: await readMute(sourceName),
        settings: await readSettings(sourceName),
        filters: await readFilters(sourceName)
      });
    }
  } catch (e) {
    diagnostics.rawErrors.push(`SpecialInputs: ${e.message}`);
  }

  try {
    const { inputs } = await obs.call('GetInputList');
    for (const input of inputs || []) {
      const kind = input.unversionedInputKind || input.inputKind;
      const sourceName = input.inputName;

      if (INPUT_KINDS.audioAny.includes(kind)) {
        diagnostics.localAudio.push({
          name: sourceName,
          kind,
          volumeDb: await readVolume(sourceName),
          muted: await readMute(sourceName),
          settings: await readSettings(sourceName),
          filters: await readFilters(sourceName)
        });
      }
      if (INPUT_KINDS.videoAny.includes(kind)) {
        diagnostics.videoInputs.push({
          name: sourceName,
          kind,
          settings: await readSettings(sourceName),
          filters: await readFilters(sourceName)
        });
      }
    }
  } catch (e) {
    diagnostics.rawErrors.push(`GetInputList: ${e.message}`);
  }

  return diagnostics;
}

async function exportLayout(sendLog) {
  try {
    sendLog('Подключение к OBS для глубокого экспорта и диагностики...', 'info');
    try {
      await obs.call('GetVersion');
    } catch (e) {
      await obs.connect(OBS_URL, undefined, { rpcVersion: 1 });
    }

    const layout = await collectSceneLayout(sendLog);
    layout._diagnostics = await collectDiagnostics();

    await safeDisconnect();
    return layout;
  } catch (error) {
    sendLog(`Ошибка экспорта: ${error.message}`, 'error');
    await safeDisconnect();
    return null;
  }
}

module.exports = { exportLayout };