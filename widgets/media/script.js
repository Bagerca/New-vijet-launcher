/* ФАЙЛ: widgets/media/script.js — v3 (обложки работают и в file://-превью, и в OBS) */
import { MediaLibrary } from './media-db.js';
import { icons } from '../../js/utils/icons.js';

function normalizeHex(value, fallback) {
    let h = String(value || '').trim();
    if (!h) return fallback;
    if (!h.startsWith('#')) h = '#' + h;
    if (/^#[0-9a-f]{3}$/i.test(h)) {
        h = '#' + h.slice(1).split('').map(c => c + c).join('');
    }
    return /^#[0-9a-f]{6}$/i.test(h) ? h : fallback;
}

function isTrue(v) { return v === true || String(v) === 'true'; }

/**
 * Пути в media-db заданы от корня проекта ("/data/covers/...").
 * В OBS документ лежит на http://host/media/index.html, а в превью лаунчера —
 * на file:///<проект>/widgets/media/index.html. Резолвим относительно документа,
 * чтобы обложки грузились в обоих случаях.
 */
function resolveAsset(path) {
    const s = String(path || '').trim();
    if (!s) return '';
    if (/^(https?:|data:|blob:)/i.test(s)) return s;
    const clean = s.replace(/^\/+/, '');
    try {
        return new URL('../../' + clean, document.baseURI).href;
    } catch (e) {
        console.warn('[Media] Не удалось.resolve обложку, использую относительный путь:', e);
        return '../../' + clean;
    }
}

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

    config: {},
    _sig: null,
    _token: 0,
    _marqueeTimer: null,

    init: function () {
        try {
            if (this.ytPlayEl) this.ytPlayEl.innerHTML = icons.play();
            if (this.noIconSlot) this.noIconSlot.innerHTML = icons.noSignal();

            fetch('http://localhost:42069/api/config')
                .then(res => res.json())
                .then(config => this.applyConfig(config.widgets?.media || {}))
                .catch(() => {
                    try {
                        const saved = localStorage.getItem('stream_pack_config');
                        if (saved) this.applyConfig(JSON.parse(saved).widgets?.media || {});
                    } catch (e) {
                        console.warn('[Media] Локальный конфиг не читается:', e);
                    }
                });

            window.addEventListener('storage', (e) => {
                if (e.key === 'stream_pack_config' && e.newValue) {
                    try {
                        this.applyConfig(JSON.parse(e.newValue).widgets?.media || {});
                    } catch (err) {
                        console.warn('[Media] Ошибка разбора storage-конфига:', err);
                    }
                }
            });

            window.addEventListener('resize', () => {
                clearTimeout(this._marqueeTimer);
                this._marqueeTimer = setTimeout(() => this.checkMarquee(), 200);
            });

            this.connectWS();
            console.log('[Media] v3 инициализирован');
        } catch (e) {
            console.error('[Media] Ошибка инициализации:', e);
        }
    },

    connectWS: function () {
        let ws;
        try { ws = new WebSocket('ws://localhost:42069'); }
        catch (e) { setTimeout(() => this.connectWS(), 3000); return; }
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.event === 'CONFIG_UPDATED' && message.data?.widgets?.media) {
                    this.applyConfig(message.data.widgets.media);
                }
            } catch (e) {}
        };
        ws.onerror = () => { try { ws.close(); } catch (e) {} };
        ws.onclose = () => setTimeout(() => this.connectWS(), 3000);
    },

    applyConfig: function (config) {
        if (!this.container) return;
        this.config = config || {};

        const isOff = this.config.isActive === false || String(this.config.isActive) === 'false';
        if (isOff) {
            this.hide();
            this._sig = null;
            this._token++;
            return;
        }

        const sig = JSON.stringify([
            String(this.config.libId || ''),
            String(this.config.ytLink || ''),
            isTrue(this.config.autoColor === undefined ? true : this.config.autoColor),
            String(this.config.accentColor || ''),
            String(this.config.badgeText || '')
        ]);

        if (sig !== this._sig) {
            this._sig = sig;
            this.set(this.config.libId, this.config.ytLink);
        } else if (this.container.classList.contains('hidden')) {
            this.container.classList.remove('hidden');
        }
    },

    set: async function (libId, ytLink) {
        const token = ++this._token;
        if (!this.container) { this.hide(); return; }

        let mediaData = null;
        const link = String(ytLink || '').trim();

        if (link && (link.includes('youtu.be') || link.includes('youtube.com'))) {
            mediaData = await this.fetchFromYouTube(link);
            if (token !== this._token) return;
            if (!mediaData) {
                mediaData = { title: 'YouTube Video', cover: 'generated', themeColor: '#FF0000', type: 'youtube', meta: ['Видео загружается...'] };
            }
        } else if (libId) {
            mediaData = MediaLibrary[String(libId).toLowerCase()];
            if (!mediaData) {
                mediaData = { title: String(libId).toUpperCase(), cover: 'generated', themeColor: '#ff007f', type: 'game', meta: ['Неизвестно'] };
            }
        }

        if (token !== this._token) return;

        if (mediaData) {
            this.render(mediaData);
            this.container.classList.remove('hidden');
            this.container.classList.remove('pop-anim');
            void this.container.offsetWidth;
            this.container.classList.add('pop-anim');
            clearTimeout(this._marqueeTimer);
            this._marqueeTimer = setTimeout(() => this.checkMarquee(), 100);
        } else {
            this.hide();
        }
    },

    checkMarquee: function () {
        if (!this.titleEl || !this.titleWrapper) return;
        if (this.titleEl.scrollWidth > this.titleWrapper.clientWidth + 5) {
            this.titleEl.classList.add('marquee-active');
        } else {
            this.titleEl.classList.remove('marquee-active');
        }
    },

    fetchFromYouTube: async function (urlOrId) {
        try {
            let videoId = String(urlOrId || '').trim();
            const match = videoId.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
            if (match && match[2].length === 11) videoId = match[2];
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (response.ok) {
                const data = await response.json();
                return {
                    title: data.title,
                    cover: data.thumbnail_url,
                    themeColor: '#FF0000',
                    type: 'youtube',
                    meta: [data.author_name]
                };
            }
        } catch (err) {
            console.warn('[Media] oEmbed недоступен, показываю заглушку:', err && err.message);
            return null;
        }
        return null;
    },

    generateGradientPlaceholder: function (title) {
        const text = String(title || '??');
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
        const hue1 = Math.abs(hash % 360);
        const hue2 = (hue1 + 40) % 360;
        this.posterBreakout.style.background = `linear-gradient(135deg, hsl(${hue1}, 80%, 50%), hsl(${hue2}, 80%, 40%))`;
        let initials = text.substring(0, 2).toUpperCase();
        const words = text.split(' ').filter(Boolean);
        if (words.length > 1) initials = (words[0][0] + words[1][0]).toUpperCase();
        this.noMediaEl.innerHTML = `<div class="mi-generated-initials">${initials}</div>`;
        this.noMediaEl.style.display = 'flex';
        this.noMediaEl.style.background = 'transparent';
    },

    render: function (data) {
        const autoColor = this.config.autoColor === undefined ? true : isTrue(this.config.autoColor);
        const color = autoColor
            ? (data.themeColor || '#ff007f')
            : normalizeHex(this.config.accentColor, data.themeColor || '#ff007f');

        this.container.style.setProperty('--media-color', color);
        this.container.style.setProperty('--media-glow', `${color}33`);

        const customBadge = String(this.config.badgeText || '').trim();
        const autoBadge = data.type === 'youtube'
            ? 'РЕАКЦИЯ НА ВИДЕО'
            : (data.type === 'series' ? 'СЕЙЧАС СМОТРИМ' : 'СЕЙЧАС ИГРАЕМ');

        if (data.type === 'youtube') {
            this.container.classList.add('is-youtube');
            this.ytPlayEl.style.display = (data.cover && data.cover !== 'generated') ? 'flex' : 'none';
        } else {
            this.container.classList.remove('is-youtube');
            this.ytPlayEl.style.display = 'none';
        }
        this.typeBadgeEl.innerText = customBadge || autoBadge;

        this.titleEl.innerText = data.title || 'Неизвестно';
        this.titleEl.classList.remove('marquee-active');
        this.posterBreakout.style.background = '';

        if (data.cover === 'generated') {
            this.coverEl.src = '';
            this.coverEl.classList.add('hidden');
            this.generateGradientPlaceholder(data.title);
        } else if (data.cover && String(data.cover).trim() !== '') {
            const url = resolveAsset(data.cover);
            this.coverEl.onerror = () => {
                console.warn('[Media] Обложка не загрузилась:', url);
                this.coverEl.classList.add('hidden');
                this.generateGradientPlaceholder(data.title);
            };
            this.coverEl.src = url;
            this.coverEl.classList.remove('hidden');
            this.noMediaEl.style.display = 'none';
        } else {
            this.coverEl.src = '';
            this.coverEl.classList.add('hidden');
            this.noMediaEl.innerHTML = `
<div id="mi-no-icon-slot">${icons.noSignal()}</div>
<div class="mi-no-text">NO SIGNAL</div>`;
            this.noMediaEl.style.display = 'flex';
            this.noMediaEl.style.background = 'linear-gradient(135deg, #1a1a24, #0a0a0f)';
        }

        this.metaRowEl.innerHTML = '';
        if (Array.isArray(data.meta)) {
            data.meta.forEach(itemText => {
                if (itemText) {
                    const span = document.createElement('span');
                    span.className = 'mi-meta-item';
                    span.innerText = itemText;
                    this.metaRowEl.appendChild(span);
                }
            });
        }
    },

    hide: function () {
        if (this.container) this.container.classList.add('hidden');
    }
};

AppMediaInfo.init();