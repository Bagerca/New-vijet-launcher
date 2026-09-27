let currentClient = null;
let currentChannel = null;
let globalWs = null;
let globalConfigData = null;

const AppEmotes = {
    container: document.getElementById('emotes-container'),
    mode: "bubble",
    enabled: true,
    activeEmotesCount: 0, 
    MAX_GLOBAL_EMOTES: 100, 
    maxSpawnPerMsg: 20,

    init: function() {
        // Подключаем слушатели LocalStorage для Live Preview тестов
        fetch('/api/config')
          .then(res => res.json())
          .then(config => {
              globalConfigData = config;
              this.applyConfig(config.widgets?.emotes || {});
              initTMI(config);
              connectWS();
          })
          .catch(() => {
              const saved = localStorage.getItem('stream_pack_config');
              if (saved) {
                  const conf = JSON.parse(saved);
                  this.applyConfig(conf.widgets?.emotes || {});
              }
              connectWS();
          });

        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_config' && e.newValue) {
                const conf = JSON.parse(e.newValue);
                this.applyConfig(conf.widgets?.emotes || {});
            }
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.action === 'TEST_EMOTES') {
                        // Фейковый объект с популярными ID смайлов для теста
                        const fakeEmotes = { "25": ["0-4", "6-10"], "30259": ["12-16"], "86": ["18-22"] };
                        this.spawn(fakeEmotes);
                    }
                } catch(err){}
            }
        });
    },

    applyConfig: function(config) {
        if (config.mode) this.mode = config.mode;
        if (config.enabled !== undefined) this.enabled = String(config.enabled) === 'true';
        if (config.maxEmotes) this.maxSpawnPerMsg = parseInt(config.maxEmotes) || 20;
    },

    spawn: function(emotesData) {
        if (!this.enabled || !emotesData || !this.container) return;
        if (this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) return;

        let emoteIds = Object.keys(emotesData);
        if (emoteIds.length === 0) return;

        let spawned = 0;
        let delayIndex = 0;
        const fragment = document.createDocumentFragment();

        for (let id of emoteIds) {
            let count = emotesData[id].length; 
            for (let i = 0; i < count; i++) {
                if (spawned >= this.maxSpawnPerMsg || this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) break;
                this.createEmoteDOM(id, delayIndex, fragment);
                spawned++;
                delayIndex++;
            }
            if (spawned >= this.maxSpawnPerMsg || this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) break;
        }
        
        this.container.appendChild(fragment);
    },

    createEmoteDOM: function(id, delayIndex, fragment) {
        this.activeEmotesCount++;
        const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;
        const wrap = document.createElement('div');
        const img = document.createElement('img');
        img.src = emoteUrl;

        const staggerDelay = delayIndex * (0.05 + Math.random() * 0.03); 
        let fallBackDestroyTime = 0;
        
        if (this.mode === 'bubble') {
            wrap.className = 'emote-bubble';
            const size = Math.random(); 
            const scale = 0.5 + size * 1.5; 
            const duration = 5 + (1 - size) * 5; 
            
            let blur = '0px';
            if (size > 0.85) blur = `${(size - 0.8) * 20}px`; 
            else if (size < 0.2) blur = '2px'; 
            
            const xPos = 5 + Math.random() * 90; 
            const swayDir = Math.random() > 0.5 ? 1 : -1; 
            
            wrap.style.left = `${xPos}%`;
            wrap.style.animationDelay = `${staggerDelay}s`;
            wrap.style.setProperty('--e-dur', `${duration}s`);
            
            img.style.setProperty('--e-blur', blur);
            img.style.setProperty('--e-scale', scale);
            img.style.setProperty('--e-dir', swayDir);
            wrap.appendChild(img);
            
            fallBackDestroyTime = (duration + staggerDelay + 1) * 1000;
        } 
        else if (this.mode === 'fountain') {
            wrap.className = 'emote-fountain-x';
            img.className = 'emote-fountain-y';
            
            const dir = Math.random() > 0.5 ? 1 : -1;
            const distanceX = (100 + Math.random() * 600) * dir; 
            const peakY = -300 - Math.random() * 600; 
            const rot = (Math.random() * 720 - 360); 
            const scale = 0.7 + Math.random() * 1.2; 
            
            const startOffsetX = (Math.random() - 0.5) * 100;
            wrap.style.left = `calc(50% + ${startOffsetX}px)`;
            wrap.style.animationDelay = `${staggerDelay}s`;
            img.style.animationDelay = `${staggerDelay}s`;
            
            wrap.style.setProperty('--f-x', `${distanceX}px`);
            img.style.setProperty('--f-y', `${peakY}px`);
            img.style.setProperty('--f-rot', `${rot}deg`);
            img.style.setProperty('--f-scale', scale);
            wrap.appendChild(img);
            
            fallBackDestroyTime = (3 + staggerDelay + 1) * 1000;
        }

        fragment.appendChild(wrap);

        let isDestroyed = false;
        const destroyEmote = () => {
            if (isDestroyed) return;
            isDestroyed = true;
            img.src = ''; 
            wrap.remove();
            this.activeEmotesCount--;
            if (this.activeEmotesCount < 0) this.activeEmotesCount = 0;
        };

        wrap.addEventListener('animationend', (e) => {
            if (e.target === wrap) destroyEmote();
        });

        setTimeout(destroyEmote, fallBackDestroyTime);
    }
};

async function initTMI(config) {
    if (!config.twitchChannel) return;
    const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    
    if (currentChannel === channel) return;
    currentChannel = channel;
    
    if (currentClient) await currentClient.disconnect();
    
    currentClient = new tmi.Client({ channels: [channel] });
    
    currentClient.on('message', (chan, tags, message) => {
        if (tags.emotes) {
            AppEmotes.spawn(tags.emotes);
        }

        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        
        if (isMod && (msgLow.startsWith('!emotes ') || msgLow.startsWith('!смайлы '))) {
            const arg = msgLow.split(' ')[1];
            if (globalWs && globalWs.readyState === WebSocket.OPEN && globalConfigData) {
                if (!globalConfigData.widgets.emotes) globalConfigData.widgets.emotes = {};
                
                let changed = false;
                if (['bubble', 'fountain'].includes(arg)) {
                    globalConfigData.widgets.emotes.mode = arg;
                    changed = true;
                } else if (['on', 'off'].includes(arg)) {
                    globalConfigData.widgets.emotes.enabled = (arg === 'on') ? 'true' : 'false';
                    changed = true;
                }
                
                if (changed) globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
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
                if (message.data.widgets?.emotes) AppEmotes.applyConfig(message.data.widgets.emotes);
            }
        } catch (e) {}
    };
    
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

AppEmotes.init();