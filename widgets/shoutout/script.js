import { WidgetCore } from '../shared/WidgetCore.js';

async function safeFetch(url, options = {}, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP Ошибка: ${response.status}`);
            return await response.json();
        } catch (err) {
            if (i === maxRetries - 1) throw err; 
            await new Promise(res => setTimeout(res, 500));
        }
    }
}

const AppShoutout = {
    container: document.getElementById('shoutout-container'),
    queue: [],
    isPlaying: false,
    duration: 8000, 

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
            const audio = new Audio('../../data/sounds/shoutout.mp3');
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

// Интеграция с Ядром
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.shoutout) AppShoutout.applyConfig(config.widgets.shoutout);
    },
    onTwitchCommand: (cmd, args) => {
        if (cmd === '!so' || cmd === '!shoutout') {
            if (args.length > 0 && args[0] !== "") {
                AppShoutout.add(args[0]);
            }
        }
    },
    onWidgetAction: (action, payload) => {
        if (action === 'TEST_SHOUTOUT') {
            AppShoutout.add(payload.user);
        }
    }
});