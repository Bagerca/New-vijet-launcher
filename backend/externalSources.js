/* ФАЙЛ: backend/externalSources.js — v2 (ФАСАД: публичный API ключа стримера, реализация в backend/external/) */
const schema = require('./external/schema');
const manifest = require('./external/manifest');
const keyFile = require('./external/keyFile');

module.exports = {
  // Константы и пути
  EXTERNAL_PREFIX: schema.EXTERNAL_PREFIX,
  FILE_PATH: schema.FILE_PATH,
  EXAMPLE_PATH: schema.EXAMPLE_PATH,
  BACKUP_PATH: schema.BACKUP_PATH,
  DEFAULT_SCENES: schema.DEFAULT_SCENES,
  MONITOR_OBS_TYPES: schema.MONITOR_OBS_TYPES,
  MONITOR_LABELS: schema.MONITOR_LABELS,
  MONITOR_MODES: schema.MONITOR_MODES,

  // Чтение и валидация
  load: manifest.load,
  getStatus: manifest.getStatus,
  buildManifest: manifest.buildManifest,

  // Запись
  createFromExample: keyFile.createFromExample,
  importFromText: keyFile.importFromText,

  // Утилиты
  maskUrl: schema.maskUrl,
  fullName: schema.fullName,
  isExternalName: schema.isExternalName,
  normalizeMonitor: schema.normalizeMonitor
};