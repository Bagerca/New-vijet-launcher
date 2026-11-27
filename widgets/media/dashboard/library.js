/* ФАЙЛ: widgets/media/dashboard/library.js — v2 (только Игры/Кино, собственный select, без двойных кликов) */
import { MediaLibrary } from '../media-db.js';
import { icons } from '../../../js/utils/icons.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');

export const SORT_OPTIONS = [
    { id: 'title', label: 'А → Я' },
    { id: 'title-desc', label: 'Я → А' },
    { id: 'id', label: 'По ID' }
];

const CATEGORIES = ['game', 'series'];

export function normalizeCover(path) {
    const s = String(path || '').trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    return s.replace(/^\/+/, '');
}

export function youTubeId(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/|v\/)([\w-]{11})/);
    if (m) return m[1];
    if (/^[\w-]{11}$/.test(s)) return s;
    return null;
}

export function libraryEntries() {
    try {
        return Object.entries(MediaLibrary).map(([id, e]) => ({
            id,
            title: e.title || id,
            cover: e.cover || '',
            themeColor: e.themeColor || '#ff007f',
            type: e.type === 'series' ? 'series' : 'game',
            meta: Array.isArray(e.meta) ? e.meta : []
        }));
    } catch (e) {
        console.error('[MediaLib] Библиотека недоступна:', e);
        return [];
    }
}

function initialsOf(title) {
    const words = String(title || '').split(' ').filter(Boolean);
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return String(title || '??').substring(0, 2).toUpperCase();
}

function normCat(value) { return CATEGORIES.includes(value) ? value : 'game'; }
function normSort(value) { return SORT_OPTIONS.some(s => s.id === value) ? value : 'title'; }

export class LibraryController {
    constructor({ root, store, toast, params, onPick, onHash }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.onPick = onPick;
        this.onHash = onHash;
        this.entries = libraryEntries();
        this.filter = '';
        this.cat = normCat(params?.cat);
        this.sort = normSort(params?.sort);
        this.rows = new Map();
        this.sortOpen = false;
        this.clickHandler = null;
        this.keyHandler = null;
        this.searchHandler = null;
        this.docHandler = null;
    }

    mount() {
        const panel = this.root.querySelector('.md-lib-panel');
        const search = document.getElementById('md-lib-search');

        this.clickHandler = (e) => this._onClick(e);
        this.keyHandler = (e) => this._onKey(e);
        this.searchHandler = (e) => { this.filter = e.target.value; this.render(this.store.getState()); };
        this.docHandler = (e) => {
            if (!this.sortOpen) return;
            const t = e.target;
            if (!t || !t.closest || !t.closest('#md-sort')) this._closeSort();
        };

        // Один слушатель на всю панель — карточки не получают двойной клик.
        if (panel) {
            panel.addEventListener('click', this.clickHandler);
            panel.addEventListener('keydown', this.keyHandler);
        }
        if (search) search.addEventListener('input', this.searchHandler);
        document.addEventListener('click', this.docHandler);
    }

    unmount() {
        const panel = this.root.querySelector('.md-lib-panel');
        const search = document.getElementById('md-lib-search');
        if (panel && this.clickHandler) panel.removeEventListener('click', this.clickHandler);
        if (panel && this.keyHandler) panel.removeEventListener('keydown', this.keyHandler);
        if (search && this.searchHandler) search.removeEventListener('input', this.searchHandler);
        if (this.docHandler) document.removeEventListener('click', this.docHandler);
        this.rows.clear();
        this.sortOpen = false;
    }

    setParams(params) {
        this.cat = normCat(params?.cat);
        this.sort = normSort(params?.sort);
        this._closeSort();
    }

    _onClick(e) {
        const t = e.target;

        if (t.closest('#md-sort-btn')) {
            e.preventDefault();
            if (this.sortOpen) this._closeSort();
            else this._openSort();
            return;
        }

        const opt = t.closest('.md-sort-opt');
        if (opt) {
            e.preventDefault();
            this._setSort(opt.getAttribute('data-value'));
            this._closeSort();
            const btn = document.getElementById('md-sort-btn');
            if (btn) btn.focus();
            return;
        }

        const catBtn = t.closest('[data-md-cat]');
        if (catBtn) {
            e.preventDefault();
            this.cat = normCat(catBtn.getAttribute('data-md-cat'));
            this.onHash({ cat: this.cat === 'game' ? null : this.cat });
            this.render(this.store.getState());
            return;
        }

        if (t.closest('#md-lib-reset')) {
            e.preventDefault();
            this.filter = '';
            const search = document.getElementById('md-lib-search');
            if (search) { search.value = ''; search.focus(); }
            this.render(this.store.getState());
            return;
        }

        const card = t.closest('.md-lib-card');
        if (card) {
            e.preventDefault();
            const id = card.getAttribute('data-id');
            const entry = this.entries.find(x => x.id === id);
            card.classList.add('is-picked');
            setTimeout(() => { if (card.isConnected) card.classList.remove('is-picked'); }, 420);
            this.onPick(id, entry);
        }
    }

    _onKey(e) {
        const inSort = e.target && e.target.closest && e.target.closest('#md-sort');
        if (!inSort) return;
        const btn = document.getElementById('md-sort-btn');
        const pop = document.getElementById('md-sort-pop');
        const opts = pop ? Array.from(pop.querySelectorAll('.md-sort-opt')) : [];

        if (e.key === 'Escape') {
            if (this.sortOpen) {
                e.preventDefault();
                this._closeSort();
                if (btn) btn.focus();
            }
            return;
        }

        if (e.target === btn) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._openSort();
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
            this._closeSort();
        }
    }

    _openSort() {
        const root = document.getElementById('md-sort');
        const pop = document.getElementById('md-sort-pop');
        const btn = document.getElementById('md-sort-btn');
        if (!root || !pop || !btn) return;
        this.sortOpen = true;
        root.classList.add('is-open');
        pop.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    }

    _closeSort() {
        const root = document.getElementById('md-sort');
        const pop = document.getElementById('md-sort-pop');
        const btn = document.getElementById('md-sort-btn');
        this.sortOpen = false;
        if (root) root.classList.remove('is-open');
        if (pop) pop.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    _setSort(value) {
        this.sort = normSort(value);
        this.onHash({ sort: this.sort === 'title' ? null : this.sort });
        this._syncSortUI();
        this.render(this.store.getState());
    }

    _syncSortUI() {
        const root = document.getElementById('md-sort');
        const label = document.getElementById('md-sort-val');
        const pop = document.getElementById('md-sort-pop');
        const current = SORT_OPTIONS.find(s => s.id === this.sort) || SORT_OPTIONS[0];
        if (root) root.setAttribute('data-value', this.sort);
        if (label && label.textContent !== current.label) label.textContent = current.label;
        if (pop) {
            pop.querySelectorAll('.md-sort-opt').forEach(o => {
                const on = o.getAttribute('data-value') === this.sort;
                o.classList.toggle('is-active', on);
                o.setAttribute('aria-selected', on ? 'true' : 'false');
            });
        }
    }

    visible() {
        const q = this.filter.trim().toLowerCase();
        const list = this.entries.filter(item => {
            if (item.type !== this.cat) return false;
            if (!q) return true;
            return `${item.title} ${item.id} ${item.meta.join(' ')}`.toLowerCase().includes(q);
        });
        const byTitle = (a, b) => a.title.localeCompare(b.title, 'ru');
        if (this.sort === 'title-desc') list.sort((a, b) => byTitle(b, a));
        else if (this.sort === 'id') list.sort((a, b) => a.id.localeCompare(b.id, 'en'));
        else list.sort(byTitle);
        return list;
    }

    _makeCard(item) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'md-lib-card';
        el.setAttribute('data-id', item.id);
        el.style.setProperty('--card-accent', item.themeColor);

        const cover = document.createElement('span');
        cover.className = 'md-lib-cover';

        const fb = document.createElement('span');
        fb.className = 'md-lib-initials';
        fb.textContent = initialsOf(item.title);
        cover.appendChild(fb);

        const url = normalizeCover(item.cover);
        if (url) {
            const img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = () => { img.classList.add('is-broken'); };
            img.src = url;
            cover.appendChild(img);
        }

        const type = document.createElement('span');
        type.className = 'md-lib-type';
        type.innerHTML = item.type === 'series' ? ic('alert_movie') : ic('alert_game');
        type.title = item.type === 'series' ? 'Кино / сериал' : 'Игра';
        cover.appendChild(type);

        const flag = document.createElement('span');
        flag.className = 'md-lib-flag';
        flag.textContent = 'В ЭФИРЕ';
        cover.appendChild(flag);

        const body = document.createElement('span');
        body.className = 'md-lib-body';

        const title = document.createElement('span');
        title.className = 'md-lib-title';
        title.textContent = item.title;

        const meta = document.createElement('span');
        meta.className = 'md-lib-meta';
        meta.textContent = item.meta.filter(Boolean).join(' · ') || '—';

        const idChip = document.createElement('span');
        idChip.className = 'md-lib-id';
        idChip.textContent = item.id;

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(idChip);

        el.appendChild(cover);
        el.appendChild(body);
        el.title = `${item.title} — показать на экране`;
        return el;
    }

    render(state) {
        const grid = document.getElementById('md-lib-grid');
        if (!grid) return;

        const c = state.config.widgets.media || {};
        const hasLink = Boolean(String(c.ytLink || '').trim());
        const liveId = hasLink ? null : String(c.libId || '').toLowerCase();
        const list = this.visible();
        const catTotal = this.entries.filter(x => x.type === this.cat).length;

        const count = document.getElementById('md-lib-count');
        if (count) count.textContent = `${list.length} / ${catTotal}`;

        this._syncSortUI();

        this.root.querySelectorAll('[data-md-cat]').forEach(b => {
            const on = b.getAttribute('data-md-cat') === this.cat;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        const empty = document.getElementById('md-lib-empty');
        if (empty) empty.classList.toggle('is-hidden', list.length > 0);

        const seen = new Set();
        let cursor = grid.firstElementChild;
        for (const item of list) {
            seen.add(item.id);
            let el = this.rows.get(item.id);
            if (!el || !el.isConnected) {
                el = this._makeCard(item);
                this.rows.set(item.id, el);
            }
            el.classList.toggle('is-live', item.id === liveId);
            if (el === cursor) cursor = cursor.nextElementSibling;
            else grid.insertBefore(el, cursor);
        }
        for (const [id, el] of this.rows) {
            if (!seen.has(id)) { el.remove(); this.rows.delete(id); }
        }
    }
}