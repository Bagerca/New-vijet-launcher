/* ФАЙЛ: widgets/player/dashboard/stage.js — v6 (единый переключатель источника: один клик, авто-эстафета, демо закрывается при возврате в OBS) */
import { thumbnailUrl } from '../queue.js';

const SERVER_HTTP = 'http://localhost:42069';
const IFRAME_WAIT = 8000;
const HANDOFF_TIMEOUT = 14000;

export class StageController {
    constructor({ root, state, toast, onSetSource, onSpawnDemo, onDespawnDemo, onReconnect, onRequestSync }) {
        this.root = root;
        this.state = state;
        this.toast = toast;
        this.onSetSource = onSetSource;
        this.onSpawnDemo = onSpawnDemo;
        this.onDespawnDemo = onDespawnDemo;
        this.onReconnect = onReconnect;
        this.onRequestSync = onRequestSync;
        this.iframe = null;
        this.iframeLoaded = false;
        this.iframeFailed = false;
        this.iframeTimer = null;
        this.resizeObs = null;
        this.clickHandler = null;
        this.pendingDemo = false;
        this.pendingSince = 0;
        this._lastOnline = false;
        this._lastHint = '';
    }

    mount() {
        this.clickHandler = (e) => this._onClick(e);
        this.root.addEventListener('click', this.clickHandler);
        const stage = document.getElementById('pd-stage');
        this.resizeObs = new ResizeObserver(() => this.scaleIframe());
        if (stage) this.resizeObs.observe(stage);
    }

    unmount() {
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.resizeObs) this.resizeObs.disconnect();
        this.cancelPending();
        this.destroyIframe();
    }

    _onClick(e) {
        const t = e.target;
        if (t.closest('#pd-reconnect')) {
            e.preventDefault();
            this.onReconnect();
            return;
        }
        const idleCta = t.closest('#pd-idle-demo');
        if (idleCta && !idleCta.disabled) {
            e.preventDefault();
            this.requestSource('demo');
            return;
        }
        const seg = t.closest('.pd-seg-btn');
        if (seg && !seg.disabled) {
            e.preventDefault();
            this.requestSource(seg.getAttribute('data-source'));
        }
    }

    /** Единая точка входа для сегмента и idle-CTA. */
    requestSource(mode) {
        const online = this._lastOnline;
        if (!online) {
            this.toast.error('Нет связи с локальным сервером.');
            return;
        }
        const current = this.state.activeMode();

        if (mode === 'demo') {
            if (this.pendingDemo) return;
            if (current === 'demo' && this.state.has('demo')) return;
            if (this.state.has('demo')) {
                this.onSetSource('demo');
                return;
            }
            if (this.iframeFailed) this.destroyIframe();
            this.expectDemoHandoff();
            if (!this.state.demoWanted) this.onSpawnDemo();
            else this.createIframe();
            this.toast.info('Запускаю плеер в лаунчере…');
            this.evaluate(online);
            return;
        }

        if (mode === 'obs') {
            if (!this.state.has('obs')) {
                this.toast.info('OBS-плеер не подключён. Откройте OBS с виджетом плеера.');
                return;
            }
            if (current === 'obs' && !this.state.demoWanted) return;
            this.cancelPending();
            // Сначала сервер замораживает позицию и передаёт эстафету в OBS…
            this.onSetSource('obs');
            // …затем закрываем демо-iframe (вариант «закрывать при возврате в OBS»).
            if (this.state.demoWanted) this.onDespawnDemo();
        }
    }

    expectDemoHandoff() {
        this.pendingDemo = true;
        this.pendingSince = Date.now();
    }

    cancelPending() {
        this.pendingDemo = false;
        this.pendingSince = 0;
    }

    createIframe() {
        if (this.iframe) return;
        const layer = document.getElementById('pd-iframe-layer');
        if (!layer) return;
        this.iframeLoaded = false;
        this.iframeFailed = false;
        const f = document.createElement('iframe');
        f.className = 'pd-iframe';
        f.id = 'pd-demo-iframe';
        f.title = 'Демо-плеер';
        f.allow = 'autoplay; encrypted-media';
        f.src = `${SERVER_HTTP}/player/index.html?preview=1&demo=1&cb=${Date.now()}`;
        f.onload = () => {
            if (this.iframe !== f) return;
            setTimeout(() => { if (this.iframe === f && this.onRequestSync) this.onRequestSync(); }, 400);
            setTimeout(() => {
                if (this.iframe !== f) return;
                if (this.state.has('demo')) { this.iframeLoaded = true; this.evaluate(this._lastOnline); }
            }, 2500);
        };
        f.onerror = () => { this.iframeFailed = true; this.evaluate(this._lastOnline); };
        layer.appendChild(f);
        this.iframe = f;
        const loading = document.getElementById('pd-stage-loading');
        if (loading) loading.classList.remove('is-hidden');
        if (this.iframeTimer) clearTimeout(this.iframeTimer);
        this.iframeTimer = setTimeout(() => {
            if (!this.iframe) return;
            if (!this.state.has('demo')) { this.iframeFailed = true; this.evaluate(this._lastOnline); }
        }, IFRAME_WAIT);
        this.evaluate(this._lastOnline);
    }

    destroyIframe() {
        if (this.iframeTimer) { clearTimeout(this.iframeTimer); this.iframeTimer = null; }
        if (this.iframe) {
            const f = this.iframe;
            this.iframe = null;
            try { f.src = 'about:blank'; } catch (e) {}
            f.remove();
        }
        document.querySelectorAll('iframe#pd-demo-iframe').forEach(f => f.remove());
        this.iframeLoaded = false;
        this.iframeFailed = false;
        this.cancelPending();
        const loading = document.getElementById('pd-stage-loading');
        if (loading) loading.classList.add('is-hidden');
        // Страховка: если демо исчезло, будучи активным, — возвращаем звук в OBS.
        if (this.state.roster.active === 'demo' && this.onSetSource) {
            this.onSetSource('obs');
        }
        if (this.onRequestSync) this.onRequestSync();
        this.evaluate(this._lastOnline);
    }

    scaleIframe() {
        const stage = document.getElementById('pd-stage');
        if (!stage || !this.iframe) return;
        const s = Math.min(stage.clientWidth / 480, stage.clientHeight / 380) * 0.96;
        this.iframe.style.transform = `translate(-50%, -50%) scale(${s})`;
    }

    evaluate(online) {
        this._lastOnline = online;

        // Авто-эстафета: как только демо зарегистрировалось — переводим звук одним действием.
        if (this.pendingDemo) {
            if (this.state.has('demo')) {
                this.cancelPending();
                this.onSetSource('demo');
            } else if (Date.now() - this.pendingSince > HANDOFF_TIMEOUT) {
                this.cancelPending();
                this.toast.error('Демо-плеер не запустился. Нажмите «Переподключить» и попробуйте снова.');
            }
        }

        const hasObs = this.state.has('obs');
        const hasDemo = this.state.has('demo');
        const mode = this.state.activeMode();
        const q = this.state.queue;
        const t = this.state.transport;
        const now = q.nowPlaying;

        const setBadge = (id, cls, text) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = `pd-badge ${cls}`;
            el.innerHTML = `<span class="pd-badge-dot"></span>${text}`;
        };
        setBadge('pd-server', online ? 'pd-badge-live' : 'pd-badge-off', online ? 'СЕРВЕР ONLINE' : 'СЕРВЕР OFFLINE');
        setBadge('pd-obs', hasObs ? 'pd-badge-live' : 'pd-badge-off', hasObs ? 'OBS ПЛЕЕР ЖИВ' : 'OBS НЕ НАЙДЕН');

        const launching = this.pendingDemo || (Boolean(this.iframe) && !hasDemo && !this.iframeFailed);

        const segObs = document.getElementById('pd-seg-obs');
        const segDemo = document.getElementById('pd-seg-demo');
        if (segObs) {
            segObs.classList.toggle('is-active', mode === 'obs');
            segObs.setAttribute('aria-pressed', mode === 'obs' ? 'true' : 'false');
            segObs.disabled = !online || !hasObs;
        }
        if (segDemo) {
            segDemo.classList.toggle('is-active', mode === 'demo');
            segDemo.setAttribute('aria-pressed', mode === 'demo' ? 'true' : 'false');
            segDemo.disabled = !online || this.pendingDemo;
        }
        const dotObs = document.getElementById('pd-seg-dot-obs');
        if (dotObs) dotObs.className = 'pd-seg-dot' + (hasObs ? ' is-live' : '');
        const dotDemo = document.getElementById('pd-seg-dot-demo');
        if (dotDemo) dotDemo.className = 'pd-seg-dot' + (hasDemo ? ' is-live' : (launching ? ' is-launching' : ''));

        const hint = document.getElementById('pd-source-hint');
        if (hint) {
            let text;
            if (!online) text = 'Нет связи с локальным сервером.';
            else if (launching) text = 'Запускаю плеер в лаунчере…';
            else if (mode === 'demo') text = 'Звук идёт из лаунчера. Верните в OBS одним кликом.';
            else if (mode === 'obs') text = 'Звук идёт в OBS Studio.';
            else text = 'Откройте OBS или включите «Лаунчер», чтобы слушать здесь.';
            if (this._lastHint !== text) {
                this._lastHint = text;
                hint.textContent = text;
            }
        }

        const showIframe = Boolean(this.iframe) && mode === 'demo';
        const showMirror = mode === 'obs' && hasObs;
        const showIdle = !showIframe && !showMirror;
        const mirror = document.getElementById('pd-mirror');
        const iframeLayer = document.getElementById('pd-iframe-layer');
        const idle = document.getElementById('pd-idle');
        if (mirror) mirror.classList.toggle('is-hidden', !showMirror);
        if (iframeLayer) iframeLayer.classList.toggle('is-hidden', !showIframe);
        if (idle) idle.classList.toggle('is-hidden', !showIdle);

        const idleTitle = document.getElementById('pd-idle-title');
        const idleSub = document.getElementById('pd-idle-sub');
        const idleCta = document.getElementById('pd-idle-demo');
        if (idleTitle && idleSub) {
            if (!online) {
                idleTitle.textContent = 'Сервер недоступен';
                idleSub.textContent = 'Лаунчер должен быть запущен через npm start — сервер поднимается автоматически.';
            } else {
                idleTitle.textContent = 'Плеер не найден';
                idleSub.textContent = 'Откройте OBS с виджетом плеера — или нажмите «Слушать в лаунчере», чтобы слушать музыку прямо здесь.';
            }
        }
        if (idleCta) idleCta.disabled = !online || this.pendingDemo;

        const loading = document.getElementById('pd-stage-loading');
        if (loading) loading.classList.toggle('is-hidden', !(Boolean(this.iframe) && !this.iframeFailed && !hasDemo));

        const note = document.getElementById('pd-stage-note');
        if (note) {
            let text = '';
            if (this.iframeFailed && this.state.demoWanted) text = 'Демо-плеер не ответил. Нажмите «Переподключить».';
            if (text) { note.textContent = text; note.classList.add('is-visible'); }
            else note.classList.remove('is-visible');
        }

        const stage = document.getElementById('pd-stage');
        if (stage) stage.classList.toggle('is-live', Boolean(now && t.state === 'PLAYING'));

        if (showMirror) this.renderMirror(now, t);
        this.scaleIframe();
    }

    renderMirror(now, t) {
        const titleEl = document.getElementById('pd-mirror-title');
        const userEl = document.getElementById('pd-mirror-user');
        const coverEl = document.getElementById('pd-mirror-cover');
        if (!titleEl || !coverEl) return;
        if (now) {
            titleEl.textContent = now.title || 'Играет трек…';
            titleEl.classList.remove('pd-mirror-stopped');
            if (userEl) {
                userEl.textContent = now.isBackground ? 'Автоплейлист' : `Заказ: ${now.user}`;
                userEl.style.display = '';
            }
            const hi = thumbnailUrl(now, 'maxresdefault');
            const lo = thumbnailUrl(now, 'hqdefault');
            if (hi && coverEl.dataset.id !== now.id) {
                coverEl.dataset.id = now.id;
                coverEl.onerror = () => { if (lo) coverEl.src = lo; };
                coverEl.src = hi;
                coverEl.style.display = '';
            } else if (!hi) {
                coverEl.style.display = 'none';
                coverEl.dataset.id = '';
            }
        } else {
            titleEl.textContent = t.state === 'IDLE' ? 'ПЛЕЕР ОСТАНОВЛЕН' : 'ОЖИДАНИЕ ТРЕКА';
            titleEl.classList.add('pd-mirror-stopped');
            if (userEl) userEl.style.display = 'none';
            coverEl.style.display = 'none';
            coverEl.dataset.id = '';
        }
    }
}