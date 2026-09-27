import { AvatarManager } from '/shared/AvatarManager.js';
import { icons } from '/js/utils/icons.js';

const AppPlayer = {
  yt: null,
  isReady: false,
  queue: [],
  isPlaying: false,
  nowPlaying: null,
  currentVol: 30,
  progressInterval: null,
  
  container: document.getElementById('widget-container'),
  nameLabel: document.getElementById('requester-name'),
  avatarEl: document.getElementById('requester-avatar'), 
  volLabel: document.getElementById('volume-level'),
  queueCount: document.getElementById('queue-count'),
  progressBar: document.getElementById('yt-progress-bar'), 

  init: function(configVol) {
    document.getElementById('icon-volume').innerHTML = icons.volume();
    document.getElementById('icon-queue').innerHTML = icons.queue();

    this.currentVol = parseInt(configVol) || 30;
    this.loadQueue();
    window.onYouTubeIframeAPIReady = () => this.createPlayer();
  },

  createPlayer: function() {
    this.yt = new YT.Player('yt-player', {
      playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'modestbranding': 1, 'playsinline': 1, 'origin': window.location.origin },
      events: {
        'onReady': () => {
          this.isReady = true;
          this.setVolume(this.currentVol);
          if (this.queue.length > 0 && !this.isPlaying) this.next();
        },
        'onStateChange': this.handleStateChange.bind(this),
        'onError': () => this.next()
      }
    });
  },

  loadQueue: function() {
    try {
      const saved = localStorage.getItem('uso_queue');
      if (saved) this.queue = JSON.parse(saved);
      this.updateUIQueue();
    } catch(e) { this.queue = []; }
  },

  saveQueue: function() {
    localStorage.setItem('uso_queue', JSON.stringify(this.queue));
    this.updateUIQueue();
  },

  extractData: function(url) {
    if (!url) return null;
    let str = url.trim();
    const listMatch = str.match(/[?&]list=([^#&?]+)/);
    if (listMatch) return { type: 'playlist', id: listMatch[1] };
    
    let cleanUrl = str.replace(/.*?http/, 'http');
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2].length === 11) return { type: 'video', id: match[2] };
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return { type: 'video', id: str };
    return null;
  },

  addToQueue: function(url, user) {
    const ytData = this.extractData(url);
    if (ytData) {
      this.queue.push({ type: ytData.type, id: ytData.id, user: user });
      this.saveQueue();
      if (!this.isPlaying) this.next();
    }
  },

  next: function() {
    if (this.queue.length > 0) {
      this.isPlaying = true;
      this.nowPlaying = this.queue.shift();
      this.saveQueue();
      this.playCurrent();
    } else {
      this.isPlaying = false;
      this.nowPlaying = null;
      this.saveQueue();
      this.hideUI();
    }
  },

  clearQueue: function() {
    this.queue = [];
    this.saveQueue();
    this.next();
  },

  playCurrent: function() {
    if (!this.isReady) return;
    
    this.nameLabel.innerText = this.nowPlaying.user;
    AvatarManager.get(this.nowPlaying.user, '#ff4d85').then(url => {
      this.avatarEl.src = url;
      this.avatarEl.classList.remove('pop-avatar');
      void this.avatarEl.offsetWidth;
      this.avatarEl.classList.add('pop-avatar');
    });
    
    this.container.classList.remove('hidden');
    this.progressBar.style.transform = 'scaleX(0)';
    
    this.yt.mute();
    if (this.nowPlaying.type === 'playlist') this.yt.loadPlaylist({ list: this.nowPlaying.id });
    else this.yt.loadVideoById(this.nowPlaying.id);

    setTimeout(() => {
      this.yt.unMute();
      this.yt.setVolume(this.currentVol);
    }, 350);
  },

  hideUI: function() {
    this.container.classList.add('hidden');
    this.container.classList.remove('is-playing');
    this.stopProgress();
    if (this.isReady) this.yt.stopVideo();
  },

  setVolume: function(vol) {
    this.currentVol = Math.max(0, Math.min(100, parseInt(vol) || 30));
    if (this.isReady) {
      this.yt.unMute();
      this.yt.setVolume(this.currentVol);
    }
    
    this.volLabel.innerText = this.currentVol;
    this.volLabel.classList.remove('animate-pop');
    void this.volLabel.offsetWidth;
    this.volLabel.classList.add('animate-pop');
  },

  handleStateChange: function(event) {
    if (event.data === 1) { 
      this.container.classList.add('is-playing');
      this.startProgress();
      if (globalWs && globalWs.readyState === WebSocket.OPEN) globalWs.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'jam', active: true } }));
    } else if (event.data === 2) { 
      this.container.classList.remove('is-playing');
      this.stopProgress();
      if (globalWs && globalWs.readyState === WebSocket.OPEN) globalWs.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'jam', active: false } }));
    } else if (event.data === 0) { 
      this.container.classList.remove('is-playing');
      this.stopProgress();
      if (globalWs && globalWs.readyState === WebSocket.OPEN) globalWs.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_BASE_STATE', payload: { state: 'jam', active: false } }));
      
      if (this.nowPlaying && this.nowPlaying.type === 'playlist') {
        let pl = this.yt.getPlaylist();
        let idx = this.yt.getPlaylistIndex();
        if (!pl || idx === pl.length - 1) this.next();
      } else {
        this.next();
      }
    }
  },

  startProgress: function() {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      if (this.yt && this.yt.getCurrentTime && this.yt.getDuration) {
        const cur = this.yt.getCurrentTime();
        const tot = this.yt.getDuration();
        if (tot > 0) this.progressBar.style.transform = `scaleX(${cur / tot})`;
      }
    }, 500);
  },

  stopProgress: function() { clearInterval(this.progressInterval); },

  updateUIQueue: function() {
    this.queueCount.innerText = this.queue.length;
    this.queueCount.classList.remove('animate-pop');
    void this.queueCount.offsetWidth;
    this.queueCount.classList.add('animate-pop');
  }
};

let currentClient = null, currentChannel = null;

async function initTMI(config) {
  if (!config.twitchChannel) return;
  const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
  
  if (currentChannel === channel) return;
  currentChannel = channel;
  if (currentClient) await currentClient.disconnect();
  
  currentClient = new tmi.Client({ channels: [channel] });
  currentClient.on('message', (chan, tags, message) => {
    const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
    const user = tags['display-name'] || tags.username;
    const msg = message.trim();
    
    if (msg.toLowerCase().startsWith('!play ') || msg.toLowerCase().startsWith('!sr ')) {
      const url = msg.substring(msg.indexOf(' ') + 1).trim();
      AppPlayer.addToQueue(url, user);
    }
    
    if (isMod) {
      if (msg.toLowerCase() === '!skip') AppPlayer.next();
      if (msg.toLowerCase() === '!clear') AppPlayer.clearQueue();
      if (msg.toLowerCase().startsWith('!vol ')) {
        const vol = msg.split(' ')[1];
        AppPlayer.setVolume(vol);
        updateGlobalVolume(vol);
      }
    }
  });
  await currentClient.connect();
}

let globalWs = null, globalConfigData = null;

function updateGlobalVolume(vol) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN && globalConfigData) {
    if (!globalConfigData.widgets.player) globalConfigData.widgets.player = {};
    globalConfigData.widgets.player.volume = vol;
    globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
  }
}

function connectWS() {
  globalWs = new WebSocket('ws://localhost:42069');
  globalWs.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'CONFIG_UPDATED') {
        globalConfigData = message.data;
        initTMI(message.data);
        const pConf = message.data.widgets?.player;
        if (pConf) {
          if (pConf.volume !== undefined) AppPlayer.setVolume(pConf.volume);
          if (pConf.videoUrl && pConf.videoUrl.trim() !== '') {
            AppPlayer.clearQueue();
            const streamerName = message.data.twitchChannel || "Стример";
            AppPlayer.addToQueue(pConf.videoUrl, streamerName);
            pConf.videoUrl = '';
            globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
          }
        }
      }
    } catch (e) { }
  };
  globalWs.onclose = () => setTimeout(connectWS, 3000);
}

fetch('http://localhost:42069/api/config').then(res => res.json()).then(config => {
    globalConfigData = config;
    AppPlayer.init(config.widgets?.player?.volume || 30);
    initTMI(config); connectWS();
}).catch(() => { AppPlayer.init(30); connectWS(); });