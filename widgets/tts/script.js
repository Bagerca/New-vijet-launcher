const style = document.createElement('style');
style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');
    
    body {
        margin: 0; padding: 0; width: 100vw; height: 100vh;
        overflow: hidden; background: transparent; font-family: 'Montserrat', sans-serif;
    }

    #tts-container {
        position: absolute; 
        bottom: 120px; 
        right: 40px; 
        display: flex; align-items: center; gap: 15px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 245, 250, 0.8) 100%);
        backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255, 255, 255, 0.8);
        border-left: 4px solid var(--tts-accent, #FF4477);
        border-radius: 16px; padding: 12px 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        z-index: 40; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform-origin: right center;
    }

    #tts-container.hidden { display: none; }

    .tts-icon { font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    .tts-info { display: flex; flex-direction: column; }
    .tts-title { font-size: 11px; color: rgba(0,0,0,0.5); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .tts-user { font-size: 16px; color: #1a1a1a; font-weight: 900; }

    .tts-wave { display: flex; align-items: flex-end; gap: 4px; height: 18px; margin-left: 5px; }
    .tts-bar { 
        width: 4px; background: var(--tts-accent, #FF4477); border-radius: 2px; height: 15%; 
        transition: height 0.08s ease-out, box-shadow 0.08s ease-out; will-change: height;
    }
    .tts-bar.active-spike { box-shadow: 0 0 8px var(--tts-accent, rgba(255,68,119,0.8)); }

    .tts-in { animation: ttsSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .tts-out { animation: ttsSlideOut 0.5s cubic-bezier(0.36, 0, 0.66, -0.56) forwards; }

    @keyframes ttsSlideIn { 0% { opacity: 0; transform: translateX(50px) scale(0.9); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
    @keyframes ttsSlideOut { 0% { opacity: 1; transform: translateX(0) scale(1); } 100% { opacity: 0; transform: translateX(50px) scale(0.9); } }
`;
document.head.appendChild(style);

document.getElementById('app').innerHTML = `
    <div id="tts-container" class="hidden">
        <div class="tts-icon">🎙️</div>
        <div class="tts-info"><span class="tts-title">Озвучивает</span><span id="tts-user" class="tts-user">Никнейм</span></div>
        <div class="tts-wave"><div class="tts-bar"></div><div class="tts-bar"></div><div class="tts-bar"></div></div>
    </div>
`;

const AppTTS = {
    container: document.getElementById('tts-container'),
    userText: document.getElementById('tts-user'),
    bars: document.querySelectorAll('.tts-bar'),
    
    synth: window.speechSynthesis,
    queue: [],
    isPlaying: false,
    eqInterval: null,
    keepAliveInterval: null,
    activeUtterance: null, 
    ws: null,
    currentChannel: null,
    client: null,
    
    config: { enabled: true, volume: 100, maxLength: 150, customVoices: {} },

    init: function() {
        let voices = this.synth.getVoices();
        if (voices.length === 0) this.synth.onvoiceschanged = () => { voices = this.synth.getVoices(); };
        this.connectWS();
    },

    connectWS: function() {
        this.ws = new WebSocket('ws://localhost:42069');
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.event === 'CONFIG_UPDATED') {
                this.updateConfig(msg.data);
            }
        };
        this.ws.onclose = () => setTimeout(() => this.connectWS(), 3000);
    },

    updateConfig: function(globalConfig) {
        const tConf = globalConfig.widgets?.tts || {};
        this.config.enabled = tConf.enabled !== false;
        this.config.volume = parseInt(tConf.volume) || 100;
        this.config.maxLength = parseInt(tConf.maxLength) || 150;
        
        try {
            this.config.customVoices = typeof tConf.customVoices === 'string' ? JSON.parse(tConf.customVoices) : tConf.customVoices || {};
        } catch (e) { this.config.customVoices = {}; }

        if (globalConfig.twitchChannel && this.currentChannel !== globalConfig.twitchChannel) {
            this.currentChannel = globalConfig.twitchChannel;
            this.initTMI(this.currentChannel);
        }
    },

    add: function(user, text) {
        if (!this.config.enabled || !text) return;
        let cleanText = text.replace(/https?:\/\/[^\s]+/g, "").replace(/www\.[^\s]+/g, ""); 
        cleanText = cleanText.replace(/(.)\1{10,}/g, "$1$1$1"); 
        if (cleanText.length > this.config.maxLength) cleanText = cleanText.substring(0, this.config.maxLength) + "...";
        if (cleanText.trim().length > 0) {
            this.queue.push({ user: user, text: cleanText.trim() });
            if (!this.isPlaying) this.playNext();
        }
    },

    playNext: function() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            this.hideVisual();
            return;
        }

        this.isPlaying = true;
        const currentData = this.queue.shift();
        this.showVisual(currentData.user);

        const utterance = new SpeechSynthesisUtterance(currentData.text);
        utterance.lang = 'ru-RU'; 
        utterance.volume = Math.min(1.0, (this.config.volume / 100) * 2.0);

        const customSettings = this.config.customVoices[currentData.user.toLowerCase()];
        utterance.pitch = customSettings?.pitch !== undefined ? customSettings.pitch : 1.0;
        utterance.rate = customSettings?.rate !== undefined ? customSettings.rate : 1.1;

        const voices = this.synth.getVoices();
        let selectedVoice = voices.find(v => v.lang === 'ru-RU' && v.name.includes('Google')) || voices.find(v => v.lang.includes('ru'));
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => {
            this.startEq();
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'listen', active: true } }));
            }
            this.keepAliveInterval = setInterval(() => { if (this.synth.speaking) { this.synth.pause(); this.synth.resume(); } }, 10000);
        };
        
        utterance.onboundary = (event) => { if (event.name === 'word') this.spikeEq(); };
        
        const finishTTS = () => {
            if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
            this.stopEq();
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'listen', active: false } }));
            }
            this.activeUtterance = null;
            setTimeout(() => this.playNext(), 500);
        };

        utterance.onend = finishTTS;
        utterance.onerror = finishTTS;

        this.activeUtterance = utterance; 
        this.synth.speak(utterance);
    },

    stop: function() {
        this.queue = []; 
        this.synth.cancel(); 
        this.isPlaying = false;
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.stopEq();
        this.hideVisual();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'listen', active: false } }));
        }
    },

    showVisual: function(user) {
        this.userText.innerText = user;
        this.container.classList.remove('hidden', 'tts-out', 'tts-in');
        void this.container.offsetWidth;
        this.container.classList.add('tts-in');
    },

    hideVisual: function() {
        this.container.classList.remove('tts-in');
        void this.container.offsetWidth;
        this.container.classList.add('tts-out');
        setTimeout(() => this.container.classList.add('hidden'), 500);
    },

    startEq: function() {
        if (this.eqInterval) clearInterval(this.eqInterval);
        this.eqInterval = setInterval(() => {
            this.bars.forEach(bar => { bar.style.height = `${20 + Math.random() * 40}%`; bar.classList.remove('active-spike'); });
        }, 120); 
    },

    spikeEq: function() {
        this.bars.forEach(bar => { bar.style.height = `${70 + Math.random() * 30}%`; bar.classList.add('active-spike'); });
    },

    stopEq: function() {
        if (this.eqInterval) clearInterval(this.eqInterval);
        this.bars.forEach(bar => { bar.style.height = '15%'; bar.classList.remove('active-spike'); });
    },

    initTMI: async function(channelName) {
        const channel = channelName.replace(/[@#]/g, '').trim().toLowerCase();
        if (this.client) await this.client.disconnect();
        this.client = new tmi.Client({ channels: [channel] });
        this.client.on('message', (chan, tags, message) => {
            const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
            const msgLow = message.trim().toLowerCase();
            const user = tags['display-name'] || tags.username;
            if (isMod && msgLow.startsWith('!tts ')) {
                const text = message.substring(5).trim();
                if (text === "stop" || text === "skip") this.stop(); else this.add(user, text);
            }
        });
        await this.client.connect();
    }
};

fetch('http://localhost:42069/api/config').then(res => res.json()).then(config => {
      AppTTS.updateConfig(config); AppTTS.init();
}).catch(() => AppTTS.init());