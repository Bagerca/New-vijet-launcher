/* ФАЙЛ: widgets/deaths/dashboard/stage.js — v1 (живое превью настоящего виджета) */

const WIDGET_W = 250;
const WIDGET_H = 200;

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
        const stage = document.getElementById('dd-stage');
        this.resizeObs = new ResizeObserver(() => this.scale());
        if (stage) this.resizeObs.observe(stage);
        this.createIframe();
    }

    unmount() {
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.resizeObs) this.resizeObs.disconnect();
        this.destroyIframe();
    }

    _onClick(e) {
        const t = e.target;

        if (t.closest('#dd-refresh')) {
            e.preventDefault();
            const btn = document.getElementById('dd-refresh');
            if (btn) { btn.classList.add('is-spin'); setTimeout(() => btn.classList.remove('is-spin'), 900); }
            this.destroyIframe();
            this.createIframe();
            this.toast.info('Превью перезапущено.');
            return;
        }

        if (t.closest('#dd-off-show')) {
            e.preventDefault();
            this.store.updateConfig({ widgets: { deaths: { enabled: true } } });
            this.toast.success('Счётчик снова на экране.');
        }
    }

    createIframe() {
        if (this.iframe) return;
        const frame = document.getElementById('dd-stage-frame');
        if (!frame) return;
        this.loaded = false;
        const loading = document.getElementById('dd-stage-loading');
        if (loading) loading.classList.remove('is-hidden');

        const f = document.createElement('iframe');
        f.id = 'dd-preview-iframe';
        f.className = 'dd-iframe';
        f.title = 'Превью счётчика смертей';
        f.setAttribute('scrolling', 'no');
        // Относительный путь: работает и в Electron (file://), и по http.
        f.src = `widgets/deaths/index.html?preview=1&cb=${Date.now()}`;
        f.onload = () => {
            if (this.iframe !== f) return;
            this.loaded = true;
            const l = document.getElementById('dd-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.scale();
        };
        f.onerror = () => {
            if (this.iframe !== f) return;
            const l = document.getElementById('dd-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.toast.error('Не удалось загрузить превью виджета.');
        };
        frame.appendChild(f);
        this.iframe = f;

        clearTimeout(this.loadTimer);
        this.loadTimer = setTimeout(() => {
            if (!this.loaded) {
                const l = document.getElementById('dd-stage-loading');
                if (l) l.classList.add('is-hidden');
            }
        }, 6000);

        this.scale();
    }

    destroyIframe() {
        clearTimeout(this.loadTimer);
        if (this.iframe) {
            const f = this.iframe;
            this.iframe = null;
            try { f.src = 'about:blank'; } catch (e) {}
            f.remove();
        }
        document.querySelectorAll('iframe#dd-preview-iframe').forEach(f => f.remove());
        this.loaded = false;
    }

    scale() {
        const stage = document.getElementById('dd-stage');
        if (!stage || !this.iframe) return;
        const s = Math.min(stage.clientWidth / WIDGET_W, stage.clientHeight / WIDGET_H) * 0.9;
        this.iframe.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
    }

    evaluate(state) {
        const c = state.config.widgets.deaths || {};
        const enabled = c.enabled === true || String(c.enabled) === 'true';

        const stage = document.getElementById('dd-stage');
        if (stage) {
            stage.classList.toggle('is-off', !enabled);
            stage.style.setProperty('--stage-accent', String(c.color || '#ff0050'));
        }

        const off = document.getElementById('dd-stage-off');
        if (off) off.classList.toggle('is-hidden', enabled);

        const loading = document.getElementById('dd-stage-loading');
        if (loading && this.loaded) loading.classList.add('is-hidden');

        this.scale();
    }
}