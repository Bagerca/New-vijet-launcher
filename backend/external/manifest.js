/* ФАЙЛ: backend/external/manifest.js — v1 (чтение и валидация ключа + безопасный срез для UI) */
const fs = require('fs');
const path = require('path');
const schema = require('./schema');

const {
  FILE_PATH, EXAMPLE_PATH, EXTERNAL_PREFIX, DEFAULT_SCENES, DEFAULT_CSS,
  LIMITS, MONITOR_LABELS,
  toNum, clamp, toBool, normalizeMonitor, normalizeScenes, normalizeTransform,
  maskUrl, hostOf, fullName, baseDefaults, emptyManifest
} = schema;

/** Валидация уже разобранного JSON. Общая для load() и импорта: битый ключ не затирает рабочий. */
function buildManifest(data) {
  const result = emptyManifest();
  result.exists = true;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    result.errors.push('Корень файла должен быть объектом { "sources": [...] }');
    return result;
  }

  result.enabled = toBool(data.enabled, true);
  result.namePrefix = typeof data.namePrefix === 'string' && data.namePrefix ? data.namePrefix : EXTERNAL_PREFIX;

  if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
    result.warnings.push('Список scenes не задан — использую все 4 сцены пака.');
  }
  result.scenes = normalizeScenes(data.scenes, DEFAULT_SCENES);

  const d = (data.defaults && typeof data.defaults === 'object') ? data.defaults : {};
  result.defaults = {
    shutdown: toBool(d.shutdown, false),
    reroute_audio: toBool(d.reroute_audio, true),
    monitor: normalizeMonitor(d.monitor, 'both'),
    css: typeof d.css === 'string' && d.css ? d.css : DEFAULT_CSS
  };

  if (!Array.isArray(data.sources)) {
    result.errors.push('Поле sources должно быть массивом');
    return result;
  }

  const seenIds = new Set();
  data.sources.forEach((raw, index) => {
    const label = `Источник #${index + 1}`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      result.errors.push(`${label}: запись должна быть объектом — пропущена`);
      return;
    }

    const errors = [];
    let id = String(raw.id || '').trim().toLowerCase();
    if (!id) {
      id = `source-${index + 1}`;
      result.warnings.push(`${label}: не задан id, назначен "${id}"`);
    }
    if (!/^[a-z0-9][a-z0-9_-]{1,40}$/.test(id)) {
      result.errors.push(`${label}: некорректный id "${id}" (разрешены a-z, 0-9, дефис, подчёркивание) — пропущен`);
      return;
    }
    if (seenIds.has(id)) {
      result.errors.push(`${label}: дубликат id "${id}" — пропущен`);
      return;
    }

    const name = String(raw.name || '').trim() || id;
    const url = String(raw.url || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      result.errors.push(`«${name}»: ссылка должна начинаться с http:// или https:// — пропущен`);
      return;
    }
    if (/ВСТАВЬТЕ|YOUR_TOKEN|PLACEHOLDER/i.test(url)) {
      result.warnings.push(`«${name}»: в ссылке остался шаблонный плейсхолдер — источник работать не будет`);
    }

    const width = Math.round(clamp(toNum(raw.width, 1920), LIMITS.size[0], LIMITS.size[1]));
    const height = Math.round(clamp(toNum(raw.height, 1080), LIMITS.size[0], LIMITS.size[1]));
    const transform = normalizeTransform(raw.transform, errors, `«${name}»`);
    errors.forEach(msg => result.warnings.push(msg));

    seenIds.add(id);
    result.sources.push({
      id,
      name,
      url,
      width,
      height,
      enabled: toBool(raw.enabled, true),
      note: String(raw.note || '').trim(),
      scenes: Array.isArray(raw.scenes) && raw.scenes.length ? normalizeScenes(raw.scenes, result.scenes) : null,
      shutdown: toBool(raw.shutdown, result.defaults.shutdown),
      reroute_audio: toBool(raw.reroute_audio, result.defaults.reroute_audio),
      monitor: normalizeMonitor(raw.monitor, result.defaults.monitor),
      css: typeof raw.css === 'string' && raw.css ? raw.css : result.defaults.css,
      transform
    });
  });

  result.ok = result.errors.length === 0;
  return result;
}

/**
 * Читает и валидирует локальный ключ. Никогда не бросает исключение.
 * @returns {{exists:boolean, ok:boolean, enabled:boolean, namePrefix:string, scenes:string[], defaults:object, sources:object[], errors:string[], warnings:string[]}}
 */
function load() {
  const result = emptyManifest();
  let rawText = '';

  try {
    if (!fs.existsSync(FILE_PATH)) {
      console.log('[External] Локальный ключ не найден:', FILE_PATH);
      return result;
    }
    result.exists = true;
    rawText = fs.readFileSync(FILE_PATH, 'utf-8');
  } catch (e) {
    result.errors.push(`Не удалось прочитать файл: ${e.message}`);
    console.error('[External] Ошибка чтения:', e);
    return result;
  }

  let data = null;
  try {
    data = JSON.parse(rawText.replace(/^\uFEFF/, ''));
  } catch (e) {
    result.errors.push(`JSON повреждён: ${e.message}`);
    console.error('[External] JSON повреждён:', e.message);
    return result;
  }

  const manifest = buildManifest(data);
  console.log(`[External] Ключ загружен: ${manifest.sources.length} источник(ов), ошибок ${manifest.errors.length}, предупреждений ${manifest.warnings.length}`);
  return manifest;
}

/** Безопасный срез для интерфейса: ссылки замаскированы, токенов нет. */
function getStatus() {
  const m = load();
  return {
    supported: true,
    exists: m.exists,
    ok: m.ok,
    enabled: m.enabled,
    path: FILE_PATH,
    fileName: path.basename(FILE_PATH),
    exampleExists: fs.existsSync(EXAMPLE_PATH),
    count: m.sources.length,
    activeCount: m.sources.filter(s => s.enabled).length,
    scenes: m.scenes,
    monitorDefault: m.defaults.monitor,
    errors: m.errors,
    warnings: m.warnings,
    sources: m.sources.map(s => ({
      id: s.id,
      name: s.name,
      fullName: fullName(s, m.namePrefix),
      url: maskUrl(s.url),
      host: hostOf(s.url),
      width: s.width,
      height: s.height,
      enabled: s.enabled,
      note: s.note,
      scenes: s.scenes && s.scenes.length ? s.scenes : m.scenes,
      transform: s.transform,
      monitor: s.monitor,
      monitorLabel: MONITOR_LABELS[s.monitor] || s.monitor,
      rerouteAudio: s.reroute_audio
    }))
  };
}

module.exports = { buildManifest, load, getStatus };