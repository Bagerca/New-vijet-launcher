/* ФАЙЛ: widgets/frame/dashboard/petPanel.js — v1 (тумблер, эмоции, таймаут сна, VIP и бан-слова) */
import {
ic, EMOTIONS, EMOTION_LABELS, SLEEP_MIN, SLEEP_MAX, SLEEP_RANGE_MAX,
DUR_MIN, DUR_MAX, clampInt, splitList, paintRange, setText, petOf, petEnabled
} from './constants.js';
import { copyText } from '../../../js/utils/clipboard.js';

export class PetPanel {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.duration = 5;
this.inputHandler = null;
this.changeHandler = null;
this.clickHandler = null;
this.chipTimers = new Map();
this.fireTimers = new Map();
}
mount() {
this.inputHandler = (e) => this._onInput(e);
this.changeHandler = (e) => this._onChange(e);
this.clickHandler = (e) => this._onClick(e);
this.root.addEventListener('input', this.inputHandler);
this.root.addEventListener('change', this.changeHandler);
this.root.addEventListener('click', this.clickHandler);
this._syncDuration();
console.log('[FrameDash:pet] смонтирован');
}
unmount() {
if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
for (const t of this.chipTimers.values()) clearTimeout(t);
this.chipTimers.clear();
for (const t of this.fireTimers.values()) clearTimeout(t);
this.fireTimers.clear();
}
_scoped(t) { return Boolean(t && t.closest && t.closest('[data-fd-scope="pet"]')); }
_conf() { return petOf(this.store.getState()); }
_set(patch) {
try {
this.store.updateConfig({ widgets: { pet: patch } });
return true;
} catch (e) {
console.error('[FrameDash:pet] Настройка не сохранилась:', e);
this.toast.error('Настройка не сохранилась.');
return false;
}
}
_syncDuration() {
setText('fd-dur-val', this.duration);
const minus = document.getElementById('fd-dur-minus');
const plus = document.getElementById('fd-dur-plus');
if (minus) minus.disabled = this.duration <= DUR_MIN;
if (plus) plus.disabled = this.duration >= DUR_MAX;
}
_onInput(e) {
const t = e.target;
if (!this._scoped(t)) return;
if (t.id === 'fd-sleep') {
const value = clampInt(t.value, SLEEP_MIN, SLEEP_MAX, 120);
paintRange(t);
const num = document.getElementById('fd-sleep-num');
if (num && document.activeElement !== num) num.value = String(value);
this._set({ sleepTimeout: value });
return;
}
if (t.id === 'fd-sleep-num') {
if (t.value === '') return;
const value = clampInt(t.value, SLEEP_MIN, SLEEP_MAX, 120);
const range = document.getElementById('fd-sleep');
if (range) { range.value = String(Math.min(SLEEP_RANGE_MAX, value)); paintRange(range); }
this._set({ sleepTimeout: value });
return;
}
if (!t.hasAttribute('data-fd-key')) return;
const key = t.getAttribute('data-fd-key');
if (key === 'enabled') return;
if (t.type === 'text' || t.tagName === 'TEXTAREA') {
this._set({ [key]: t.value });
if (key === 'vipUsers') setText('fd-vip-count', splitList(t.value).length);
if (key === 'forbiddenWords') setText('fd-ban-count', splitList(t.value).length);
}
}
_onChange(e) {
const t = e.target;
if (!this._scoped(t)) return;
if (t.id === 'fd-sleep-num') {
const value = clampInt(t.value, SLEEP_MIN, SLEEP_MAX, 120);
t.value = String(value);
this._set({ sleepTimeout: value });
return;
}
if (t.type === 'checkbox' && t.getAttribute('data-fd-key') === 'enabled') {
this._set({ enabled: t.checked });
this.toast.show(
t.checked ? 'Лиса снова на рамке.' : 'Лиса скрыта. Рамка осталась.',
t.checked ? 'success' : 'info'
);
}
}
_onClick(e) {
const t = e.target;
const chip = t.closest && t.closest('.fd-chip');
if (chip && this._scoped(chip)) {
e.preventDefault();
this._copyChip(chip);
return;
}
const btn = t.closest && t.closest('[data-fd-act]');
if (!btn || !this._scoped(btn)) return;
const act = btn.getAttribute('data-fd-act');
const arg = btn.getAttribute('data-arg');
switch (act) {
case 'dur-minus':
e.preventDefault();
this.duration = Math.max(DUR_MIN, this.duration - 1);
this._syncDuration();
return;
case 'dur-plus':
e.preventDefault();
this.duration = Math.min(DUR_MAX, this.duration + 1);
this._syncDuration();
return;
case 'emotion': {
e.preventDefault();
if (!petEnabled(this._conf())) {
this.toast.info('Сначала включите лису тумблером выше.');
return;
}
const meta = EMOTIONS.find(x => x.id === arg);
if (!meta) return;
this.store.broadcastAction('PET_EMOTION', { emotion: arg, duration: this.duration * 1000 });
btn.classList.remove('is-fired');
void btn.offsetWidth;
btn.classList.add('is-fired');
const old = this.fireTimers.get(btn);
if (old) clearTimeout(old);
this.fireTimers.set(btn, setTimeout(() => {
this.fireTimers.delete(btn);
if (btn.isConnected) btn.classList.remove('is-fired');
}, 700));
this.toast.success(`«${meta.label}» на ${this.duration} с — отправлено в превью и OBS.`);
return;
}
case 'reset-pet':
e.preventDefault();
this.store.resetWidgetToDefaults('pet');
this.toast.success('Настройки лисы сброшены.');
return;
default:
return;
}
}
async _copyChip(chip) {
const text = chip.getAttribute('data-copy') || '';
const ok = await copyText(text);
if (!ok) { this.toast.error(`Не удалось скопировать. Команда: ${text}`); return; }
this.toast.success(`Скопировано: ${text}`);
const iconEl = chip.querySelector('.fd-chip-ic');
if (iconEl) iconEl.innerHTML = ic('check');
chip.classList.add('is-copied');
const old = this.chipTimers.get(chip);
if (old) clearTimeout(old);
this.chipTimers.set(chip, setTimeout(() => {
this.chipTimers.delete(chip);
if (!chip.isConnected) return;
chip.classList.remove('is-copied');
const el = chip.querySelector('.fd-chip-ic');
if (el) el.innerHTML = ic('copy');
}, 1400));
}
render(state, live) {
const c = petOf(state);
const on = petEnabled(c);
const sleep = clampInt(c.sleepTimeout, SLEEP_MIN, SLEEP_MAX, 120);
const toggle = document.getElementById('fd-pet-enabled');
if (toggle && document.activeElement !== toggle && toggle.checked !== on) toggle.checked = on;
const range = document.getElementById('fd-sleep');
if (range && document.activeElement !== range) {
const v = String(Math.min(SLEEP_RANGE_MAX, sleep));
if (range.value !== v) range.value = v;
paintRange(range);
}
const num = document.getElementById('fd-sleep-num');
if (num && document.activeElement !== num && num.value !== String(sleep)) num.value = String(sleep);
const fields = [['fd-feed', 'feedRewardName', 'Покормить лису'], ['fd-vip', 'vipUsers', ''], ['fd-ban', 'forbiddenWords', '']];
fields.forEach(([id, key, fallback]) => {
const el = document.getElementById(id);
if (!el || document.activeElement === el) return;
const value = String(c[key] ?? fallback);
if (el.value !== value) el.value = value;
});
setText('fd-vip-count', splitList(c.vipUsers).length);
setText('fd-ban-count', splitList(c.forbiddenWords).length);
const liveState = live && live.petState ? live.petState : null;
this.root.querySelectorAll('.fd-emotion').forEach(btn => {
const id = btn.getAttribute('data-arg');
btn.disabled = !on;
btn.classList.toggle('is-live', Boolean(on) && liveState === id);
btn.title = on
? `Показать эмоцию «${EMOTION_LABELS[id] || id}»`
: 'Лиса выключена — включите тумблер выше';
});
const note = document.getElementById('fd-emotion-note');
if (note) {
const text = !on
? 'Лиса выключена: эмоции не показываются, но настройки сохраняются.'
: (liveState && liveState !== 'idle'
? `Сейчас лиса в состоянии «${EMOTION_LABELS[liveState] || liveState}». Более приоритетная эмоция перебьёт текущую.`
: 'Тестовая эмоция уходит и в превью, и в OBS. Конфиг она не меняет.');
if (note.textContent !== text) note.textContent = text;
}
this._syncDuration();
}
}