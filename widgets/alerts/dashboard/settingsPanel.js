/* ФАЙЛ: widgets/alerts/dashboard/settingsPanel.js — v2 (импорты из constants) */
import { normalizeAlertConfig, ALERT_LIMITS, clampInt, POSITIONS, ic, paintRange, setText, alertsOf } from './constants.js';
import { copyText } from '../../../js/utils/clipboard.js';

export class SettingsPanel {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.chipTimers = new Map();
}
mount() { console.log('[AlertsDash:settings] смонтирован'); }
unmount() {
for (const t of this.chipTimers.values()) clearTimeout(t);
this.chipTimers.clear();
}
_set(patch) {
try { this.store.updateConfig({ widgets: { alerts: patch } }); return true; }
catch (e) {
console.error('[AlertsDash:settings] Не сохранилось:', e);
this.toast.error('Настройка не сохранилась.');
return false;
}
}
onInput(e) {
const t = e.target;
if (!t.hasAttribute || !t.hasAttribute('data-ad-key')) return false;
if (t.type !== 'range') return false;
const key = t.getAttribute('data-ad-key');
const [min, max] = ALERT_LIMITS[key] || [0, 100];
const value = clampInt(t.value, min, max, min);
paintRange(t);
setText(`${t.id}-val`, `${value}${key === 'duration' ? ' с' : '%'}`);
this._set({ [key]: value });
return true;
}
onChange(e) {
const t = e.target;
if (!t.hasAttribute || !t.hasAttribute('data-ad-key')) return false;
if (t.type !== 'checkbox') return false;
const key = t.getAttribute('data-ad-key');
this._set({ [key]: t.checked });
if (key === 'enabled') {
this.toast.show(t.checked ? 'Оповещения снова на экране.' : 'Оповещения выключены, очередь сброшена.', t.checked ? 'success' : 'info');
} else if (key === 'soundEnabled') {
this.toast.show(t.checked ? 'Звук включён.' : 'Звук выключен.', t.checked ? 'success' : 'info');
}
return true;
}
setPosition(id) {
if (!POSITIONS.some(p => p.id === id)) return;
this._set({ position: id });
this.root.querySelectorAll('[data-ad-act="pos"]').forEach(b => {
const on = b.getAttribute('data-arg') === id;
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
}
reset() {
this.store.resetWidgetToDefaults('alerts');
this.toast.success('Настройки оповещений сброшены.');
}
async copyChip(chip, text) {
const ok = await copyText(text);
if (!ok) { this.toast.error(`Не удалось скопировать. Команда: ${text}`); return; }
this.toast.success(`Скопировано: ${text}`);
const iconEl = chip.querySelector('.ad-chip-ic');
if (iconEl) iconEl.innerHTML = ic('check');
chip.classList.add('is-copied');
const old = this.chipTimers.get(chip);
if (old) clearTimeout(old);
this.chipTimers.set(chip, setTimeout(() => {
this.chipTimers.delete(chip);
if (!chip.isConnected) return;
chip.classList.remove('is-copied');
const el = chip.querySelector('.ad-chip-ic');
if (el) el.innerHTML = ic('copy');
}, 1400));
}
render(state) {
const c = normalizeAlertConfig(alertsOf(state));
const master = document.getElementById('ad-master');
if (master && document.activeElement !== master && master.checked !== c.enabled) master.checked = c.enabled;
const sound = document.getElementById('ad-sound');
if (sound && document.activeElement !== sound && sound.checked !== c.soundEnabled) sound.checked = c.soundEnabled;
[['ad-volume', 'volume', '%'], ['ad-duration', 'duration', ' с'], ['ad-scale', 'scale', '%']].forEach(([id, key, unit]) => {
const input = document.getElementById(id);
if (input && document.activeElement !== input) {
if (input.value !== String(c[key])) input.value = String(c[key]);
paintRange(input);
}
setText(`${id}-val`, `${c[key]}${unit}`);
});
const volRow = document.getElementById('ad-volume-row');
if (volRow) volRow.classList.toggle('is-muted', !c.soundEnabled);
const vol = document.getElementById('ad-volume');
if (vol) vol.disabled = !c.soundEnabled;
this.root.querySelectorAll('[data-ad-act="pos"]').forEach(b => {
const on = b.getAttribute('data-arg') === c.position;
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
}
}