/* ФАЙЛ: backend/packManager.js — v1 (Пак сцен: версионные папки + атомарный указатель + откат) */
const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');
const { fetchReleases, downloadFile, extractZip, compareVersions, PACK_TAG_RE } = require('./updateManager');
const PACK_DIRS = ['widgets', 'data', 'css', path.join('js', 'utils')];
const PACK_PREFIXES = ['/widgets/', '/data/', '/css/', '/js/utils/'];
function sanitizeVersion(v) {
return String(v || '0.0.0').replace(/^(?:pack-)?v/i, '').replace(/[^\w.-]/g, '_');
}
function copyDirSync(src, dst) {
fs.mkdirSync(dst, { recursive: true });
for (const item of fs.readdirSync(src)) {
const s = path.join(src, item);
const d = path.join(dst, item);
if (fs.statSync(s).isDirectory()) copyDirSync(s, d);
else fs.copyFileSync(s, d);
}
}
class PackManager extends EventEmitter {
constructor({ rootDir, getLauncherVersion }) {
super();
this.rootDir = rootDir;
this.getLauncherVersion = getLauncherVersion || (() => '1.0.0');
this.packsDir = path.join(rootDir, 'packs');
this.pointerPath = path.join(this.packsDir, 'active.json');
this.activeDir = null;
this.previousDir = null;
this.meta = null;
this.previousMeta = null;
this._loadPointer();
}
_dirPath(name) { return path.join(this.packsDir, name); }
_readMeta(name) {
try { return JSON.parse(fs.readFileSync(path.join(this._dirPath(name), '_pack-meta.json'), 'utf-8')); }
catch (e) { return null; }
}
_loadPointer() {
try {
if (!fs.existsSync(this.pointerPath)) {
console.log('[PACK] Указатель не найден — работаю со встроенными файлами.');
return;
}
const p = JSON.parse(fs.readFileSync(this.pointerPath, 'utf-8'));
if (p.active && fs.existsSync(this._dirPath(p.active))) {
this.activeDir = p.active;
this.meta = this._readMeta(p.active);
console.log(`[PACK] Активный пак: ${this.activeDir} (v${(this.meta && this.meta.version) || '?'})`);
} else {
console.warn('[PACK] Указатель ссылается на несуществующую папку:', p.active);
}
if (p.previous && fs.existsSync(this._dirPath(p.previous))) {
this.previousDir = p.previous;
this.previousMeta = this._readMeta(p.previous);
}
} catch (e) {
console.error('[PACK] Указатель повреждён, игнорирую:', e.message);
}
}
get activePath() { return this.activeDir ? this._dirPath(this.activeDir) : null; }
resolve(relUrlPath) {
if (!this.activePath) return null;
const rel = String(relUrlPath || '');
if (!PACK_PREFIXES.some(p => rel.startsWith(p))) return null;
return path.join(this.activePath, rel);
}
info() {
return {
installedVersion: (this.meta && this.meta.version) || null,
installedTag: (this.meta && this.meta.tag) || null,
appliedAt: (this.meta && this.meta.appliedAt) || null,
previousVersion: (this.previousMeta && this.previousMeta.version) || null,
canRollback: Boolean(this.previousDir && fs.existsSync(this._dirPath(this.previousDir))),
baselineVersion: this.getLauncherVersion(),
activeDir: this.activeDir
};
}
async checkForUpdate(repo) {
const current = this.info().installedVersion;
if (!repo) return { hasUpdate: false, currentVersion: current, error: 'Репозиторий не указан' };
try {
const releases = await fetchReleases(repo);
const rel = releases.find(r => !r.draft && PACK_TAG_RE.test(r.tag_name || ''));
if (!rel) return { hasUpdate: false, currentVersion: current, latestVersion: current, message: 'Пак-релизы (pack-vX.Y.Z) не найдены.' };
const version = sanitizeVersion(rel.tag_name);
let downloadUrl = null;
if (Array.isArray(rel.assets) && rel.assets.length > 0) {
const preferred = rel.assets.find(a => a.name === 'scene-pack.zip') || rel.assets.find(a => a.name.endsWith('.zip'));
if (preferred) downloadUrl = preferred.browser_download_url;
}
if (!downloadUrl) downloadUrl = rel.zipball_url;
const hasUpdate = !current || compareVersions(version, current) > 0;
console.log(`[PACK] Проверка: установлен ${current || 'встроенный'}, доступен ${version} (${hasUpdate ? 'НОВЫЙ' : 'актуально'})`);
return { hasUpdate, currentVersion: current, latestVersion: version, tag: rel.tag_name, releaseNotes: rel.body || 'Обновление сцен и виджетов.', downloadUrl };
} catch (e) {
console.warn('[PACK] Проверка пака не удалась:', e.message);
return { hasUpdate: false, currentVersion: current, error: e.message };
}
}
_writePointer() {
fs.mkdirSync(this.packsDir, { recursive: true });
const data = {
active: this.activeDir,
previous: this.previousDir,
version: (this.meta && this.meta.version) || null,
previousVersion: (this.previousMeta && this.previousMeta.version) || null,
ts: Date.now()
};
const tmp = this.pointerPath + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
fs.renameSync(tmp, this.pointerPath);
}
_cleanup() {
try {
const keep = new Set([this.activeDir, this.previousDir].filter(Boolean));
for (const name of fs.readdirSync(this.packsDir)) {
if (!name.startsWith('pack-') || keep.has(name)) continue;
try {
fs.rmSync(this._dirPath(name), { recursive: true, force: true });
console.log('[PACK] Удалена старая версия:', name);
} catch (e) { console.warn('[PACK] Не удалось удалить', name, e.message); }
}
} catch (e) {}
}
async apply({ downloadUrl, tag, version }, onStatus = () => {}) {
if (!downloadUrl || !version) return { success: false, error: 'Не переданы данные релиза (downloadUrl/version)' };
const cleanVer = sanitizeVersion(version);
const tempDir = path.join(os.tmpdir(), `scene-pack-${Date.now()}`);
const archivePath = path.join(tempDir, 'pack.zip');
const extractDir = path.join(tempDir, 'extracted');
const stagingDir = path.join(this.packsDir, `.staging-${Date.now()}`);
const finalName = `pack-${cleanVer}-${Date.now()}`;
try {
fs.mkdirSync(extractDir, { recursive: true });
fs.mkdirSync(this.packsDir, { recursive: true });
onStatus({ stage: 'downloading', percent: 0, text: 'Скачивание пака сцен...' });
await downloadFile(downloadUrl, archivePath, (percent) => onStatus({ stage: 'downloading', percent, text: `Скачивание: ${percent}%` }));
onStatus({ stage: 'extracting', percent: 100, text: 'Распаковка пака...' });
await extractZip(archivePath, extractDir);
let sourceRoot = extractDir;
const top = fs.readdirSync(extractDir);
if (top.length === 1 && fs.statSync(path.join(extractDir, top[0])).isDirectory()) sourceRoot = path.join(extractDir, top[0]);
onStatus({ stage: 'validating', percent: 100, text: 'Валидация пака...' });
if (!fs.existsSync(path.join(sourceRoot, 'widgets'))) throw new Error('Архив не содержит папку widgets/ — это не пак сцен.');
let packManifest = {};
const manifestPath = path.join(sourceRoot, 'pack.json');
if (fs.existsSync(manifestPath)) {
try { packManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); }
catch (e) { console.warn('[PACK] pack.json повреждён, игнорирую:', e.message); }
}
const launcherVer = this.getLauncherVersion();
if (packManifest.minLauncherVersion && compareVersions(packManifest.minLauncherVersion, launcherVer) > 0) {
throw new Error(`Пак требует ядро лаунчера v${packManifest.minLauncherVersion}+ (у вас v${launcherVer}). Сначала обновите лаунчер.`);
}
onStatus({ stage: 'applying', percent: 100, text: 'Установка пака...' });
for (const dir of PACK_DIRS) {
const src = path.join(sourceRoot, dir);
if (fs.existsSync(src)) copyDirSync(src, path.join(stagingDir, dir));
}
const meta = {
version: cleanVer,
tag: tag || `pack-v${cleanVer}`,
appliedAt: Date.now(),
sourceUrl: downloadUrl,
minLauncherVersion: packManifest.minLauncherVersion || null
};
fs.writeFileSync(path.join(stagingDir, '_pack-meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
fs.renameSync(stagingDir, this._dirPath(finalName));
const oldActive = this.activeDir;
const oldMeta = this.meta;
this.previousDir = oldActive;
this.previousMeta = oldMeta;
this.activeDir = finalName;
this.meta = meta;
this._writePointer();
this._cleanup();
console.log(`[PACK] ✅ Активирован пак v${cleanVer} (${finalName}). Откат: ${oldActive || 'нет'}`);
onStatus({ stage: 'completed', percent: 100, text: `Пак сцен v${cleanVer} установлен!` });
this.emit('applied', { version: cleanVer, previousVersion: (oldMeta && oldMeta.version) || null, dirName: finalName });
return { success: true, version: cleanVer, dirName: finalName };
} catch (error) {
console.error('[PACK] Ошибка применения пака:', error);
onStatus({ stage: 'error', percent: 0, text: `Ошибка: ${error.message}` });
return { success: false, error: error.message };
} finally {
try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
try { if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (e) {}
}
}
async rollback() {
try {
if (!this.previousDir || !fs.existsSync(this._dirPath(this.previousDir))) {
return { success: false, error: 'Нет предыдущего пака для отката.' };
}
const oldActive = this.activeDir;
const oldMeta = this.meta;
this.activeDir = this.previousDir;
this.meta = this.previousMeta || this._readMeta(this.previousDir);
this.previousDir = oldActive;
this.previousMeta = oldMeta;
this._writePointer();
const version = (this.meta && this.meta.version) || '?';
console.log(`[PACK] ↩ Откат выполнен → v${version}`);
this.emit('rolledBack', { version, previousVersion: (oldMeta && oldMeta.version) || null, dirName: this.activeDir });
return { success: true, version };
} catch (e) {
console.error('[PACK] Ошибка отката:', e);
return { success: false, error: e.message };
}
}
}
module.exports = PackManager;