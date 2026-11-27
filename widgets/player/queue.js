/* ФАЙЛ: widgets/player/queue.js — v6 (зеркало серверной очереди + утилиты) */

export function extractYouTubeId(url) {
if (!url) return null;
const s = String(url).trim();
const list = s.match(/[?&]list=([^#&?]+)/);
if (list) return { type: 'playlist', id: list[1] };
const video = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
if (video) return { type: 'video', id: video[1] };
if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return { type: 'video', id: s };
return null;
}

export function formatTime(sec) {
const s = Math.max(0, Math.floor(Number(sec) || 0));
const h = Math.floor(s / 3600);
const m = Math.floor((s % 3600) / 60);
const r = s % 60;
if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
return `${m}:${String(r).padStart(2, '0')}`;
}

export function thumbnailUrl(track, quality = 'mqdefault') {
if (!track || !track.id || track.type === 'playlist') return null;
return `https://img.youtube.com/vi/${track.id}/${quality}.jpg`;
}

export class QueueMirror {
constructor() {
this.orders = [];
this.playlist = [];
this.order = [];
this.nowPlaying = null;
this.cursor = -1;
this.shuffle = false;
this.bgEnabled = false;
this.enabled = true;
this.canPrev = false;
this.receivedAt = 0;
this.hasSnapshot = false;
}

apply(payload) {
if (!payload) return;
this.orders = Array.isArray(payload.orders) ? payload.orders : [];
this.playlist = Array.isArray(payload.playlist) ? payload.playlist : [];
this.order = Array.isArray(payload.order) ? payload.order : this.playlist.map(t => t.uid);
this.nowPlaying = payload.nowPlaying || null;
this.cursor = Number(payload.cursor ?? -1);
this.shuffle = !!payload.shuffle;
this.bgEnabled = !!payload.bgEnabled;
this.enabled = payload.enabled !== false;
this.canPrev = !!payload.canPrev;
this.receivedAt = Date.now();
this.hasSnapshot = true;
}

get currentUid() { return this.nowPlaying ? this.nowPlaying.uid : null; }

orderedPlaylist() {
const map = new Map(this.playlist.map(t => [t.uid, t]));
const seen = new Set();
const out = [];
this.order.forEach(uid => {
const t = map.get(uid);
if (t && !seen.has(uid)) { out.push(t); seen.add(uid); }
});
this.playlist.forEach(t => {
if (!seen.has(t.uid)) { out.push(t); seen.add(t.uid); }
});
return out;
}

filter(term) {
const q = String(term || '').trim().toLowerCase();
const match = (t) => !q
|| String(t.title || '').toLowerCase().includes(q)
|| String(t.user || '').toLowerCase().includes(q)
|| String(t.id || '').toLowerCase().includes(q);
return {
orders: this.orders.filter(match),
playlist: this.orderedPlaylist().filter(match)
};
}

get total() {
return this.orders.length + this.playlist.filter(t => !t.removed).length;
}
}