/* ФАЙЛ: widgets/media/dashboard/stage.js — v2 (один тёмный стенд, живое превью виджета) */

const WIDGET_W = 520;
const WIDGET_H = 220;

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
        const stage = document.getElementById('md-stage');
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

        if (t.closest('#md-refresh')) {
            e.preventDefault();
            const btn = document.getElementById('md-refresh');
            if (btn) { btn.classList.add('is-spin'); setTimeout(() => btn.classList.remove('is-spin'), 900); }
            this.destroyIframe();
            this.createIframe();
            this.toast.info('Превью перезапущено.');
            return;
        }

        if (t.closest('#md-stage-show')) {
            e.preventDefault();
            this.store.updateConfig({ widgets: { media: { isActive: true } } });
            this.toast.success('Карточка снова на экране.');
        }
    }

    createIframe() {
        if (this.iframe) return;
        const frame = document.getElementById('md-stage-frame');
        if (!frame) return;
        this.loaded = false;
        const loading = document.getElementById('md-stage-loading');
        if (loading) loading.classList.remove('is-hidden');

        const f = document.createElement('iframe');
        f.id = 'md-preview-iframe';
        f.className = 'md-iframe';
        f.title = 'Превью карточки активности';
        f.setAttribute('scrolling', 'no');
        // Относительный путь: работает и в Electron (file://), и по http.
        f.src = `widgets/media/index.html?preview=1&cb=${Date.now()}`;
        f.onload = () => {
            if (this.iframe !== f) return;
            this.loaded = true;
            const l = document.getElementById('md-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.scale();
        };
        f.onerror = () => {
            if (this.iframe !== f) return;
            const l = document.getElementById('md-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.toast.error('Не удалось загрузить превью виджета.');
        };
        frame.appendChild(f);
        this.iframe = f;

        clearTimeout(this.loadTimer);
        this.loadTimer = setTimeout(() => {
            if (!this.loaded) {
                const l = document.getElementById('md-stage-loading');
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
        document.querySelectorAll('iframe#md-preview-iframe').forEach(f => f.remove());
        this.loaded = false;
    }

    scale() {
        const stage = document.getElementById('md-stage');
        if (!stage || !this.iframe) return;
        const s = Math.min(stage.clientWidth / WIDGET_W, stage.clientHeight / WIDGET_H) * 0.92;
        this.iframe.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
    }

    evaluate(state) {
        const c = state.config.widgets.media || {};
        const active = c.isActive === true || String(c.isActive) === 'true';

        const stage = document.getElementById('md-stage');
        if (stage) stage.classList.toggle('is-off', !active);

        const hidden = document.getElementById('md-stage-hidden');
        if (hidden) hidden.classList.toggle('is-hidden', active);

        const loading = document.getElementById('md-stage-loading');
        if (loading && this.loaded) loading.classList.add('is-hidden');

        this.scale();
    }
}