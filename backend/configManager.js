const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[CONFIG] Ошибка чтения конфига:', e);
  }
  // Вписали твой репозиторий по умолчанию
  return { obsPath: '', twitchChannel: 'ksusha__sher', githubRepo: 'Bagerca/New-vijet-launcher', widgets: {} };
}

function saveConfig(newConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('[CONFIG] Ошибка сохранения конфига:', e);
  }
}

module.exports = {
  getConfig,
  saveConfig
};