import { icons } from '/js/utils/icons.js';

let currentClient = null, currentChannel = null, globalWs = null, globalConfigData = null;

const AppAlerts = {
    container: document.getElementById('alert-container'),
    queue: [],
    isPlaying: false,
    volume: 40,
    duration: 5000,
    lastPlayedAudioTime: 0,

    init: function() {
        // Загрузка конфига для автономного режима (Live Preview)
        fetch('/api/config').then(res => res.json())
        .then(config => {
            globalConfigData = config; 
            this.applyConfig(config.widgets?.alerts || {});
            initTMI(config); 
            connectWS();
        })
        .catch(() => {
            const saved = localStorage.getItem('stream_pack_config');
            if (saved) {
                const conf = JSON.parse(saved);
                this.applyConfig(conf.widgets?.alerts || {});
            }
            connectWS(); 
        });

        // Слушатель LocalStorage для кнопок "Тест"
        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.action === 'TEST_ALERT') {
                        this.add(data.payload.user, data.payload.type, data.payload.message);
                    }
                } catch(err){}
            }
        });
    },

    applyConfig: function(config) {
        if (config.volume !== undefined) this.volume = parseInt(config.volume);
        if (config.duration !== undefined) this.duration = parseInt(config.duration) * 1000;
    },

    playSound: function(type) {
        const now = Date.now();
        if (now - this.lastPlayedAudioTime < 100) return; 
        this.lastPlayedAudioTime = now;
        
        let path = `/data/sounds/${type.replace('reward_', '')}.mp3`;
        
        try {
            const audio = new Audio(path);
            audio.volume = this.volume / 100;
            
            if (globalWs && globalWs.readyState === WebSocket.OPEN) {
                globalWs.send(JSON.stringify({ event: 'AUDIO_DUCK', data: 'start' }));
            }
            const cleanup = () => {
                if (globalWs && globalWs.readyState === WebSocket.OPEN) globalWs.send(JSON.stringify({ event: 'AUDIO_DUCK', data: 'stop' }));
                audio.src = '';
            };
            audio.onended = cleanup; audio.onerror = cleanup;
            audio.play().catch(e => cleanup());
        } catch (e) {}
    },

    add: function(user, type, message = "", value = 0) {
        if (this.queue.length > 50) return; 
        this.queue.push({ user, type, message, value });
        if (!this.isPlaying) this.playNext();
    },

    playNext: function() {
        if (this.queue.length === 0) { this.isPlaying = false; return; }
        this.isPlaying = true;
        const data = this.queue.shift();
        this.render(data);
    },

    render: function(data) {
        if (globalWs && globalWs.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_EMOTION', payload: { emotion: 'love', duration: 4000 } }));
        }

        let iconHtml = "", color = "", titleText = "", subText = data.message;
        let isReward = false, rewardCategory = "";

        switch (data.type) {
            case 'follow': iconHtml = `💖`; color = `#FF69B4`; titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span> отслеживает канал!`; break;
            case 'sub': iconHtml = `⭐`; color = `#00ff66`; titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span> оформил подписку!`; break;
            case 'resub': iconHtml = `🔥`; color = `#FF4500`; titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span> с нами уже ${data.value} мес.!`; break;
            case 'gift': iconHtml = `🎁`; color = `#ff007f`; titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span> подарил подписку!`; break;
            case 'streak': iconHtml = `📺`; color = `#00E5FF`; titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span> смотрит ${data.value} стримов подряд!`; break;
            case 'reward_series': isReward = true; rewardCategory = "СЕРИАЛ"; color = `#a29bfe`; iconHtml = icons.alert_series(); titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span>`; break;
            case 'reward_movie': isReward = true; rewardCategory = "ФИЛЬМ"; color = `#fdcb6e`; iconHtml = icons.alert_movie(); titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span>`; break;
            case 'reward_video': isReward = true; rewardCategory = "ВИДЕО"; color = `#74b9ff`; iconHtml = icons.alert_video(); titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span>`; break;
            case 'reward_game': isReward = true; rewardCategory = "ИГРА"; color = `#55efc4`; iconHtml = icons.alert_game(); titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span>`; break;
            case 'reward_music': isReward = true; rewardCategory = "МУЗЫКА"; color = `#ff7675`; iconHtml = icons.alert_music(); titleText = `<span class="alert-user" style="color: ${color}">${data.user}</span>`; break;
        }

        if (!document.hidden) this.playSound(data.type);
        this.container.style.setProperty('--alert-color', color);
        this.container.style.setProperty('--alert-glow', `${color}55`);

        if (isReward) {
            this.container.innerHTML = `
                <div class="alert-card reward-card">
                    <div class="alert-icon-wrap reward-icon-wrap" style="box-shadow: 0 0 20px var(--alert-glow), inset 0 0 15px var(--alert-glow); border-color: ${color};"><div class="alert-icon reward-svg" style="color: ${color}; filter: drop-shadow(0 0 8px ${color});">${iconHtml}</div></div>
                    <div class="alert-info"><div class="reward-badge" style="color: ${color}; text-shadow: 0 0 10px var(--alert-glow);">ЗАКАЗ ЗА БАЛЛЫ: ${rewardCategory}</div><div class="alert-title reward-title">${titleText}</div>${subText ? `<div class="alert-message reward-msg">"${subText}"</div>` : ''}</div>
                </div>`;
        } else {
            this.container.innerHTML = `
                <div class="alert-card">
                    <div class="alert-icon-wrap" style="box-shadow: 0 0 20px var(--alert-glow), inset 0 0 10px var(--alert-glow);"><div class="alert-icon" style="text-shadow: 0 0 15px ${color};">${iconHtml}</div></div>
                    <div class="alert-info"><div class="alert-title">${titleText}</div>${subText ? `<div class="alert-message">"${subText}"</div>` : ''}</div>
                </div>`;
        }

        this.container.classList.remove('hidden', 'alert-out');
        this.container.classList.add('alert-in');
        setTimeout(() => {
            this.container.classList.remove('alert-in');
            this.container.classList.add('alert-out');
            setTimeout(() => { this.container.classList.add('hidden'); this.playNext(); }, 500);
        }, this.duration);
    }
};

async function initTMI(config) {
    if (!config.twitchChannel) return;
    const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    if (currentChannel === channel) return;
    currentChannel = channel;
    
    if (currentClient) await currentClient.disconnect();
    currentClient = new tmi.Client({ channels: [channel] });
    
    currentClient.on("subscription", (channel, username, method, message, userstate) => AppAlerts.add(username, 'sub', message));
    currentClient.on("resub", (channel, username, months, message, userstate, methods) => AppAlerts.add(username, 'resub', message, months));
    currentClient.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => AppAlerts.add(username, 'gift', `для ${recipient}`));

    currentClient.on('message', (chan, tags, message) => {
        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        
        if (isMod && msgLow.startsWith('!alert ')) {
            const arg = msgLow.split(' ')[1];
            if (arg === "sub") AppAlerts.add("ТестовыйЮзер", "sub");
            else if (arg === "resub") AppAlerts.add("ОлдРесабер", "resub", "Обожаю этот стрим!", 12);
            else if (arg === "gift") AppAlerts.add("Богач", "gift", "для СлучайныйЗритель");
            else if (arg === "streak") AppAlerts.add("ПреданныйЗритель", "streak", "Лучший стример, смотрю каждый день!", 5);
            else if (arg === "series") AppAlerts.add("Киноман", "reward_series", "Давай смотреть Во все тяжкие!");
            else if (arg === "movie") AppAlerts.add("Зритель", "reward_movie", "Гарри Поттер пожалуйста");
            else if (arg === "video") AppAlerts.add("Кекус", "reward_video", "Смешные коты");
            else if (arg === "game") AppAlerts.add("Геймер", "reward_game", "Го в Доту?");
            else if (arg === "music") AppAlerts.add("Меломан", "reward_music", "Врубай фонк");
            else if (arg === "follow") AppAlerts.add("НовыйФолловер", "follow");
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
                globalConfigData = message.data; initTMI(message.data);
                if (message.data.widgets?.alerts) AppAlerts.applyConfig(message.data.widgets.alerts);
            }
        } catch (e) { }
    };
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

AppAlerts.init();