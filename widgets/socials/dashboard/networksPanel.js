/* ФАЙЛ: widgets/socials/dashboard/networksPanel.js — v1 (список платформ: порядок, цвет, ссылка, состав) */
import { icons } from '../../../js/utils/icons.js';
import { PLATFORMS, platformList, getPlatform, normalizeNetworks, serializeNetworks, legacyPatch } from '../networks.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');

export class NetworksPanel {
    constructor({ root, store, toast }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.rows = new Map();
        this.addId = null;
        this.selectOpen = false;
        this.clickHandler = null;
        this.inputHandler = null;
        this.changeHandler = null;
        this.keyHandler = null;
        this.docHandler = null;
        this._optSig = '';
    }

    mount() {
        const panel = this.root.querySelector('.sd-net-panel');
        this.clickHandler = (e) => this._onClick(e);
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.keyHandler = (e) => this._onKey(e);
        this.docHandler = (e) => {
            if (!this.selectOpen) return;
            const t = e.target;
            if (!t || !t.closest || !t.closest('#sd-add-select')) this._closeSelect();
        };
        if (panel) {
            panel.addEventListener('click', this.clickHandler);
            panel.addEventListener('input', this.inputHandler);
            panel.addEventListener('change', this.changeHandler);
            panel.addEventListener('keydown', this.keyHandler);
        }
        document.addEventListener('click', this.docHandler);
    }

    unmount() {
        const panel = this.root.querySelector('.sd-net-panel');
        if (panel) {
            if (this.clickHandler) panel.removeEventListener('click', this.clickHandler);
            if (this.inputHandler) panel.removeEventListener('input', this.inputHandler);
            if (this.changeHandler) panel.removeEventListener('change', this.changeHandler);
            if (this.keyHandler) panel.removeEventListener('keydown', this.keyHandler);
        }
        if (this.docHandler) document.removeEventListener('click', this.docHandler);
        this.rows.clear();
        this.selectOpen = false;
    }

    _list() { return normalizeNetworks(this.store.getState().config.widgets.socials || {}); }

    _write(list, extra) {
        const networks = serializeNetworks(list);
        try {
            this.store.updateConfig({ widgets: { socials: { networks, ...legacyPatch(networks), ...(extra || {}) } } });
        } catch (e) {
            console.error('[SocialsNet] Не удалось сохранить список:', e);
            this.toast.error('Настройка не сохранилась.');
        }
    }

    _onInput(e) {
        const t = e.target;
        const row = t.closest && t.closest('.sd-net-row');
        if (!row) return;
        const id = row.getAttribute('data-id');
        const list = this._list();
        const item = list.find(n => n.id === id);
        if (!item) return;

        if (t.classList.contains('sd-net-handle')) {
            item.handle = t.value;
            this._write(list);
        } else if (t.type === 'color') {
            item.color = t.value;
            const hex = row.querySelector('.sd-net-hex');
            if (hex) hex.textContent = t.value;
            row.style.setProperty('--row-accent', t.value);
            this._write(list);
        }
    }

    _onChange(e) {
        const t = e.target;
        if (t.type !== 'checkbox') return;
        const row = t.closest && t.closest('.sd-net-row');
        if (!row) return;
        const id = row.getAttribute('data-id');
        const list = this._list();
        const item = list.find(n => n.id === id);
        if (!item) return;
        item.enabled = t.checked;
        this._write(list);
        const p = getPlatform(id);
        this.toast.show(`${p ? p.title : id}: ${t.checked ? 'в ротации' : 'выключена'}`, t.checked ? 'success' : 'info');
    }

    _onClick(e) {
        const t = e.target;

        if (t.closest('#sd-add-btn')) {
            e.preventDefault();
            if (this.selectOpen) this._closeSelect(); else this._openSelect();
            return;
        }

        const opt = t.closest('.sd-select-opt');
        if (opt) {
            e.preventDefault();
            this.addId = opt.getAttribute('data-value');
            this._syncSelect();
            this._closeSelect();
            const btn = document.getElementById('sd-add-btn');
            if (btn) btn.focus();
            return;
        }

        if (t.closest('#sd-add-confirm')) {
            e.preventDefault();
            this._addPlatform();
            return;
        }

        const row = t.closest('.sd-net-row');
        if (!row) return;
        const id = row.getAttribute('data-id');
        const list = this._list();
        const idx = list.findIndex(n => n.id === id);
        if (idx < 0) return;

        if (t.closest('.sd-net-up')) {
            e.preventDefault();
            if (idx === 0) return;
            const [item] = list.splice(idx, 1);
            list.splice(idx - 1, 0, item);
            this._write(list);
            return;
        }

        if (t.closest('.sd-net-down')) {
            e.preventDefault();
            if (idx >= list.length - 1) return;
            const [item] = list.splice(idx, 1);
            list.splice(idx + 1, 0, item);
            this._write(list);
            return;
        }

        if (t.closest('.sd-net-remove')) {
            e.preventDefault();
            const p = getPlatform(id);
            list.splice(idx, 1);
            this._write(list);
            this.toast.info(`${p ? p.title : id} убрана из ротации.`);
            return;
        }

        if (t.closest('.sd-net-brand')) {
            e.preventDefault();
            const item = list[idx];
            const p = getPlatform(id);
            if (!item || !p) return;
            item.color = p.color;
            this._write(list);
            this.toast.info(`Цвет ${p.title} возвращён к фирменному.`);
        }
    }

    _onKey(e) {
        const inSelect = e.target && e.target.closest && e.target.closest('#sd-add-select');
        if (inSelect) {
            const btn = document.getElementById('sd-add-btn');
            const pop = document.getElementById('sd-add-pop');
            const opts = pop ? Array.from(pop.querySelectorAll('.sd-select-opt')) : [];
            if (e.key === 'Escape') {
                if (this.selectOpen) { e.preventDefault(); this._closeSelect(); if (btn) btn.focus(); }
                return;
            }
            if (e.target === btn) {
                if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                    e.preventDefault();
                    this._openSelect();
                    const active = opts.find(o => o.classList.contains('is-active')) || opts[0];
                    if (active) active.focus();
                }
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const i = opts.indexOf(document.activeElement);
                const next = e.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1);
                if (opts[next]) opts[next].focus();
            } else if (e.key === 'Tab') {
                this._closeSelect();
            }
            return;
        }

        if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('sd-net-handle')) {
            e.preventDefault();
            e.target.blur();
        }
    }

    _available() {
        const used = new Set(this._list().map(n => n.id));
        return platformList().filter(p => !used.has(p.id));
    }

    _addPlatform() {
        const avail = this._available();
        if (avail.length === 0) { this.toast.info('Все платформы уже добавлены.'); return; }
        const p = avail.find(x => x.id === this.addId) || avail[0];
        const list = this._list();
        list.push({ id: p.id, handle: '', color: p.color, enabled: true });
        this._write(list);
        this.addId = null;
        this.toast.success(`${p.title} добавлена — заполните ссылку.`);
        setTimeout(() => {
            const input = this.root.querySelector(`.sd-net-row[data-id="${p.id}"] .sd-net-handle`);
            if (input) { input.focus(); input.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        }, 60);
    }

    _openSelect() {
        const root = document.getElementById('sd-add-select');
        const pop = document.getElementById('sd-add-pop');
        const btn = document.getElementById('sd-add-btn');
        if (!root || !pop || !btn || btn.disabled) return;
        this.selectOpen = true;
        root.classList.add('is-open');
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }

    _closeSelect() {
        const root = document.getElementById('sd-add-select');
        const pop = document.getElementById('sd-add-pop');
        const btn = document.getElementById('sd-add-btn');
        this.selectOpen = false;
        if (root) root.classList.remove('is-open');
        if (pop) pop.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    _syncSelect() {
        const avail = this._available();
        const btn = document.getElementById('sd-add-btn');
        const val = document.getElementById('sd-add-val');
        const pop = document.getElementById('sd-add-pop');
        const confirm = document.getElementById('sd-add-confirm');
        if (!avail.some(p => p.id === this.addId)) this.addId = avail[0] ? avail[0].id : null;
        const current = avail.find(p => p.id === this.addId) || null;

        if (val) val.textContent = current ? current.title : 'Все добавлены';
        if (btn) btn.disabled = avail.length === 0;
        if (confirm) confirm.disabled = avail.length === 0;

        const sig = avail.map(p => p.id).join('|') + '#' + this.addId;
        if (pop && sig !== this._optSig) {
            this._optSig = sig;
            pop.innerHTML = avail.map(p => `
<button class="sd-select-opt ${p.id === this.addId ? 'is-active' : ''}" type="button" role="option" data-value="${p.id}" aria-selected="${p.id === this.addId}" style="--opt-accent:${p.color}">
<span class="sd-select-ic">${ic(p.icon)}</span><span>${p.title}</span>
</button>`).join('');
        }
    }

    _makeRow(item) {
        const p = getPlatform(item.id);
        const el = document.createElement('article');
        el.className = 'sd-net-row';
        el.setAttribute('data-id', item.id);
        el.innerHTML = `
<div class="sd-net-top">
<span class="sd-net-num"></span>
<button class="sd-net-brand" type="button" title="Вернуть фирменный цвет">${ic(p.icon)}</button>
<span class="sd-net-name"></span>
<label class="sd-toggle sd-toggle-mini" title="Участвует в ротации">
<input type="checkbox" class="sd-net-enabled">
<div class="sd-track"></div>
</label>
<button class="sd-mini-btn sd-net-up" type="button" title="Выше">${ic('chevronUp')}</button>
<button class="sd-mini-btn sd-net-down" type="button" title="Ниже">${ic('chevronDown')}</button>
<button class="sd-mini-btn is-danger sd-net-remove" type="button" title="Убрать платформу">${ic('trash')}</button>
</div>
<div class="sd-net-bottom">
<input type="text" class="sd-net-handle" placeholder="${p.placeholder}" aria-label="Ссылка ${p.title}">
<span class="sd-net-hex"></span>
<input type="color" class="sd-net-color" aria-label="Цвет ${p.title}">
</div>
<div class="sd-net-hint"></div>`;
        const nameEl = el.querySelector('.sd-net-name');
        if (nameEl) nameEl.textContent = p.title;
        const hintEl = el.querySelector('.sd-net-hint');
        if (hintEl) hintEl.textContent = p.hint;
        return el;
    }

    _updateRow(el, item, index, total, liveId) {
        const p = getPlatform(item.id);
        el.style.setProperty('--row-accent', item.color);
        el.classList.toggle('is-off', !item.enabled);
        el.classList.toggle('is-empty', !item.handle);
        el.classList.toggle('is-live', item.id === liveId && item.enabled && !!item.handle);

        const num = el.querySelector('.sd-net-num');
        if (num) num.textContent = String(index + 1).padStart(2, '0');

        const enabled = el.querySelector('.sd-net-enabled');
        if (enabled && document.activeElement !== enabled && enabled.checked !== item.enabled) enabled.checked = item.enabled;

        const handle = el.querySelector('.sd-net-handle');
        if (handle && document.activeElement !== handle && handle.value !== item.handle) handle.value = item.handle;

        const color = el.querySelector('.sd-net-color');
        if (color && document.activeElement !== color && color.value !== item.color) color.value = item.color;

        const hex = el.querySelector('.sd-net-hex');
        if (hex && hex.textContent !== item.color) hex.textContent = item.color;

        const up = el.querySelector('.sd-net-up');
        const down = el.querySelector('.sd-net-down');
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index >= total - 1;

        const brand = el.querySelector('.sd-net-brand');
        if (brand) brand.title = item.color.toLowerCase() === p.color.toLowerCase() ? 'Фирменный цвет' : 'Вернуть фирменный цвет';
    }

    render(state) {
        const listEl = document.getElementById('sd-net-list');
        if (!listEl) return;
        const c = state.config.widgets.socials || {};
        const list = normalizeNetworks(c);
        const activeCount = list.filter(n => n.enabled && n.handle).length;

        const count = document.getElementById('sd-net-count');
        if (count) count.textContent = `${activeCount} / ${list.length}`;

        const empty = document.getElementById('sd-net-empty');
        if (empty) empty.classList.toggle('is-hidden', list.length > 0);

        let liveId = null;
        const nowTitle = document.getElementById('sd-now-title');
        if (nowTitle) {
            const found = list.find(n => (getPlatform(n.id) || {}).title === nowTitle.textContent);
            if (found) liveId = found.id;
        }

        const seen = new Set();
        let cursor = listEl.firstElementChild;
        list.forEach((item, index) => {
            seen.add(item.id);
            let el = this.rows.get(item.id);
            if (!el || !el.isConnected) {
                el = this._makeRow(item);
                this.rows.set(item.id, el);
            }
            this._updateRow(el, item, index, list.length, liveId);
            if (el === cursor) cursor = cursor.nextElementSibling;
            else listEl.insertBefore(el, cursor);
        });
        for (const [id, el] of this.rows) {
            if (!seen.has(id)) { el.remove(); this.rows.delete(id); }
        }

        this._syncSelect();
    }
}