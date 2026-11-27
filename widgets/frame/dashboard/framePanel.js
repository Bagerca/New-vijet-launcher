/* ФАЙЛ: widgets/frame/dashboard/framePanel.js — v1 (цвета, пресеты,.swap/random, чипы команд) */
import {
ic, PRESETS, BRAND_1, BRAND_2, normalizeHex, randomPair,
frameOf, frameVisible, setText
} from './constants.js';
import { copyText } from '../../../js/utils/clipboard.js';

export class FramePanel {
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
console.log('[FrameDash:frame] смонтирован');
}
unmount() {
if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
for (const t of this.chipTimers.values()) clearTimeout(t);
this.chipTimers.clear();
}
_scoped(t) { return Boolean(t && t.closest && t.closest('[data-fd-scope="frame"]')); }
_conf() { return frameOf(this.store.getState()); }
_set(patch) {
try {
this.store.updateConfig({ widgets: { frame: patch } });
return true;
} catch (e) {
console.error('[FrameDash:frame] Настройка не сохранилась:', e);
this.toast.error('Настройка не сохранилась.');
return false;
}
}
_onInput(e) {
const t = e.target;
if (!this._scoped(t) || !t.hasAttribute || !t.hasAttribute('data-fd-key')) return;
if (t.type !== 'color') return;
const key = t.getAttribute('data-fd-key');
if (key !== 'color1' && key !== 'color2') return;
this._set({ [key]: t.value });
setText(key === 'color1' ? 'fd-hex-1' : 'fd-hex-2', t.value);
}
_onChange(e) {
const t = e.target;
if (!this._scoped(t) || t.type !== 'checkbox') return;
if (t.getAttribute('data-fd-key') !== 'isVisible') return;
this._set({ isVisible: t.checked });
this.toast.show(
t.checked ? 'Рамка показана на стриме.' : 'Рамка скрыта — лиса скрыта вместе с ней.',
t.checked ? 'success' : 'info'
);
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
const c = this._conf();
const c1 = normalizeHex(c.color1, BRAND_1);
const c2 = normalizeHex(c.color2, BRAND_2);
switch (act) {
case 'preset': {
e.preventDefault();
const pr = PRESETS.find(x => x.id === arg);
if (!pr) return;
if (this._set({ color1: pr.c1, color2: pr.c2 })) {
btn.classList.remove('is-picked');
void btn.offsetWidth;
btn.classList.add('is-picked');
this.toast.success(`Градиент «${pr.title}» применён.`);
}
return;
}
case 'swap':
e.preventDefault();
if (this._set({ color1: c2, color2: c1 })) this.toast.info('Цвета поменялись местами.');
return;
case 'random': {
e.preventDefault();
const pair = randomPair();
if (this._set(pair)) this.toast.success(`Случайный градиент: ${pair.c1} → ${pair.c2}`);
return;
}
case 'brand1':
e.preventDefault();
if (this._set({ color1: BRAND_1 })) this.toast.info('Цвет 1 возвращён к фирменному.');
return;
case 'brand2':
e.preventDefault();
if (this._set({ color2: BRAND_2 })) this.toast.info('Цвет 2 возвращён к фирменному.');
return;
case 'reset-frame':
e.preventDefault();
this.store.resetWidgetToDefaults('frame');
this.toast.success('Настройки рамки сброшены.');
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
render(state) {
const c = frameOf(state);
const c1 = normalizeHex(c.color1, BRAND_1);
const c2 = normalizeHex(c.color2, BRAND_2);
const visible = frameVisible(c);
const pairs = [['fd-color-1', 'fd-hex-1', c1], ['fd-color-2', 'fd-hex-2', c2]];
pairs.forEach(([inputId, hexId, value]) => {
const input = document.getElementById(inputId);
if (input && document.activeElement !== input && input.value !== value) input.value = value;
setText(hexId, value);
});
const master = document.getElementById('fd-master');
if (master && document.activeElement !== master && master.checked !== visible) master.checked = visible;
const bar = document.getElementById('fd-gradient');
if (bar) {
bar.style.setProperty('--g1', c1);
bar.style.setProperty('--g2', c2);
}
this.root.querySelectorAll('.fd-preset').forEach(btn => {
const pr = PRESETS.find(x => x.id === btn.getAttribute('data-arg'));
const on = Boolean(pr) && pr.c1.toLowerCase() === c1 && pr.c2.toLowerCase() === c2;
btn.classList.toggle('is-active', on);
btn.setAttribute('aria-pressed', on ? 'true' : 'false');
});
}
}