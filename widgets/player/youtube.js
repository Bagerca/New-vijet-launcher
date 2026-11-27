/* ФАЙЛ: widgets/player/youtube.js — v6 */
export class YouTubeWrapper {
constructor(instanceId, containerId, callbacks = {}) {
this.instanceId = instanceId;
this.containerId = containerId;
this.callbacks = callbacks;
this.isReady = false;
this.yt = null;
this._pendingPause = null;
this.initAPI();
}

initAPI() {
const check = () => {
if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') this.createPlayer();
else setTimeout(check, 100);
};
if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
tag.async = true;
document.head.appendChild(tag);
}
check();
}

createPlayer() {
if (this.yt) return;
let origin = window.location.origin;
if (!origin || origin === 'null' || origin === 'file://') origin = 'http://localhost:42069';
try {
this.yt = new YT.Player(this.containerId, {
host: 'https://www.youtube.com',
playerVars: {
autoplay: 1, controls: 0, disablekb: 1, enablejsapi: 1,
fs: 0, modestbranding: 1, playsinline: 1, rel: 0,
origin, mute: 1
},
events: {
onReady: () => {
this.isReady = true;
console.log(`[YT:${this.instanceId}] готов (origin ${origin})`);
if (this.callbacks.onReady) this.callbacks.onReady();
},
onStateChange: (e) => { if (this.callbacks.onStateChange) this.callbacks.onStateChange(e.data); },
onError: (e) => {
console.error(`[YT:${this.instanceId}] ошибка ${e.data}`);
if (this.callbacks.onError) this.callbacks.onError(e.data);
}
}
});
} catch (e) {
console.error(`[YT:${this.instanceId}] не создан:`, e);
}
}

load(track, startSeconds = 0, autoplay = true) {
if (!this.isReady || !this.yt || !track) return;
if (this._pendingPause) { clearTimeout(this._pendingPause); this._pendingPause = null; }
try { this.yt.mute(); } catch (e) {}
const s = Math.max(0, Math.floor(Number(startSeconds) || 0));
try {
if (track.type === 'playlist') {
this.yt.loadPlaylist({ list: track.id, index: 0, startSeconds: s });
} else if (s > 0) {
this.yt.loadVideoById({ videoId: track.id, startSeconds: s });
} else {
this.yt.loadVideoById({ videoId: track.id });
}
if (!autoplay) {
this._pendingPause = setTimeout(() => {
this._pendingPause = null;
this.pause();
}, 500);
}
} catch (e) {
console.error(`[YT:${this.instanceId}] загрузка не удалась:`, e);
}
}

play(track) { this.load(track, 0, true); }

seekTo(seconds) {
if (!this.isReady || !this.yt || !this.yt.seekTo) return;
try { this.yt.seekTo(Math.max(0, Number(seconds) || 0), true); } catch (e) {}
}

pause() {
if (this.isReady && this.yt && this.yt.pauseVideo) {
try { this.yt.pauseVideo(); } catch (e) {}
}
}

resume() {
if (this.isReady && this.yt && this.yt.playVideo) {
try { this.yt.playVideo(); } catch (e) {}
}
}

stop() {
if (this._pendingPause) { clearTimeout(this._pendingPause); this._pendingPause = null; }
if (this.isReady && this.yt && this.yt.stopVideo) {
try { this.yt.mute(); this.yt.stopVideo(); } catch (e) {}
}
}

setVolume(vol) {
const v = Math.max(0, Math.min(100, parseInt(vol) || 0));
if (this.isReady && this.yt && this.yt.setVolume) {
try { this.yt.setVolume(v); } catch (e) {}
}
}

mute() { if (this.isReady && this.yt && this.yt.mute) { try { this.yt.mute(); } catch (e) {} } }
unMute() { if (this.isReady && this.yt && this.yt.unMute) { try { this.yt.unMute(); } catch (e) {} } }
forcePlay() { if (this.isReady && this.yt && this.yt.playVideo) { try { this.yt.playVideo(); } catch (e) {} } }
getState() { return this.isReady && this.yt && this.yt.getPlayerState ? this.yt.getPlayerState() : -1; }

getCurrentTime() {
if (this.isReady && this.yt && this.yt.getCurrentTime) {
try { return this.yt.getCurrentTime() || 0; } catch (e) {}
}
return 0;
}

getDuration() {
if (this.isReady && this.yt && this.yt.getDuration) {
try { return this.yt.getDuration() || 0; } catch (e) {}
}
return 0;
}

getTimes() { return { current: this.getCurrentTime(), duration: this.getDuration() }; }

getProgress() {
const { current, duration } = this.getTimes();
return duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
}

isPlaylistEnded() {
if (this.isReady && this.yt && this.yt.getPlaylist && this.yt.getPlaylistIndex) {
try {
const pl = this.yt.getPlaylist();
const idx = this.yt.getPlaylistIndex();
return (!pl || pl.length === 0 || idx === pl.length - 1);
} catch (e) {}
}
return true;
}

destroy() {
if (this._pendingPause) clearTimeout(this._pendingPause);
if (this.yt && this.yt.destroy) { try { this.yt.destroy(); } catch (e) {} }
this.yt = null;
this.isReady = false;
}
}