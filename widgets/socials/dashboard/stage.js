/* ФАЙЛ: widgets/socials/dashboard/stage.js — v1 (живое превью настоящего виджета) */
import { activeNetworks, getPlatform } from '../networks.js';

const WIDGET_W = 400;
const WIDGET_H = 120;

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
        const stage = document.getElementById('sd-stage');
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

        if (t.closest('#sd-refresh')) {
            e.preventDefault();
            const btn = document.getElementById('sd-refresh');
            if (btn) { btn.classList.add('is-spin'); setTimeout(() => btn.classList.remove('is-spin'), 900); }
            this.destroyIframe();
            this.createIframe();
            this.toast.info('Превью перезапущено.');
            return;
        }

        if (t.closest('#sd-off-show')) {
            e.preventDefault();
            this.store.updateConfig({ widgets: { socials: { isActive: true } } });
            this.toast.success('Ротатор снова на экране.');
        }
    }

    createIframe() {
        if (this.iframe) return;
        const frame = document.getElementById('sd-stage-frame');
        if (!frame) return;
        this.loaded = false;
        const loading = document.getElementById('sd-stage-loading');
        if (loading) loading.classList.remove('is-hidden');

        const f = document.createElement('iframe');
        f.id = 'sd-preview-iframe';
        f.className = 'sd-iframe';
        f.title = 'Превью ротатора соцсетей';
        f.setAttribute('scrolling', 'no');
        // Относительный путь: работает и в Electron (file://), и по http.
        f.src = `widgets/socials/index.html?preview=1&cb=${Date.now()}`;
        f.onload = () => {
            if (this.iframe !== f) return;
            this.loaded = true;
            const l = document.getElementById('sd-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.scale();
        };
        f.onerror = () => {
            if (this.iframe !== f) return;
            const l = document.getElementById('sd-stage-loading');
            if (l) l.classList.add('is-hidden');
            this.toast.error('Не удалось загрузить превью виджета.');
        };
        frame.appendChild(f);
        this.iframe = f;

        clearTimeout(this.loadTimer);
        this.loadTimer = setTimeout(() => {
            if (!this.loaded) {
                const l = document.getElementById('sd-stage-loading');
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
        document.querySelectorAll('iframe#sd-preview-iframe').forEach(f => f.remove());
        this.loaded = false;
    }

    scale() {
        const stage = document.getElementById('sd-stage');
        if (!stage || !this.iframe) return;
        const s = Math.min(stage.clientWidth / WIDGET_W, stage.clientHeight / WIDGET_H) * 0.88;
        this.iframe.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
    }

    evaluate(state, live) {
        const c = state.config.widgets.socials || {};
        const isOn = c.isActive === true || String(c.isActive) === 'true';
        const list = activeNetworks(c);
        const visible = isOn && list.length > 0;

        const current = live && live.id ? list.find(n => n.id === live.id) : null;
        const item = current || list[0] || null;
        const accent = item ? item.color : null;

        const stage = document.getElementById('sd-stage');
        if (stage) {
            stage.classList.toggle('is-off', !visible);
            if (accent) stage.style.setProperty('--stage-accent', accent);
            else stage.style.removeProperty('--stage-accent');
        }

        const off = document.getElementById('sd-stage-off');
        if (off) off.classList.toggle('is-hidden', visible);

        const title = document.getElementById('sd-off-title');
        const sub = document.getElementById('sd-off-sub');
        const show = document.getElementById('sd-off-show');
        if (title && sub && show) {
            if (!isOn) {
                title.textContent = 'Ротатор скрыт';
                sub.textContent = 'Виджет работает, но не показывается на стриме.';
                show.style.display = list.length > 0 ? '' : 'none';
            } else {
                title.textContent = 'Нет активных соцсетей';
                sub.textContent = 'Добавьте платформу слева и заполните ссылку — карточка появится сразу.';
                show.style.display = 'none';
            }
        }

        const loading = document.getElementById('sd-stage-loading');
        if (loading && this.loaded) loading.classList.add('is-hidden');

        this.scale();
    }
}