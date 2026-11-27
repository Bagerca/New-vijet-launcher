/* ФАЙЛ: widgets/frame/dashboard/stage.js — v1 (живое превью рамки 1400×850 поверх мока камеры) */
import { WIDGET_W, WIDGET_H, CAM_W, CAM_H, EMOTION_LABELS, setText, frameOf, frameVisible, petOf, petEnabled } from './constants.js';

export class StageController {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.iframe = null;
this.loaded = false;
this.resizeObs = null;
this.clickHandler = null;
this.loadTimer = null;
}
mount() {
this.clickHandler = (e) => this._onClick(e);
this.root.addEventListener('click', this.clickHandler);
const stage = document.getElementById('fd-stage');
this.resizeObs = new ResizeObserver(() => this.scale());
if (stage) this.resizeObs.observe(stage);
this.createIframe();
console.log('[FrameDash:stage] смонтирован');
}
unmount() {
if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
if (this.resizeObs) { this.resizeObs.disconnect(); this.resizeObs = null; }
this.destroyIframe();
}
_onClick(e) {
const t = e.target;
if (t.closest('#fd-refresh')) {
e.preventDefault();
const btn = document.getElementById('fd-refresh');
if (btn) {
btn.classList.add('is-spin');
setTimeout(() => { if (btn.isConnected) btn.classList.remove('is-spin'); }, 900);
}
this.refresh();
this.toast.info('Превью перезапущено.');
return;
}
if (t.closest('#fd-off-show')) {
e.preventDefault();
try {
this.store.updateConfig({ widgets: { frame: { isVisible: true } } });
this.toast.success('Рамка снова на экране.');
} catch (err) {
console.error('[FrameDash:stage] Не удалось показать рамку:', err);
this.toast.error('Настройка не сохранилась.');
}
}
}
refresh() {
this.destroyIframe();
this.createIframe();
}
createIframe() {
if (this.iframe) return;
const host = document.getElementById('fd-frame-host');
if (!host) return;
this.loaded = false;
const loading = document.getElementById('fd-stage-loading');
if (loading) loading.classList.remove('is-hidden');
const f = document.createElement('iframe');
f.id = 'fd-preview-iframe';
f.className = 'fd-iframe';
f.title = 'Превью неоновой рамки и лисы';
f.setAttribute('scrolling', 'no');
// Относительный путь: работает и в Electron (file://), и по http.
f.src = `widgets/frame/index.html?preview=1&cb=${Date.now()}`;
f.onload = () => {
if (this.iframe !== f) return;
this.loaded = true;
const l = document.getElementById('fd-stage-loading');
if (l) l.classList.add('is-hidden');
this.scale();
this.store.broadcastAction('FRAME_REQUEST_STATE', {});
};
f.onerror = () => {
if (this.iframe !== f) return;
const l = document.getElementById('fd-stage-loading');
if (l) l.classList.add('is-hidden');
this.toast.error('Не удалось загрузить превью виджета.');
};
host.appendChild(f);
this.iframe = f;
clearTimeout(this.loadTimer);
this.loadTimer = setTimeout(() => {
if (!this.loaded) {
const l = document.getElementById('fd-stage-loading');
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
document.querySelectorAll('iframe#fd-preview-iframe').forEach(f => f.remove());
this.loaded = false;
}
scale() {
const stage = document.getElementById('fd-stage');
const inner = document.getElementById('fd-stage-inner');
if (!stage || !inner) return;
const w = stage.clientWidth;
const h = stage.clientHeight;
if (w <= 0 || h <= 0) return;
const s = Math.min(w / WIDGET_W, h / WIDGET_H) * 0.96;
inner.style.width = `${WIDGET_W}px`;
inner.style.height = `${WIDGET_H}px`;
inner.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
const cam = inner.querySelector('.fd-cam-mock');
if (cam) {
cam.style.width = `${CAM_W}px`;
cam.style.height = `${CAM_H}px`;
}
}
evaluate(state, live) {
const visible = frameVisible(frameOf(state));
const petOn = petEnabled(petOf(state));
const stage = document.getElementById('fd-stage');
if (stage) stage.classList.toggle('is-off', !visible);
const off = document.getElementById('fd-stage-off');
if (off) off.classList.toggle('is-hidden', visible);
const loading = document.getElementById('fd-stage-loading');
if (loading && this.loaded) loading.classList.add('is-hidden');
const petState = live ? live.petState : (petOn ? 'idle' : 'off');
const label = petOn ? (EMOTION_LABELS[petState] || petState) : 'выключена';
setText('fd-hud-pet', `ЛИСА: ${String(label).toUpperCase()}`);
const chip = document.getElementById('fd-hud-pet');
if (chip) chip.classList.toggle('is-off', !petOn || !visible);
this.scale();
}
}