import { AvatarManager } from '../shared/AvatarManager.js';
import { icons } from '../../js/utils/icons.js';
import { WidgetCore } from '../shared/WidgetCore.js';

function ensureYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') {
      console.log('[Player] YouTube Iframe API уже доступен.');
      return resolve();
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      console.log('[Player] Событие onYouTubeIframeAPIReady успешно перехвачено.');
      if (typeof previousCallback === 'function') previousCallback();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
      console.log('[Player] Тег YouTube API внедрен в DOM.');
    }

    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

const AppPlayer = {
  yt: null,
  isReady: false,
  queue: [],
  isPlaying: false,
  nowPlaying: null,
  currentVol: 30,
  progressInterval: null,
  watchdogTimer: null,
  
  container: document.getElementById('widget-container'),
  nameLabel: document.getElementById('requester-name'),
  avatarEl: document.getElementById('requester-avatar'), 
  volLabel: document.getElementById('volume-level'),
  queueCount: document.getElementById('queue-count'),
  progressBar: document.getElementById('yt-progress-bar'), 

  init: async function() {
    console.log('[Player] Инициализация виджета плеера...');
    document.getElementById('icon-volume').innerHTML = icons.volume();
    document.getElementById('icon-queue').innerHTML = icons.queue();

    this.loadQueue();

    try {
      await ensureYouTubeAPI();
      this.createPlayer();
    } catch (err) {
      console.error('[Player] Критический сбой загрузки YouTube API:', err);
    }
  },

  createPlayer: function() {
    console.log('[Player] Создание экземпляра YT.Player...');
    
    const originUrl = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://www.youtube.com';

    this.yt = new YT.Player('yt-player', {
      playerVars: { 
        'autoplay': 1, 
        'controls': 0, 
        'disablekb': 1, 
        'enablejsapi': 1,
        'fs': 0,
        'modestbranding': 1, 
        'playsinline': 1, 
        'rel': 0,
        'origin': originUrl 
      },
      events: {
        'onReady': () => {
          console.log('[Player] YT.Player успешно инициализирован (onReady)!');
          this.isReady = true;
          this.setVolume(this.currentVol);
          
          if (!this.isPlaying && this.queue.length > 0) {
            console.log('[Player] Обнаружены отложенные треки в очереди, запуск...');
            this.next();
          }
        },
        'onStateChange': this.handleStateChange.bind(this),
        'onError': (e) => {
          console.warn(`[Player] Ошибка воспроизведения YouTube (Код ${e.data}). Скип трека.`);
          this.clearWatchdog();
          this.next();
        }
      }
    });
  },

  loadQueue: function() {
    try {
      const saved = localStorage.getItem('uso_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log(`[Player] Загружено треков из кэша: ${this.queue.length}`);
      }
      this.updateUIQueue();
    } catch (e) { 
      this.queue = []; 
    }
  },

  saveQueue: function() {
    try {
      localStorage.setItem('uso_queue', JSON.stringify(this.queue));
    } catch (e) {}
    this.updateUIQueue();
  },

  extractData: function(url) {
    if (!url) return null;
    const str = url.trim();
    const listMatch = str.match(/[?&]list=([^#&?]+)/);
    if (listMatch) return { type: 'playlist', id: listMatch[1] };
    
    const cleanUrl = str.replace(/.*?http/, 'http');
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2].length === 11) return { type: 'video', id: match[2] };
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return { type: 'video', id: str };
    return null;
  },

  addToQueue: function(url, user) {
    const ytData = this.extractData(url);
    if (!ytData) {
      console.warn(`[Player] Некорректная ссылка YouTube: ${url}`);
      return;
    }

    console.log(`[Player] Трек добавлен в очередь: ${ytData.id} от ${user}`);
    this.queue.push({ type: ytData.type, id: ytData.id, user: user });
    this.saveQueue();

    if (!this.isPlaying) {
      this.next();
    }
  },

  next: function() {
    this.clearWatchdog();

    if (!this.isReady) {
      console.warn('[Player] Плеер еще не готов. Трек останется в очереди до onReady.');
      return;
    }

    if (this.queue.length > 0) {
      this.isPlaying = true;
      this.nowPlaying = this.queue.shift();
      this.saveQueue();
      this.playCurrent();
    } else {
      console.log('[Player] Очередь пуста. Остановка плеера.');
      this.isPlaying = false;
      this.nowPlaying = null;
      this.saveQueue();
      this.hideUI();
    }
  },

  clearQueue: function() {
    console.log('[Player] Очередь очищена.');
    this.queue = [];
    this.saveQueue();
    this.next();
  },

  playCurrent: function() {
    if (!this.isReady || !this.nowPlaying) {
      console.warn('[Player] Отмена воспроизведения: плеер не готов или трек отсутствует.');
      return;
    }

    console.log(`[Player] Старт трека: [${this.nowPlaying.id}] Заказчик: ${this.nowPlaying.user}`);
    this.nameLabel.innerText = this.nowPlaying.user;
    
    AvatarManager.get(this.nowPlaying.user, '#ff4d85').then(url => {
      this.avatarEl.src = url;
      this.avatarEl.classList.remove('pop-avatar');
      void this.avatarEl.offsetWidth;
      this.avatarEl.classList.add('pop-avatar');
    }).catch(() => {});
    
    this.container.classList.remove('hidden');
    this.progressBar.style.transform = 'scaleX(0)';

    try {
      this.yt.mute();
    } catch (e) {}

    if (this.nowPlaying.type === 'playlist') {
      this.yt.loadPlaylist({ list: this.nowPlaying.id });
    } else {
      this.yt.loadVideoById({
        videoId: this.nowPlaying.id,
        startSeconds: 0
      });
    }

    try {
      this.yt.playVideo();
    } catch (e) {}

    this.startWatchdog();
  },

  startWatchdog: function() {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (!this.isReady || !this.yt) return;
      const state = this.yt.getPlayerState ? this.yt.getPlayerState() : -1;
      
      console.warn(`[Player Watchdog] Проверка состояния через 6с: статус = ${state}`);

      if (state !== 1) {
        console.warn('[Player Watchdog] Обнаружено зависание! Принудительный пинок...');
        try {
          this.yt.unMute();
          this.yt.setVolume(this.currentVol);
          this.yt.playVideo();
        } catch (e) {}

        setTimeout(() => {
          const recheckState = this.yt.getPlayerState ? this.yt.getPlayerState() : -1;
          if (recheckState !== 1 && recheckState !== 3) {
            console.error('[Player Watchdog] Трек безнадежно завис или заблокирован. Авто-скип.');
            this.next();
          }
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

  hideUI: function() {
    this.container.classList.add('hidden');
    this.container.classList.remove('is-playing');
    this.stopProgress();
    this.clearWatchdog();
    if (this.isReady && this.yt && typeof this.yt.stopVideo === 'function') {
      this.yt.stopVideo();
    }
  },

  setVolume: function(vol) {
    this.currentVol = Math.max(0, Math.min(100, parseInt(vol) || 30));
    if (this.isReady && this.yt && typeof this.yt.setVolume === 'function') {
      try {
        this.yt.unMute();
        this.yt.setVolume(this.currentVol);
      } catch (e) {}
    }
    
    if (this.volLabel) {
      this.volLabel.innerText = this.currentVol;
      this.volLabel.classList.remove('animate-pop');
      void this.volLabel.offsetWidth;
      this.volLabel.classList.add('animate-pop');
    }
  },

  handleStateChange: function(event) {
    // 1: PLAYING
    if (event.data === 1) { 
      console.log('[Player] Статус: Воспроизведение (PLAYING).');
      this.clearWatchdog();
      this.container.classList.add('is-playing');
      
      try {
        if (this.yt.isMuted && this.yt.isMuted()) {
          this.yt.unMute();
        }
        this.yt.setVolume(this.currentVol);
      } catch (e) {}

      this.startProgress();

      if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
        WidgetCore.ws.send(JSON.stringify({ 
          event: 'WIDGET_ACTION', 
          action: 'PET_BASE_STATE', 
          payload: { state: 'jam', active: true } 
        }));
      }
    } 
    // 2: PAUSED
    else if (event.data === 2) { 
      console.log('[Player] Статус: Пауза (PAUSED).');
      this.container.classList.remove('is-playing');
      this.stopProgress();

      if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
        WidgetCore.ws.send(JSON.stringify({ 
          event: 'WIDGET_ACTION', 
          action: 'PET_BASE_STATE', 
          payload: { state: 'jam', active: false } 
        }));
      }
    } 
    // 0: ENDED
    else if (event.data === 0) { 
      console.log('[Player] Статус: Трек завершен (ENDED).');
      this.clearWatchdog();
      this.container.classList.remove('is-playing');
      this.stopProgress();

      if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
        WidgetCore.ws.send(JSON.stringify({ 
          event: 'WIDGET_ACTION', 
          action: 'PET_BASE_STATE', 
          payload: { state: 'jam', active: false } 
        }));
      }
      
      if (this.nowPlaying && this.nowPlaying.type === 'playlist') {
        const pl = this.yt.getPlaylist ? this.yt.getPlaylist() : null;
        const idx = this.yt.getPlaylistIndex ? this.yt.getPlaylistIndex() : -1;
        if (!pl || idx === pl.length - 1) this.next();
      } else {
        this.next();
      }
    }
  },

  startProgress: function() {
    this.stopProgress();
    this.progressInterval = setInterval(() => {
      if (this.yt && this.yt.getCurrentTime && this.yt.getDuration) {
        const cur = this.yt.getCurrentTime();
        const tot = this.yt.getDuration();
        if (tot > 0) {
          const ratio = Math.max(0, Math.min(1, cur / tot));
          this.progressBar.style.transform = `scaleX(${ratio})`;
        }
      }
    }, 500);
  },

  stopProgress: function() { 
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  },

  updateUIQueue: function() {
    if (this.queueCount) {
      this.queueCount.innerText = this.queue.length;
      this.queueCount.classList.remove('animate-pop');
      void this.queueCount.offsetWidth;
      this.queueCount.classList.add('animate-pop');
    }
  }
};

AppPlayer.init();

WidgetCore.init({
  onConfigUpdate: (config) => {
    const pConf = config.widgets?.player;
    if (!pConf) return;

    if (pConf.volume !== undefined) {
      AppPlayer.setVolume(pConf.volume);
    }

    if (pConf.videoUrl && pConf.videoUrl.trim() !== '') {
      console.log('[Player] Получена прямая ссылка из панели управления');
      AppPlayer.clearQueue();
      const streamerName = (config.twitchChannel || 'Стример') + ' (Панель)';
      AppPlayer.addToQueue(pConf.videoUrl, streamerName);
      WidgetCore.updateWidgetConfig('player', { videoUrl: '' });
    }
  },

  onTwitchCommand: (cmd, args, tags) => {
    const user = tags['display-name'] || tags.username;
    const url = args.join(' ').trim();

    if (cmd === '!play' || cmd === '!sr') {
      if (url) AppPlayer.addToQueue(url, user);
    }
    else if (cmd === '!skip') {
      console.log(`[Player] Команда пропуска от модератора: ${user}`);
      AppPlayer.next();
    } 
    else if (cmd === '!clear') {
      console.log(`[Player] Команда очистки очереди от модератора: ${user}`);
      AppPlayer.clearQueue();
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
        AppPlayer.clearQueue();
        AppPlayer.addToQueue(url, user);
      }
    }
  }
});