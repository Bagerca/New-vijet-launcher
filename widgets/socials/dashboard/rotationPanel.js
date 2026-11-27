/* ФАЙЛ: widgets/socials/dashboard/rotationPanel.js — v1 (интервал, порядок, живой цикл, команды) */
import { icons } from '../../../js/utils/icons.js';
import { activeNetworks, getPlatform, intervalFrom, defaultNetworks } from '../networks.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');

async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (e) {
        console.warn('[SocialsRotation] Clipboard API недоступен, пробую fallback:', e);
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
        console.error('[SocialsRotation] Копирование не удалось:', e);
        return false;
    } finally {
        if (ta && ta.parentNode) ta.remove();
    }
}

export class RotationPanel {
    constructor({ root, store, toast }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.live = null;
        this.raf = null;
        this.clickHandler = null;
        this.inputHandler = null;
        this.changeHandler = null;
        this.chipTimers = new Map();
        this._orderSig = '';
    }

    mount() {
        this.clickHandler = (e) => this._onClick(e);
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.root.addEventListener('click', this.clickHandler);
        this.root.addEventListener('input', this.inputHandler);
        this.root.addEventListener('change', this.changeHandler);
        const loop = () => { this._tickCycle(); this.raf = requestAnimationFrame(loop); };
        this.raf = requestAnimationFrame(loop);
    }

    unmount() {
        if (this.raf) cancelAnimationFrame(this.raf);
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
        if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
        for (const t of this.chipTimers.values()) clearTimeout(t);
        this.chipTimers.clear();
    }

    _paint(input) {
        if (!input) return;
        const min = Number(input.min || 3);
        const max = Number(input.max || 120);
        const val = Number(input.value);
        const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
        input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, pct)).toFixed(2)}%`);
    }

    _setInterval(value) {
        const n = parseInt(value, 10);
        if (isNaN(n)) return;
        const clamped = Math.max(3, Math.min(600, n));
        this.store.updateConfig({ widgets: { socials: { interval: clamped } } });
    }

    _onInput(e) {
        const t = e.target;
        if (t.id === 'sd-interval') {
            this._paint(t);
            const num = document.getElementById('sd-interval-num');
            if (num && document.activeElement !== num) num.value = t.value;
            this._setInterval(t.value);
        } else if (t.id === 'sd-interval-num') {
            const n = parseInt(t.value, 10);
            if (isNaN(n)) return;
            const clamped = Math.max(3, Math.min(600, n));
            const range = document.getElementById('sd-interval');
            if (range) { range.value = String(Math.max(3, Math.min(120, clamped))); this._paint(range); }
            this._setInterval(clamped);
        }
    }

    _onChange(e) {
        const t = e.target;
        if (t.id === 'sd-interval-num') {
            const n = Math.max(3, Math.min(600, parseInt(t.value, 10) || 30));
            t.value = String(n);
            this._setInterval(n);
        }
        if (t.hasAttribute && t.hasAttribute('data-sd-key') && t.type === 'checkbox') {
            this.store.updateConfig({ widgets: { socials: { [t.getAttribute('data-sd-key')]: t.checked } } });
            this.toast.show(t.checked ? 'Ротатор показан на стриме.' : 'Ротатор скрыт со стрима.', t.checked ? 'success' : 'info');
        }
    }

    _onClick(e) {
        const t = e.target;

        const chip = t.closest('.sd-chip');
        if (chip) { e.preventDefault(); this._copyChip(chip); return; }

        if (t.closest('#sd-next')) {
            e.preventDefault();
            this.store.broadcastAction('SOCIALS_NEXT', {});
            this.toast.info('Переключаю на следующую соцсеть.');
            return;
        }

        const show = t.closest('.sd-order-show');
        if (show) {
            e.preventDefault();
            const id = show.getAttribute('data-id');
            this.store.broadcastAction('SOCIALS_SHOW', { id });
            const p = getPlatform(id);
            this.toast.success(`Показываю ${p ? p.title : id}.`);
            return;
        }

        if (t.closest('#sd-reset')) {
            e.preventDefault();
            const manifest = this.store.getState().widgetsManifest.find(w => w.id === 'socials');
            const def = {};
            if (manifest) manifest.controls.forEach(c => { if (c.type !== 'button') def[c.key] = c.default; });
            const networks = defaultNetworks(def);
            this.store.updateConfig({ widgets: { socials: { ...def, networks } } });
            this.toast.success('Настройки ротатора сброшены.');
        }
    }

    async _copyChip(chip) {
        const text = chip.getAttribute('data-copy') || '';
        const ok = await copyText(text);
        if (!ok) { this.toast.error(`Не удалось скопировать. Команда: ${text}`); return; }
        this.toast.success(`Скопировано: ${text}`);
        const iconEl = chip.querySelector('.sd-chip-ic');
        if (iconEl) iconEl.innerHTML = ic('check');
        chip.classList.add('is-copied');
        const old = this.chipTimers.get(chip);
        if (old) clearTimeout(old);
        this.chipTimers.set(chip, setTimeout(() => {
            this.chipTimers.delete(chip);
            if (!chip.isConnected) return;
            chip.classList.remove('is-copied');
            const el = chip.querySelector('.sd-chip-ic');
            if (el) el.innerHTML = ic('copy');
        }, 1400));
    }

    _tickCycle() {
        const fill = document.getElementById('sd-cycle-fill');
        const left = document.getElementById('sd-cycle-left');
        if (!fill || !left) return;
        const live = this.live;
        if (!live || !live.enabled || live.total < 2 || !live.interval) {
            fill.style.width = '0%';
            const text = live && live.total < 2 ? 'ротация не нужна' : 'нет сигнала';
            if (left.textContent !== text) left.textContent = text;
            return;
        }
        const elapsed = (Date.now() - live.ts) / 1000;
        const ratio = Math.max(0, Math.min(1, elapsed / live.interval));
        fill.style.width = `${(ratio * 100).toFixed(2)}%`;
        const rest = Math.max(0, Math.ceil(live.interval - elapsed));
        const text = `смена через ${rest} с`;
        if (left.textContent !== text) left.textContent = text;
    }

    render(state, live) {
        this.live = live;
        const c = state.config.widgets.socials || {};
        const interval = intervalFrom(c);
        const list = activeNetworks(c);

        const range = document.getElementById('sd-interval');
        if (range && document.activeElement !== range) {
            const v = String(Math.max(3, Math.min(120, interval)));
            if (range.value !== v) range.value = v;
            this._paint(range);
        }
        const num = document.getElementById('sd-interval-num');
        if (num && document.activeElement !== num && num.value !== String(interval)) num.value = String(interval);

        const master = this.root.querySelector('[data-sd-key="isActive"]');
        if (master && document.activeElement !== master) {
            const on = c.isActive === true || String(c.isActive) === 'true';
            if (master.checked !== on) master.checked = on;
        }

        const next = document.getElementById('sd-next');
        if (next) next.disabled = list.length < 2;

        const orderEl = document.getElementById('sd-order');
        const emptyEl = document.getElementById('sd-order-empty');
        if (emptyEl) emptyEl.classList.toggle('is-hidden', list.length > 0);
        if (!orderEl) return;

        const liveId = live && live.id ? live.id : null;
        const sig = JSON.stringify([list.map(n => [n.id, n.handle, n.color]), liveId]);
        if (sig === this._orderSig) return;
        this._orderSig = sig;

        orderEl.innerHTML = list.map((n, i) => {
            const p = getPlatform(n.id);
            const isLive = n.id === liveId;
            return `
<div class="sd-order-row ${isLive ? 'is-live' : ''}" style="--row-accent:${n.color}">
<span class="sd-order-num">${String(i + 1).padStart(2, '0')}</span>
<span class="sd-order-ic">${ic(p ? p.icon : 'globe')}</span>
<span class="sd-order-body">
<span class="sd-order-title">${p ? p.title : n.id}${isLive ? '<em class="sd-order-flag">В ЭФИРЕ</em>' : ''}</span>
<span class="sd-order-handle"></span>
</span>
<button class="sd-mini-btn sd-order-show" type="button" data-id="${n.id}" title="Показать сейчас">${ic('play')}</button>
</div>`;
        }).join('');
        list.forEach((n, i) => {
            const row = orderEl.children[i];
            if (!row) return;
            const handle = row.querySelector('.sd-order-handle');
            if (handle) handle.textContent = n.handle;
        });
    }
}