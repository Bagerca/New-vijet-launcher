/* ФАЙЛ: backend/obs/sceneItems.js — v1 (операции над элементами сцены: дедуп, удаление, подъём, видимость) */
const { obs } = require('./connection');

/** Список элементов сцены. Пустой массив вместо null/undefined. */
async function listItems(sceneName) {
  const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });
  return sceneItems || [];
}

/** Гарантирует ровно один элемент источника на сцене: создаёт или убирает дубли. */
async function enforceSingleItem(sceneName, sourceName) {
  const items = await listItems(sceneName);
  const matching = items.filter(i => i.sourceName === sourceName);

  if (matching.length === 0) {
    const response = await obs.call('CreateSceneItem', { sceneName, sourceName });
    return response.sceneItemId;
  }
  if (matching.length > 1) {
    for (let i = 1; i < matching.length; i++) {
      await obs.call('RemoveSceneItem', { sceneName, sceneItemId: matching[i].sceneItemId });
    }
  }
  return matching[0].sceneItemId;
}

async function removeIfPresent(sceneName, sourceName) {
  const items = await listItems(sceneName);
  for (const item of items.filter(i => i.sourceName === sourceName)) {
    await obs.call('RemoveSceneItem', { sceneName, sceneItemId: item.sceneItemId });
  }
}

/** Поднимает элемент на самый верх порядка слоёв. */
async function raiseToTop(sceneName, sceneItemId) {
  const items = await listItems(sceneName);
  const topIndex = Math.max(0, items.length - 1);
  await obs.call('SetSceneItemIndex', { sceneName, sceneItemId, sceneItemIndex: topIndex });
}

/** Включает/выключает видимость всех элементов источника на сцене. */
async function setSourceVisible(sceneName, sourceName, enabled) {
  const items = await listItems(sceneName);
  for (const item of items.filter(i => i.sourceName === sourceName)) {
    await obs.call('SetSceneItemEnabled', { sceneName, sceneItemId: item.sceneItemId, sceneItemEnabled: enabled });
  }
}

module.exports = { listItems, enforceSingleItem, removeIfPresent, raiseToTop, setSourceVisible };