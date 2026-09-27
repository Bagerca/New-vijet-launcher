import { GamesDatabase } from './games-db.js';
import { icons } from '/js/utils/icons.js';

const AppMediaInfo = {
    container: document.getElementById('media-info-container'),
    posterBreakout: document.querySelector('.mi-poster-breakout'),
    coverEl: document.getElementById('mi-cover'),
    noMediaEl: document.getElementById('mi-no-media'),
    noIconSlot: document.getElementById('mi-no-icon-slot'),
    ytPlayEl: document.getElementById('mi-yt-play'), 
    
    typeBadgeEl: document.getElementById('mi-type-badge'),
    titleWrapper: document.getElementById('mi-title-wrapper'),
    titleEl: document.getElementById('mi-title'),
    metaRowEl: document.getElementById('mi-meta-row'),

    currentQuery: null,
    currentType: null,

    init: function() {
        this.ytPlayEl.innerHTML = icons.play();
        this.noIconSlot.innerHTML = icons.noSignal();
        
        // Автономный фоллбэк: загрузка конфига и прослушивание storage
        fetch('/api/config')
          .then(res => res.json())
          .then(config => this.applyConfig(config.widgets?.media || {}))
          .catch(() => {
              const saved = localStorage.getItem('stream_pack_config');
              if (saved) {
                  const conf = JSON.parse(saved);
                  this.applyConfig(conf.widgets?.media || {});
              }
          });

        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_config' && e.newValue) {
                const conf = JSON.parse(e.newValue);
                this.applyConfig(conf.widgets?.media || {});
            }
        });

        this.connectWS();
    },

    connectWS: function() {
        const ws = new WebSocket('ws://localhost:42069');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.event === 'CONFIG_UPDATED' && message.data.widgets?.media) {
                    this.applyConfig(message.data.widgets.media);
                }
            } catch (e) {}
        };
        ws.onclose = () => setTimeout(() => this.connectWS(), 3000);
    },

    applyConfig: function(config) {
        const isOff = config.isActive === false || String(config.isActive) === 'false';
        if (isOff) {
            this.hide();
            this.currentQuery = null;
            return;
        }

        if (config.query !== this.currentQuery || config.type !== this.currentType) {
            this.currentQuery = config.query;
            this.currentType = config.type;
            this.set(config.type, config.query);
        } else if (this.container.classList.contains('hidden')) {
            this.container.classList.remove('hidden');
        }
    },

    set: async function(type, query) {
        if (!this.container || !query) {
            this.hide(); 
            return;
        }

        let mediaData = null;

        if (type === 'game') {
            const gameKey = query.toLowerCase().trim();
            mediaData = this.findLocalGame(gameKey);
            if (!mediaData) mediaData = await this.fetchFromSteam(gameKey);
        }
        else if (type === 'yt') {
            mediaData = await this.fetchFromYouTube(query);
            if (!mediaData) {
                // Фоллбэк, если ссылка кривая или нет API доступа
                mediaData = { title: "YouTube Video", cover: "generated", themeColor: "#FF0000", type: "youtube", meta: ["Видео загружается..."] };
            }
        }

        if (mediaData) {
            this.render(mediaData);
            this.container.classList.remove('hidden');
            
            this.container.classList.remove('pop-anim');
            void this.container.offsetWidth; 
            this.container.classList.add('pop-anim');

            setTimeout(() => this.checkMarquee(), 100);
        }
    },

    checkMarquee: function() {
        if (this.titleEl.scrollWidth > this.titleWrapper.clientWidth + 5) {
            this.titleEl.classList.add('marquee-active');
        } else {
            this.titleEl.classList.remove('marquee-active');
        }
    },

    findLocalGame: function(searchKey) {
        if (GamesDatabase[searchKey]) return GamesDatabase[searchKey]; 
        for (let key in GamesDatabase) {
            if (key.includes(searchKey) || searchKey.includes(key)) return GamesDatabase[key];
        }
        return null; 
    },

    fetchFromSteam: async function(gameName) {
        try {
            const encodedTerm = encodeURIComponent(gameName);
            const url = encodeURIComponent(`https://store.steampowered.com/api/storesearch/?term=${encodedTerm}&l=russian&cc=RU`);
            const response = await fetch(`https://api.allorigins.win/get?url=${url}`);
            
            if (response.ok) {
                const data = await response.json();
                const steamData = JSON.parse(data.contents);
                
                if (steamData && steamData.items && steamData.items.length > 0) {
                    const game = steamData.items[0]; 
                    const coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/library_600x900_2x.jpg`;
                    return { 
                        title: game.name, cover: coverUrl, themeColor: "#00ff66", type: "game", 
                        meta: ["Steam", "PC"]
                    };
                }
            }
        } catch (err) {}
        return { title: gameName.toUpperCase(), cover: "generated", themeColor: "#ff007f", type: "game", meta: ["Пользовательская игра"] };
    },

    fetchFromYouTube: async function(urlOrId) {
        try {
            let videoId = urlOrId;
            const match = urlOrId.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if (match && match[2].length === 11) {
                videoId = match[2];
            }

            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (response.ok) {
                const data = await response.json();
                return {
                    title: data.title, cover: data.thumbnail_url, themeColor: "#FF0000", type: "youtube",
                    meta: [data.author_name] 
                };
            }
        } catch (err) { 
            return null; 
        }
    },

    generateGradientPlaceholder: function(title) {
        let hash = 0;
        for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
        const hue1 = Math.abs(hash % 360);
        const hue2 = (hue1 + 40) % 360;
        
        this.posterBreakout.style.background = `linear-gradient(135deg, hsl(${hue1}, 80%, 50%), hsl(${hue2}, 80%, 40%))`;
        
        let initials = title.substring(0, 2).toUpperCase();
        let words = title.split(' ');
        if (words.length > 1) initials = (words[0][0] + words[1][0]).toUpperCase();

        this.noMediaEl.innerHTML = `<div class="mi-generated-initials">${initials}</div>`;
        this.noMediaEl.style.display = 'flex';
        this.noMediaEl.style.background = 'transparent'; 
    },

    render: function(data) {
        const color = data.themeColor || '#ff007f';
        this.container.style.setProperty('--media-color', color);
        this.container.style.setProperty('--media-glow', `${color}33`);

        if (data.type === 'youtube') {
            this.container.classList.add('is-youtube');
            this.typeBadgeEl.innerText = "РЕАКЦИЯ НА ВИДЕО";
            this.ytPlayEl.style.display = (data.cover && data.cover !== "generated") ? 'flex' : 'none';
        } else {
            this.container.classList.remove('is-youtube');
            this.ytPlayEl.style.display = 'none';
            this.typeBadgeEl.innerText = data.type === 'series' ? "СЕЙЧАС СМОТРИМ" : "СЕЙЧАС ИГРАЕМ";
        }

        this.titleEl.innerText = data.title || "Неизвестно";
        this.titleEl.classList.remove('marquee-active');
        this.posterBreakout.style.background = '';

        if (data.cover === "generated") {
            this.coverEl.src = "";
            this.coverEl.classList.add('hidden');
            this.generateGradientPlaceholder(data.title);
        } 
        else if (data.cover && data.cover.trim() !== "") {
            this.coverEl.onerror = () => { 
                this.coverEl.classList.add('hidden'); 
                this.generateGradientPlaceholder(data.title); 
            };
            this.coverEl.src = data.cover;
            this.coverEl.classList.remove('hidden');
            this.noMediaEl.style.display = 'none';
        } 
        else {
            this.coverEl.src = "";
            this.coverEl.classList.add('hidden');
            this.noMediaEl.innerHTML = `
                <div id="mi-no-icon-slot">${icons.noSignal()}</div>
                <div class="mi-no-text">NO SIGNAL</div>
            `;
            this.noMediaEl.style.display = 'flex';
            this.noMediaEl.style.background = 'linear-gradient(135deg, #1a1a24, #0a0a0f)';
        }

        this.metaRowEl.innerHTML = '';
        if (data.meta && data.meta.length > 0) {
            data.meta.forEach(itemText => {
                if(itemText) {
                    const span = document.createElement('span');
                    span.className = 'mi-meta-item';
                    span.innerText = itemText;
                    this.metaRowEl.appendChild(span);
                }
            });
        }
    },

    hide: function() {
        this.container.classList.add('hidden');
    }
};

AppMediaInfo.init();