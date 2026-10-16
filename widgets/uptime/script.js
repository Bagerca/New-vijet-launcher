/* ФАЙЛ: widgets/uptime/script.js */
import { WidgetCore } from '../shared/WidgetCore.js';

function hexToRgb(hex) {
    let h = (hex || '#ff0050').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    
    return `${isNaN(r) ? 255 : r}, ${isNaN(g) ? 0 : g}, ${isNaN(b) ? 80 : b}`;
}

const AppUptime = {
    container: document.getElementById('uptime-container'),
    valueEl: document.getElementById('uptime-value'),
    textEl: document.getElementById('up-text'),
    
    startTime: null,
    timerInterval: null,
    isTestMode: false,
    isLive: false,
    twitchChannel: "",

    init: function() {
        setInterval(() => this.fetchStreamStatus(), 30000);
        this.timerInterval = setInterval(() => this.tick(), 1000);
    },

    applyConfig: function(config, twitchChannel) {
        this.twitchChannel = twitchChannel;
        if (!config) return;

        const isOff = config.isActive === false || String(config.isActive) === 'false';
        if (isOff) {
            this.container.classList.add('hidden');
            return;
        }

        // Применяем кастомный цвет глобально (document.documentElement), 
        // чтобы OBS мгновенно применял изменения без перезагрузки
        if (config.accentColor) {
            const hex = config.accentColor.startsWith('#') ? config.accentColor : `#${config.accentColor}`;
            document.documentElement.style.setProperty('--uptime-accent', hex);
            document.documentElement.style.setProperty('--uptime-accent-rgb', hexToRgb(hex));
        } else {
            document.documentElement.style.setProperty('--uptime-accent', '#FF0050');
            document.documentElement.style.setProperty('--uptime-accent-rgb', '255, 0, 80');
        }

        if (config.testMode === true || String(config.testMode) === 'true') {
            this.enableTestMode();
        } else {
            this.isTestMode = false;
            this.fetchStreamStatus();
        }
    },

    setUIState: function(isLive) {
        if (isLive) {
            this.container.classList.add('is-live');
            this.container.classList.remove('is-offline');
            this.textEl.innerText = 'В ЭФИРЕ';
        } else {
            this.container.classList.add('is-offline');
            this.container.classList.remove('is-live');
            this.textEl.innerText = 'ОФФЛАЙН';
        }
    },

    fetchStreamStatus: async function() {
        if (this.isTestMode || !this.twitchChannel) return;

        try {
            const cleanChannel = this.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
            const response = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${cleanChannel}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const user = data[0];
                    if (user.stream && user.stream.createdAt) {
                        this.startTime = new Date(user.stream.createdAt).getTime();
                        this.isLive = true;
                        this.setUIState(true);
                        this.container.classList.remove('hidden');
                    } else {
                        this.isLive = false;
                        this.startTime = null;
                        this.valueEl.innerText = "00:00:00";
                        this.setUIState(false);
                        this.container.classList.remove('hidden');
                    }
                }
            }
        } catch (err) {
            console.warn("[Uptime] Не удалось получить статус стрима.");
        }
    },

    enableTestMode: function() {
        this.isTestMode = true;
        this.isLive = true;
        this.startTime = Date.now() - (1 * 3600 + 23 * 60 + 45) * 1000;
        this.setUIState(true);
        this.container.classList.remove('hidden');
        this.tick();
    },

    tick: function() {
        if (!this.isLive || !this.startTime) return;

        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (elapsed < 0) return;

        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        const pad = (num) => String(num).padStart(2, '0');

        if (hours > 0) {
            this.valueEl.innerText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        } else {
            this.valueEl.innerText = `${pad(minutes)}:${pad(seconds)}`;
        }
    }
};

AppUptime.init();

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ЧЕРЕЗ ЯДРО
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.uptime) AppUptime.applyConfig(config.widgets.uptime, config.twitchChannel);
    },

    onTwitchCommand: (cmd, args) => {
        let conf = { ...(WidgetCore.globalConfig.widgets.uptime || {}) };
        let changed = false;

        if (cmd === '!uptime') {
            const arg = args[0] ? args[0].toLowerCase() : null;
            if (arg === 'on') { conf.isActive = true; changed = true; }
            else if (arg === 'off') { conf.isActive = false; changed = true; }
            else { conf.isActive = !(conf.isActive === true || String(conf.isActive) === 'true'); changed = true; }
        }
        else if (cmd === '!uptimetest') {
            const arg = args[0] ? args[0].toLowerCase() : null;
            if (arg === 'on') { conf.testMode = true; changed = true; }
            else if (arg === 'off') { conf.testMode = false; changed = true; }
            else { conf.testMode = !(conf.testMode === true || String(conf.testMode) === 'true'); changed = true; }
        }
        else if (cmd === '!uptimec' && args[0]) {
            let color = args[0];
            if (!color.startsWith('#')) color = `#${color}`;
            conf.accentColor = color;
            changed = true;
        }

        if (changed) {
            WidgetCore.updateWidgetConfig('uptime', conf);
        }
    }
});