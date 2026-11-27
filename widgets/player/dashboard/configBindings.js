/* ФАЙЛ: widgets/player/dashboard/configBindings.js — v6 (заливка ползунков + синхронизация) */
import { paintRange } from '../../../js/utils/rangeFill.js';

export class ConfigBindings {
    constructor({ root, store, onAfterChange }) {
        this.root = root;
        this.store = store;
        this.onAfterChange = onAfterChange;
        this.inputHandler = null;
        this.changeHandler = null;
        this.unsub = null;
        this.lastJson = '';
    }

    mount() {
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.root.addEventListener('input', this.inputHandler);
        this.root.addEventListener('change', this.changeHandler);
        this.unsub = this.store.subscribe((state) => this.sync(state));
    }

    unmount() {
        if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
        if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
        if (this.unsub) this.unsub();
    }

    _onInput(e) {
        const t = e.target;
        if (!t.hasAttribute || !t.hasAttribute('data-pd-key')) return;
        const key = t.getAttribute('data-pd-key');
        if (t.type === 'range') {
            const lbl = document.getElementById(`val-player-${key}`);
            if (lbl) lbl.textContent = `${t.value}%`;
            paintRange(t);
            this.store.updateConfig({ widgets: { player: { [key]: Number(t.value) } } });
        } else if (t.type === 'color') {
            const hex = document.getElementById('pd-color-hex');
            if (hex) hex.textContent = t.value;
            const stage = document.getElementById('pd-stage');
            if (stage) stage.style.borderColor = t.value;
            this.store.updateConfig({ widgets: { player: { [key]: t.value } } });
        }
    }

    _onChange(e) {
        const t = e.target;
        if (!t.hasAttribute || !t.hasAttribute('data-pd-key')) return;
        if (t.type === 'checkbox') {
            this.store.updateConfig({ widgets: { player: { [t.getAttribute('data-pd-key')]: t.checked } } });
            if (this.onAfterChange) this.onAfterChange();
        }
    }

    sync(state) {
        const c = state.config.widgets.player || {};
        const json = JSON.stringify(c);
        if (json === this.lastJson) return;
        this.lastJson = json;
        this.root.querySelectorAll('[data-pd-key]').forEach(input => {
            try {
                const key = input.getAttribute('data-pd-key');
                const val = c[key];
                if (val === undefined) return;
                const focused = document.activeElement === input;
                if (input.type === 'checkbox') {
                    if (focused) return;
                    const checked = val === true || String(val) === 'true';
                    if (input.checked !== checked) input.checked = checked;
                } else if (input.type === 'range') {
                    if (!focused && input.value !== String(val)) {
                        input.value = val;
                        const lbl = document.getElementById(`val-player-${key}`);
                        if (lbl) lbl.textContent = `${val}%`;
                    }
                    // Красим всегда: и при программной синхронизации, и при первом монтировании.
                    paintRange(input);
                } else if (input.type === 'color') {
                    if (focused) return;
                    if (input.value !== String(val)) {
                        input.value = val;
                        const hex = document.getElementById('pd-color-hex');
                        if (hex) hex.textContent = val;
                        const stage = document.getElementById('pd-stage');
                        if (stage) stage.style.borderColor = val;
                    }
                }
            } catch (err) {
                console.warn('[Dash:config] Ошибка синхронизации поля:', err);
            }
        });
    }
}