/* ФАЙЛ: backend/external/keyFile.js — v1 (запись ключа: создание из шаблона, импорт drag&drop, бэкап, атомарность) */
const fs = require('fs');
const path = require('path');
const schema = require('./schema');
const { buildManifest } = require('./manifest');

const { DATA_DIR, FILE_PATH, EXAMPLE_PATH, BACKUP_PATH, TMP_PATH, MAX_IMPORT_BYTES } = schema;

/** Создаёт боевой файл из шаблона. Существующий файл никогда не перезаписывает. */
function createFromExample() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      return { status: 'exists', path: FILE_PATH, message: 'Файл уже существует — перезапись запрещена.' };
    }
    if (!fs.existsSync(EXAMPLE_PATH)) {
      return { status: 'error', message: 'Шаблон data/external-sources.example.json не найден.' };
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.copyFileSync(EXAMPLE_PATH, FILE_PATH);
    console.log('[External] Создан локальный ключ из шаблона:', FILE_PATH);
    return { status: 'ok', path: FILE_PATH, message: 'Файл создан. Вставьте в него свои ссылки.' };
  } catch (e) {
    console.error('[External] Не удалось создать файл:', e);
    return { status: 'error', message: e.message };
  }
}

/**
 * Импорт ключа из перетащенного файла.
 * Валидация ДО записи: битый JSON никогда не затирает рабочий ключ.
 * Старый ключ сохраняется в external-sources.backup.json.
 */
function importFromText(text, originalName = '') {
  const safeName = String(originalName || '').slice(0, 120);
  try {
    if (typeof text !== 'string') {
      return { status: 'error', message: 'Содержимое файла не передано.' };
    }
    const raw = text.replace(/^\uFEFF/, '');
    if (!raw.trim()) {
      return { status: 'invalid', message: 'Файл пуст.', errors: ['Файл пуст.'], warnings: [] };
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_IMPORT_BYTES) {
      return { status: 'invalid', message: 'Файл больше 1 МБ — это не ключ внешних источников.', errors: ['Превышен лимит размера 1 МБ.'], warnings: [] };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { status: 'invalid', message: `JSON повреждён: ${e.message}`, errors: [`JSON повреждён: ${e.message}`], warnings: [] };
    }

    const check = buildManifest(data);
    if (!check.ok) {
      console.warn('[External] Импорт отклонён:', check.errors.join('; '));
      return {
        status: 'invalid',
        message: 'Файл не прошёл валидацию. Текущий ключ не изменён.',
        errors: check.errors,
        warnings: check.warnings
      };
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    const replaced = fs.existsSync(FILE_PATH);
    let backupPath = null;
    if (replaced) {
      fs.copyFileSync(FILE_PATH, BACKUP_PATH);
      backupPath = BACKUP_PATH;
    }

    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(TMP_PATH, content, 'utf-8');
    try {
      fs.renameSync(TMP_PATH, FILE_PATH);
    } catch (e) {
      console.warn('[External] Атомарный rename не удался, пишу напрямую:', e.message);
      fs.writeFileSync(FILE_PATH, content, 'utf-8');
      try { fs.unlinkSync(TMP_PATH); } catch (e2) {}
    }

    const warnings = check.warnings.slice();
    if (check.sources.length === 0) warnings.push('В файле нет ни одного источника.');
    const activeCount = check.sources.filter(s => s.enabled).length;

    console.log(`[External] Ключ импортирован${safeName ? ` из «${safeName}»` : ''}: ${check.sources.length} источник(ов), бэкап: ${backupPath || 'не требовался'}`);
    return {
      status: 'ok',
      path: FILE_PATH,
      fileName: path.basename(FILE_PATH),
      replaced,
      backupPath,
      backupName: backupPath ? path.basename(backupPath) : null,
      count: check.sources.length,
      activeCount,
      errors: [],
      warnings,
      message: `Ключ принят: ${check.sources.length} источник(ов).`
    };
  } catch (e) {
    console.error('[External] Импорт упал:', e);
    return { status: 'error', message: `Не удалось записать ключ: ${e.message}` };
  }
}

module.exports = { createFromExample, importFromText };