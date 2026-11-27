/* ФАЙЛ: widgets/alerts/dashboard/labPanel.js — v3 (импорты из constants, отправка через серверный ALERTS_EMIT) */
import { getType, ALERT_TYPES, PRESETS, STORM, STORM_GAP, TARGETS, val, setText } from './constants.js';

export class LabPanel {
constructor({ root, store, toast }) {
this.root = root;
this.store = store;
this.toast = toast;
this.typeId = (ALERT_TYPES[1] || ALERT_TYPES[0]).id;
this.target = 'preview';
this.stormTimer = null;
this._mounted = false;
}
mount() { this._mounted = true; this._syncType(true); console.log('[AlertsDash:lab] смонтирован'); }
unmount() {
this._mounted = false;
if (this.stormTimer) { clearTimeout(this.stormTimer); this.stormTimer = null; }
}
_type() { return getType(this.typeId) || ALERT_TYPES[0]; }
pickType(id) { const t = getType(id); if (!t) return; this.typeId = t.id; this._syncType(true); }
applyPreset(id) {
const p = PRESETS.find(x => x.id === id);
if (!p) return;
this.typeId = p.type;
this._syncType(false);
const put = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v; };
put('ad-lab-user', p.user);
put('ad-lab-message', p.message);
put('ad-lab-value', p.value);
this.send();
}
setTarget(id) {
if (!TARGETS.some(t => t.id === id)) return;
this.target = id;
this.root.querySelectorAll('[data-ad-act="target"]').forEach(b => {
const on = b.getAttribute('data-arg') === id;
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
this.toast.info({
preview: '«Отправить» шлёт только в превью лаунчера.',
obs: '«Отправить» шлёт в OBS — на живой стрим.',
all: '«Отправить» шлёт и в превью, и в OBS.'
}[id]);
}
_syncType(fillSample) {
const t = this._type();
this.root.querySelectorAll('[data-ad-act="type"]').forEach(b => {
const on = b.getAttribute('data-arg') === t.id;
b.classList.toggle('is-active', on);
b.setAttribute('aria-pressed', on ? 'true' : 'false');
});
const vf = document.getElementById('ad-lab-value-field');
if (vf) vf.classList.toggle('is-hidden', !t.valueLabel);
setText('ad-lab-value-label', t.valueLabel || 'Значение');
if (fillSample) {
const u = document.getElementById('ad-lab-user');
const m = document.getElementById('ad-lab-message');
const v = document.getElementById('ad-lab-value');
if (u) u.value = t.sample.user;
if (m) m.value = t.sample.message;
if (v) v.value = String(t.sample.value || t.defaultValue || 0);
}
this._note();
}
_note(live) {
const t = this._type();
const note = document.getElementById('ad-lab-note');
if (!note) return;
const mute = live && live.soundEnabled === false ? ' Звук выключен в настройках.' : '';
const auto = t.live ? ' Приходит из чата автоматически.' : ' Только тест или !alert.';
const text = `Звук: data/sounds/${t.sound}.${auto} Enter — отправка.${mute}`;
if (note.textContent !== text) note.textContent = text;
}
build(target) {
const t = this._type();
return {
type: t.id,
user: val('ad-lab-user', t.sample.user).trim() || t.sample.user,
message: val('ad-lab-message', '').trim(),
value: Math.max(0, parseInt(val('ad-lab-value', '0'), 10) || 0),
target: target || this.target
};
}
_guard(target) {
const state = this.store.getState();
const c = state.config.widgets.alerts || {};
const enabled = c.enabled === undefined ? true : (c.enabled === true || String(c.enabled) === 'true');
if (!enabled) { this.toast.info('Сначала включите оповещения мастер-тумблером.'); return false; }
if (target !== 'preview' && !state.serverOnline) {
this.toast.error('Нет связи с сервером — тест в OBS не доставлен.');
return false;
}
return true;
}
send(forceTarget) {
const payload = this.build(forceTarget);
if (!this._guard(payload.target)) return;
// Через сервер: он проставит emitId и разошлёт всем экземплярам (дедуп на виджете).
if (payload.target === 'preview') this.store.broadcastAction('TEST_ALERT', payload);
else this.store.broadcastAction('ALERTS_EMIT', payload);
const t = this._type();
const where = { preview: 'в превью', obs: 'в OBS — на стрим', all: 'в превью и OBS' }[payload.target];
this.toast.success(`«${t.label}» отправлено ${where}.`);
}
sendObs() { this.send('obs'); }
storm() {
if (!this._guard(this.target)) return;
if (this.stormTimer) { clearTimeout(this.stormTimer); this.stormTimer = null; }
let i = 0;
const step = () => {
if (!this._mounted) return;
if (i >= STORM.length) { this.stormTimer = null; return; }
const body = { ...STORM[i], target: this.target };
if (this.target === 'preview') this.store.broadcastAction('TEST_ALERT', body);
else this.store.broadcastAction('ALERTS_EMIT', body);
i++;
this.stormTimer = setTimeout(step, STORM_GAP);
};
step();
this.toast.info('Шторм из 5 событий пошёл — проверьте очередь.');
}
onKey(e) {
if (!e.target || !e.target.id) return false;
if (!['ad-lab-user', 'ad-lab-message', 'ad-lab-value'].includes(e.target.id)) return false;
if (e.key === 'Enter') { e.preventDefault(); this.send(); return true; }
return false;
}
render(state, live) {
if (!this._mounted) return;
const liveType = live && live.current ? getType(live.current.type) : null;
this.root.querySelectorAll('[data-ad-act="type"]').forEach(b => {
b.classList.toggle('is-live', Boolean(liveType) && b.getAttribute('data-arg') === liveType.id);
});
this._note(live);
}
}