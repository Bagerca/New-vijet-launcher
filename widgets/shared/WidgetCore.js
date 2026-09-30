/* ====================================================================
   WIDGET CORE (Shared Module)
   ==================================================================== */

export const WidgetCore = {
    globalConfig: null,
    ws: null,
    tmiClient: null,
    currentChannel: null,
    thirdPartyEmotes: new Map(), 

    callbacks: {
        onConfigUpdate: (config) => {},
        onTwitchCommand: (cmd, args, tags, message) => {},
        onTwitchMessage: (tags, message) => {},
        onWidgetAction: (action, payload) => {}
    },

    init: function(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        this._setupStorageListeners();
        this._loadConfig();
    },

    updateWidgetConfig: function(widgetId, newWidgetData) {
        if (!this.globalConfig) return;
        if (!this.globalConfig.widgets[widgetId]) this.globalConfig.widgets[widgetId] = {};
        
        // Обновляем общий конфиг
        this.globalConfig.widgets[widgetId] = { ...this.globalConfig.widgets[widgetId], ...newWidgetData };

        // 1. МГНОВЕННО применяем изменения локально (чтобы виджет сразу обновился)
        if (this.callbacks.onConfigUpdate) {
            this.callbacks.onConfigUpdate(this.globalConfig);
        }

        // 2. Отправляем на сервер (чтобы обновился Лаунчер и другие виджеты)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: this.globalConfig }));
        }
    },

    // --- ПАРСИНГ ЭМОДЗИ (ЧАТ) ---
    parseMessageToHTML: function(text, twitchEmotes) {
        let tokens = [];
        let nativePositions = [];

        if (twitchEmotes) {
            Object.entries(twitchEmotes).forEach(([id, positions]) => {
                positions.forEach(pos => {
                    const [start, end] = pos.split('-').map(Number);
                    nativePositions.push({ start, end, id });
                });
            });
        }
        nativePositions.sort((a, b) => a.start - b.start);

        let currentIndex = 0;
        const processTextFor3rdParty = (textPart) => {
            const parts = textPart.split(/(\s+)/);
            parts.forEach(part => {
                if (part.trim() === '') {
                    tokens.push({ type: 'text', content: part });
                } else if (this.thirdPartyEmotes.has(part)) {
                    tokens.push({ type: 'emote', url: this.thirdPartyEmotes.get(part), alt: part });
                } else {
                    tokens.push({ type: 'text', content: part });
                }
            });
        };

        nativePositions.forEach(({ start, end, id }) => {
            if (start > currentIndex) processTextFor3rdParty(text.substring(currentIndex, start));
            tokens.push({
                type: 'emote',
                url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`,
                alt: text.substring(start, end + 1)
            });
            currentIndex = end + 1;
        });

        if (currentIndex < text.length) processTextFor3rdParty(text.substring(currentIndex));

        const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return tokens.map(t => {
            if (t.type === 'emote') return `<img class="chat-emote" src="${t.url}" alt="${t.alt}">`;
            return escapeHtml(t.content);
        }).join('');
    },

    // --- ПАРСИНГ ЭМОДЗИ (ЛЕТЯЩИЕ НА ЭКРАНЕ) ---
    getEmotesFromMessage: function(text, twitchEmotes) {
        let result = [];
        
        if (twitchEmotes) {
            Object.entries(twitchEmotes).forEach(([id, positions]) => {
                result.push({ url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`, count: positions.length });
            });
        }

        const words = text.split(/\s+/);
        const tpCounts = {};
        words.forEach(w => {
            if (this.thirdPartyEmotes.has(w)) {
                tpCounts[w] = (tpCounts[w] || 0) + 1;
            }
        });

        Object.entries(tpCounts).forEach(([name, count]) => {
            result.push({ url: this.thirdPartyEmotes.get(name), count: count });
        });

        return result;
    },

    // ==========================================
    // ВНУТРЕННИЕ МЕТОДЫ (PRIVATE)
    // ==========================================
    async _loadThirdPartyEmotes(channelLogin) {
        this.thirdPartyEmotes.clear();
        try {
            const ivrRes = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${channelLogin}`);
            const ivrData = await ivrRes.json();
            const twitchId = ivrData[0]?.id;
            if (!twitchId) return;

            // 7TV Global & Channel
            fetch('https://7tv.io/v3/emote-sets/global').then(r=>r.json()).then(d => d.emotes?.forEach(e => this.thirdPartyEmotes.set(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`))).catch(()=>{});
            fetch(`https://7tv.io/v3/users/twitch/${twitchId}`).then(r=>r.json()).then(d => d.emote_set?.emotes?.forEach(e => this.thirdPartyEmotes.set(e.name, `https://cdn.7tv.app/emote/${e.id}/2x.webp`))).catch(()=>{});

            // BTTV Global & Channel
            fetch('https://api.betterttv.net/3/cached/emotes/global').then(r=>r.json()).then(d => d.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`))).catch(()=>{});
            fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`).then(r=>r.json()).then(d => {
                d.channelEmotes?.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`));
                d.sharedEmotes?.forEach(e => this.thirdPartyEmotes.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`));
            }).catch(()=>{});

            // FFZ Global & Channel
            fetch('https://api.frankerfacez.com/v1/set/global').then(r=>r.json()).then(d => { if(d.sets) Object.values(d.sets).forEach(s => s.emoticons?.forEach(e => this.thirdPartyEmotes.set(e.name, e.urls['2']||e.urls['1']))) }).catch(()=>{});
            fetch(`https://api.frankerfacez.com/v1/room/id/${twitchId}`).then(r=>r.json()).then(d => { if(d.sets) Object.values(d.sets).forEach(s => s.emoticons?.forEach(e => this.thirdPartyEmotes.set(e.name, e.urls['2']||e.urls['1']))) }).catch(()=>{});

        } catch (e) { console.warn('[WidgetCore] Failed to load 3rd party emotes', e); }
    },

    _loadConfig: function() {
        fetch('http://localhost:42069/api/config')
            .then(res => res.json())
            .then(config => { this._handleNewConfig(config); this._setupWS(); })
            .catch(() => {
                const saved = localStorage.getItem('stream_pack_config');
                if (saved) try { this._handleNewConfig(JSON.parse(saved)); } catch (e) {}
                this._setupWS();
            });
    },

    _handleNewConfig: function(config) {
        this.globalConfig = config;
        if (this.callbacks.onConfigUpdate) this.callbacks.onConfigUpdate(this.globalConfig);

        const newChannel = (config.twitchChannel || '').replace(/[@#]/g, '').trim().toLowerCase();
        if (newChannel && newChannel !== this.currentChannel) {
            this.currentChannel = newChannel;
            this._loadThirdPartyEmotes(this.currentChannel);
            this._setupTMI(this.currentChannel);
        }
    },

    _setupWS: function() {
        this.ws = new WebSocket('ws://localhost:42069');
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.event === 'CONFIG_UPDATED') this._handleNewConfig(message.data);
                else if (message.event === 'WIDGET_ACTION' && this.callbacks.onWidgetAction) this.callbacks.onWidgetAction(message.action, message.payload);
            } catch (e) {}
        };
        this.ws.onclose = () => setTimeout(() => this._setupWS(), 3000);
    },

    _setupTMI: async function(channel) {
        if (typeof tmi === 'undefined') return;
        if (this.tmiClient) await this.tmiClient.disconnect();
        this.tmiClient = new tmi.Client({ channels: [channel] });
        
        this.tmiClient.on('message', (chan, tags, message) => {
            if (this.callbacks.onTwitchMessage) this.callbacks.onTwitchMessage(tags, message);
            const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1') || tags.username === channel;
            const msgTrimmed = message.trim();
            if (isMod && msgTrimmed.startsWith('!')) {
                const parts = msgTrimmed.split(' ');
                if (this.callbacks.onTwitchCommand) this.callbacks.onTwitchCommand(parts[0].toLowerCase(), parts.slice(1), tags, message);
            }
        });
        await this.tmiClient.connect();
    },

    _setupStorageListeners: function() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_config' && e.newValue) {
                try { this._handleNewConfig(JSON.parse(e.newValue)); } catch (err) {}
            }
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (this.callbacks.onWidgetAction) this.callbacks.onWidgetAction(data.action, data.payload);
                } catch (err) {}
            }
        });
    }
};