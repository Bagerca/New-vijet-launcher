/* ФАЙЛ: backend/updateManager.js — v2 (два канала: ядро и пак сцен; общие хелперы экспортированы) */
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');
const configManager = require('./configManager');
const rootDir = path.join(__dirname, '..');
const versionFilePath = path.join(rootDir, 'version.json');
const PACK_TAG_RE = /^pack-v/i;
function getLocalVersionInfo() {
try {
if (fs.existsSync(versionFilePath)) return JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
} catch (e) {
console.error('[UPDATER] Ошибка чтения version.json:', e);
}
return { version: '1.0.0', githubRepo: 'Bagerca/New-vijet-launcher', channel: 'stable' };
}
function compareVersions(v1, v2) {
const clean = v => String(v || '').replace(/^(?:pack-)?v/i, '').split('.').map(n => parseInt(n, 10) || 0);
const p1 = clean(v1);
const p2 = clean(v2);
const len = Math.max(p1.length, p2.length);
for (let i = 0; i < len; i++) {
const n1 = p1[i] || 0;
const n2 = p2[i] || 0;
if (n1 > n2) return 1;
if (n1 < n2) return -1;
}
return 0;
}
function fetchJson(url) {
return new Promise((resolve, reject) => {
const options = { headers: { 'User-Agent': 'Stream-Launcher-AutoUpdater', 'Accept': 'application/vnd.github.v3+json' } };
https.get(url, options, (res) => {
if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
res.resume();
return fetchJson(res.headers.location).then(resolve).catch(reject);
}
if (res.statusCode !== 200) { res.resume(); return reject(new Error(`GitHub API вернул статус ${res.statusCode}`)); }
let rawData = '';
res.on('data', chunk => rawData += chunk);
res.on('end', () => { try { resolve(JSON.parse(rawData)); } catch (e) { reject(e); } });
}).on('error', reject);
});
}
async function fetchReleases(repo) {
const list = await fetchJson(`https://api.github.com/repos/${repo}/releases?per_page=30`);
if (!Array.isArray(list)) throw new Error('Некорректный ответ GitHub API (ожидался массив релизов)');
return list;
}
async function checkForUpdates(customRepo = null) {
const localInfo = getLocalVersionInfo();
const repo = customRepo || localInfo.githubRepo;
if (!repo || repo === 'ksusha-sher/stream-launcher') {
return { hasUpdate: false, currentVersion: localInfo.version, latestVersion: localInfo.version, releaseNotes: 'Укажите актуальный репозиторий GitHub в настройках.', downloadUrl: null };
}
try {
const releases = await fetchReleases(repo);
const latestRelease = releases.find(r => !r.draft && !PACK_TAG_RE.test(r.tag_name || ''));
if (!latestRelease) {
return { hasUpdate: false, currentVersion: localInfo.version, latestVersion: localInfo.version, releaseNotes: 'Релизы ядра не найдены.', downloadUrl: null };
}
const latestTag = latestRelease.tag_name || latestRelease.name || '1.0.0';
const isNewer = compareVersions(latestTag, localInfo.version) > 0;
let downloadUrl = null;
if (Array.isArray(latestRelease.assets) && latestRelease.assets.length > 0) {
const zipAsset = latestRelease.assets.find(a => a.name.endsWith('.zip') && a.name !== 'scene-pack.zip');
if (zipAsset) downloadUrl = zipAsset.browser_download_url;
}
if (!downloadUrl) downloadUrl = latestRelease.zipball_url;
return { hasUpdate: isNewer, currentVersion: localInfo.version, latestVersion: latestTag, releaseNotes: latestRelease.body || 'Новые исправления и обновления виджетов.', downloadUrl };
} catch (error) {
console.warn('[UPDATER] Проверка обновлений завершилась с ошибкой:', error.message);
return { hasUpdate: false, currentVersion: localInfo.version, error: error.message };
}
}
function downloadFile(url, destPath, onProgress) {
return new Promise((resolve, reject) => {
const fileStream = fs.createWriteStream(destPath);
const options = { headers: { 'User-Agent': 'Stream-Launcher-AutoUpdater' } };
const request = https.get(url, options, (response) => {
if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
fileStream.close();
try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) {}
return downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
}
if (response.statusCode !== 200) {
fileStream.close();
try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) {}
return reject(new Error(`Ошибка скачивания: HTTP ${response.statusCode}`));
}
const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
let downloadedBytes = 0;
response.on('data', (chunk) => {
downloadedBytes += chunk.length;
if (totalBytes > 0 && typeof onProgress === 'function') onProgress(Math.round((downloadedBytes / totalBytes) * 100));
});
response.pipe(fileStream);
fileStream.on('finish', () => fileStream.close(() => resolve(destPath)));
});
request.on('error', (err) => {
fileStream.close();
try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch (e) {}
reject(err);
});
});
}
function extractZip(archivePath, destDir) {
return new Promise((resolve, reject) => {
const safeArchive = archivePath.replace(/'/g, "''");
const safeDest = destDir.replace(/'/g, "''");
const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force"`;
exec(cmd, (error) => {
if (error) return reject(new Error(`Ошибка распаковки PowerShell: ${error.message}`));
resolve();
});
});
}
function copyFolderRecursiveSync(source, target, skipFiles = ['config.json', '.git', '.electron-data', 'node_modules', 'packs']) {
if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
for (const item of fs.readdirSync(source)) {
if (skipFiles.includes(item)) continue;
const srcPath = path.join(source, item);
const dstPath = path.join(target, item);
if (fs.statSync(srcPath).isDirectory()) copyFolderRecursiveSync(srcPath, dstPath, skipFiles);
else fs.copyFileSync(srcPath, dstPath);
}
}
async function performUpdate(downloadUrl, onStatusUpdate) {
const tempDir = path.join(os.tmpdir(), `stream-launcher-upd-${Date.now()}`);
const archivePath = path.join(os.tmpdir(), `update-${Date.now()}.zip`);
const extractDir = path.join(tempDir, 'extracted');
try {
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(extractDir, { recursive: true });
onStatusUpdate({ stage: 'downloading', percent: 0, text: 'Скачивание пакета обновления...' });
await downloadFile(downloadUrl, archivePath, (percent) => onStatusUpdate({ stage: 'downloading', percent, text: `Скачивание: ${percent}%` }));
onStatusUpdate({ stage: 'extracting', percent: 100, text: 'Распаковка файлов оверлеев...' });
await extractZip(archivePath, extractDir);
let sourceRoot = extractDir;
const extractedContents = fs.readdirSync(extractDir);
if (extractedContents.length === 1 && fs.statSync(path.join(extractDir, extractedContents[0])).isDirectory()) {
sourceRoot = path.join(extractDir, extractedContents[0]);
}
onStatusUpdate({ stage: 'applying', percent: 100, text: 'Применение виджетов и стилей...' });
copyFolderRecursiveSync(sourceRoot, rootDir, ['config.json', '.git', '.electron-data', 'node_modules', 'packs']);
const newVersionFile = path.join(sourceRoot, 'version.json');
if (fs.existsSync(newVersionFile)) {
try {
const newVerData = JSON.parse(fs.readFileSync(newVersionFile, 'utf-8'));
fs.writeFileSync(versionFilePath, JSON.stringify(newVerData, null, 2), 'utf-8');
} catch (e) {}
}
configManager.saveConfig(configManager.getConfig());
onStatusUpdate({ stage: 'completed', percent: 100, text: 'Обновление успешно установлено!' });
return { success: true };
} catch (error) {
console.error('[UPDATER] Критическая ошибка обновления:', error);
onStatusUpdate({ stage: 'error', percent: 0, text: `Ошибка: ${error.message}` });
return { success: false, error: error.message };
} finally {
try { if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath); } catch (e) {}
try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
}
}
module.exports = {
getLocalVersionInfo, checkForUpdates, performUpdate,
compareVersions, fetchJson, fetchReleases, downloadFile, extractZip, PACK_TAG_RE
};