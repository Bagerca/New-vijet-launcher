/* ФАЙЛ: widgets/player/youtube.js */

export class YouTubeWrapper {
    constructor(containerId, callbacks) {
        this.isReady = false;
        this.yt = null;
        this.callbacks = callbacks;
        this.initAPI(containerId);
    }

    initAPI(containerId) {
        const checkAndCreate = () => {
            if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') {
                this.createPlayer(containerId);
            } else {
                setTimeout(checkAndCreate, 100);
            }
        };

        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.async = true;
            document.head.appendChild(tag);
        }

        checkAndCreate();
    }

    createPlayer(containerId) {
        const originUrl = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
            ? window.location.origin : 'https://www.youtube.com';

        this.yt = new YT.Player(containerId, {
            playerVars: {
                'autoplay': 1, 'controls': 0, 'disablekb': 1, 'enablejsapi': 1,
                'fs': 0, 'modestbranding': 1, 'playsinline': 1, 'rel': 0,
                'origin': originUrl
            },
            events: {
                'onReady': () => {
                    this.isReady = true;
                    if (this.callbacks.onReady) this.callbacks.onReady();
                },
                'onStateChange': (e) => {
                    if (this.callbacks.onStateChange) this.callbacks.onStateChange(e.data);
                },
                'onError': (e) => {
                    if (this.callbacks.onError) this.callbacks.onError(e);
                }
            }
        });
    }

    play(track) {
        if (!this.isReady || !this.yt) return;
        
        // Мутим плеер ДО старта, чтобы не было скачков громкости
        try { this.yt.mute(); } catch (e) {}
        
        // API само начнет воспроизведение (autoplay: 1)
        // Категорически нельзя вызывать здесь playVideo(), это вызывает треск аудио-буфера!
        if (track.type === 'playlist') {
            this.yt.loadPlaylist({ list: track.id });
        } else {
            this.yt.loadVideoById({ videoId: track.id });
        }
    }

    stop() {
        if (this.isReady && this.yt && typeof this.yt.stopVideo === 'function') {
            try { this.yt.stopVideo(); } catch (e) {}
        }
    }

    setVolume(vol) {
        const safeVol = Math.max(0, Math.min(100, parseInt(vol) || 30));
        if (this.isReady && this.yt && typeof this.yt.setVolume === 'function') {
            try {
                this.yt.setVolume(safeVol);
            } catch (e) {}
        }
    }

    unMute() {
        if (this.isReady && this.yt && typeof this.yt.unMute === 'function') {
            try { this.yt.unMute(); } catch(e){}
        }
    }

    // Жесткий пинок (используется только вочдогом при зависаниях)
    kick() {
        if (this.isReady && this.yt) {
            try {
                this.yt.unMute();
                this.yt.playVideo();
            } catch (e) {}
        }
    }

    getState() {
        return this.isReady && this.yt && this.yt.getPlayerState ? this.yt.getPlayerState() : -1;
    }

    getProgress() {
        if (this.isReady && this.yt && this.yt.getCurrentTime && this.yt.getDuration) {
            const cur = this.yt.getCurrentTime();
            const tot = this.yt.getDuration();
            if (tot > 0) return Math.max(0, Math.min(1, cur / tot));
        }
        return 0;
    }

    isPlaylistEnded() {
        if (this.isReady && this.yt && this.yt.getPlaylist && this.yt.getPlaylistIndex) {
            const pl = this.yt.getPlaylist();
            const idx = this.yt.getPlaylistIndex();
            return (!pl || idx === pl.length - 1);
        }
        return true;
    }
}