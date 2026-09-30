/* ФАЙЛ: widgets/tts/script.js */
import { WidgetCore } from '../shared/WidgetCore.js';

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
    
    config: { enabled: true, volume: 100, maxLength: 150, customVoices: {} },

    init: function() {
        console.log('[TTS] Инициализация встроенного синтезатора (Web Speech API)...');
        
        // Жесткий сброс зависших сообщений в движке
        if (this.synth.speaking || this.synth.pending) {
            this.synth.cancel();
        }

        // Принудительная подгрузка голосов
        let voices = this.synth.getVoices();
        if (voices.length === 0) {
            this.synth.onvoiceschanged = () => { 
                voices = this.synth.getVoices(); 
                console.log(`[TTS] Загружено системных голосов: ${voices.length}`);
            };
        } else {
            console.log(`[TTS] Загружено системных голосов: ${voices.length}`);
        }

        // Хак для браузера (клик по экрану для разблокировки звука в Предпросмотре)
        window.addEventListener('click', () => {
            if (this.synth.getVoices().length > 0) {
                const unlock = new SpeechSynthesisUtterance('');
                unlock.volume = 0;
                this.synth.speak(unlock);
                console.log('[TTS] Звук разблокирован кликом.');
            }
        }, { once: true });
    },

    applyConfig: function(tConf) {
        if (!tConf) return;
        this.config.enabled = tConf.enabled !== false && String(tConf.enabled) !== 'false';
        
        this.config.volume = parseInt(tConf.volume);
        if (isNaN(this.config.volume)) this.config.volume = 100;
        
        this.config.maxLength = parseInt(tConf.maxLength) || 150;
        
        try {
            this.config.customVoices = typeof tConf.customVoices === 'string' 
                ? JSON.parse(tConf.customVoices) 
                : tConf.customVoices || {};
        } catch (e) { 
            this.config.customVoices = {}; 
        }

        if (!this.config.enabled && this.isPlaying) {
            this.stop();
        }
    },

    add: function(user, text) {
        if (!this.config.enabled || !text) return;
        
        // Фильтрация ссылок и спама одинаковыми буквами
        let cleanText = text.replace(/https?:\/\/[^\s]+/g, "ссылка").replace(/www\.[^\s]+/g, "ссылка"); 
        cleanText = cleanText.replace(/(.)\1{10,}/g, "$1$1$1"); 
        
        if (cleanText.length > this.config.maxLength) {
            cleanText = cleanText.substring(0, this.config.maxLength) + "...";
        }
        
        if (cleanText.trim().length > 0) {
            this.queue.push({ user: user, text: cleanText.trim() });
            console.log(`[TTS] Добавлено в очередь: ${cleanText.trim()}`);
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
        
        console.log(`[TTS] Начинаем озвучку: [${currentData.user}] ${currentData.text}`);
        this.showVisual(currentData.user);

        const utterance = new SpeechSynthesisUtterance(currentData.text);
        utterance.lang = 'ru-RU'; 
        
        // Линейная громкость: от 0.0 до 1.0
        utterance.volume = Math.max(0, Math.min(1.0, this.config.volume / 100));

        // Персонализация голосов из JSON-конфига
        const customSettings = this.config.customVoices[currentData.user.toLowerCase()];
        utterance.pitch = customSettings?.pitch !== undefined ? customSettings.pitch : 1.0;
        utterance.rate = customSettings?.rate !== undefined ? customSettings.rate : 1.1;

        // Поиск русского голоса
        const voices = this.synth.getVoices();
        let selectedVoice = voices.find(v => v.lang === 'ru-RU' && v.name.includes('Google')) 
                         || voices.find(v => v.lang.includes('ru'));
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            this.startEq();
            this.triggerPet(true);
            
            // Защита от остановки Garbage Collector'ом
            this.keepAliveInterval = setInterval(() => { 
                if (this.synth.speaking) { 
                    this.synth.pause(); 
                    this.synth.resume(); 
                } 
            }, 10000);
        };
        
        utterance.onboundary = (event) => { 
            if (event.name === 'word') this.spikeEq(); 
        };
        
        const finishTTS = () => {
            if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
            this.stopEq();
            this.triggerPet(false);
            this.activeUtterance = null;
            setTimeout(() => this.playNext(), 500);
        };

        utterance.onend = finishTTS;
        utterance.onerror = finishTTS;

        this.activeUtterance = utterance; 
        
        try {
            this.synth.speak(utterance);
        } catch (err) {
            console.error('[TTS] Ошибка synth.speak():', err);
            finishTTS();
        }
    },

    stop: function() {
        console.log('[TTS] Принудительная остановка.');
        this.queue = []; 
        this.synth.cancel(); 
        this.isPlaying = false;
        
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.stopEq();
        this.hideVisual();
        this.triggerPet(false);
    },

    triggerPet: function(isActive) {
        if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
            WidgetCore.ws.send(JSON.stringify({ 
                event: 'WIDGET_ACTION', 
                action: 'PET_BASE_STATE', 
                payload: { state: 'listen', active: isActive } 
            }));
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
            this.bars.forEach(bar => { 
                bar.style.height = `${20 + Math.random() * 40}%`; 
                bar.classList.remove('active-spike'); 
            });
        }, 120); 
    },

    spikeEq: function() {
        this.bars.forEach(bar => { 
            bar.style.height = `${70 + Math.random() * 30}%`; 
            bar.classList.add('active-spike'); 
        });
    },

    stopEq: function() {
        if (this.eqInterval) clearInterval(this.eqInterval);
        this.bars.forEach(bar => { 
            bar.style.height = '15%'; 
            bar.classList.remove('active-spike'); 
        });
    }
};

AppTTS.init();

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ЧЕРЕЗ ЯДРО WIDGET CORE
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.tts) AppTTS.applyConfig(config.widgets.tts);
    },

    onTwitchMessage: (tags, message) => {
        const msgLow = message.trim().toLowerCase();
        
        if (msgLow.startsWith('!tts ')) {
            const text = message.substring(5).trim();
            if (text.toLowerCase() !== "stop" && text.toLowerCase() !== "skip" && text.toLowerCase() !== "clear") {
                const user = tags['display-name'] || tags.username;
                AppTTS.add(user, text);
            }
        }
    },

    onTwitchCommand: (cmd, args) => {
        if (cmd === '!tts') {
            const action = args[0] ? args[0].toLowerCase() : '';
            if (action === 'stop' || action === 'skip' || action === 'clear') {
                AppTTS.stop();
                WidgetCore.ws?.send(JSON.stringify({ event: 'SYSTEM_LOG', type: 'info', message: 'Озвучка (TTS) принудительно очищена.' }));
            }
        }
    }
});