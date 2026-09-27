import { icons } from '/js/utils/icons.js';

// Конвертер из HEX в "R, G, B" строку для использования в rgba(var(--blur-rgb), alpha)
function hexToRgb(hex) {
    let h = (hex || '#ff4d85').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substring(0, 2), 16) || 255;
    const g = parseInt(h.substring(2, 4), 16) || 77;
    const b = parseInt(h.substring(4, 6), 16) || 133;
    return `${r}, ${g}, ${b}`;
}

const AppBlur = {
    container: document.getElementById('screen-blur-overlay'),
    titleEl: document.getElementById('blur-title-el'),
    subEl: document.getElementById('blur-sub-el'),

    init: function(config) {
        // Устанавливаем иконку централизованно
        document.getElementById('blur-icon-slot').innerHTML = icons.lock();

        if (config.enabled !== undefined) {
            this.toggle(String(config.enabled) === 'true');
        }
        
        if (config.title !== undefined) this.titleEl.textContent = config.title;
        if (config.subtitle !== undefined) this.subEl.textContent = config.subtitle;
        
        if (config.accentColor) {
            const rgb = hexToRgb(config.accentColor);
            document.documentElement.style.setProperty('--blur-rgb', rgb);
        }
    },

    toggle: function(isActive) {
        if (!this.container) return;
        if (isActive) {
            this.container.classList.add('blur-active');
        } else {
            this.container.classList.remove('blur-active');
        }
    }
};

let currentClient = null;
let currentChannel = null;
let globalWs = null;
let globalConfigData = null;

async function initTMI(config) {
    if (!config.twitchChannel) return;
    const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    
    if (currentChannel === channel) return;
    currentChannel = channel;
    
    if (currentClient) await currentClient.disconnect();
    
    currentClient = new tmi.Client({ channels: [channel] });
    
    currentClient.on('message', (chan, tags, message) => {
        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        
        // Обработка команд чата для приватного режима
        if (isMod && (msgLow.startsWith('!blur') || msgLow.startsWith('!блюр'))) {
            const parts = msgLow.split(' ');
            const arg = parts[1]; 
            
            let newState = null;
            if (arg === 'on') newState = 'true';
            else if (arg === 'off') newState = 'false';
            else {
                // Если аргумент не указан, работает как тумблер (toggle)
                const currentState = globalConfigData.widgets.blur?.enabled === 'true';
                newState = currentState ? 'false' : 'true';
            }

            if (newState !== null && globalWs && globalWs.readyState === WebSocket.OPEN && globalConfigData) {
                if (!globalConfigData.widgets.blur) globalConfigData.widgets.blur = {};
                globalConfigData.widgets.blur.enabled = newState;
                globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
            }
        }
    });
    
    await currentClient.connect();
}

function connectWS() {
    globalWs = new WebSocket('ws://localhost:42069');
    
    globalWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.event === 'CONFIG_UPDATED') {
                globalConfigData = message.data;
                initTMI(message.data);
                
                const bConf = message.data.widgets?.blur;
                if (bConf) AppBlur.init(bConf);
            }
        } catch (e) { console.error(e); }
    };
    
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

// Первичная загрузка
fetch('http://localhost:42069/api/config')
    .then(res => res.json())
    .then(config => {
        globalConfigData = config;
        AppBlur.init(config.widgets?.blur || {});
        initTMI(config);
        connectWS();
    })
    .catch(() => {
        AppBlur.init({});
        connectWS();
    });