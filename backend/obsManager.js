/* ФАЙЛ: backend/obsManager.js — v5 (ФАСАД: публичный API OBS, реализация в backend/obs/) */
const { runObsSetup } = require('./obs/setupScenes');
const { runExternalApply } = require('./obs/applyExternal');
const { exportLayout } = require('./obs/exportLayout');

module.exports = { runObsSetup, runExternalApply, exportLayout };