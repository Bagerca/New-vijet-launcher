/* ФАЙЛ: backend/sceneManager.js — v2 (рефреш браузер-источников + ensure: создать/поднять/включить) */
const OBSWebSocket = require('obs-websocket-js').default;
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const COOLDOWN_MS = 5000;
const PRESS_GAP_MS = 140;
const OBS_URL = 'ws://127.0.0.1:4455';
const SCENES = ['🔴 [Сцена] Начало', '🗣 [Сцена] Общение', '🎮 [Сцена] Игра', '👋 [Сцена] Конец'];
const WIDGETS = {
frame: { name: 'Виджет: Рамка вебки', url: '/frame/index.html', w: 1400, h: 850 },
chat: { name: 'Виджет: Чат Twitch', url: '/chat/index.html', w: 540, h: 1040 },
player: { name: 'Виджет: YouTube Плеер', url: '/player/index.html', w: 480, h: 380 },
goal: { name: 'Виджет: Шкала цели', url: '/goal/index.html', w: 440, h: 100 },
media: { name: 'Виджет: Медиа Инфо', url: '/media/index.html', w: 520, h: 220 },
socials: { name: 'Виджет: Соцсети', url: '/socials/index.html', w: 400, h: 120 },
uptime: { name: 'Виджет: Таймер стрима (Uptime)', url: '/uptime/index.html', w: 300, h: 100 },
deaths: { name: 'Виджет: Счетчик смертей', url: '/deaths/index.html', w: 250, h: 200 },
ticker: { name: 'Виджет: Бегущая строка', url: '/ticker/index.html', w: 860, h: 120 },
emotes: { name: 'Виджет: Летящие смайлы', url: '/emotes/index.html', w: 1920, h: 1080 },
particles: { name: 'Виджет: Неоновые частицы', url: '/particles/index.html', w: 1920, h: 1080 },
shoutout: { name: 'Виджет: Реклама (Shoutout)', url: '/shoutout/index.html', w: 1920, h: 1080 },
alerts: { name: 'Виджет: Оповещения (Alerts)', url: '/alerts/index.html', w: 1920, h: 1080 },
blur: { name: 'Виджет: Заглушка (Blur)', url: '/blur/index.html', w: 1920, h: 1080 },
startscreen: { name: 'Виджет: Экран Начала', url: '/startscreen/index.html', w: 1920, h: 1080 },
endscreen: { name: 'Виджет: Экран Конца', url: '/endscreen/index.html', w: 1920, h: 1080 },
bg: { name: 'Виджет: Фон Общения', url: '/bg/index.html', w: 1920, h: 1080 },
tts: { name: 'Виджет: Озвучка (TTS)', url: '/tts/index.html', w: 1920, h: 1080 }
};
class SceneManager {
constructor({ port }) {
this.port = String(port);
this._busy = false;
this._lastAt = 0;
}
_parseSourceUrl(urlStr) {
try {
const u = new URL(String(urlStr || ''));
if (u.port !== this.port) return null;
const m = u.pathname.match(/^\/([a-z0-9_-]+)\/index\.html$/i);
return m ? m[1].toLowerCase() : null;
} catch (e) { return null; }
}
async _collect(obs) {
const { inputs } = await obs.call('GetInputList');
const browsers = (inputs || []).filter(i => (i.unversionedInputKind || i.inputKind) === 'browser_source');
const found = [];
for (const b of browsers) {
try {
const s = await obs.call('GetInputSettings', { inputName: b.inputName });
const id = this._parseSourceUrl(s.inputSettings && s.inputSettings.url);
if (id) found.push({ name: b.inputName, id });
} catch (e) {}
}
return found;
}
async refresh(payload = {}, { force = false } = {}) {
const empty = { refreshed: [], skipped: [], notFound: [], failed: [] };
if (this._busy) return { ok: false, message: 'Перезагрузка уже выполняется', ...empty };
const since = Date.now() - this._lastAt;
if (!force && since < COOLDOWN_MS) {
return { ok: false, message: `Подождите ${Math.ceil((COOLDOWN_MS - since) / 1000)} с`, ...empty };
}
this._busy = true;
const obs = new OBSWebSocket();
try {
await obs.connect(OBS_URL, undefined, { rpcVersion: 1 });
const found = await this._collect(obs);
console.log(`[Scenes] Источники лаунчера в OBS: ${found.map(f => f.id).join(', ') || 'нет'}`);
const raw = payload.widgets;
let ids = [];
if (Array.isArray(raw)) ids = raw.map(x => String(x).toLowerCase().trim()).filter(Boolean);
else if (typeof raw === 'string' && raw.trim()) ids = raw.toLowerCase().split(/[\s,]+/).filter(Boolean);
const safe = ids.length === 0 || ids.includes('all');
let targets, skipped = [], notFound = [];
if (safe) {
targets = found.filter(f => f.id !== 'player');
if (found.some(f => f.id === 'player')) skipped.push('player');
} else {
const set = new Set(ids.filter(x => x !== 'all'));
targets = found.filter(f => set.has(f.id));
notFound = [...set].filter(id => !found.some(f => f.id === id));
}
if (targets.length === 0) {
this._lastAt = Date.now();
return {
ok: false,
message: notFound.length
? `Источник «${notFound.join(', ')}» не найден в OBS — нажмите «Починить источник» в дашборде виджета.`
: 'Браузер-источники лаунчера не найдены в OBS',
refreshed: [], skipped, notFound, failed: []
};
}
const refreshed = [], failed = [];
for (const t of targets) {
try {
await obs.call('PressInputPropertiesButton', { inputName: t.name, propertyName: 'refreshnocache' });
refreshed.push(t.id);
console.log(`[Scenes] ↻ ${t.id}`);
} catch (e) { failed.push(t.id); console.warn(`[Scenes] Ошибка рефреша ${t.name}:`, e.message); }
await delay(PRESS_GAP_MS);
}
this._lastAt = Date.now();
const parts = [`Перезагружено источников: ${refreshed.length}`];
if (skipped.length) parts.push('плеер не тронут');
if (notFound.length) parts.push(`не найдены: ${notFound.join(', ')}`);
if (failed.length) parts.push(`ошибки: ${failed.join(', ')}`);
return { ok: refreshed.length > 0, message: parts.join(' · '), refreshed, skipped, notFound, failed };
} catch (e) {
console.warn('[Scenes] OBS недоступен:', e.message);
return { ok: false, message: `OBS не отвечает (${e.message}). Порт 4455, аутентификация снята.`, ...empty };
} finally {
this._busy = false;
try { await obs.disconnect(); } catch (e) {}
}
}
async ensure(payload = {}) {
const id = String(payload.id || 'alerts').toLowerCase();
const def = WIDGETS[id];
if (!def) return { ok: false, message: `Неизвестный виджет: ${id}`, id };
if (this._busy) return { ok: false, message: 'Другая операция с OBS уже выполняется', id };
this._busy = true;
const obs = new OBSWebSocket();
const report = { id, created: false, scenes: [], enabled: false, refreshed: false };
try {
await obs.connect(OBS_URL, undefined, { rpcVersion: 1 });
const url = `http://localhost:${this.port}${def.url}?nocache=${Date.now()}`;
const { inputs } = await obs.call('GetInputList');
const exists = (inputs || []).some(i => i.inputName === def.name);
if (!exists) {
await obs.call('CreateInput', {
sceneName: SCENES[0], inputName: def.name, inputKind: 'browser_source',
inputSettings: { url, width: def.w, height: def.h, css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }', shutdown: false, reroute_audio: true }
});
report.created = true;
console.log(`[Scenes] Создан источник «${def.name}»`);
} else {
await obs.call('SetInputSettings', { inputName: def.name, inputSettings: { url, width: def.w, height: def.h } });
}
const { scenes } = await obs.call('GetSceneList');
const names = (scenes || []).map(s => s.sceneName);
for (const sc of SCENES) {
if (!names.includes(sc)) continue;
try {
const { sceneItems } = await obs.call('GetSceneItemList', { sceneName: sc });
const mine = (sceneItems || []).filter(i => i.sourceName === def.name);
let itemId;
if (mine.length === 0) {
const r = await obs.call('CreateSceneItem', { sceneName: sc, sourceName: def.name });
itemId = r.sceneItemId;
} else {
itemId = mine[0].sceneItemId;
for (let i = 1; i < mine.length; i++) {
try { await obs.call('RemoveSceneItem', { sceneName: sc, sceneItemId: mine[i].sceneItemId }); } catch (e) {}
}
}
await obs.call('SetSceneItemTransform', {
sceneName: sc, sceneItemId: itemId,
sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 }
});
await obs.call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: itemId, sceneItemEnabled: true });
const fresh = await obs.call('GetSceneItemList', { sceneName: sc });
await obs.call('SetSceneItemIndex', { sceneName: sc, sceneItemId: itemId, sceneItemIndex: Math.max(0, (fresh.sceneItems || []).length - 1) });
report.scenes.push(sc);
report.enabled = true;
} catch (e) { console.warn(`[Scenes] Сцена ${sc}:`, e.message); }
}
try {
await obs.call('PressInputPropertiesButton', { inputName: def.name, propertyName: 'refreshnocache' });
report.refreshed = true;
} catch (e) {}
this._lastAt = Date.now();
const parts = [report.created ? 'Источник создан' : 'Источник обновлён', `сцен: ${report.scenes.length}`, 'видимость включена, поднят наверх, кэш сброшен'];
console.log(`[Scenes] ensure(${id}) → ${parts.join(' · ')}`);
return { ok: true, message: parts.join(' · '), ...report };
} catch (e) {
console.warn('[Scenes] ensure не удался:', e.message);
return { ok: false, message: `OBS не отвечает (${e.message}). Проверьте WebSocket 4455 без аутентификации.`, ...report };
} finally {
this._busy = false;
try { await obs.disconnect(); } catch (e) {}
}
}
}
module.exports = SceneManager;