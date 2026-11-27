/* ФАЙЛ: widgets/alerts/dashboard/logPanel.js — v2 (импорты из constants) */
import { getType, ic, esc, typeIcon, setText, LOG_KEY, LOG_MAX, ARM_MS } from './constants.js';

function fmtTime(ts) {
try { return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
catch (e) { return '--:--:--'; }
}

export class LogPanel {
constructor({ root, toast }) {
this.root = root;
this.toast = toast;
this.entries = [];
this.paused = false;
this.armed = false;
this.armTimer = null;
this._sig = '';
this._mounted = false;
}
mount() { this._mounted = true; this.load(); this.render(); console.log('[AlertsDash:log] смонтирован'); }
unmount() {
this._mounted = false;
if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
this.armed = false;
}
load() {
try {
const raw = localStorage.getItem(LOG_KEY);
if (!raw) return;
const parsed = JSON.parse(raw);
if (!Array.isArray(parsed)) return;
this.entries = parsed.filter(e => e && typeof e.ts === 'number' && typeof e.type === 'string').slice(0, LOG_MAX);
console.log(`[AlertsDash:log] записей: ${this.entries.length}`);
} catch (e) { this.entries = []; }
}
save() {
try { localStorage.setItem(LOG_KEY, JSON.stringify(this.entries.slice(0, LOG_MAX))); }
catch (e) { console.warn('[AlertsDash:log] не сохранился:', e); }
}
push(payload) {
if (!this._mounted || this.paused || !payload) return;
this.entries.unshift({
ts: Number(payload.ts) || Date.now(),
source: payload.source === 'obs' ? 'obs' : 'preview',
type: String(payload.type || 'follow'),
user: String(payload.user || '—'),
message: String(payload.message || ''),
value: Number(payload.value) || 0
});
if (this.entries.length > LOG_MAX) this.entries.length = LOG_MAX;
this.save();
this.render();
}
_disarm() {
this.armed = false;
if (this.armTimer) { clearTimeout(this.armTimer); this.armTimer = null; }
const btn = document.getElementById('ad-log-clear');
if (btn) { btn.classList.remove('is-armed'); btn.innerHTML = ic('trash'); }
}
handleAction(act) {
if (act === 'log-pause') {
this.paused = !this.paused;
const btn = document.getElementById('ad-log-pause');
if (btn) { btn.classList.toggle('is-armed', this.paused); btn.innerHTML = this.paused ? ic('play') : ic('pause'); }
this.toast.info(this.paused ? 'Журнал на паузе.' : 'Журнал снова пишет.');
return true;
}
if (act === 'log-clear') {
if (this.entries.length === 0) { this.toast.info('Журнал уже пуст.'); return true; }
if (!this.armed) {
this.armed = true;
const btn = document.getElementById('ad-log-clear');
if (btn) { btn.classList.add('is-armed'); btn.innerHTML = ic('check'); }
this.toast.info('Очистка журнала — подтвердите повторным нажатием.');
if (this.armTimer) clearTimeout(this.armTimer);
this.armTimer = setTimeout(() => this._disarm(), ARM_MS);
return true;
}
this._disarm();
this.entries = [];
this._sig = '';
this.save();
this.render();
this.toast.success('Журнал очищен.');
return true;
}
return false;
}
stats() {
let subs = 0, rewards = 0, follows = 0;
this.entries.forEach(e => {
const t = getType(e.type);
if (!t) return;
if (t.kind === 'reward') rewards++;
else if (e.type === 'follow') follows++;
else subs++;
});
return { total: this.entries.length, subs, rewards, follows };
}
render() {
if (!this._mounted) return;
const s = this.stats();
setText('ad-stat-total', s.total);
setText('ad-stat-subs', s.subs);
setText('ad-stat-rewards', s.rewards);
setText('ad-stat-follows', s.follows);
setText('ad-log-count', this.entries.length);
const empty = document.getElementById('ad-log-empty');
if (empty) empty.classList.toggle('is-hidden', this.entries.length > 0);
const sig = `${this.entries.length}:${this.entries[0]?.ts || 0}`;
if (sig === this._sig) return;
this._sig = sig;
const list = document.getElementById('ad-log');
if (!list) return;
list.innerHTML = this.entries.map(e => {
const t = getType(e.type);
const color = t ? t.color : '#a1a1aa';
const label = t ? t.label : e.type;
const valueTag = e.value > 0 ? `<span class="ad-log-tag is-value">×${e.value}</span>` : '';
const kindTag = t && t.kind === 'reward' ? '<span class="ad-log-tag is-reward">баллы</span>' : '';
return `
<div class="ad-log-row" style="--row-color:${esc(color)}">
<span class="ad-log-time">${fmtTime(e.ts)}</span>
<span class="ad-log-ic">${t ? typeIcon(t) : ''}</span>
<span class="ad-log-body">
<span class="ad-log-user">${esc(e.user)}<em class="ad-log-src">${e.source === 'obs' ? 'OBS' : 'PREVIEW'}</em></span>
<span class="ad-log-text">${esc(e.message || label)}</span>
</span>
<span class="ad-log-tags">${valueTag}${kindTag}<span class="ad-log-tag">${esc(label)}</span></span>
</div>`;
}).join('');
const scroll = document.getElementById('ad-log-scroll');
if (scroll) scroll.scrollTop = 0;
}
}