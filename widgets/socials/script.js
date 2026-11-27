/* ФАЙЛ: widgets/socials/script.js — v2 (WidgetCore, ротация по id, живые команды и состояния) */
import { WidgetCore } from '../shared/WidgetCore.js';
import { icons } from '../../js/utils/icons.js';
import { activeNetworks, normalizeNetworks, serializeNetworks, legacyPatch, intervalFrom, getPlatform } from './networks.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get('preview') === '1';
const SOURCE = IS_PREVIEW ? 'preview' : 'obs';
const FADE_MS = 420;
const HEARTBEAT_MS = 5000;

const AppSocials = {
    container: document.getElementById('social-rotator'),
    list: [],
    currentId: null,
    intervalSec: 30,
    enabled: true,
    timer: null,
    fadeTimer: null,
    transitioning: false,
    _sig: '',

    applyConfig(conf) {
        if (!this.container) return;
        const config = conf || {};
        const isOff = config.isActive === false || String(config.isActive) === 'false';
        const next = activeNetworks(config);
        const interval = intervalFrom(config);
        const sig = JSON.stringify([isOff, interval, next.map(n => [n.id, n.handle, n.color])]);
        if (sig === this._sig) return;
        this._sig = sig;

        this.enabled = !isOff;
        this.intervalSec = interval;
        this.list = next;

        if (isOff || next.length === 0) {
            this.stopRotation();
            this.cancelFade();
            this.hide();
            this.report();
            return;
        }

        if (!next.some(n => n.id === this.currentId)) this.currentId = next[0].id;
        this.container.classList.remove('hidden');
        this.render();
        this.restartRotation();
        this.reveal();
        this.report();
    },

    stopRotation() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },

    restartRotation() {
        this.stopRotation();
        if (this.list.length > 1) {
            this.timer = setInterval(() => this.next(), this.intervalSec * 1000);
        }
    },

    cancelFade() {
        if (this.fadeTimer) { clearTimeout(this.fadeTimer); this.fadeTimer = null; }
        this.transitioning = false;
        if (this.container) this.container.classList.remove('fade-out');
    },

    reveal() {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (this.container) this.container.classList.remove('fade-out');
        }));
    },

    hide() {
        if (this.container) this.container.classList.add('hidden');
    },

    next() {
        if (this.transitioning || this.list.length < 2) return;
        const idx = this.list.findIndex(n => n.id === this.currentId);
        const item = this.list[((idx < 0 ? 0 : idx) + 1) % this.list.length];
        if (item) this.show(item.id, true, false);
    },

    show(id, animate = true, resetTimer = true) {
        const item = this.list.find(n => n.id === id);
        if (!item) return;
        if (!animate) {
            this.currentId = item.id;
            this.render();
            this.reveal();
            if (resetTimer) this.restartRotation();
            this.report();
            return;
        }
        if (this.transitioning) return;
        this.transitioning = true;
        this.container.classList.add('fade-out');
        if (this.fadeTimer) clearTimeout(this.fadeTimer);
        this.fadeTimer = setTimeout(() => {
            this.fadeTimer = null;
            if (!this.list.some(n => n.id === item.id)) { this.transitioning = false; return; }
            this.currentId = item.id;
            this.render();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.container.classList.remove('fade-out');
                this.transitioning = false;
            }));
            if (resetTimer) this.restartRotation();
            this.report();
        }, FADE_MS);
    },

    render() {
        if (!this.container) return;
        const item = this.list.find(n => n.id === this.currentId) || this.list[0];
        if (!item) return;
        this.currentId = item.id;
        const p = getPlatform(item.id);
        const color = item.color;
        const iconFn = p && typeof icons[p.icon] === 'function' ? icons[p.icon] : null;
        const iconSvg = iconFn ? iconFn() : '';

        this.container.style.setProperty('--social-color', color);
        this.container.style.setProperty('--social-glow', `${color}26`);
        this.container.innerHTML = `
<div class="social-icon-wrapper" style="color: ${color}; background: ${color}15; border: 1px solid ${color}25;">${iconSvg}</div>
<div class="social-info">
<div class="social-badge">
<div class="social-dot" style="background: ${color}; box-shadow: 0 0 6px ${color};"></div>
<span style="color: ${color};"></span>
</div>
<span class="social-handle"></span>
</div>`;
        const titleEl = this.container.querySelector('.social-badge span');
        const handleEl = this.container.querySelector('.social-handle');
        if (titleEl) titleEl.textContent = p ? p.title : item.id;
        if (handleEl) handleEl.textContent = item.handle;
    },

    report() {
        const idx = this.list.findIndex(n => n.id === this.currentId);
        WidgetCore.sendAction('SOCIALS_STATE', {
            source: SOURCE,
            id: this.currentId,
            index: idx,
            total: this.list.length,
            interval: this.intervalSec,
            enabled: this.enabled,
            ts: Date.now()
        });
    },

    handleAction(action, payload = {}) {
        if (action === 'SOCIALS_SHOW') {
            if (payload && payload.id) this.show(String(payload.id), true, true);
            return;
        }
        if (action === 'SOCIALS_NEXT') { this.next(); return; }
        if (action === 'SOCIALS_REQUEST_STATE') { this.report(); }
    },

    writeList(list, extra) {
        const networks = serializeNetworks(list);
        WidgetCore.updateWidgetConfig('socials', { networks, ...legacyPatch(networks), ...(extra || {}) });
    },

    handleChat(cmd, args) {
        // Команды приходят и мастеру, и слейвам через шину — пишет только мастер.
        if (!WidgetCore.isMaster) return;
        const conf = { ...(WidgetCore.globalConfig?.widgets?.socials || {}) };
        const list = normalizeNetworks(conf);

        if (cmd === '!socials') {
            const arg = (args[0] || '').toLowerCase();
            const cur = conf.isActive === true || String(conf.isActive) === 'true';
            const next = arg === 'on' ? true : (arg === 'off' ? false : !cur);
            WidgetCore.updateWidgetConfig('socials', { isActive: next });
            console.log(`[Socials] !socials → ${next ? 'включён' : 'выключен'}`);
            return;
        }

        if (cmd === '!socialsint') {
            const n = parseInt(args[0], 10);
            if (isNaN(n)) return;
            const value = Math.max(3, Math.min(600, n));
            WidgetCore.updateWidgetConfig('socials', { interval: value });
            console.log(`[Socials] !socialsint → ${value}s`);
            return;
        }

        const map = { '!stg': 'telegram', '!stt': 'tiktok', '!svk': 'vk' };
        const platformId = map[cmd];
        if (!platformId) return;
        const value = (args || []).join(' ').trim();
        const p = getPlatform(platformId);
        const existing = list.find(n => n.id === platformId);
        if (existing) existing.handle = value;
        else if (value) list.push({ id: platformId, handle: value, color: p.color, enabled: true });
        this.writeList(list);
        console.log(`[Socials] ${cmd} → ${value || 'очищено'}`);
    }
};

WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config?.widgets?.socials) AppSocials.applyConfig(config.widgets.socials);
    },
    onWidgetAction: (action, payload) => AppSocials.handleAction(action, payload),
    onTwitchCommand: (cmd, args) => AppSocials.handleChat(cmd, args)
});

setInterval(() => AppSocials.report(), HEARTBEAT_MS);
console.log(`[Socials] v2 инициализирован (${SOURCE})`);