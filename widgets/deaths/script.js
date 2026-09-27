function restartAnimation(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth; 
    element.classList.add(className);
}

let globalWs = null;
let globalConfigData = null;

const AppDeaths = {
    container: document.getElementById('deaths-container'),
    countText: document.getElementById('deaths-count'),
    comboEl: document.getElementById('deaths-combo'),
    
    count: 0,
    isVisible: false,
    comboCount: 0,
    comboTimer: null,

    init: function(config) {
        if (config.enabled !== undefined) {
            // Надежный парсинг boolean и string('true')
            const isEnabled = config.enabled === true || String(config.enabled) === 'true';
            this.toggle(isEnabled);
        }
        if (config.color) {
            document.documentElement.style.setProperty('--death-color', config.color);
        }

        const newCount = parseInt(config.deathsCount) || 0;
        if (newCount > this.count) this.handleHit(newCount - this.count);
        this.count = Math.max(0, newCount);
        this.render();
    },

    toggle: function(forceState) {
        if (!this.container) return;
        const newState = forceState !== undefined ? forceState : !this.isVisible;
        
        if (newState && !this.isVisible) {
            // Если включили (из лаунчера или чата) - дергаем анимацию, чтобы было видно в OBS
            this.container.classList.remove('hidden');
            restartAnimation(this.countText, 'animate-pop-red');
        } else if (!newState) {
            this.container.classList.add('hidden');
        }
        this.isVisible = newState;
    },

    handleHit: function(delta) {
        if (!this.isVisible) this.toggle(true);

        restartAnimation(this.container, 'damage-shake');

        this.comboCount += delta;
        if (this.comboCount > 1) {
            this.comboEl.innerText = `x${this.comboCount} COMBO!`;
            this.comboEl.classList.remove('hidden');
            restartAnimation(this.comboEl, 'combo-pop');
        }

        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => {
            this.comboCount = 0;
            this.comboEl.classList.add('hidden');
        }, 8000);

        if (!document.hidden) {
            try {
                const audio = new Audio('/data/sounds/death.mp3');
                audio.volume = 0.6;
                audio.play().catch(e => {});
            } catch (e) {}
        }

        if (globalWs && globalWs.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_EMOTION', payload: { emotion: 'scared', duration: 4000 } }));
        }
    },

    render: function() {
        if (this.countText.innerText !== String(this.count)) {
            this.countText.innerText = this.count;
            restartAnimation(this.countText, 'animate-pop-red');
        }
    }
};

let currentClient = null;
let currentChannel = null;

async function initTMI(config) {
    if (!config.twitchChannel) return;
    const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    
    if (currentChannel === channel) return;
    currentChannel = channel;
    if (currentClient) await currentClient.disconnect();
    
    currentClient = new tmi.Client({ channels: [channel] });
    currentClient.on('message', (chan, tags, message) => {
        // Проверка прав: модератор или владелец канала
        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1') || (tags.username === channel);
        const msgLow = message.trim().toLowerCase();
        
        if (isMod) {
            const isDeathCommand = msgLow === '!death' || msgLow === '!deaths' || msgLow === '!смерть' || msgLow.startsWith('!death ') || msgLow.startsWith('!смерть ');
            
            if (isDeathCommand) {
                const parts = msgLow.split(' ');
                const arg = parts[1];
                
                if (globalWs && globalWs.readyState === WebSocket.OPEN && globalConfigData) {
                    if (!globalConfigData.widgets.deaths) globalConfigData.widgets.deaths = { deathsCount: 0, enabled: 'false' };
                    let currentCount = parseInt(globalConfigData.widgets.deaths.deathsCount) || 0;
                    let changed = false;

                    if (!arg || arg === '+') { 
                        globalConfigData.widgets.deaths.deathsCount = currentCount + 1; 
                        globalConfigData.widgets.deaths.enabled = 'true'; // Принудительно включаем при +1
                        changed = true; 
                    } 
                    else if (arg === '-' || arg === 'sub') { 
                        globalConfigData.widgets.deaths.deathsCount = Math.max(0, currentCount - 1); 
                        changed = true; 
                    } 
                    else if (arg === 'reset' || arg === 'clear') { 
                        globalConfigData.widgets.deaths.deathsCount = 0; 
                        changed = true; 
                    } 
                    else if (arg === 'set' && parts[2]) { 
                        const val = parseInt(parts[2]); 
                        if (!isNaN(val)) { 
                            globalConfigData.widgets.deaths.deathsCount = Math.max(0, val); 
                            globalConfigData.widgets.deaths.enabled = 'true';
                            changed = true; 
                        } 
                    } 
                    else if (arg === 'on' || arg === 'show') { 
                        globalConfigData.widgets.deaths.enabled = 'true'; 
                        changed = true; 
                    } 
                    else if (arg === 'off' || arg === 'hide') { 
                        globalConfigData.widgets.deaths.enabled = 'false'; 
                        changed = true; 
                    }

                    if (changed) globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
                }
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
                const dConf = message.data.widgets?.deaths;
                if (dConf) AppDeaths.init(dConf);
            }
        } catch (e) { }
    };
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

fetch('http://localhost:42069/api/config').then(res => res.json()).then(config => {
    globalConfigData = config;
    AppDeaths.init(config.widgets?.deaths || {});
    initTMI(config); connectWS();
}).catch(() => { AppDeaths.init({}); connectWS(); });