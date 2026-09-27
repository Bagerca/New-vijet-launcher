let globalWs = null;
const frameContainer = document.getElementById('webcam-container');

const AppPet = {
    container: document.getElementById('pet-container'),
    baseStack: ['idle'], 
    activeState: null,
    currentPriority: 0,
    savedState: null,
    
    particleInterval: null,
    emotionTimeout: null,
    sleepTimer: null,

    priorities: {
        'angry': 10, 'scared': 9, 'nom': 8,
        'love': 5, 'greet': 4, 'bye': 4, 'alert': 3, 'hype': 1
    },

    config: { enabled: true, sleepTimeout: 120, feedRewardName: "Покормить лису", vipUsers: [], forbiddenWords: [] },

    init: function() {
        this.resetSleepTimer();
        window.addEventListener('click', () => this.wakeUp());

        // Слушатель LocalStorage для кнопок "Тест"
        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.action === 'PET_EMOTION') {
                        this.setEmotion(data.payload.emotion, data.payload.duration);
                    } else if (data.action === 'PET_BASE_STATE') {
                        this.setBaseState(data.payload.state, data.payload.active);
                    }
                } catch(err){}
            }
        });
    },

    updateConfig: function(petConf) {
        if (!petConf) return;
        this.config.enabled = petConf.enabled !== false && String(petConf.enabled) !== 'false';
        if (this.container) {
            if (this.config.enabled) this.container.classList.remove('hidden');
            else this.container.classList.add('hidden');
        }

        this.config.sleepTimeout = parseInt(petConf.sleepTimeout) || 120;
        this.config.feedRewardName = petConf.feedRewardName || "Покормить лису";
        
        if (petConf.vipUsers) this.config.vipUsers = petConf.vipUsers.split(',').map(s => s.trim().toLowerCase());
        if (petConf.forbiddenWords) this.config.forbiddenWords = petConf.forbiddenWords.split(',').map(s => s.trim().toLowerCase());
    },

    setBaseState: function(state, active) {
        if (active) {
            if (!this.baseStack.includes(state)) this.baseStack.push(state);
        } else {
            this.baseStack = this.baseStack.filter(s => s !== state);
        }
        if (!this.activeState) this.applyVisualState(this.baseStack[this.baseStack.length - 1]);
    },

    setEmotion: function(state, durationMs = 0) {
        if (!this.container || !this.config.enabled) return;
        this.resetSleepTimer();

        const incomingPriority = this.priorities[state] || 1;
        if (this.activeState && incomingPriority <= this.currentPriority) return; 

        if (this.activeState && this.savedState === null && this.emotionTimeout) {
            this.savedState = { emotion: this.activeState, priority: this.currentPriority, timeLeft: 2000 };
        }

        clearTimeout(this.emotionTimeout);
        this.activeState = state;
        this.currentPriority = incomingPriority;

        this.applyVisualState(state);

        if (durationMs > 0) {
            this.emotionTimeout = setTimeout(() => {
                if (this.savedState) {
                    const nextState = this.savedState;
                    this.savedState = null;
                    this.activeState = null;
                    this.currentPriority = 0;
                    this.setEmotion(nextState.emotion, nextState.timeLeft);
                } else {
                    this.activeState = null;
                    this.currentPriority = 0;
                    this.applyVisualState(this.baseStack[this.baseStack.length - 1]);
                }
            }, durationMs);
        }
    },

    applyVisualState: function(state) {
        clearInterval(this.particleInterval);
        this.container.className = '';
        this.container.classList.add(`state-${state}`);

        if (state === 'sleep') this.particleInterval = setInterval(() => this.spawnParticle('Z', 'part-zzz', 60, 50), 800);
        if (state === 'alert') this.spawnParticle('!', 'part-alert', 55, 10);
        if (state === 'love') this.particleInterval = setInterval(() => this.spawnParticle('❤', 'part-heart', 50 + Math.random()*20, 20), 400);
        if (state === 'greet') this.particleInterval = setInterval(() => this.spawnParticle('👋', 'part-greet', 50 + Math.random()*15, 20), 600);
        if (state === 'bye') this.particleInterval = setInterval(() => this.spawnParticle('💜', 'part-bye', 50 + Math.random()*15, 20), 800);
        if (state === 'jam') this.particleInterval = setInterval(() => this.spawnParticle('🎵', 'part-note', 45 + Math.random()*25, 10), 600);
        if (state === 'listen') this.particleInterval = setInterval(() => this.spawnParticle('?', 'part-question', 60 + Math.random()*10, 10), 1500);
        if (state === 'nom') {
            this.particleInterval = setInterval(() => {
                const icon = Math.random() > 0.5 ? '🍪' : '✨';
                this.spawnParticle(icon, 'part-cookie', 80, 40);
            }, 300);
        }
    },

    wakeUp: function() {
        if (this.baseStack.includes('sleep')) {
            this.setBaseState('sleep', false);
            this.setEmotion('alert', 2000); 
        }
        this.resetSleepTimer();
    },

    resetSleepTimer: function() {
        clearTimeout(this.sleepTimer);
        if (this.baseStack.includes('sleep')) this.setBaseState('sleep', false);
        
        this.sleepTimer = setTimeout(() => {
            if (this.baseStack[this.baseStack.length - 1] === 'idle' && !this.activeState) {
                this.setBaseState('sleep', true);
            }
        }, this.config.sleepTimeout * 1000);
    },

    spawnParticle: function(text, cssClass, leftOffset, topOffset) {
        if (!this.container) return;
        const p = document.createElement('div');
        p.innerText = text;
        p.className = `pet-particle ${cssClass}`;
        p.style.left = `${leftOffset + (Math.random() - 0.5) * 20}px`;
        p.style.top = `${topOffset}px`;
        this.container.appendChild(p);
        setTimeout(() => p.remove(), 2000);
    }
};

let currentClient = null;
let currentChannel = null;

async function initTMI(twitchChannel) {
    if (!twitchChannel) return;
    const channel = twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    
    if (currentChannel === channel) return;
    currentChannel = channel;
    
    if (currentClient) await currentClient.disconnect();
    
    currentClient = new tmi.Client({ channels: [channel] });
    
    currentClient.on('message', (chan, tags, message) => {
        if (!AppPet.config.enabled) return;

        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        const userLow = (tags['display-name'] || tags.username).toLowerCase();
        const isMention = new RegExp(`@${channel}\\b`, 'ig').test(message);
        
        const hasForbidden = AppPet.config.forbiddenWords.some(w => msgLow.includes(w));
        
        if (hasForbidden) {
            AppPet.setEmotion('angry', 4000);
            return;
        }

        if (isMod && (msgLow.startsWith('!fox ') || msgLow.startsWith('!лиса ') || msgLow.startsWith('!лис '))) {
            const cmd = msgLow.split(' ')[1];
            const states = ['idle', 'sleep', 'alert', 'hype', 'love', 'scared', 'angry', 'greet', 'bye', 'jam', 'listen', 'nom'];
            if (states.includes(cmd)) AppPet.setEmotion(cmd, 5000);
            else if (cmd === "кусь" || cmd === "ням") AppPet.setEmotion('nom', 5000);
            else if (cmd === "привет") AppPet.setEmotion('greet', 5000);
            else if (cmd === "пока") AppPet.setEmotion('bye', 5000);
            else if (cmd === "танцуй" || cmd === "вайб") AppPet.setEmotion('jam', 5000);
            return;
        }

        if (tags['custom-reward-id']) {
            AppPet.setEmotion('hype', 3000);
            return;
        }

        if (AppPet.config.vipUsers.includes(userLow) || isMod) AppPet.setEmotion('love', 4000);
        else if (isMention) AppPet.setEmotion('alert', 4000);
        else if (tags.emotes) AppPet.setEmotion('hype', 4000);
        
        AppPet.resetSleepTimer(); 
    });
    
    await currentClient.connect();
}

function applyFrameConfig(config) {
    if (config.color1) document.documentElement.style.setProperty('--color-1', config.color1);
    if (config.color2) document.documentElement.style.setProperty('--color-2', config.color2);
    frameContainer.style.opacity = (config.isVisible !== false && String(config.isVisible) !== 'false') ? '1' : '0';
}

function connectWS() {
    globalWs = new WebSocket('ws://localhost:42069');
    
    globalWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            if (message.event === 'CONFIG_UPDATED') {
                if (message.data.widgets?.frame) applyFrameConfig(message.data.widgets.frame);
                AppPet.updateConfig(message.data.widgets?.pet);
                initTMI(message.data.twitchChannel);
            } 
            else if (message.event === 'WIDGET_ACTION') {
                if (message.action === 'PET_BASE_STATE') {
                    AppPet.setBaseState(message.payload.state, message.payload.active);
                } else if (message.action === 'PET_EMOTION') {
                    AppPet.setEmotion(message.payload.emotion, message.payload.duration);
                }
            }
        } catch (e) { }
    };
    
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

// Автономная инициализация
fetch('/api/config')
  .then(res => res.json())
  .then(config => {
      if (config.widgets?.frame) applyFrameConfig(config.widgets.frame);
      AppPet.updateConfig(config.widgets?.pet);
      AppPet.init();
      initTMI(config.twitchChannel);
      connectWS();
  })
  .catch(() => {
      const saved = localStorage.getItem('stream_pack_config');
      if (saved) {
          const config = JSON.parse(saved);
          if (config.widgets?.frame) applyFrameConfig(config.widgets.frame);
          AppPet.updateConfig(config.widgets?.pet);
      }
      AppPet.init();
      connectWS();
  });

window.addEventListener('storage', (e) => {
    if (e.key === 'stream_pack_config' && e.newValue) {
        const config = JSON.parse(e.newValue);
        if (config.widgets?.frame) applyFrameConfig(config.widgets.frame);
        AppPet.updateConfig(config.widgets?.pet);
    }
});