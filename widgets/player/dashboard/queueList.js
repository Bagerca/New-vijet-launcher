/* ФАЙЛ: widgets/player/dashboard/queueList.js — v5 */
import { icons } from '../../../js/utils/icons.js';
import { thumbnailUrl } from '../queue.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SNAPSHOT_WAIT = 6000;

export class QueueList {
constructor({ root, state, mountAt, onPlay, onRemove, onRestore, onRestart }) {
this.root = root;
this.state = state;
this.mountAt = mountAt;
this.onPlay = onPlay;
this.onRemove = onRemove;
this.onRestore = onRestore;
this.onRestart = onRestart;
this.filter = '';
this.rowMap = new Map();
this.optTimers = new Map();
this.clickHandler = null;
this.searchHandler = null;
this.restartHandler = null;
}

mount() {
const list = document.getElementById('pd-queue');
const search = document.getElementById('pd-search');
const restart = document.getElementById('pd-restart');
this.clickHandler = (e) => this._onClick(e);
this.searchHandler = (e) => { this.filter = e.target.value; this.render(); };
this.restartHandler = (e) => { e.preventDefault(); if (!restart.disabled) this.onRestart(); };
if (list) list.addEventListener('click', this.clickHandler);
if (search) search.addEventListener('input', this.searchHandler);
if (restart) restart.addEventListener('click', this.restartHandler);
}

unmount() {
const list = document.getElementById('pd-queue');
const search = document.getElementById('pd-search');
const restart = document.getElementById('pd-restart');
if (list && this.clickHandler) list.removeEventListener('click', this.clickHandler);
if (search && this.searchHandler) search.removeEventListener('input', this.searchHandler);
if (restart && this.restartHandler) restart.removeEventListener('click', this.restartHandler);
for (const t of this.optTimers.values()) clearTimeout(t);
this.optTimers.clear();
this.rowMap.clear();
}

_onClick(e) {
const rm = e.target.closest('.pd-btn-remove');
if (rm) {
e.preventDefault();
e.stopPropagation();
const uid = rm.getAttribute('data-uid');
const row = rm.closest('.pd-q-item');
if (rm.classList.contains('is-restore')) {
this.onRestore(uid);
} else {
this._optimistic('o-' + uid, row);
this._optimistic('p-' + uid, row);
this.onRemove(uid);
}
return;
}
const track = e.target.closest('.clickable-track');
if (track) {
e.preventDefault();
const uid = track.getAttribute('data-uid');
this._optimistic('o-' + uid, track);
this.onPlay(uid);
}
}

_optimistic(key, el) {
if (!el) return;
el.classList.add('optimistic-action');
const old = this.optTimers.get(key);
if (old) clearTimeout(old);
this.optTimers.set(key, setTimeout(() => {
this.optTimers.delete(key);
if (el.isConnected) el.classList.remove('optimistic-action');
}, 2200));
}

_row(item) {
const el = document.createElement('div');
el.dataset.kind = item.kind;
if (item.kind === 'hdr') {
el.className = 'pd-q-hdr';
el.innerHTML = `<span class="pd-q-hdr-label"></span><span class="pd-q-hdr-note"></span>`;
} else if (item.kind === 'loading') {
el.className = 'pd-sk-row';
el.innerHTML = `<div class="pd-sk-thumb"></div><div class="pd-sk-lines"><div class="pd-sk-line" style="width:75%"></div><div class="pd-sk-line" style="width:40%"></div></div>`;
} else if (item.kind === 'empty') {
el.className = 'pd-empty';
el.innerHTML = `${ic('music')}<div class="pd-empty-title"></div><div class="pd-empty-sub"></div>`;
} else {
el.className = 'pd-q-item clickable-track' + (item.bg ? ' is-bg' : '');
el.innerHTML = `<div class="pd-q-thumb"></div><div class="pd-q-info"><div class="pd-q-title"></div><div class="pd-q-user${item.bg ? ' is-muted' : ''}"></div></div><button class="pd-btn-remove" title="Убрать">${ic('trash')}</button>`;
}
return el;
}

_updateRow(el, item) {
if (item.kind === 'hdr') {
const label = el.querySelector('.pd-q-hdr-label');
const note = el.querySelector('.pd-q-hdr-note');
if (label && label.textContent !== item.label) label.textContent = item.label;
if (note && note.textContent !== (item.note || '')) note.textContent = item.note || '';
return;
}
if (item.kind === 'loading') return;
if (item.kind === 'empty') {
const t = el.querySelector('.pd-empty-title');
const s = el.querySelector('.pd-empty-sub');
if (t && t.textContent !== item.title) t.textContent = item.title;
if (s && s.textContent !== item.sub) s.textContent = item.sub;
return;
}
const t = item.track;
const titleEl = el.querySelector('.pd-q-title');
const userEl = el.querySelector('.pd-q-user');
const thumbEl = el.querySelector('.pd-q-thumb');
const btn = el.querySelector('.pd-btn-remove');
const title = t.title || (t.isBackground ? 'Фоновый трек' : 'Трек');
if (titleEl && titleEl.textContent !== title) titleEl.textContent = title;

const isCurrent = item.current;
el.classList.toggle('is-current', isCurrent);
el.classList.toggle('is-played', !!t.played && !isCurrent);
el.classList.toggle('is-removed', !!t.removed);
el.dataset.uid = t.uid;

if (userEl) {
const parts = [];
if (item.bg) parts.push(`<span class="pd-q-index">${String(t.index + 1).padStart(2, '0')}</span>`);
if (isCurrent) parts.push(`<span class="pd-q-flag is-live">ИГРАЕТ</span>`);
else if (t.removed) parts.push(`<span class="pd-q-flag">СКРЫТ</span>`);
else if (t.played) parts.push(`<span class="pd-q-flag">ПРОСЛУШАН</span>`);
parts.push(`<span>${esc(item.bg ? 'Фоновая музыка' : (t.user || 'Гость'))}</span>`);
const html = parts.join('');
if (userEl.innerHTML !== html) userEl.innerHTML = html;
}

const key = String(t.id) + String(t.type);
if (thumbEl && thumbEl.dataset.id !== key) {
thumbEl.dataset.id = key;
const url = thumbnailUrl(t, 'mqdefault');
if (url) { thumbEl.innerHTML = ''; thumbEl.style.backgroundImage = `url("${url}")`; }
else { thumbEl.style.backgroundImage = 'none'; thumbEl.innerHTML = ic('music'); }
}
if (btn) {
btn.dataset.uid = t.uid;
btn.classList.toggle('is-restore', !!t.removed);
btn.title = t.removed ? 'Вернуть в плейлист' : 'Убрать';
btn.innerHTML = t.removed ? ic('sync') : ic('trash');
}
}

render() {
const list = document.getElementById('pd-queue');
if (!list) return;
const q = this.state.queue;
const desired = [];
const now = Date.now();

if (!q.hasSnapshot && now - this.mountAt < SNAPSHOT_WAIT) {
desired.push({ key: 'sk1', kind: 'loading' });
desired.push({ key: 'sk2', kind: 'loading' });
desired.push({ key: 'sk3', kind: 'loading' });
} else if (!q.hasSnapshot) {
desired.push({ key: 'empty', kind: 'empty', title: 'Нет данных от сервера', sub: 'Нажмите кнопку переподключения в шапке стенда.' });
} else {
const { orders, playlist } = q.filter(this.filter);
const currentUid = q.currentUid;
if (orders.length > 0) {
desired.push({ key: 'hdr-o', kind: 'hdr', label: `ЗАКАЗЫ · ${orders.length}`, note: 'играют первыми' });
orders.forEach(t => desired.push({ key: 'o-' + t.uid, kind: 'track', track: t, bg: false, current: t.uid === currentUid }));
}
if (playlist.length > 0) {
desired.push({ key: 'hdr-p', kind: 'hdr', label: `ПЛЕЙЛИСТ (ФОН) · ${playlist.filter(t => !t.removed).length}`, note: q.shuffle ? 'случайный порядок' : 'по порядку' });
playlist.forEach(t => desired.push({ key: 'p-' + t.uid, kind: 'track', track: t, bg: true, current: t.uid === currentUid }));
}
if (desired.length === 0) {
if (this.filter) {
desired.push({ key: 'empty', kind: 'empty', title: 'Ничего не найдено', sub: `По запросу «${this.filter}» совпадений нет.` });
} else {
desired.push({ key: 'empty', kind: 'empty', title: 'Очередь пуста', sub: 'Добавьте трек ссылкой слева, дождитесь заказов из чата (!play) или включите фоновый плейлист.' });
}
}
}

const count = document.getElementById('pd-q-count');
if (count) count.textContent = `${q.orders.length} + ${q.playlist.filter(x => !x.removed).length}`;
const restart = document.getElementById('pd-restart');
if (restart) restart.disabled = q.playlist.length === 0;

const seen = new Set();
let cursor = list.firstElementChild;
for (const item of desired) {
seen.add(item.key);
let el = this.rowMap.get(item.key);
if (!el || el.dataset.kind !== item.kind || !el.isConnected) {
if (el) el.remove();
el = this._row(item);
this.rowMap.set(item.key, el);
}
this._updateRow(el, item);
if (el === cursor) cursor = cursor.nextElementSibling;
else list.insertBefore(el, cursor);
}
for (const [key, el] of this.rowMap) {
if (!seen.has(key)) {
el.remove();
this.rowMap.delete(key);
const timer = this.optTimers.get(key);
if (timer) { clearTimeout(timer); this.optTimers.delete(key); }
}
}
}
}