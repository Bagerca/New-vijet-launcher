/* ФАЙЛ: widgets/frame/script.js — v2 (телеметрия FRAME_STATE + чат-команды рамки и лисы) */
import { WidgetCore } from '../shared/WidgetCore.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_PREVIEW = PARAMS.get('preview') === '1';
const SOURCE = IS_PREVIEW ? 'preview' : 'obs';
const HEARTBEAT_MS = 4000;

const frameContainer = document.getElementById('webcam-container');

function isTrue(v) { return v === true || String(v) === 'true'; }
function normalizeHex(value, fallback) {
let h = String(value ?? '').trim();
if (!h) return fallback;
if (!h.startsWith('#')) h = '#' + h;
if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : fallback;
}
function clampInt(value, min, max, fallback) {
const n = parseInt(value, 10);
if (isNaN(n)) return fallback;
return Math.max(min, Math.min(max, n));
}
function splitList(value) {
return String(value ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

const AppPet = {
container: document.getElementById('pet-container'),
baseStack: ['idle'],
activeState: null,
currentPriority: 0,
savedState: null,
particleInterval: null,
emotionTimeout: null,
sleepTimer: null,
onStateChange: null,
priorities: {
'angry': 10, 'scared': 9, 'nom': 8,
'love': 5, 'greet': 4, 'bye': 4, 'alert': 3, 'hype': 1
},
config: { enabled: true, sleepTimeout: 120, feedRewardName: "Покормить лису", vipUsers: [], forbiddenWords: [] },
init: function() {
this.resetSleepTimer();
window.addEventListener('click', () => this.wakeUp());
},
updateConfig: function(petConf) {
if (!petConf) return;
this.config.enabled = petConf.enabled !== false && String(petConf.enabled) !== 'false';
if (this.container) {
if (this.config.enabled) this.container.classList.remove('hidden');
else this.container.classList.add('hidden');
}
this.config.sleepTimeout = clampInt(petConf.sleepTimeout, 5, 3600, 120);
if (petConf.feedRewardName !== undefined) {
this.config.feedRewardName = String(petConf.feedRewardName || '').trim() || "Покормить лису";
}
if (petConf.vipUsers !== undefined) this.config.vipUsers = splitList(petConf.vipUsers);
if (petConf.forbiddenWords !== undefined) this.config.forbiddenWords = splitList(petConf.forbiddenWords);
this.resetSleepTimer();
this.notify();
},
notify: function() {
if (typeof this.onStateChange === 'function') {
try { this.onStateChange(); } catch (e) { console.warn('[Frame] onStateChange:', e); }
}
},
/** Текущее видимое состояние лисы (для телеметрии дашборда). */
currentState: function() {
if (!this.config.enabled) return 'off';
return this.activeState || this.baseStack[this.baseStack.length - 1] || 'idle';
},
setBaseState: function(state, active) {
if (active) {
if (!this.baseStack.includes(state)) this.baseStack.push(state);
} else {
this.baseStack = this.baseStack.filter(s => s !== state);
}
if (this.baseStack.length === 0) this.baseStack.push('idle');
if (!this.activeState) this.applyVisualState(this.baseStack[this.baseStack.length - 1]);
this.notify();
},
setEmotion: function(state, durationMs = 0) {
if (!this.container || !this.config.enabled) return;
this.resetSleepTimer();
const incomingPriority = this.priorities[state] || 1;
if (this.activeState && incomingPriority <= this.currentPriority) return;
if (this.activeState && this.savedState === null && this.emotionTimeout) {
this.savedState = { emotion: this.activeState, priority: this.currentPriority, timeLeft: 2000 };
}
clearTimeout(this.emotionTimeout);
this.activeState = state;
this.currentPriority = incomingPriority;
this.applyVisualState(state);
if (durationMs > 0) {
this.emotionTimeout = setTimeout(() => {
if (this.savedState) {
const nextState = this.savedState;
this.savedState = null;
this.activeState = null;
this.currentPriority = 0;
this.setEmotion(nextState.emotion, nextState.timeLeft);
} else {
this.activeState = null;
this.currentPriority = 0;
this.applyVisualState(this.baseStack[this.baseStack.length - 1]);
}
}, durationMs);
}
},
applyVisualState: function(state) {
clearInterval(this.particleInterval);
this.container.className = '';
this.container.classList.add(`state-${state}`);
// Класс hidden не должен слетать при смене состояния выключенной лисы.
if (!this.config.enabled) this.container.classList.add('hidden');
if (state === 'sleep') this.particleInterval = setInterval(() => this.spawnParticle('Z', 'part-zzz', 60, 50), 800);
if (state === 'alert') this.spawnParticle('!', 'part-alert', 55, 10);
if (state === 'love') this.particleInterval = setInterval(() => this.spawnParticle('❤', 'part-heart', 50 + Math.random()*20, 20), 400);
if (state === 'greet') this.particleInterval = setInterval(() => this.spawnParticle('👋', 'part-greet', 50 + Math.random()*15, 20), 600);
if (state === 'bye') this.particleInterval = setInterval(() => this.spawnParticle('💜', 'part-bye', 50 + Math.random()*15, 20), 800);
if (state === 'jam') this.particleInterval = setInterval(() => this.spawnParticle('🎵', 'part-note', 45 + Math.random()*25, 10), 600);
if (state === 'listen') this.particleInterval = setInterval(() => this.spawnParticle('?', 'part-question', 60 + Math.random()*10, 10), 1500);
if (state === 'nom') {
this.particleInterval = setInterval(() => {
const icon = Math.random() > 0.5 ? '🍪' : '✨';
this.spawnParticle(icon, 'part-cookie', 80, 40);
}, 300);
}
this.notify();
},
wakeUp: function() {
if (this.baseStack.includes('sleep')) {
this.setBaseState('sleep', false);
this.setEmotion('alert', 2000);
}
this.resetSleepTimer();
},
resetSleepTimer: function() {
clearTimeout(this.sleepTimer);
if (this.baseStack.includes('sleep')) this.setBaseState('sleep', false);
this.sleepTimer = setTimeout(() => {
if (this.baseStack[this.baseStack.length - 1] === 'idle' && !this.activeState) {
this.setBaseState('sleep', true);
}
}, this.config.sleepTimeout * 1000);
},
spawnParticle: function(text, cssClass, leftOffset, topOffset) {
if (!this.container) return;
const p = document.createElement('div');
p.innerText = text;
p.className = `pet-particle ${cssClass}`;
p.style.left = `${leftOffset + (Math.random() - 0.5) * 20}px`;
p.style.top = `${topOffset}px`;
this.container.appendChild(p);
setTimeout(() => p.remove(), 2000);
}
};

const AppFrame = {
color1: '#00ff66',
color2: '#ff007f',
visible: true,
_lastReport: 0,
_reportTimer: null,
apply: function(conf) {
if (!conf || !frameContainer) return;
if (conf.color1 !== undefined) this.color1 = normalizeHex(conf.color1, this.color1);
if (conf.color2 !== undefined) this.color2 = normalizeHex(conf.color2, this.color2);
if (conf.isVisible !== undefined) this.visible = isTrue(conf.isVisible);
document.documentElement.style.setProperty('--color-1', this.color1);
document.documentElement.style.setProperty('--color-2', this.color2);
frameContainer.style.opacity = this.visible ? '1' : '0';
this.report();
},
report: function(force) {
const now = Date.now();
if (!force && now - this._lastReport < 300) {
if (this._reportTimer) return;
this._reportTimer = setTimeout(() => {
this._reportTimer = null;
this.report(true);
}, 320);
return;
}
this._lastReport = now;
WidgetCore.sendAction('FRAME_STATE', {
source: SOURCE,
visible: this.visible,
color1: this.color1,
color2: this.color2,
petEnabled: AppPet.config.enabled,
petState: AppPet.currentState(),
ts: now
});
},
handleAction: function(action) {
if (action === 'FRAME_REQUEST_STATE') this.report(true);
},
handleChat: function(cmd, args) {
// Команды приходят и мастеру, и слейвам через шину — пишет только мастер.
if (!WidgetCore.isMaster) return false;
if (cmd === '!color1' || cmd === '!color2') {
const hex = normalizeHex(args[0], null);
if (!hex) return false;
const key = cmd === '!color1' ? 'color1' : 'color2';
WidgetCore.updateWidgetConfig('frame', { [key]: hex });
console.log(`[Frame] ${cmd} → ${hex}`);
return true;
}
if (cmd === '!frame') {
const conf = WidgetCore.globalConfig?.widgets?.frame || {};
const cur = conf.isVisible === undefined ? true : isTrue(conf.isVisible);
const arg = (args[0] || '').toLowerCase();
const next = arg === 'on' || arg === 'show' ? true : (arg === 'off' || arg === 'hide' ? false : !cur);
WidgetCore.updateWidgetConfig('frame', { isVisible: next });
console.log(`[Frame] !frame → ${next ? 'видна' : 'скрыта'}`);
return true;
}
if (cmd === '!peton') {
const conf = WidgetCore.globalConfig?.widgets?.pet || {};
const cur = conf.enabled === undefined ? true : isTrue(conf.enabled);
const arg = (args[0] || '').toLowerCase();
const next = arg === 'on' ? true : (arg === 'off' ? false : !cur);
WidgetCore.updateWidgetConfig('pet', { enabled: next });
console.log(`[Frame] !peton → ${next}`);
return true;
}
if (cmd === '!petsleep') {
const value = clampInt(args[0], 5, 3600, NaN);
if (isNaN(value)) return false;
WidgetCore.updateWidgetConfig('pet', { sleepTimeout: value });
console.log(`[Frame] !petsleep → ${value}s`);
return true;
}
if (cmd === '!petfeed' || cmd === '!petvip' || cmd === '!petban') {
const text = (args || []).join(' ').trim();
const key = cmd === '!petfeed' ? 'feedRewardName' : (cmd === '!petvip' ? 'vipUsers' : 'forbiddenWords');
WidgetCore.updateWidgetConfig('pet', { [key]: text });
console.log(`[Frame] ${cmd} → ${text || 'очищено'}`);
return true;
}
return false;
}
};

AppPet.onStateChange = () => AppFrame.report();
AppPet.init();

// Интеграция с Ядром
WidgetCore.init({
onConfigUpdate: (config) => {
if (config.widgets?.frame) AppFrame.apply(config.widgets.frame);
if (config.widgets?.pet) AppPet.updateConfig(config.widgets.pet);
AppFrame.report();
},
onTwitchMessage: (tags, message) => {
if (!AppPet.config.enabled) return;
const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
const msgLow = message.trim().toLowerCase();
const userLow = (tags['display-name'] || tags.username).toLowerCase();
const hasForbidden = AppPet.config.forbiddenWords.some(w => w && msgLow.includes(w));
if (hasForbidden) {
AppPet.setEmotion('angry', 4000);
return;
}
if (tags['custom-reward-id']) {
AppPet.setEmotion('hype', 3000);
return;
}
if (AppPet.config.vipUsers.includes(userLow) || isMod) AppPet.setEmotion('love', 4000);
else if (tags.emotes) AppPet.setEmotion('hype', 4000);
AppPet.resetSleepTimer();
},
onTwitchCommand: (cmd, args) => {
if (AppFrame.handleChat(cmd, args)) return;
if (!AppPet.config.enabled) return;
if (cmd === '!fox' || cmd === '!лиса' || cmd === '!лис') {
const action = args[0]?.toLowerCase();
const states = ['idle', 'sleep', 'alert', 'hype', 'love', 'scared', 'angry', 'greet', 'bye', 'jam', 'listen', 'nom'];
if (states.includes(action)) AppPet.setEmotion(action, 5000);
else if (action === "кусь" || action === "ням") AppPet.setEmotion('nom', 5000);
else if (action === "привет") AppPet.setEmotion('greet', 5000);
else if (action === "пока") AppPet.setEmotion('bye', 5000);
else if (action === "танцуй" || action === "вайб") AppPet.setEmotion('jam', 5000);
}
},
onWidgetAction: (action, payload) => {
AppFrame.handleAction(action);
if (action === 'PET_BASE_STATE') AppPet.setBaseState(payload.state, payload.active);
if (action === 'PET_EMOTION') AppPet.setEmotion(payload.emotion, payload.duration);
}
});

setInterval(() => AppFrame.report(true), HEARTBEAT_MS);
setTimeout(() => AppFrame.report(true), 600);
console.log(`[Frame] v2 инициализирован (${SOURCE})`);