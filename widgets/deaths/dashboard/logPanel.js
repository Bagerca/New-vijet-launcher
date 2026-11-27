/* ФАЙЛ: widgets/deaths/dashboard/logPanel.js — v1 (реальный журнал изменений счёта + метрики) */
import { icons } from '../../../js/utils/icons.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const STORAGE_KEY = 'dd_deaths_log_v1';
const MAX_ENTRIES = 80;
const ARM_MS = 3000;

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { return '--:--:--'; }
}

function formatGap(sec) {
    if (!isFinite(sec) || sec <= 0) return '—';
    if (sec < 60) return `${Math.round(sec)}с`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}м ${s}с`;
}

export class LogPanel {
    constructor({ root, toast }) {
        this.root = root;
        this.toast = toast;
        this.entries = [];
        this.clickHandler = null;
        this.armed = false;
        this.armTimer = null;
        this._sig = '';
        this.load();
    }

    mount() {
        const panel = this.root.querySelector('.dd-log-panel');
        this.clickHandler = (e) => this._onClick(e);
        if (panel) panel.addEventListener('click', this.clickHandler);
    }

    unmount() {
        const panel = this.root.querySelector('.dd-log-panel');
        if (panel && this.clickHandler) panel.removeEventListener('click', this.clickHandler);
        if (this.armTimer) clearTimeout(this.armTimer);
        this.armed = false;
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            this.entries = parsed
                .filter(e => e && typeof e.ts === 'number' && typeof e.delta === 'number')
                .map(e => ({ ts: e.ts, delta: e.delta, count: Number(e.count) || 0, combo: Number(e.combo) || 0 }))
                .slice(0, MAX_ENTRIES);
            console.log(`[DeathsLog] Загружено записей: ${this.entries.length}`);
        } catch (e) {
            console.warn('[DeathsLog] Журнал не читается, начинаю с пустого:', e);
            this.entries = [];
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries.slice(0, MAX_ENTRIES)));
        } catch (e) {
            console.warn('[DeathsLog] Не удалось сохранить журнал:', e);
        }
    }

    push(entry) {
        if (!entry || !entry.delta) return;
        this.entries.unshift(entry);
        if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
        this.save();
        this.render();
    }

    _disarm() {
        this.armed = false;
        if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
        const btn = document.getElementById('dd-log-clear');
        if (btn) { btn.classList.remove('is-armed'); btn.innerHTML = btn.dataset.label || btn.innerHTML; }
    }

    _onClick(e) {
        const btn = e.target.closest('#dd-log-clear');
        if (!btn) return;
        e.preventDefault();
        if (this.entries.length === 0) { this.toast.info('Журнал уже пуст.'); return; }

        if (!this.armed) {
            this.armed = true;
            btn.dataset.label = btn.innerHTML;
            btn.classList.add('is-armed');
            btn.textContent = 'Точно очистить?';
            this.toast.info('Очистка журнала — подтвердите повторным нажатием.');
            if (this.armTimer) clearTimeout(this.armTimer);
            this.armTimer = setTimeout(() => this._disarm(), ARM_MS);
            return;
        }
        this._disarm();
        this.entries = [];
        this.save();
        this.render();
        this.toast.success('Журнал очищен.');
    }

    stats() {
        const positives = this.entries.filter(e => e.delta > 0);
        const deaths = positives.reduce((sum, e) => sum + e.delta, 0);
        const maxCombo = this.entries.reduce((m, e) => Math.max(m, e.combo || 0), 0);
        let gap = '—';
        if (positives.length >= 2) {
            const sorted = positives.slice().sort((a, b) => a.ts - b.ts);
            let total = 0;
            for (let i = 1; i < sorted.length; i++) total += (sorted[i].ts - sorted[i - 1].ts) / 1000;
            gap = formatGap(total / (sorted.length - 1));
        }
        return { deaths, maxCombo, gap };
    }

    render() {
        const list = document.getElementById('dd-log');
        if (!list) return;

        const { deaths, maxCombo, gap } = this.stats();
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el && el.textContent !== String(value)) el.textContent = String(value);
        };
        set('dd-stat-deaths', deaths);
        set('dd-stat-combo', maxCombo > 1 ? `x${maxCombo}` : '0');
        set('dd-stat-gap', gap);
        set('dd-log-count', this.entries.length);

        const empty = document.getElementById('dd-log-empty');
        if (empty) empty.classList.toggle('is-hidden', this.entries.length > 0);

        const sig = `${this.entries.length}:${this.entries[0]?.ts || 0}`;
        if (sig === this._sig) return;
        this._sig = sig;

        list.innerHTML = this.entries.map(entry => {
            const isReset = entry.delta < 0 && entry.count === 0;
            const kind = entry.delta > 0 ? 'is-up' : (isReset ? 'is-reset' : 'is-down');
            const label = entry.delta > 0 ? `+${entry.delta}` : (isReset ? 'СБРОС' : String(entry.delta));
            const combo = entry.combo > 1 ? `<em class="dd-log-combo">x${entry.combo}</em>` : '';
            return `
<div class="dd-log-row ${kind}">
<span class="dd-log-time">${formatTime(entry.ts)}</span>
<span class="dd-log-delta">${label}</span>
<span class="dd-log-count">→ ${entry.count}</span>
${combo}
</div>`;
        }).join('');

        const scroll = document.getElementById('dd-log-scroll');
        if (scroll) scroll.scrollTop = 0;
    }
}