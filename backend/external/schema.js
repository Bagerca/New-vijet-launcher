/* ФАЙЛ: backend/external/schema.js — v1 (чистая схема ключа: пути, лимиты, нормализаторы, маскирование) */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const FILE_PATH = path.join(DATA_DIR, 'external-sources.json');
const EXAMPLE_PATH = path.join(DATA_DIR, 'external-sources.example.json');
const BACKUP_PATH = path.join(DATA_DIR, 'external-sources.backup.json');
const TMP_PATH = FILE_PATH + '.tmp';

/** Префикс имён в OBS. По нему лаунчер отличает свои внешние источники от чужих. */
const EXTERNAL_PREFIX = '🔗 [Внешний] ';

const DEFAULT_SCENES = [
  '🔴 [Сцена] Начало',
  '🗣 [Сцена] Общение',
  '🎮 [Сцена] Игра',
  '👋 [Сцена] Конец'
];

const DEFAULT_CSS = 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }';
const MAX_IMPORT_BYTES = 1024 * 1024;

/** Режимы звука источника → тип мониторинга OBS WebSocket 5. */
const MONITOR_OBS_TYPES = {
  both: 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT',
  monitor: 'OBS_MONITORING_TYPE_MONITOR_ONLY',
  stream: 'OBS_MONITORING_TYPE_NONE'
};

const MONITOR_LABELS = {
  both: 'МОНИТОР+ЭФИР',
  monitor: 'ТОЛЬКО СТРИМЕР',
  stream: 'ТОЛЬКО ЭФИР'
};

const MONITOR_MODES = ['both', 'monitor', 'stream'];

const LIMITS = {
  size: [16, 8192],
  position: [-20000, 20000],
  scale: [-8, 8],
  crop: [0, 20000]
};

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return fallback;
}

/** monitor: "both" (стример+зрители), "monitor" (только стример), "stream" (только зрители). Boolean тоже принят. */
function normalizeMonitor(value, fallback) {
  const fb = MONITOR_MODES.includes(fallback) ? fallback : 'both';
  if (value === undefined || value === null || value === '') return fb;
  if (typeof value === 'boolean') return value ? 'both' : 'stream';
  const s = String(value).toLowerCase().trim();
  if (['true', '1', 'yes', 'on', 'both', 'all', 'monitor+output', 'monitor_and_output'].includes(s)) return 'both';
  if (['false', '0', 'no', 'off', 'stream', 'output', 'none'].includes(s)) return 'stream';
  if (['monitor', 'monitor_only', 'self'].includes(s)) return 'monitor';
  return fb;
}

function normalizeScenes(raw, fallback) {
  if (!Array.isArray(raw)) return fallback.slice();
  const list = raw.map(x => String(x || '').trim()).filter(Boolean);
  return list.length ? list : fallback.slice();
}

function normalizeTransform(raw, errors, label) {
  const t = (raw && typeof raw === 'object') ? raw : {};
  if (raw && typeof raw !== 'object') errors.push(`${label}: transform должен быть объектом, использую значения по умолчанию`);
  let scaleX = clamp(toNum(t.scaleX, 1), LIMITS.scale[0], LIMITS.scale[1]);
  let scaleY = clamp(toNum(t.scaleY, 1), LIMITS.scale[0], LIMITS.scale[1]);
  if (scaleX === 0) { scaleX = 1; errors.push(`${label}: scaleX = 0 недопустим, заменён на 1`); }
  if (scaleY === 0) { scaleY = 1; errors.push(`${label}: scaleY = 0 недопустим, заменён на 1`); }
  return {
    positionX: Math.round(clamp(toNum(t.positionX, 0), LIMITS.position[0], LIMITS.position[1])),
    positionY: Math.round(clamp(toNum(t.positionY, 0), LIMITS.position[0], LIMITS.position[1])),
    scaleX,
    scaleY,
    cropTop: Math.round(clamp(toNum(t.cropTop, 0), LIMITS.crop[0], LIMITS.crop[1])),
    cropBottom: Math.round(clamp(toNum(t.cropBottom, 0), LIMITS.crop[0], LIMITS.crop[1])),
    cropLeft: Math.round(clamp(toNum(t.cropLeft, 0), LIMITS.crop[0], LIMITS.crop[1])),
    cropRight: Math.round(clamp(toNum(t.cropRight, 0), LIMITS.crop[0], LIMITS.crop[1]))
  };
}

/**
 * Прячет секреты в ссылке. В UI и в логах не должно быть ни токенов DA,
 * ни JWT Twitch/MemeAlerts — стример может показать лаунчер на стриме.
 */
function maskUrl(raw) {
  const s = String(raw || '');
  if (!s) return '';
  let out = s.replace(/([?&](?:token|obsToken|obs_token|key|secret|password|auth|jwt)=)[^&#]+/gi, '$1••••••••');
  out = out.replace(/#eyJ[A-Za-z0-9._-]+/g, '#••••••••');
  out = out.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '••••••••');
  return out;
}

function hostOf(raw) {
  try { return new URL(String(raw)).hostname; }
  catch (e) { return 'некорректная ссылка'; }
}

function fullName(source, prefix) {
  const p = typeof prefix === 'string' && prefix ? prefix : EXTERNAL_PREFIX;
  return `${p}${source.name}`;
}

/** Принадлежит ли имя источника нам (защита от удаления при авто-настройке сцен). */
function isExternalName(name, prefix) {
  const s = String(name || '');
  if (s.startsWith(EXTERNAL_PREFIX)) return true;
  if (typeof prefix === 'string' && prefix && s.startsWith(prefix)) return true;
  return false;
}

function baseDefaults() {
  return { shutdown: false, reroute_audio: true, monitor: 'both', css: DEFAULT_CSS };
}

function emptyManifest() {
  return {
    exists: false,
    ok: false,
    enabled: false,
    namePrefix: EXTERNAL_PREFIX,
    scenes: DEFAULT_SCENES.slice(),
    defaults: baseDefaults(),
    sources: [],
    errors: [],
    warnings: []
  };
}

module.exports = {
  ROOT,
  DATA_DIR,
  FILE_PATH,
  EXAMPLE_PATH,
  BACKUP_PATH,
  TMP_PATH,
  EXTERNAL_PREFIX,
  DEFAULT_SCENES,
  DEFAULT_CSS,
  MAX_IMPORT_BYTES,
  MONITOR_OBS_TYPES,
  MONITOR_LABELS,
  MONITOR_MODES,
  LIMITS,
  toNum,
  clamp,
  toBool,
  normalizeMonitor,
  normalizeScenes,
  normalizeTransform,
  maskUrl,
  hostOf,
  fullName,
  isExternalName,
  baseDefaults,
  emptyManifest
};