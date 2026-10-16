/* ФАЙЛ: widgets/player/script.js (Контроллер UI и связи с ядром) */

import { YouTubeWrapper } from './youtube.js';
import { PlayerQueue } from './queue.js';
import { AvatarManager } from '../shared/AvatarManager.js';
import { icons } from '../../js/utils/icons.js';
import { WidgetCore } from '../shared/WidgetCore.js';

// Хелперы для мгновенной смены цвета
function hexToRgb(hex) {
    let h = (hex || '#ff4d85').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substring(0, 2), 16) || 255;
    const g = parseInt(h.substring(2, 4), 16) || 77;
    const b = parseInt(h.substring(4, 6), 16) || 133;
    return `${r}, ${g}, ${b}`;
}

function applyGlobalColor(color) {
    if (!color) return;
    const hex = color.startsWith('#') ? color : `#${color}`;
    document.documentElement.style.setProperty('--player-accent', hex);
    document.documentElement.style.setProperty('--player-accent-rgb', hexToRgb(hex));
}

// Управление DOM-элементами вынесено в отдельный объект
const UI = {
    container: document.getElementById('widget-container'),
    nameLabel: document.getElementById('requester-name'),
    infoLabelText: document.getElementById('info-label-text'),
    avatarEl: document.getElementById('requester-avatar'), 
    volLabel: document.getElementById('volume-level'),
    queueCount: document.getElementById('queue-count'),
    progressBar: document.getElementById('yt-progress-bar'),

    initIcons() {
        document.getElementById('icon-volume').innerHTML = icons.volume();
        document.getElementById('icon-queue').innerHTML = icons.queue();
    },

    updateQueueCount(count) {
        if (!this.queueCount) return;
        this.queueCount.innerText = count;
        this.queueCount.classList.remove('animate-pop');
        void this.queueCount.offsetWidth;
        this.queueCount.classList.add('animate-pop');
    },

    updateVolume(vol) {
        if (!this.volLabel) return;
        this.volLabel.innerText = vol;
        this.volLabel.classList.remove('animate-pop');
        void this.volLabel.offsetWidth;
        this.volLabel.classList.add('animate-pop');
    },

    showTrackInfo(track, accentColor) {
        this.container.classList.remove('hidden');
        this.progressBar.style.transform = 'scaleX(0)';

        if (track.isBackground) {
            this.nameLabel.innerText = track.user;
            this.infoLabelText.innerText = "ФОНОВЫЙ ПЛЕЙЛИСТ";
            this.container.classList.add('mode-background');
        } else {
            this.nameLabel.innerText = track.user;
            this.infoLabelText.innerText = "СЕЙЧАС ИГРАЕТ ЗАКАЗ";
            this.container.classList.remove('mode-background');

            AvatarManager.get(track.user, accentColor || '#ff4d85').then(url => {
                this.avatarEl.src = url;
                this.avatarEl.classList.remove('pop-avatar');
                void this.avatarEl.offsetWidth;
                this.avatarEl.classList.add('pop-avatar');
            }).catch(() => {});
        }
    },

    setPlayingState(isPlaying) {
        if (isPlaying) this.container.classList.add('is-playing');
        else this.container.classList.remove('is-playing');
    },

    hide() {
        this.container.classList.add('hidden');
        this.setPlayingState(false);
    }
};

// Главный Оркестратор
const AppPlayer = {
    yt: null,
    queue: null,
    isPlaying: false,
    nowPlaying: null,
    watchdogTimer: null,
    progressInterval: null,
    
    config: {
        volume: 30,
        playlistEnabled: false,
        playlistShuffle: true,
        bgVolume: 15,
        accentColor: '#ff4d85'
    },

    init: function() {
        UI.initIcons();
        
        this.queue = new PlayerQueue((count) => UI.updateQueueCount(count));
        
        this.yt = new YouTubeWrapper('yt-player', {
            onReady: () => {
                this.yt.setVolume(this.config.volume);
                if (!this.isPlaying) this.playNext();
            },
            onStateChange: (state) => this.handleStateChange(state),
            onError: () => {
                this.clearWatchdog();
                this.playNext();
            }
        });
    },

    applyConfig: function(pConf) {
        if (!pConf) return;
        
        const wasEnabled = this.config.playlistEnabled;
        this.config = { ...this.config, ...pConf };

        // 1. Мгновенная смена цвета
        if (this.config.accentColor) applyGlobalColor(this.config.accentColor);

        // 2. Обновление списков фонового плейлиста
        if (pConf.playlistUrls !== undefined) {
            this.queue.updateBgPlaylist(pConf.playlistUrls, this.config.playlistShuffle);
        }

        // 3. Логика запуска/остановки фона на лету
        if (this.config.playlistEnabled && !this.isPlaying && this.yt.isReady) {
            this.playNext();
        }
        
        if (!this.config.playlistEnabled && wasEnabled && this.nowPlaying && this.nowPlaying.isBackground) {
            this.stopPlayer();
            if (this.queue.userQueue.length > 0) this.playNext(); // Запуск заказов, если есть
        }
        
        // 4. Мгновенное применение громкости
        const targetVol = (this.nowPlaying && this.nowPlaying.isBackground) ? this.config.bgVolume : this.config.volume;
        this.setVolume(targetVol);
    },

    addTrack: function(url, user) {
        if (this.queue.add(url, user)) {
            // Если ничего не играет ИЛИ сейчас играет фон -> прерываем фон и запускаем заказ
            if (!this.isPlaying || (this.nowPlaying && this.nowPlaying.isBackground)) {
                this.playNext();
            }
        }
    },

    playNext: function() {
        this.clearWatchdog();
        if (!this.yt.isReady) return;

        const nextTrack = this.queue.getNext(this.config.playlistEnabled);

        if (nextTrack) {
            this.isPlaying = true;
            this.nowPlaying = nextTrack;
            
            UI.showTrackInfo(nextTrack, this.config.accentColor);
            
            const targetVol = nextTrack.isBackground ? this.config.bgVolume : this.config.volume;
            this.setVolume(targetVol);
            
            this.yt.play(nextTrack);
            this.startWatchdog();
        } else {
            this.stopPlayer();
        }
    },

    stopPlayer: function() {
        this.isPlaying = false;
        this.nowPlaying = null;
        this.clearWatchdog();
        this.stopProgress();
        this.yt.stop();
        UI.hide();
    },

    setVolume: function(vol) {
        const safeVol = Math.max(0, Math.min(100, parseInt(vol) || 30));
        this.yt.setVolume(safeVol);
        UI.updateVolume(safeVol);
    },

    handleStateChange: function(state) {
        if (state === 1) { // PLAYING
            this.clearWatchdog();
            UI.setPlayingState(true);
            
            this.yt.forcePlay();
            this.setVolume(this.nowPlaying?.isBackground ? this.config.bgVolume : this.config.volume);
            this.startProgress();

            this.notifyPet(true);
        } 
        else if (state === 2) { // PAUSED
            UI.setPlayingState(false);
            this.stopProgress();
            this.notifyPet(false);
        } 
        else if (state === 0) { // ENDED
            this.clearWatchdog();
            UI.setPlayingState(false);
            this.stopProgress();
            this.notifyPet(false);
            
            if (this.nowPlaying && this.nowPlaying.type === 'playlist') {
                if (this.yt.isPlaylistEnded()) this.playNext();
            } else {
                this.playNext();
            }
        }
    },

    startWatchdog: function() {
        this.clearWatchdog();
        this.watchdogTimer = setTimeout(() => {
            const state = this.yt.getState();
            if (state !== 1) {
                this.yt.forcePlay();
                setTimeout(() => {
                    const recheck = this.yt.getState();
                    if (recheck !== 1 && recheck !== 3) this.playNext(); // Автоскип битого
                }, 2000);
            }
        }, 6000);
    },

    clearWatchdog: function() {
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    },

    startProgress: function() {
        this.stopProgress();
        this.progressInterval = setInterval(() => {
            UI.progressBar.style.transform = `scaleX(${this.yt.getProgress()})`;
        }, 500);
    },

    stopProgress: function() { 
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    },

    notifyPet: function(isActive) {
        if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
            WidgetCore.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'jam', active: isActive } }));
        }
    }
};

AppPlayer.init();

// ==========================================
// ИНТЕГРАЦИЯ С ЯДРОМ
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        const pConf = config.widgets?.player;
        if (!pConf) return;

        AppPlayer.applyConfig(pConf);

        if (pConf.videoUrl && pConf.videoUrl.trim() !== '') {
            AppPlayer.queue.clearUserQueue();
            const streamerName = (config.twitchChannel || 'Стример') + ' (Панель)';
            AppPlayer.addTrack(pConf.videoUrl, streamerName);
            WidgetCore.updateWidgetConfig('player', { videoUrl: '' }); // Очищаем поле
        }
    },

    onWidgetAction: (action, payload) => {
        if (action === 'PLAYER_SKIP') AppPlayer.playNext();
        else if (action === 'PLAYER_STOP') AppPlayer.stopPlayer();
    },

    onTwitchCommand: (cmd, args, tags) => {
        const user = tags['display-name'] || tags.username;
        const url = args.join(' ').trim();

        if (cmd === '!play' || cmd === '!sr') {
            if (url) AppPlayer.addTrack(url, user);
        }
        else if (cmd === '!skip') {
            AppPlayer.playNext();
        } 
        else if (cmd === '!clear') {
            AppPlayer.queue.clearUserQueue();
            AppPlayer.playNext();
        } 
        else if (cmd === '!vol') {
            const vol = parseInt(args[0], 10);
            if (!isNaN(vol)) {
                AppPlayer.setVolume(vol);
                WidgetCore.updateWidgetConfig('player', { volume: vol });
            }
        }
        else if (cmd === '!forceplay') {
            if (url) {
                AppPlayer.queue.clearUserQueue();
                AppPlayer.addTrack(url, user);
            }
        }
        else if (cmd === '!playerc' && args[0]) {
            let color = args[0];
            if (!color.startsWith('#')) color = `#${color}`;
            WidgetCore.updateWidgetConfig('player', { accentColor: color });
        }
    }
});