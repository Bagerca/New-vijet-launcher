/* ФАЙЛ: js/router.js — v4 (fallback-render: сломанный экран не оставляет пустой #app) */
export class Router {
constructor(routes, store, renderLayout) {
this.routes = routes;
this.store = store;
this.renderLayout = renderLayout;
this.currentViewObj = null;
this.currentPath = null;
window.addEventListener('hashchange', () => this.handleHash());
}
parseHash(hash) {
const raw = hash || '#/home';
const [path, query] = raw.split('?');
const params = {};
if (query) {
try {
for (const [k, v] of new URLSearchParams(query).entries()) params[k] = v;
} catch (e) { console.error('[Router] query parse:', e); }
}
return { path: path || '#/home', params };
}
_fallback(path, error) {
const app = document.getElementById('app');
if (!app) return;
const msg = String((error && error.stack) || (error && error.message) || error || 'Неизвестная ошибка');
const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
app.innerHTML = `
<main class="main-wrapper">
<header class="view-header">
<h1 class="view-title">Интерфейс не собрался</h1>
<p class="view-subtitle">Маршрут ${path} упал до рендера. Ядро и сервер продолжают работать.</p>
</header>
<section class="card" style="border-color: var(--color-danger-dim);">
<pre style="white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); font-size: 12px; color: var(--color-warning); background: var(--bg-input); border: 1px solid var(--border-subtle); border-left: 3px solid var(--color-danger); padding: 14px; border-radius: var(--radius-sm); max-height: 300px; overflow: auto;">${safe}</pre>
<div class="d-flex gap-sm mt-md flex-wrap">
<a href="#/home" class="btn btn-primary">На дашборд</a>
<button class="btn btn-secondary" onclick="location.reload()">Перезагрузить интерфейс</button>
</div>
</section>
</main>`;
}
handleHash() {
const { path, params } = this.parseHash(window.location.hash);
const View = this.routes[path] || this.routes['#/home'];
console.log(`[Router] → ${path}`, params);
if (this.currentPath === path && this.currentViewObj && typeof this.currentViewObj.onParamsChange === 'function') {
let handled = false;
try { handled = this.currentViewObj.onParamsChange(params, this.store.getState()); }
catch (e) { console.error('[Router] onParamsChange:', e); handled = false; }
if (handled !== false) return;
}
if (this.currentViewObj && typeof this.currentViewObj.unmount === 'function') {
try { this.currentViewObj.unmount(); } catch (e) { console.error('[Router] unmount:', e); }
}
this.currentPath = path;
this.currentViewObj = View;
try {
this.renderLayout(path, View, params, this.store.getState());
} catch (e) {
console.error('[Router] render:', e);
this._fallback(path, e);
return;
}
if (typeof View.mount === 'function') {
const mounted = path;
setTimeout(() => {
if (this.currentPath !== mounted) return;
try { View.mount(params, this.store.getState()); }
catch (e) { console.error('[Router] mount:', e); }
}, 0);
}
}
init() {
if (!window.location.hash) window.location.hash = '#/home';
else this.handleHash();
}
}