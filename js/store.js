import { widgetsManifest } from '../data/widgetsManifest.js';

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return deepMerge(target, ...sources);
}

export class Store {
  constructor() {
    this.STORAGE_KEY = 'stream_pack_config';
    this.ACTION_KEY = 'stream_pack_action';
    this.state = {
      isProcessing: false,
      obsStatus: 'disconnected', 
      logs: [],
      logFilter: 'all',
      widgetsManifest: widgetsManifest,
      config: {
        obsPath: '',
        twitchChannel: 'ksusha__sher',
        githubRepo: 'Bagerca/New-vijet-launcher',
        widgets: {}
      },
      updateInfo: {
        hasUpdate: false,
        isChecking: false,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        releaseNotes: '',
        downloadUrl: null,
        isUpdating: false,
        progressPercent: 0,
        statusText: ''
      },
      isElectronEnv: typeof window !== 'undefined' && Boolean(window.obsAPI)
    };
    this.listeners = new Set();
    
    this._lastSaveTime = 0;
    this._saveTimeout = null;
    
    this._initializeDefaults();
    this._loadStandaloneConfig();

    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          this.syncFromRemote(newConfig);
        } catch(err) {}
      }
    });
  }

  _sanitizeWidgetsConfig(widgetsConfig) {
    if (!widgetsConfig) return {};
    const sanitized = deepMerge({}, widgetsConfig);
    
    this.state.widgetsManifest.forEach(widget => {
      if (sanitized[widget.id]) {
        widget.controls.forEach(control => {
          if (control.type === 'button') return;
          const val = sanitized[widget.id][control.key];
          if (val !== undefined) {
            if (control.type === 'checkbox') {
              sanitized[widget.id][control.key] = (val === true || String(val).toLowerCase() === 'true');
            } else if (control.type === 'number' || control.type === 'range') {
              const parsed = Number(val);
              sanitized[widget.id][control.key] = isNaN(parsed) ? control.default : parsed;
            } else {
              sanitized[widget.id][control.key] = String(val);
            }
          }
        });
      }
    });
    return sanitized;
  }

  _initializeDefaults() {
    this.state.widgetsManifest.forEach(widget => {
      if (!this.state.config.widgets[widget.id]) {
        this.state.config.widgets[widget.id] = {};
      }
      widget.controls.forEach(control => {
        if (control.type !== 'button' && this.state.config.widgets[widget.id][control.key] === undefined) {
          this.state.config.widgets[widget.id][control.key] = control.default;
        }
      });
    });
  }

  _loadStandaloneConfig() {
    if (!this.state.isElectronEnv) {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.state.config = deepMerge({}, this.state.config, parsed);
          this.state.config.widgets = this._sanitizeWidgetsConfig(this.state.config.widgets);
        }
      } catch(e) {}
    }
  }

  getState() { return this.state; }
  
  setState(newStatePartial) {
    this.state = { ...this.state, ...newStatePartial };
    this.notify();
  }

  setUpdateInfo(info) {
    this.state.updateInfo = { ...this.state.updateInfo, ...info };
    this.notify();
  }

  async updateConfig(newConfigPartial) {
    const mergedConfig = deepMerge({}, this.state.config, newConfigPartial);
    if (newConfigPartial.widgets) {
      mergedConfig.widgets = this._sanitizeWidgetsConfig(mergedConfig.widgets);
    }
    
    this.state.config = mergedConfig;
    this.notify();

    const now = Date.now();
    const throttleMs = 100;

    const performSave = async () => {
      this._lastSaveTime = Date.now();
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state.config)); } catch(e){}

      if (this.state.isElectronEnv) {
        try {
          await window.obsAPI.saveConfig(this.state.config);
        } catch (err) {
          this.addLog(`Ошибка сохранения в ядро: ${err.message}`, 'error');
        }
      }
    };

    if (now - this._lastSaveTime > throttleMs) {
      clearTimeout(this._saveTimeout);
      await performSave();
    } else {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(performSave, throttleMs);
    }
  }

  syncFromRemote(newConfig) {
    const mergedConfig = deepMerge({}, this.state.config, newConfig);
    if (newConfig.widgets) mergedConfig.widgets = this._sanitizeWidgetsConfig(mergedConfig.widgets);
    this.state.config = mergedConfig;
    this.notify();
  }
  
  resetWidgetToDefaults(widgetId) {
    const manifest = this.state.widgetsManifest.find(w => w.id === widgetId);
    if (!manifest) return;
    
    const newWidgetConfig = {};
    manifest.controls.forEach(c => { 
      if (c.type !== 'button') newWidgetConfig[c.key] = c.default; 
    });
    
    const newWidgets = { [widgetId]: newWidgetConfig };
    this.updateConfig({ widgets: newWidgets });
    this.addLog(`Виджет "${manifest.title}" сброшен до заводских настроек.`, 'success');
  }

  broadcastAction(action, payload) {
    const data = { event: 'WIDGET_ACTION', action, payload, ts: Date.now() };
    try { localStorage.setItem(this.ACTION_KEY, JSON.stringify(data)); } catch(e){}
    this.addLog(`Тестовое событие отправлено: ${action}`, 'info');
  }

  addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString('ru-RU');
    this.setState({ logs: [...this.state.logs, { time, message, type }] });
  }

  clearLogs() { this.setState({ logs: [] }); }
  
  subscribe(listener) { 
    this.listeners.add(listener); 
    return () => this.listeners.delete(listener);
  }
  
  notify() { this.listeners.forEach(l => l(this.state)); }
}

export const store = new Store();