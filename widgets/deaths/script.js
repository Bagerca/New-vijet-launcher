/* ФАЙЛ: widgets/deaths/script.js — v2 (мастер-тумблер главный, параметризованное оформление, живой сигнал) */
import { WidgetCore } from '../shared/WidgetCore.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get('preview') === '1';
const SOURCE = IS_PREVIEW ? 'preview' : 'obs';
const HEARTBEAT_MS = 4000;
const SOUND_PATH = '../../data/sounds/death.mp3';

function num(value, fallback) {
    const n = parseInt(value, 10);
    return isNaN(n) ? fallback : n;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function isTrue(v) { return v === true || String(v) === 'true'; }

function normalizeHex(value, fallback) {
    let h = String(value || '').trim();
    if (!h) return fallback;
    if (!h.startsWith('#')) h = '#' + h;
    if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
    return /^#[0-9a-f]{6}$/i.test(h) ? h : fallback;
}

function restartAnimation(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

const AppDeaths = {
    container: document.getElementById('deaths-container'),
    countText: document.getElementById('deaths-count'),
    comboEl: document.getElementById('deaths-combo'),
    shakerEl: document.getElementById('deaths-shaker'),
    titleEl: document.querySelector('.deaths-title'),

    count: 0,
    isVisible: false,
    comboCount: 0,
    comboTimer: null,
    _booted: false,

    config: {
        enabled: false,
        color: '#ff0050',
        comboColor: '#ff8c00',
        label: 'DEATHS',
        fontSize: 64,
        shake: 1,
        comboWindow: 8,
        comboThreshold: 2,
        soundEnabled: true,
        soundVolume: 60
    },

    applyConfig(conf) {
        if (!conf || !this.container) return;

        this.config.enabled = isTrue(conf.enabled);
        this.config.color = normalizeHex(conf.color, '#ff0050');
        this.config.comboColor = normalizeHex(conf.comboColor, '#ff8c00');
        this.config.label = String(conf.label ?? 'DEATHS');
        this.config.fontSize = clamp(num(conf.fontSize, 64), 24, 140);
        this.config.shake = clamp(num(conf.shakeIntensity, 100), 0, 100) / 100;
        this.config.comboWindow = clamp(num(conf.comboWindow, 8), 1, 60);
        this.config.comboThreshold = clamp(num(conf.comboThreshold, 2), 2, 20);
        this.config.soundEnabled = conf.soundEnabled === undefined ? true : isTrue(conf.soundEnabled);
        this.config.soundVolume = clamp(num(conf.soundVolume, 60), 0, 100);

        this.applyAppearance();

        const nextCount = Math.max(0, num(conf.deathsCount, 0));
        const delta = nextCount - this.count;
        this.count = nextCount;

        this.setVisible(this.config.enabled);

        if (delta > 0 && this.config.enabled) {
            this.handleHit(delta);
        } else {
            this.render();
        }

        if (delta !== 0 && this._booted) this.reportChange(delta);
        this._booted = true;
        this.report();
    },

    applyAppearance() {
        const root = document.documentElement;
        root.style.setProperty('--death-color', this.config.color);
        root.style.setProperty('--death-glow', `${this.config.color}80`);
        root.style.setProperty('--combo-color', this.config.comboColor);
        root.style.setProperty('--death-size', `${this.config.fontSize}px`);
        root.style.setProperty('--death-shake', String(this.config.shake));
        if (this.titleEl && this.titleEl.textContent !== this.config.label) {
            this.titleEl.textContent = this.config.label;
        }
    },

    setVisible(on) {
        if (on === this.isVisible) return;
        this.isVisible = on;
        if (on) {
            this.container.classList.remove('hidden');
            restartAnimation(this.countText, 'animate-pop-red');
        } else {
            this.container.classList.add('hidden');
            this.clearCombo();
        }
    },

    clearCombo() {
        if (this.comboTimer) { clearTimeout(this.comboTimer); this.comboTimer = null; }
        this.comboCount = 0;
        if (this.comboEl) this.comboEl.classList.remove('combo-in', 'combo-out');
        if (this.container) this.container.classList.remove('has-combo');
    },

    handleHit(delta) {
        restartAnimation(this.shakerEl, 'damage-shake');
        this.comboCount += delta;

        if (this.comboCount >= this.config.comboThreshold) {
            this.comboEl.textContent = `x${this.comboCount} COMBO!`;
            this.comboEl.classList.remove('combo-out');
            restartAnimation(this.comboEl, 'combo-in');
            this.container.classList.add('has-combo');
        }

        if (this.comboTimer) clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => this.clearCombo(), this.config.comboWindow * 1000);

        this.playSound();
        this.render();
        this.pet();
    },

    testHit() {
        if (!this.config.enabled) {
            console.log('[Deaths] Тест пропущен: счётчик скрыт мастер-тумблером.');
            return;
        }
        restartAnimation(this.shakerEl, 'damage-shake');
        restartAnimation(this.countText, 'animate-pop-red');
        this.playSound();
        this.pet();
        this.report();
    },

    playSound() {
        if (!this.config.soundEnabled || this.config.soundVolume <= 0) return;
        if (document.hidden) return;
        try {
            const audio = new Audio(SOUND_PATH);
            audio.volume = this.config.soundVolume / 100;
            audio.play().catch(e => console.warn('[Deaths] Звук не проигрался:', e && e.message));
        } catch (e) {
            console.warn('[Deaths] Не удалось создать звук:', e);
        }
    },

    pet() {
        WidgetCore.sendAction('PET_EMOTION', { emotion: 'scared', duration: 4000 });
    },

    render() {
        if (!this.countText) return;
        const next = String(this.count);
        if (this.countText.textContent !== next) {
            this.countText.textContent = next;
            restartAnimation(this.countText, 'animate-pop-red');
        }
    },

    reportChange(delta) {
        WidgetCore.sendAction('DEATHS_CHANGE', {
            source: SOURCE,
            delta,
            count: this.count,
            combo: this.comboCount,
            ts: Date.now()
        });
    },

    report() {
        WidgetCore.sendAction('DEATHS_STATE', {
            source: SOURCE,
            count: this.count,
            visible: this.config.enabled,
            combo: this.comboCount,
            label: this.config.label,
            ts: Date.now()
        });
    },

    handleAction(action) {
        if (action === 'DEATHS_TEST') { this.testHit(); return; }
        if (action === 'DEATHS_REQUEST_STATE') { this.report(); }
    },

    handleChat(cmd, args) {
        // Команды приходят и мастеру, и слейвам через шину — пишет только мастер.
        if (!WidgetCore.isMaster) return;
        const conf = { ...(WidgetCore.globalConfig?.widgets?.deaths || {}) };
        const current = Math.max(0, num(conf.deathsCount, 0));
        let changed = false;

        if (cmd === '!deathshow') {
            const arg = (args[0] || '').toLowerCase();
            conf.enabled = arg === 'on' || arg === 'show' ? true
                : (arg === 'off' || arg === 'hide' ? false : !isTrue(conf.enabled));
            changed = true;
        } else if (cmd === '!deathset') {
            const value = num(args[0], NaN);
            if (!isNaN(value)) {
                conf.deathsCount = Math.max(0, value);
                conf.enabled = true;
                changed = true;
            }
        } else if (cmd === '!deathc') {
            const color = normalizeHex(args[0], null);
            if (color) { conf.color = color; changed = true; }
        } else if (cmd === '!death' || cmd === '!deaths' || cmd === '!смерть') {
            const arg = (args[0] || '').toLowerCase();
            if (!arg || arg === '+') {
                conf.deathsCount = current + 1;
                conf.enabled = true;
                changed = true;
            } else if (arg === '-' || arg === 'sub') {
                conf.deathsCount = Math.max(0, current - 1);
                changed = true;
            } else if (arg === 'reset' || arg === 'clear') {
                conf.deathsCount = 0;
                changed = true;
            } else if (arg === 'set' && args[1] !== undefined) {
                const value = num(args[1], NaN);
                if (!isNaN(value)) {
                    conf.deathsCount = Math.max(0, value);
                    conf.enabled = true;
                    changed = true;
                }
            } else if (arg === 'on' || arg === 'show') {
                conf.enabled = true; changed = true;
            } else if (arg === 'off' || arg === 'hide') {
                conf.enabled = false; changed = true;
            }
        }

        if (changed) {
            WidgetCore.updateWidgetConfig('deaths', conf);
            console.log(`[Deaths] ${cmd} → счётчик ${conf.deathsCount ?? current}, видимость ${conf.enabled}`);
        }
    }
};

WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config?.widgets?.deaths) AppDeaths.applyConfig(config.widgets.deaths);
    },
    onWidgetAction: (action) => AppDeaths.handleAction(action),
    onTwitchCommand: (cmd, args) => AppDeaths.handleChat(cmd, args)
});

setInterval(() => AppDeaths.report(), HEARTBEAT_MS);
console.log(`[Deaths] v2 инициализирован (${SOURCE})`);