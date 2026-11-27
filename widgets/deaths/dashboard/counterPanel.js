/* ФАЙЛ: widgets/deaths/dashboard/counterPanel.js — v1 (+1, −1, точное значение, обнуление с возвратом, тест) */

const UNDO_MS = 8000;
const ARM_MS = 3000;

function toInt(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }

export class CounterPanel {
    constructor({ root, store, toast }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.clickHandler = null;
        this.inputHandler = null;
        this.changeHandler = null;
        this.keyHandler = null;
        this.armed = false;
        this.armTimer = null;
        this.undoValue = null;
        this.undoTimer = null;
    }

    mount() {
        this.clickHandler = (e) => this._onClick(e);
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.keyHandler = (e) => {
            if (e.key === 'Enter' && e.target && e.target.id === 'dd-count-input') {
                e.preventDefault();
                e.target.blur();
            }
        };
        this.root.addEventListener('click', this.clickHandler);
        this.root.addEventListener('input', this.inputHandler);
        this.root.addEventListener('change', this.changeHandler);
        this.root.addEventListener('keydown', this.keyHandler);
    }

    unmount() {
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
        if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
        if (this.keyHandler) this.root.removeEventListener('keydown', this.keyHandler);
        if (this.armTimer) clearTimeout(this.armTimer);
        if (this.undoTimer) clearTimeout(this.undoTimer);
        this.armed = false;
        this.undoValue = null;
    }

    _count() {
        return Math.max(0, toInt(this.store.getState().config.widgets.deaths?.deathsCount, 0));
    }

    _write(value) {
        const next = Math.max(0, Math.min(99999, toInt(value, 0)));
        try {
            // Меняем ТОЛЬКО счёт: мастер-тумблер остаётся как есть.
            this.store.updateConfig({ widgets: { deaths: { deathsCount: next } } });
        } catch (e) {
            console.error('[DeathsCounter] Не удалось сохранить счёт:', e);
            this.toast.error('Счёт не сохранился.');
        }
        return next;
    }

    _disarm() {
        this.armed = false;
        if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
        const btn = document.getElementById('dd-reset');
        if (btn) { btn.classList.remove('is-armed'); btn.innerHTML = btn.dataset.label || btn.innerHTML; }
    }

    _hideUndo() {
        this.undoValue = null;
        if (this.undoTimer) { clearTimeout(this.undoTimer); this.undoTimer = null; }
        const btn = document.getElementById('dd-undo');
        if (btn) btn.classList.add('is-hidden');
    }

    _onClick(e) {
        const t = e.target;

        if (t.closest('#dd-plus')) {
            e.preventDefault();
            const next = this._write(this._count() + 1);
            const btn = document.getElementById('dd-plus');
            if (btn) { btn.classList.remove('is-hit'); void btn.offsetWidth; btn.classList.add('is-hit'); }
            this.toast.show(`Смерть отмечена: ${next}`, 'info');
            return;
        }

        if (t.closest('#dd-minus')) {
            e.preventDefault();
            const current = this._count();
            if (current <= 0) return;
            this._write(current - 1);
            return;
        }

        if (t.closest('#dd-test')) {
            e.preventDefault();
            this.store.broadcastAction('DEATHS_TEST', {});
            this.toast.info('Тестовый удар: тряска и звук, счёт не меняется.');
            return;
        }

        const reset = t.closest('#dd-reset');
        if (reset) {
            e.preventDefault();
            if (!this.armed) {
                const current = this._count();
                if (current === 0) { this.toast.info('Счётчик уже на нуле.'); return; }
                this.armed = true;
                reset.dataset.label = reset.innerHTML;
                reset.classList.add('is-armed');
                reset.textContent = 'Точно обнулить? Нажмите ещё раз';
                this.toast.info('Обнуление счётчика — подтвердите повторным нажатием.');
                if (this.armTimer) clearTimeout(this.armTimer);
                this.armTimer = setTimeout(() => this._disarm(), ARM_MS);
                return;
            }
            const previous = this._count();
            this._disarm();
            this._write(0);
            this.undoValue = previous;
            const undo = document.getElementById('dd-undo');
            const label = document.getElementById('dd-undo-label');
            if (label) label.textContent = `Вернуть ${previous}`;
            if (undo) undo.classList.remove('is-hidden');
            if (this.undoTimer) clearTimeout(this.undoTimer);
            this.undoTimer = setTimeout(() => this._hideUndo(), UNDO_MS);
            this.toast.success(`Счётчик обнулён. Можно вернуть ${previous}.`);
            return;
        }

        if (t.closest('#dd-undo')) {
            e.preventDefault();
            if (this.undoValue === null) return;
            const value = this.undoValue;
            this._hideUndo();
            this._write(value);
            this.toast.success(`Возвращено значение ${value}.`);
        }
    }

    _onInput(e) {
        const t = e.target;
        if (t.id !== 'dd-count-input') return;
        if (t.value === '') return;
        this._write(t.value);
    }

    _onChange(e) {
        const t = e.target;
        if (t.id === 'dd-count-input') {
            t.value = String(this._count());
            return;
        }
        if (t.type === 'checkbox' && t.hasAttribute('data-dd-key') && t.getAttribute('data-dd-key') === 'enabled') {
            this.store.updateConfig({ widgets: { deaths: { enabled: t.checked } } });
            this.toast.show(t.checked ? 'Счётчик показан на стриме.' : 'Счётчик скрыт со стрима.', t.checked ? 'success' : 'info');
            if (!t.checked) this._disarm();
        }
    }

    render(state) {
        const c = state.config.widgets.deaths || {};
        const enabled = c.enabled === true || String(c.enabled) === 'true';
        const count = Math.max(0, toInt(c.deathsCount, 0));

        const input = document.getElementById('dd-count-input');
        if (input && document.activeElement !== input && input.value !== String(count)) input.value = String(count);

        const minus = document.getElementById('dd-minus');
        if (minus) minus.disabled = count <= 0;

        const test = document.getElementById('dd-test');
        if (test) {
            test.disabled = !enabled;
            test.title = enabled ? 'Тряска и звук без изменения счёта' : 'Сначала включите счётчик мастер-тумблером';
        }

        const master = this.root.querySelector('[data-dd-key="enabled"]');
        if (master && document.activeElement !== master && master.checked !== enabled) master.checked = enabled;
    }
}