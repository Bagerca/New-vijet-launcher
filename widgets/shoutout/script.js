async function safeFetch(url, options = {}, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP Ошибка: ${response.status}`);
            return await response.json();
        } catch (err) {
            if (i === maxRetries - 1) {
                console.error(`[Shoutout] Ошибка запроса к ${url} после ${maxRetries} попыток.`, err);
                throw err; 
            }
            await new Promise(res => setTimeout(res, 500));
        }
    }
}

const AppShoutout = {
    container: document.getElementById('shoutout-container'),
    queue: [],
    isPlaying: false,
    duration: 8000, 

    init: function() {
        fetch('/api/config')
          .then(res => res.json())
          .then(config => {
              this.applyConfig(config.widgets?.shoutout || {});
              initTMI(config);
              connectWS();
          })
          .catch(() => {
              const saved = localStorage.getItem('stream_pack_config');
              if (saved) {
                  const conf = JSON.parse(saved);
                  this.applyConfig(conf.widgets?.shoutout || {});
              }
              connectWS();
          });

        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_config' && e.newValue) {
                const conf = JSON.parse(e.newValue);
                this.applyConfig(conf.widgets?.shoutout || {});
            }
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.action === 'TEST_SHOUTOUT') {
                        this.add(data.payload.user);
                    }
                } catch(err){}
            }
        });
    },

    applyConfig: function(config) {
        if (config.duration !== undefined) {
            this.duration = parseInt(config.duration) * 1000;
            if (isNaN(this.duration) || this.duration <= 0) this.duration = 8000;
        }
    },

    add: function(username) {
        const cleanName = username.replace('@', '').split(' ')[0].trim().toLowerCase();
        if (cleanName) {
            this.queue.push(cleanName);
            if (!this.isPlaying) this.playNext();
        }
    },

    playNext: async function() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const targetUser = this.queue.shift();

        try {
            const data = await safeFetch(`https://api.ivr.fi/v2/twitch/user?login=${targetUser}`);
            if (data && data.length > 0) this.render(data[0]);
            else this.playNext();
        } catch (err) {
            console.error("[Shoutout] Ошибка получения данных:", err);
            this.playNext();
        }
    },

    render: function(userData) {
        const displayName = userData.displayName || userData.login;
        const userColor = userData.chatColor || "#ff007f"; 
        const avatarUrl = userData.logo || `https://ui-avatars.com/api/?name=${displayName}&background=1a1a1e&color=fff`;
        const followers = userData.followers ? userData.followers.toLocaleString('ru-RU') : "0";
        const category = (userData.lastBroadcast && userData.lastBroadcast.game) ? userData.lastBroadcast.game.displayName : "Just Chatting";

        this.container.style.setProperty('--user-color', userColor);
        this.container.style.setProperty('--user-glow', `${userColor}44`);

        this.container.innerHTML = `
            <div class="so-card">
                <div class="so-shine"></div>
                <div class="so-left">
                    <div class="so-avatar-wrapper">
                        <img src="${avatarUrl}" class="so-avatar">
                        <div class="so-avatar-ring"></div>
                    </div>
                </div>
                <div class="so-right">
                    <div class="so-badge">
                        <div class="so-dot"></div>
                        ВНИМАНИЕ, РЕКОМЕНДАЦИЯ
                    </div>
                    <div class="so-name" style="background-image: linear-gradient(90deg, ${userColor} 0%, #1a1a1a 120%);">
                        ${displayName}
                    </div>
                    <div class="so-meta">
                        <div class="so-meta-item">🎮 ${category}</div>
                        <div class="so-meta-item">👥 ${followers} фолл.</div>
                    </div>
                    <div class="so-url">
                        twitch.tv/<span>${userData.login}</span>
                    </div>
                </div>
            </div>
        `;

        this.container.classList.remove('hidden', 'shoutout-out');
        
        try {
            const audio = new Audio('/data/sounds/shoutout.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => {});
        } catch (e) {}

        this.container.classList.add('shoutout-in');

        setTimeout(() => {
            this.container.classList.remove('shoutout-in');
            this.container.classList.add('shoutout-out');
            setTimeout(() => {
                this.container.classList.add('hidden');
                this.playNext();
            }, 800); 
        }, this.duration);
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
        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        
        if (isMod) {
            const isCommand = msgLow.startsWith('!so ') || msgLow.startsWith('!shoutout ');
            if (isCommand) {
                const parts = message.trim().split(' ');
                if (parts.length > 1 && parts[1] !== "") {
                    AppShoutout.add(parts[1]);
                }
            }
        }
    });
    
    await currentClient.connect();
}

function connectWS() {
    const ws = new WebSocket('ws://localhost:42069');
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.event === 'CONFIG_UPDATED') {
                initTMI(message.data);
                if (message.data.widgets?.shoutout) AppShoutout.applyConfig(message.data.widgets.shoutout);
            }
        } catch (e) {}
    };
    
    ws.onclose = () => setTimeout(connectWS, 3000);
}

AppShoutout.init();