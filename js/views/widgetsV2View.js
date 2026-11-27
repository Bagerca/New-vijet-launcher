/* ФАЙЛ: js/views/widgetsV2View.js — v18 (стили вынесены в css/views/widgets-v2.css; реестр в data/v2Registry.js) */
import { V2_DASHBOARDS } from '../../data/v2Registry.js';
function esc(s) {
return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function classifyImportError(e) {
const msg = String((e && e.message) || e || '');
if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script/i.test(msg)) {
return {
title: 'Модуль дашборда не найден',
hint: 'Отсутствует файл widgets/<виджет>/dashboard/Dashboard.js или один из его импортов. Для алертов обязательны widgets/alerts/types.js и js/utils/icons.js.'
};
}
if (/does not provide an export named/i.test(msg)) {
return {
title: 'Нет нужного экспорта',
hint: 'Файл сохранён не полностью. Проверь конец файла — там должен быть export default { render, preload, mount, onParamsChange, unmount }.'
};
}
if (/Unexpected token|Unexpected end of input|SyntaxError/i.test(msg)) {
return { title: 'Синтаксическая ошибка в модуле', hint: 'Файл дашборда повреждён или скопирован не полностью (частая причина — обрезанный конец файла).' };
}
return { title: 'Ошибка загрузки дашборда', hint: 'Полный текст ошибки ниже и в консоли (Ctrl+Shift+I).' };
}
function resolveDashboard(mod) {
if (!mod) return null;
if (mod.default && typeof mod.default.render === 'function') return mod.default;
if (typeof mod.render === 'function') return mod;
return null;
}
export const WidgetsV2View = {
_module: null,
_widgetId: null,
_token: 0,
_retryHandler: null,
_lastParams: null,
_lastState: null,
render: (state, params) => {
const all = state.widgetsManifest;
const entries = V2_DASHBOARDS
.map(d => ({ ...d, widget: all.find(w => w.id === d.id) }))
.filter(d => Boolean(d.widget));
const config = state.config.widgets;
const activeId = params?.id || entries[0]?.id;
if (!entries.find(d => d.id === activeId)) {
return `<div class="card" style="padding:40px; color: var(--text-primary);">Виджет не найден</div>`;
}
const href = (entry) => {
const sp = new URLSearchParams();
sp.set('id', entry.id);
entry.ownParams.forEach(key => {
const value = params?.[key];
if (value !== undefined && value !== null && value !== '') sp.set(key, value);
});
return `#/widgets-v2?${sp.toString()}`;
};
const nav = entries.map(entry => {
const widget = entry.widget;
const isActive = widget.id === activeId;
const masterKeys = ['enabled', 'isActive', 'isVisible', 'playlistEnabled'];
const master = widget.controls.find(c => masterKeys.includes(c.key));
let on = true;
if (master) {
const v = config[widget.id]?.[master.key] ?? master.default;
on = v === true || String(v) === 'true';
}
return `
<a href="${href(entry)}" class="v2-nav-item ${isActive ? 'active' : ''}">
<div class="d-flex align-center gap-sm">
<span class="v2-dot ${on ? 'v2-dot-on' : ''}"></span>
<span>${esc(widget.title)}</span>
</div>
</a>`;
}).join('');
return `
<div class="v2-layout">
<aside class="v2-sidebar card">
<div class="v2-side-head"><span class="v2-side-title">ВИДЖЕТЫ</span><span class="v2-beta">BETA</span></div>
<nav class="v2-nav-list">${nav}</nav>
<div class="v2-legend"><b>Зелёная точка</b> — виджет сейчас включён и виден на стриме.</div>
</aside>
<section class="v2-main-area" id="v2-dynamic-content">
<div class="v2-skeleton"><div class="v2-sk" style="height:44%;"></div><div class="v2-sk" style="flex:1;"></div></div>
</section>
</div>`;
},
onParamsChange: (params, state) => {
const id = params?.id || 'player';
if (WidgetsV2View._widgetId && id !== WidgetsV2View._widgetId) return false;
const mod = WidgetsV2View._module;
if (mod && typeof mod.onParamsChange === 'function') {
try { return mod.onParamsChange(params, state) !== false; }
catch (e) { console.error('[V2] onParamsChange:', e); return false; }
}
return false;
},
_showError: (area, id, error) => {
const info = classifyImportError(error);
const message = String((error && error.stack) || (error && error.message) || error || 'Неизвестная ошибка');
area.innerHTML = `
<div class="card v2-err">
<div class="v2-err-title">${esc(info.title)}</div>
<div class="v2-err-path">widgets/${esc(id)}/dashboard/Dashboard.js</div>
<div class="v2-err-hint">${esc(info.hint)}</div>
<pre class="v2-err-msg">${esc(message)}</pre>
<div class="d-flex gap-sm">
<button class="btn btn-primary" id="v2-retry-btn">Повторить загрузку</button>
</div>
</div>`;
const btn = document.getElementById('v2-retry-btn');
if (WidgetsV2View._retryHandler && btn) btn.removeEventListener('click', WidgetsV2View._retryHandler);
WidgetsV2View._retryHandler = () => {
const state = WidgetsV2View._lastState;
const params = WidgetsV2View._lastParams || { id };
area.innerHTML = `<div class="v2-skeleton"><div class="v2-sk" style="height:44%;"></div><div class="v2-sk" style="flex:1;"></div></div>`;
WidgetsV2View.mount(params, state);
};
if (btn) btn.addEventListener('click', WidgetsV2View._retryHandler);
},
mount: async (params, state) => {
const token = ++WidgetsV2View._token;
const id = params?.id || 'player';
WidgetsV2View._lastParams = params;
WidgetsV2View._lastState = state;
const area = document.getElementById('v2-dynamic-content');
if (!area) return;
if (!V2_DASHBOARDS.some(d => d.id === id)) {
WidgetsV2View._showError(area, id, new Error(`Дашборд "${id}" не подключён к реестру data/v2Registry.js.`));
return;
}
let mod;
try {
mod = await import(`../../widgets/${id}/dashboard/Dashboard.js`);
} catch (e) {
console.error(`[V2] Импорт дашборда "${id}" провален:`, e);
if (token !== WidgetsV2View._token) return;
WidgetsV2View._showError(area, id, e);
return;
}
if (token !== WidgetsV2View._token) return;
const dash = resolveDashboard(mod);
if (!dash) {
const keys = Object.keys(mod || {}).join(', ') || 'модуль без экспортов';
console.error(`[V2] "${id}": нет render(). Экспорты: ${keys}`, mod);
WidgetsV2View._showError(area, id, new Error(
`Модуль загружен, но не отдаёт render().
Найденные экспорты: ${keys}
Сохрани файл widgets/${id}/dashboard/Dashboard.js целиком — он должен содержать export default { render, preload, mount, onParamsChange, unmount }.`
));
return;
}
if (typeof dash.preload === 'function') {
try {
const ok = await dash.preload();
if (ok === false) console.warn(`[V2] Стили "${id}" загружены не полностью.`);
} catch (e) {
console.warn(`[V2] preload "${id}" упал, рендерю без ожидания:`, e);
}
}
if (token !== WidgetsV2View._token) return;
try {
WidgetsV2View._module = dash;
WidgetsV2View._widgetId = id;
area.innerHTML = dash.render(state, params);
const rootEl = area.firstElementChild;
if (rootEl) rootEl.classList.add('v2-fade');
if (typeof dash.mount === 'function') dash.mount(params, state);
console.log(`[V2] дашборд ${id} смонтирован`);
} catch (e) {
console.error(`[V2] Рендер дашборда "${id}" провален:`, e);
try { if (dash.unmount) dash.unmount(); } catch (e2) {}
WidgetsV2View._module = null;
WidgetsV2View._widgetId = null;
WidgetsV2View._showError(area, id, e);
}
},
unmount: () => {
WidgetsV2View._token++;
const btn = document.getElementById('v2-retry-btn');
if (btn && WidgetsV2View._retryHandler) btn.removeEventListener('click', WidgetsV2View._retryHandler);
WidgetsV2View._retryHandler = null;
const mod = WidgetsV2View._module;
if (mod && typeof mod.unmount === 'function') {
try { mod.unmount(); } catch (e) { console.error('[V2] unmount:', e); }
}
WidgetsV2View._module = null;
WidgetsV2View._widgetId = null;
}
};