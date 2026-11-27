/* ФАЙЛ: backend/obs/applyExternal.js — v1 (размещение внешних источников + самопрослушивание + защита чужих) */
const { obs, connectObs, safeDisconnect } = require('./connection');
const { enforceSingleItem, listItems, raiseToTop, setSourceVisible } = require('./sceneItems');
const externalSources = require('../externalSources');

/**
 * Внешние браузер-источники стримера (DonationAlerts / Twitch AlertBox / MemeAlerts).
 * Работает поверх уже подключённого obs. Порядок в массиве = порядок слоёв:
 * каждый следующий поднимается наверх, последний оказывается выше всех.
 * Звук: reroute_audio ведёт звук в микшер OBS, SetInputAudioMonitorType включает
 * самопрослушивание, чтобы стример слышал донаты в наушниках.
 */
async function applyExternalSources(sendLog) {
  const result = { status: 'ok', applied: 0, skipped: 0, scenes: 0, message: '' };

  let manifest;
  try {
    manifest = externalSources.load();
  } catch (e) {
    result.status = 'error';
    result.message = `Не удалось прочитать ключ: ${e.message}`;
    sendLog(result.message, 'error');
    return result;
  }

  if (!manifest.exists) {
    result.status = 'missing';
    result.message = 'Файл data/external-sources.json не найден. Перетащите файл-ключ в Настройках → Внешние источники или создайте из шаблона.';
    sendLog(result.message, 'warn');
    return result;
  }
  if (!manifest.ok) {
    result.status = 'invalid';
    result.message = `Ошибки в external-sources.json: ${manifest.errors.join('; ')}`;
    manifest.errors.forEach(err => sendLog(`Внешние источники: ${err}`, 'error'));
    return result;
  }

  manifest.warnings.forEach(w => sendLog(`Внешние источники: ${w}`, 'warn'));

  if (!manifest.enabled) {
    result.status = 'disabled';
    result.message = 'Внешние источники выключены в конфиге (enabled: false).';
    sendLog(result.message, 'warn');
    return result;
  }
  if (manifest.sources.length === 0) {
    result.status = 'empty';
    result.message = 'В файле нет ни одного источника.';
    sendLog(result.message, 'warn');
    return result;
  }

  let sceneNames = [];
  try {
    const { scenes } = await obs.call('GetSceneList');
    sceneNames = (scenes || []).map(s => s.sceneName);
  } catch (e) {
    result.status = 'error';
    result.message = `Не удалось получить список сцен: ${e.message}`;
    sendLog(result.message, 'error');
    return result;
  }

  const targetScenes = manifest.scenes.filter(s => sceneNames.includes(s));
  if (targetScenes.length === 0) {
    result.status = 'no-scenes';
    result.message = 'Ни одна из целевых сцен не найдена в OBS. Сначала выполните «Авто-настройка OBS».';
    sendLog(result.message, 'error');
    return result;
  }
  result.scenes = targetScenes.length;

  let inputNames = new Set();
  try {
    const { inputs } = await obs.call('GetInputList');
    inputNames = new Set((inputs || []).map(i => i.inputName));
  } catch (e) {
    sendLog(`Не удалось получить список источников: ${e.message}`, 'warn');
  }

  sendLog(`Внешние источники: ${manifest.sources.length} шт. → сцен ${targetScenes.length}`, 'info');

  const monitored = manifest.sources.filter(s => s.enabled && s.monitor !== 'stream');
  if (monitored.length > 0) {
    sendLog(`Самопрослушивание активно у ${monitored.length} источник(ов). Устройство прослушивания: OBS → Настройки → Звук → Дополнительно. Рекомендуются наушники — иначе мониторинг может попасть в захват рабочего стола и дать двойной звук на стриме.`, 'info');
  }

  for (const source of manifest.sources) {
    const name = externalSources.fullName(source, manifest.namePrefix);
    const wanted = (source.scenes && source.scenes.length) ? source.scenes : manifest.scenes;
    const srcScenes = wanted.filter(s => sceneNames.includes(s));

    if (srcScenes.length === 0) {
      sendLog(`«${source.name}»: целевые сцены не найдены — пропуск`, 'warn');
      result.skipped++;
      continue;
    }

    // Выключенный источник не удаляем — просто прячем, если он уже есть.
    if (!source.enabled) {
      if (inputNames.has(name)) {
        for (const sc of srcScenes) {
          try { await setSourceVisible(sc, name, false); }
          catch (e) { console.warn('[External] hide:', sc, e.message); }
        }
        sendLog(`⏸ «${source.name}» выключен в конфиге — скрыт на сценах`, 'info');
      }
      result.skipped++;
      continue;
    }

    const settings = {
      url: source.url,
      width: source.width,
      height: source.height,
      css: source.css,
      shutdown: source.shutdown,
      reroute_audio: source.reroute_audio
    };

    try {
      if (!inputNames.has(name)) {
        await obs.call('CreateInput', {
          sceneName: srcScenes[0],
          inputName: name,
          inputKind: 'browser_source',
          inputSettings: settings
        });
        inputNames.add(name);
        sendLog(`Создан источник «${name}» (${source.width}×${source.height})`, 'success');
      } else {
        await obs.call('SetInputSettings', { inputName: name, inputSettings: settings, overlay: true });
      }
    } catch (e) {
      sendLog(`Не удалось создать/обновить «${name}»: ${e.message}`, 'error');
      result.skipped++;
      continue;
    }

    // Самопрослушивание: «Прослушивание и вывод» в расширенных свойствах аудио OBS.
    const monitorType = externalSources.MONITOR_OBS_TYPES[source.monitor] || externalSources.MONITOR_OBS_TYPES.both;
    try {
      await obs.call('SetInputAudioMonitorType', { inputName: name, monitorType });
      console.log(`[External] ${name}: мониторинг → ${source.monitor} (${monitorType})`);
    } catch (e) {
      sendLog(`«${source.name}»: самопрослушивание не применено (${e.message}). Нужен OBS 28+ со встроенным WebSocket 5. Размещение источника продолжается.`, 'warn');
    }
    if (!source.reroute_audio && source.monitor !== 'stream') {
      sendLog(`«${source.name}»: monitor="${source.monitor}" требует reroute_audio: true («Управлять звуком через OBS»), иначе звук идёт мимо микшера OBS.`, 'warn');
    }

    let placed = 0;
    for (const sc of srcScenes) {
      try {
        const itemId = await enforceSingleItem(sc, name);
        await obs.call('SetSceneItemTransform', {
          sceneName: sc,
          sceneItemId: itemId,
          sceneItemTransform: {
            positionX: source.transform.positionX,
            positionY: source.transform.positionY,
            scaleX: source.transform.scaleX,
            scaleY: source.transform.scaleY,
            cropTop: source.transform.cropTop,
            cropBottom: source.transform.cropBottom,
            cropLeft: source.transform.cropLeft,
            cropRight: source.transform.cropRight,
            alignment: 5,
            boundsType: 'OBS_BOUNDS_NONE'
          }
        });
        await obs.call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: itemId, sceneItemEnabled: true });
        await raiseToTop(sc, itemId);
        placed++;
      } catch (e) {
        sendLog(`«${source.name}» на сцене ${sc}: ${e.message}`, 'warn');
      }
    }

    if (placed > 0) {
      result.applied++;
      const monitorLabel = externalSources.MONITOR_LABELS[source.monitor] || source.monitor;
      sendLog(`✅ «${source.name}» → ${placed} сцен(ы) · звук: ${monitorLabel} · ${externalSources.maskUrl(source.url)}`, 'success');
    } else {
      result.skipped++;
    }
  }

  // Осиротевшие источники: остались в OBS, но исчезли из ключа. Не удаляем — только сообщаем.
  try {
    const known = new Set(manifest.sources.map(s => externalSources.fullName(s, manifest.namePrefix)));
    const orphans = new Set();
    for (const sc of targetScenes) {
      const items = await listItems(sc);
      items.forEach(i => {
        if (externalSources.isExternalName(i.sourceName, manifest.namePrefix) && !known.has(i.sourceName)) {
          orphans.add(i.sourceName);
        }
      });
    }
    if (orphans.size > 0) {
      sendLog(`В сценах остались источники, которых нет в ключе: ${[...orphans].join(', ')}. Они НЕ удалены — уберите вручную или верните в файл.`, 'warn');
    }
  } catch (e) {
    console.warn('[External] Проверка осиротевших источников не удалась:', e.message);
  }

  result.message = `Внешние источники применены: ${result.applied} из ${manifest.sources.length} на ${result.scenes} сценах.`;
  if (result.applied > 0) sendLog(result.message, 'success');
  else {
    result.status = 'nothing';
    sendLog('Ни один внешний источник не удалось разместить.', 'warn');
  }
  return result;
}

/** Отдельная кнопка «Применить внешние источники» — без перестройки всех сцен. */
async function runExternalApply(customPath, sendLog) {
  try {
    sendLog('Внешние источники: подключение к OBS WebSocket...', 'info');
    const isConnected = await connectObs(customPath, sendLog);
    if (!isConnected) {
      throw new Error('OBS не отвечает. Проверьте WebSocket: порт 4455, аутентификация снята.');
    }
    const result = await applyExternalSources(sendLog);
    await safeDisconnect();
    return result;
  } catch (error) {
    sendLog(error.message, 'error');
    await safeDisconnect();
    return { status: 'error', message: error.message };
  }
}

module.exports = { applyExternalSources, runExternalApply };