/* ФАЙЛ: widgets/deaths/dashboard/tuningPanel.js — v1 (8 живых параметров оформления и поведения) */
import { icons } from '../../../js/utils/icons.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const BRAND_COLOR = '#ff0050';
const BRAND_COMBO = '#ff8c00';

async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (e) {
        console.warn('[DeathsTuning] Clipboard API недоступен, пробую fallback:', e);
    }
    let ta = null;
    try {
        ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, value.length);
        return document.execCommand('copy');
    } catch (e) {
        console.error('[DeathsTuning] Копирование не удалось:', e);
        return false;
    } finally {
        if (ta && ta.parentNode) ta.remove();
    }
}

function toInt(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export class TuningPanel {
    constructor({ root, store, toast }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.inputHandler = null;
        this.changeHandler = null;
        this.clickHandler = null;
        this.chipTimers = new Map();
    }

    mount() {
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.clickHandler = (e) => this._onClick(e);
        this.root.addEventListener('input', this.inputHandler);
        this.root.addEventListener('change', this.changeHandler);
        this.root.addEventListener('click', this.clickHandler);
    }

    unmount() {
        if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
        if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        for (const t of this.chipTimers.values()) clearTimeout(t);
        this.chipTimers.clear();
    }

    _set(patch) {
        try {
            this.store.updateConfig({ widgets: { deaths: patch } });
        } catch (e) {
            console.error('[DeathsTuning] Не удалось сохранить настройку:', e);
            this.toast.error('Настройка не сохранилась.');
        }
    }

    _paint(input) {
        if (!input) return;
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const val = Number(input.value);
        const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
        input.style.setProperty('--range-fill', `${clamp(pct, 0, 100).toFixed(2)}%`);
    }

    _onInput(e) {
        const t = e.target;

        if (t.id === 'dd-font') {
            const v = clamp(toInt(t.value, 64), 24, 140);
            this._paint(t);
            const num = document.getElementById('dd-font-num');
            if (num && document.activeElement !== num) num.value = String(v);
            this._set({ fontSize: v });
            return;
        }
        if (t.id === 'dd-font-num') {
            if (t.value === '') return;
            const v = clamp(toInt(t.value, 64), 24, 140);
            const range = document.getElementById('dd-font');
            if (range) { range.value = String(v); this._paint(range); }
            this._set({ fontSize: v });
            return;
        }
        if (t.id === 'dd-shake') {
            const v = clamp(toInt(t.value, 100), 0, 100);
            this._paint(t);
            const lbl = document.getElementById('dd-shake-val');
            if (lbl) lbl.textContent = `${v}%`;
            this._set({ shakeIntensity: v });
            return;
        }
        if (t.id === 'dd-window') {
            const v = clamp(toInt(t.value, 8), 1, 60);
            this._paint(t);
            const num = document.getElementById('dd-window-num');
            if (num && document.activeElement !== num) num.value = String(v);
            this._set({ comboWindow: v });
            return;
        }
        if (t.id === 'dd-window-num') {
            if (t.value === '') return;
            const v = clamp(toInt(t.value, 8), 1, 60);
            const range = document.getElementById('dd-window');
            if (range) { range.value = String(Math.min(30, v)); this._paint(range); }
            this._set({ comboWindow: v });
            return;
        }
        if (t.id === 'dd-volume') {
            const v = clamp(toInt(t.value, 60), 0, 100);
            this._paint(t);
            const lbl = document.getElementById('dd-volume-val');
            if (lbl) lbl.textContent = `${v}%`;
            this._set({ soundVolume: v });
            return;
        }

        if (!t.hasAttribute || !t.hasAttribute('data-dd-key')) return;
        const key = t.getAttribute('data-dd-key');
        if (t.type === 'color') {
            const hex = document.getElementById(key === 'color' ? 'dd-color-hex' : 'dd-combo-hex');
            if (hex) hex.textContent = t.value;
            this._set({ [key]: t.value });
        } else if (t.type === 'text') {
            this._set({ [key]: t.value });
        }
    }

    _onChange(e) {
        const t = e.target;
        if (t.id === 'dd-font-num') { t.value = String(clamp(toInt(t.value, 64), 24, 140)); this._set({ fontSize: Number(t.value) }); return; }
        if (t.id === 'dd-window-num') { t.value = String(clamp(toInt(t.value, 8), 1, 60)); this._set({ comboWindow: Number(t.value) }); return; }
        if (t.type === 'checkbox' && t.hasAttribute('data-dd-key')) {
            const key = t.getAttribute('data-dd-key');
            if (key === 'enabled') return; // мастер-тумблер обрабатывает counterPanel
            this._set({ [key]: t.checked });
            if (key === 'soundEnabled') this.toast.show(t.checked ? 'Звук смерти включён.' : 'Звук смерти выключен.', t.checked ? 'success' : 'info');
        }
    }

    _onClick(e) {
        const t = e.target;

        const chip = t.closest('.dd-chip');
        if (chip) { e.preventDefault(); this._copyChip(chip); return; }

        if (t.closest('#dd-color-brand')) {
            e.preventDefault();
            this._set({ color: BRAND_COLOR });
            this.toast.info('Цвет счётчика возвращён к фирменному.');
            return;
        }
        if (t.closest('#dd-combo-brand')) {
            e.preventDefault();
            this._set({ comboColor: BRAND_COMBO });
            this.toast.info('Цвет комбо возвращён к фирменному.');
            return;
        }

        const c = this.store.getState().config.widgets.deaths || {};
        const threshold = clamp(toInt(c.comboThreshold, 2), 2, 20);

        if (t.closest('#dd-th-minus')) {
            e.preventDefault();
            if (threshold <= 2) return;
            this._set({ comboThreshold: threshold - 1 });
            return;
        }
        if (t.closest('#dd-th-plus')) {
            e.preventDefault();
            if (threshold >= 20) return;
            this._set({ comboThreshold: threshold + 1 });
            return;
        }

        if (t.closest('#dd-widget-reset')) {
            e.preventDefault();
            this.store.resetWidgetToDefaults('deaths');
            this.toast.success('Настройки счётчика сброшены.');
        }
    }

    async _copyChip(chip) {
        const text = chip.getAttribute('data-copy') || '';
        const ok = await copyText(text);
        if (!ok) { this.toast.error(`Не удалось скопировать. Команда: ${text}`); return; }
        this.toast.success(`Скопировано: ${text}`);
        const iconEl = chip.querySelector('.dd-chip-ic');
        if (iconEl) iconEl.innerHTML = ic('check');
        chip.classList.add('is-copied');
        const old = this.chipTimers.get(chip);
        if (old) clearTimeout(old);
        this.chipTimers.set(chip, setTimeout(() => {
            this.chipTimers.delete(chip);
            if (!chip.isConnected) return;
            chip.classList.remove('is-copied');
            const el = chip.querySelector('.dd-chip-ic');
            if (el) el.innerHTML = ic('copy');
        }, 1400));
    }

    render(state) {
        const c = state.config.widgets.deaths || {};
        const fontSize = clamp(toInt(c.fontSize, 64), 24, 140);
        const shake = clamp(toInt(c.shakeIntensity, 100), 0, 100);
        const win = clamp(toInt(c.comboWindow, 8), 1, 60);
        const threshold = clamp(toInt(c.comboThreshold, 2), 2, 20);
        const volume = clamp(toInt(c.soundVolume, 60), 0, 100);
        const soundOn = c.soundEnabled === undefined ? true : (c.soundEnabled === true || String(c.soundEnabled) === 'true');

        const pairs = [
            ['dd-font', 'dd-font-num', fontSize, 24, 140],
            ['dd-window', 'dd-window-num', win, 1, 30]
        ];
        pairs.forEach(([rangeId, numId, value, min, max]) => {
            const range = document.getElementById(rangeId);
            if (range && document.activeElement !== range) {
                const v = String(clamp(value, min, max));
                if (range.value !== v) range.value = v;
                this._paint(range);
            }
            const num = document.getElementById(numId);
            if (num && document.activeElement !== num && num.value !== String(value)) num.value = String(value);
        });

        const shakeEl = document.getElementById('dd-shake');
        if (shakeEl && document.activeElement !== shakeEl) {
            if (shakeEl.value !== String(shake)) shakeEl.value = String(shake);
            this._paint(shakeEl);
        }
        const shakeVal = document.getElementById('dd-shake-val');
        if (shakeVal) shakeVal.textContent = `${shake}%`;

        const volEl = document.getElementById('dd-volume');
        if (volEl && document.activeElement !== volEl) {
            if (volEl.value !== String(volume)) volEl.value = String(volume);
            this._paint(volEl);
        }
        const volVal = document.getElementById('dd-volume-val');
        if (volVal) volVal.textContent = `${volume}%`;
        const volRow = document.getElementById('dd-volume-row');
        if (volRow) volRow.classList.toggle('is-muted', !soundOn);
        if (volEl) volEl.disabled = !soundOn;

        const thVal = document.getElementById('dd-th-val');
        if (thVal) thVal.textContent = String(threshold);
        const thMinus = document.getElementById('dd-th-minus');
        const thPlus = document.getElementById('dd-th-plus');
        if (thMinus) thMinus.disabled = threshold <= 2;
        if (thPlus) thPlus.disabled = threshold >= 20;

        const colors = [
            ['dd-color', 'dd-color-hex', c.color || BRAND_COLOR],
            ['dd-combo-color', 'dd-combo-hex', c.comboColor || BRAND_COMBO]
        ];
        colors.forEach(([inputId, hexId, value]) => {
            const input = document.getElementById(inputId);
            if (input && document.activeElement !== input && input.value !== String(value)) input.value = String(value);
            const hex = document.getElementById(hexId);
            if (hex && hex.textContent !== String(value)) hex.textContent = String(value);
        });

        this.root.querySelectorAll('[data-dd-key]').forEach(input => {
            const key = input.getAttribute('data-dd-key');
            if (key === 'enabled' || key === 'color' || key === 'comboColor') return;
            const val = c[key];
            if (val === undefined || document.activeElement === input) return;
            if (input.type === 'checkbox') {
                const checked = val === true || String(val) === 'true';
                if (input.checked !== checked) input.checked = checked;
            } else if (input.type === 'text') {
                if (input.value !== String(val)) input.value = String(val);
            }
        });
    }
}