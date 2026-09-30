import { WidgetCore } from '../shared/WidgetCore.js';

const AppEmotes = {
    container: document.getElementById('emotes-container'),
    mode: "bubble",
    enabled: true,
    activeEmotesCount: 0, 
    MAX_GLOBAL_EMOTES: 100, 
    maxSpawnPerMsg: 20,

    applyConfig: function(config) {
        if (config.mode) this.mode = config.mode;
        if (config.enabled !== undefined) this.enabled = String(config.enabled) === 'true';
        if (config.maxEmotes) this.maxSpawnPerMsg = parseInt(config.maxEmotes) || 20;
    },

    spawn: function(emotesList) {
        if (!this.enabled || !emotesList || emotesList.length === 0 || !this.container) return;
        if (this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) return;

        let spawned = 0;
        let delayIndex = 0;
        const fragment = document.createDocumentFragment();

        for (let emote of emotesList) {
            for (let i = 0; i < emote.count; i++) {
                if (spawned >= this.maxSpawnPerMsg || this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) break;
                this.createEmoteDOM(emote.url, delayIndex, fragment);
                spawned++;
                delayIndex++;
            }
            if (spawned >= this.maxSpawnPerMsg || this.activeEmotesCount >= this.MAX_GLOBAL_EMOTES) break;
        }
        
        this.container.appendChild(fragment);
    },

    createEmoteDOM: function(url, delayIndex, fragment) {
        this.activeEmotesCount++;
        const wrap = document.createElement('div');
        const img = document.createElement('img');
        img.src = url;

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

// ==========================================
// ПОДКЛЮЧЕНИЕ ЯДРА WIDGET CORE
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.emotes) AppEmotes.applyConfig(config.widgets.emotes);
    },

    onTwitchCommand: (cmd, args) => {
        if (cmd === '!emotes' || cmd === '!смайлы') {
            const arg = args[0];
            let newEmotesConf = { ...(WidgetCore.globalConfig.widgets.emotes || {}) };
            let changed = false;

            if (['bubble', 'fountain'].includes(arg)) {
                newEmotesConf.mode = arg;
                changed = true;
            } else if (['on', 'off'].includes(arg)) {
                newEmotesConf.enabled = (arg === 'on') ? 'true' : 'false';
                changed = true;
            }
            
            if (changed) {
                WidgetCore.updateWidgetConfig('emotes', newEmotesConf);
            }
        }
    },

    onTwitchMessage: (tags, message) => {
        // Ядро само вытаскивает все нативные и сторонние смайлы в готовый массив [{ url, count }]
        const extractedEmotes = WidgetCore.getEmotesFromMessage(message, tags.emotes);
        AppEmotes.spawn(extractedEmotes);
    },

    onWidgetAction: (action, payload) => {
        if (action === 'TEST_EMOTES') {
            // Тестовые смайлы из лаунчера
            AppEmotes.spawn([
                { url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/3.0', count: 2 },
                { url: 'https://cdn.7tv.app/emote/60ae3e54259ac5a73e56c426/2x.webp', count: 1 }
            ]);
        }
    }
});