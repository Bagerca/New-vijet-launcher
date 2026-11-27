/* ФАЙЛ: widgets/chat/dashboard/controls.js — v2 (живые настройки + сегмент widthMode, random/export/reset, чипы команд) */
import { normalizeChatConfig, CHAT_DEFAULTS, CHAT_LIMITS, clamp, toInt } from '../config.js';
import { listSkins, getSkin } from '../skins.js';
import { copyText } from '../../../js/utils/clipboard.js';
import { paintRange } from '../../../js/utils/rangeFill.js';
import { ic, setText, unitFor, COLORS } from './constants.js';
export class ControlsController {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.chipTimers = new Map();
}
_conf() { return normalizeChatConfig(this.store.getState().config.widgets.chat); }
_set(patch) {
try { this.store.updateConfig({ widgets: { chat: patch } }); }
catch (e) {
console.error('[ChatDash:controls] Настройка не сохранилась:', e);
this.toast.error('Настройка не сохранилась.');
}
}
mount() { console.log('[ChatDash:controls] смонтирован'); }
unmount() {
for (const t of this.chipTimers.values()) clearTimeout(t);
this.chipTimers.clear();
}
onInput(e) {
const t = e.target;
if (!t.hasAttribute || !t.hasAttribute('data-cd-key')) return false;
const key = t.getAttribute('data-cd-key');
const type = t.getAttribute('data-cd-type') || 'string';
if (type === 'number') {
const [min, max] = CHAT_LIMITS[key] || [0, 100];
const value = clamp(toInt(t.value, min), min, max);
paintRange(t);
const lbl = this.root.querySelector(`[data-cd-val="${key}"]`);
if (lbl) lbl.textContent = `${value}${unitFor(key)}`;
this._set({ [key]: value });
return true;
}
if (t.type === 'color') { this._set({ [key]: t.value }); return true; }
if (t.tagName === 'TEXTAREA' || t.type === 'text') { this._set({ [key]: t.value }); return true; }
return false;
}
onChange(e) {
const t = e.target;
if (!t.hasAttribute || !t.hasAttribute('data-cd-key')) return false;
const key = t.getAttribute('data-cd-key');
if (t.type === 'checkbox') {
this._set({ [key]: t.checked });
if (key === 'isActive') this.toast.show(t.checked ? 'Чат показан на стриме.' : 'Чат скрыт со стрима.', t.checked ? 'success' : 'info');
return true;
}
if (t.tagName === 'SELECT') { this._set({ [key]: t.value }); return true; }
return false;
}
setSegment(key, value) {
this._set({ [key]: value });
this.root.querySelectorAll(`[data-cd-set="${key}"]`).forEach(b => {
const on = b.getAttribute('data-cd-value') === value;
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
}
reset() {
this._set({ ...CHAT_DEFAULTS });
this.toast.success('Настройки чата сброшены.');
}
randomize() {
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const skin = pick(listSkins()).id;
this._set({
skin,
accentMode: Math.random() > 0.5 ? 'user' : 'fixed',
accentColor: pick(COLORS),
radius: 6 + Math.floor(Math.random() * 24),
padding: 10 + Math.floor(Math.random() * 12),
avatarScale: 100 + Math.floor(Math.random() * 80),
nickSize: 14 + Math.floor(Math.random() * 6),
borderWidth: Math.floor(Math.random() * 3),
shadow: 35 + Math.floor(Math.random() * 60),
blur: 6 + Math.floor(Math.random() * 26),
animation: pick(['rise', 'fade', 'slide', 'pop'])
});
this.toast.success(`Случайный стиль: ${getSkin(skin).title}.`);
}
async exportJson() {
const ok = await copyText(JSON.stringify(this._conf(), null, 2));
if (ok) this.toast.success('JSON настроек чата скопирован.');
else this.toast.error('Не удалось скопировать.');
}
async copyChip(chip, text) {
const ok = await copyText(text);
if (!ok) { this.toast.error(`Не удалось скопировать. Команда: ${text}`); return; }
this.toast.success(`Скопировано: ${text}`);
const iconEl = chip.querySelector('.cd-chip-ic');
if (iconEl) iconEl.innerHTML = ic('check');
chip.classList.add('is-copied');
const old = this.chipTimers.get(chip);
if (old) clearTimeout(old);
this.chipTimers.set(chip, setTimeout(() => {
this.chipTimers.delete(chip);
if (!chip.isConnected) return;
chip.classList.remove('is-copied');
const el = chip.querySelector('.cd-chip-ic');
if (el) el.innerHTML = ic('copy');
}, 1400));
}
sync(c) {
this.root.querySelectorAll('[data-cd-key]').forEach(el => {
const key = el.getAttribute('data-cd-key');
const v = c[key];
if (v === undefined) return;
const focused = document.activeElement === el;
if (el.type === 'checkbox') {
if (!focused && el.checked !== Boolean(v)) el.checked = Boolean(v);
return;
}
if (el.type === 'range') {
if (!focused && el.value !== String(v)) el.value = String(v);
paintRange(el);
const lbl = this.root.querySelector(`[data-cd-val="${key}"]`);
if (lbl) {
const next = `${v}${unitFor(key)}`;
if (lbl.textContent !== next) lbl.textContent = next;
}
return;
}
if (!focused && el.value !== String(v)) el.value = String(v);
});
['accentMode', 'animation', 'direction', 'replyStyle', 'badgeStyle', 'widthMode'].forEach(key => {
this.root.querySelectorAll(`[data-cd-set="${key}"]`).forEach(b => {
const on = b.getAttribute('data-cd-value') === c[key];
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
});
const skin = getSkin(c.skin);
const accentRow = document.getElementById('cd-accent-row');
if (accentRow) accentRow.classList.toggle('is-disabled', c.accentMode !== 'fixed');
const accentInput = this.root.querySelector('[data-cd-key="accentColor"]');
if (accentInput) accentInput.disabled = c.accentMode !== 'fixed';
setText('cd-accent-hex', c.accentMode === 'fixed' ? c.accentColor : 'ЦВЕТ НИКА');
this.root.querySelectorAll('[data-cd-bg-row]').forEach(r => r.classList.toggle('is-disabled', !skin.usesBg));
this.root.querySelectorAll('[data-cd-key="bgColor"], [data-cd-key="textColor"], [data-cd-key="bgOpacity"]').forEach(el => { el.disabled = !skin.usesBg; });
setText('cd-bg-hex', c.bgColor);
setText('cd-text-hex', c.textColor);
setText('cd-palette-note', skin.usesBg
? 'Скин использует ваши цвета фона и текста.'
: `Скин «${skin.title}» задаёт собственную палитру — цвета фона и текста отключены.`);
}
}