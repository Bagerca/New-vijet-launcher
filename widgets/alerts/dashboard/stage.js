/* ФАЙЛ: widgets/alerts/dashboard/stage.js — v2 (импорты из constants, стенд 1920×1080) */
import { normalizeAlertConfig, WIDGET_W, WIDGET_H, alertsOf, setText } from './constants.js';

export class StageController {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.iframe = null;
this.loaded = false;
this.resizeObs = null;
this.loadTimer = null;
}
mount() {
const stage = document.getElementById('ad-stage');
this.resizeObs = new ResizeObserver(() => this.scale());
if (stage) this.resizeObs.observe(stage);
this.createIframe();
console.log('[AlertsDash:stage] смонтирован');
}
unmount() {
if (this.resizeObs) { this.resizeObs.disconnect(); this.resizeObs = null; }
this.destroyIframe();
}
refresh() { this.destroyIframe(); this.createIframe(); }
createIframe() {
if (this.iframe) return;
const host = document.getElementById('ad-frame-host');
if (!host) return;
this.loaded = false;
const loading = document.getElementById('ad-stage-loading');
if (loading) loading.classList.remove('is-hidden');
const f = document.createElement('iframe');
f.id = 'ad-preview-iframe';
f.className = 'ad-iframe';
f.title = 'Превью виджета оповещений';
f.setAttribute('scrolling', 'no');
f.src = `widgets/alerts/index.html?preview=1&cb=${Date.now()}`;
f.onload = () => {
if (this.iframe !== f) return;
this.loaded = true;
const l = document.getElementById('ad-stage-loading');
if (l) l.classList.add('is-hidden');
this.scale();
this.store.broadcastAction('ALERTS_REQUEST_STATE', {});
};
f.onerror = () => {
if (this.iframe !== f) return;
const l = document.getElementById('ad-stage-loading');
if (l) l.classList.add('is-hidden');
this.toast.error('Не удалось загрузить превью виджета.');
};
host.appendChild(f);
this.iframe = f;
clearTimeout(this.loadTimer);
this.loadTimer = setTimeout(() => {
if (!this.loaded) {
const l = document.getElementById('ad-stage-loading');
if (l) l.classList.add('is-hidden');
}
}, 6000);
this.scale();
}
destroyIframe() {
clearTimeout(this.loadTimer);
this.loadTimer = null;
if (this.iframe) {
const f = this.iframe;
this.iframe = null;
try { f.src = 'about:blank'; } catch (e) {}
f.remove();
}
document.querySelectorAll('iframe#ad-preview-iframe').forEach(f => f.remove());
this.loaded = false;
}
scale() {
const stage = document.getElementById('ad-stage');
const inner = document.getElementById('ad-stage-inner');
if (!stage || !inner) return;
const w = stage.clientWidth;
const h = stage.clientHeight;
if (w <= 0 || h <= 0) return;
const s = Math.min(w / WIDGET_W, h / WIDGET_H) * 0.97;
inner.style.width = `${WIDGET_W}px`;
inner.style.height = `${WIDGET_H}px`;
inner.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
}
evaluate(state, live) {
const c = normalizeAlertConfig(alertsOf(state));
const stage = document.getElementById('ad-stage');
if (stage) stage.classList.toggle('is-off', !c.enabled);
const off = document.getElementById('ad-stage-off');
if (off) off.classList.toggle('is-hidden', c.enabled);
const loading = document.getElementById('ad-stage-loading');
if (loading && this.loaded) loading.classList.add('is-hidden');
const slot = document.getElementById('ad-slot');
if (slot && slot.dataset.pos !== c.position) slot.dataset.pos = c.position;
const queue = live ? live.queue : 0;
setText('ad-hud-queue', `ОЧЕРЕДЬ: ${queue}`);
const chip = document.getElementById('ad-hud-queue');
if (chip) chip.classList.toggle('is-warn', queue > 0);
this.scale();
}
}