/* ФАЙЛ: widgets/panel/script.js — v2 (+ карточка «Сцены OBS»: горячий рефреш с телефона) */
import { widgetsManifest } from '/data/widgetsManifest.js';
let ws = null;
let config = { widgets: {} };
let currentMode = 'ws';
let scenesRefreshTimer = null;
const statusEl = document.getElementById('status');
const container = document.getElementById('widgets-container');
const toast = document.getElementById('toast');
document.getElementById('btn-ws').addEventListener('click', (e) => setMode('ws', e.target));
document.getElementById('btn-chat').addEventListener('click', (e) => setMode('chat', e.target));
function setMode(mode, targetBtn) {
currentMode = mode;
document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
targetBtn.classList.add('active');
}
function showToast(text) {
toast.textContent = text;
toast.classList.add('show');
setTimeout(() => toast.classList.remove('show'), 3000);
}
function setScenesBtnBusy(busy) {
const btn = document.getElementById('panel-refresh-scenes');
if (!btn) return;
btn.disabled = busy;
btn.textContent = busy ? '⏳ Перезагрузка сцен...' : '⟳ Перезагрузить сцены';
}
function renderUI() {
const scenesCard = `
<div class="card">
<h2 class="card-title">Сцены OBS</h2>
<div class="control-group">
<button class="panel-btn-action" id="panel-refresh-scenes">⟳ Перезагрузить сцены</button>
</div>
<div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
Перезагружает все виджеты в OBS, кроме плеера — музыка не прервётся. Из чата: <b>!refresh</b>
</div>
</div>`;
container.innerHTML = scenesCard + widgetsManifest.map(widget => {
const widgetConfig = config.widgets[widget.id] || {};
let controlsHtml = widget.controls.map(control => {
// ИСПОЛНЯЕМЫЕ КНОПКИ В ПАНЕЛИ
if (control.type === 'button') {
return `
<div class="control-group">
<button class="panel-btn-action" data-action="${control.action}" data-payload='${JSON.stringify(control.payload)}'>
▶ ${control.label}
</button>
</div>`;
}
const val = widgetConfig[control.key] !== undefined ? widgetConfig[control.key] : control.default;
let inputHtml = '';
if (control.type === 'range') {
inputHtml = `<input type="range" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}" min="0" max="100">`;
} else if (control.type === 'checkbox') {
inputHtml = `<input type="checkbox" class="toggle-switch" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" ${val ? 'checked' : ''}>`;
} else if (control.type === 'select') {
const opts = control.options.map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
inputHtml = `<select data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}">${opts}</select>`;
} else if (control.type === 'textarea') {
inputHtml = `<textarea data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}">${val}</textarea>`;
} else {
inputHtml = `<input type="${control.type}" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}">`;
}
return `
<div class="control-group">
<div class="label-row">
<span>${control.label}</span>
${control.type === 'range' ? `<span id="val-${widget.id}-${control.key}">${val}</span>` : `<span style="color:var(--text-muted)">${control.cmd || ''}</span>`}
</div>
${inputHtml}
</div>`;
}).join('');
// КАСТОМНЫЙ ИНЖЕКТ ДЛЯ ПЛЕЕРА (Возвращаем поле ввода треков для телефонов)
if (widget.id === 'player') {
const addTrackHtml = `
<div class="control-group">
<div class="label-row">
<span style="color: var(--accent-primary);">Добавить трек (Вне очереди)</span>
</div>
<div style="display: flex; gap: 8px;">
<input type="text" id="panel-add-track-input" placeholder="Ссылка на YouTube..." style="flex: 1;">
<button class="panel-btn-action" id="panel-btn-add-track" style="width: auto; padding: 0 20px;">+</button>
</div>
</div>
`;
controlsHtml = addTrackHtml + controlsHtml;
}
return `<div class="card"><h2 class="card-title">${widget.title}</h2>${controlsHtml}</div>`;
}).join('');
}
// ОБРАБОТЧИК КНОПОК ДЕЙСТВИЙ
container.addEventListener('click', (e) => {
const btn = e.target.closest('.panel-btn-action');
if (btn) {
// 0. Горячий рефреш сцен
if (btn.id === 'panel-refresh-scenes') {
if (ws && ws.readyState === WebSocket.OPEN) {
ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'SCENES_REFRESH', payload: { widgets: 'all', origin: 'panel' } }));
setScenesBtnBusy(true);
if (scenesRefreshTimer) clearTimeout(scenesRefreshTimer);
scenesRefreshTimer = setTimeout(() => { scenesRefreshTimer = null; setScenesBtnBusy(false); }, 12000);
showToast('Команда отправлена...');
} else {
showToast('Нет подключения к стриму!');
}
return;
}
// 1. Кастомная кнопка добавления трека
if (btn.id === 'panel-btn-add-track') {
const input = document.getElementById('panel-add-track-input');
if (input && input.value.trim() !== '') {
if (ws && ws.readyState === WebSocket.OPEN) {
ws.send(JSON.stringify({
event: 'WIDGET_ACTION',
action: 'PLAYER_ADD_TRACK',
payload: { url: input.value.trim(), user: 'Модератор' }
}));
showToast('Трек отправлен!');
input.value = '';
} else {
showToast('Нет подключения к стриму!');
}
}
return;
}
// 2. Стандартные кнопки из манифеста
const action = btn.getAttribute('data-action');
const payload = JSON.parse(btn.getAttribute('data-payload') || '{}');
if (ws && ws.readyState === WebSocket.OPEN) {
ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action, payload }));
showToast('Команда выполнена!');
} else {
showToast('Нет подключения к стриму!');
}
}
});
// ОБРАБОТЧИК ИНПУТОВ НАСТРОЕК
function handleInput(e) {
const target = e.target;
if (!target.hasAttribute('data-widget')) return;
const widgetId = target.getAttribute('data-widget');
const key = target.getAttribute('data-key');
const cmd = target.getAttribute('data-cmd');
const value = target.type === 'checkbox' ? target.checked : target.value;
if (target.type === 'range') {
const valLabel = document.getElementById(`val-${widgetId}-${key}`);
if (valLabel) valLabel.textContent = value;
}
if (currentMode === 'ws') {
if (!config.widgets[widgetId]) config.widgets[widgetId] = {};
config.widgets[widgetId][key] = value;
if (ws && ws.readyState === WebSocket.OPEN) {
ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: config }));
}
} else {
if (!cmd) {
showToast('У этой настройки нет чат-команды');
return;
}
let cmdValue = value;
if (target.type === 'checkbox') cmdValue = value ? 'on' : 'off';
const fullCmd = `${cmd} ${cmdValue}`;
navigator.clipboard.writeText(fullCmd)
.then(() => showToast(`Скопировано: ${fullCmd}`))
.catch(() => showToast(`Команда: ${fullCmd}`));
}
}
container.addEventListener('input', handleInput);
async function init() {
try {
const res = await fetch('/api/config');
config = await res.json();
renderUI();
connectWS();
} catch (e) {
statusEl.textContent = 'Ошибка загрузки';
}
}
function connectWS() {
const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
ws = new WebSocket(protocol + window.location.host);
ws.onopen = () => {
statusEl.textContent = 'Online';
statusEl.classList.add('online');
};
ws.onmessage = (event) => {
try {
const msg = JSON.parse(event.data);
if (msg.event === 'CONFIG_UPDATED') {
config = msg.data;
widgetsManifest.forEach(w => w.controls.forEach(c => {
if (c.type === 'button') return;
const input = document.querySelector(`[data-widget="${w.id}"][data-key="${c.key}"]`);
if (input && document.activeElement !== input) {
const newVal = config.widgets[w.id]?.[c.key] ?? c.default;
let isChanged = false;
if (input.type === 'checkbox') {
const isChecked = newVal === true || String(newVal) === 'true';
if (input.checked !== isChecked) {
input.checked = isChecked;
isChanged = true;
}
} else {
if (input.value !== String(newVal)) {
input.value = newVal;
isChanged = true;
if (c.type === 'range') {
const valLabel = document.getElementById(`val-${w.id}-${c.key}`);
if (valLabel) valLabel.textContent = newVal;
}
}
}
if (isChanged) {
const group = input.closest('.control-group');
if (group) {
group.classList.remove('flash-update');
void group.offsetWidth;
group.classList.add('flash-update');
}
}
}
}));
}
else if (msg.event === 'WIDGET_ACTION' && msg.action === 'SCENES_REFRESH_RESULT') {
if (scenesRefreshTimer) { clearTimeout(scenesRefreshTimer); scenesRefreshTimer = null; }
setScenesBtnBusy(false);
showToast((msg.payload && msg.payload.message) || 'Сцены перезагружены');
}
} catch (e) {}
};
ws.onclose = () => {
statusEl.textContent = 'Offline';
statusEl.classList.remove('online');
setTimeout(connectWS, 2000);
};
}
init();