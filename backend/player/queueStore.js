/* ФАЙЛ: backend/player/queueStore.js — v6 (разовое перемешивание кнопкой + флаг фактического порядка) */
const EventEmitter = require('events');

function extractYouTubeId(url) {
    if (!url) return null;
    const s = String(url).trim();
    const list = s.match(/[?&]list=([^#&?]+)/);
    if (list) return { type: 'playlist', id: list[1] };
    const video = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (video) return { type: 'video', id: video[1] };
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return { type: 'video', id: s };
    return null;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

class QueueStore extends EventEmitter {
    constructor(config, titles) {
        super();
        this.config = config;
        this.titles = titles;
        this.orders = [];
        this.playlist = [];
        this.order = [];
        this.played = [];
        this.removed = [];
        this.cursor = -1;
        this.nowPlaying = null;
        this.history = [];
        this.seq = 0;
        this._lastKey = '';
        this._lastRaw = null;
        this._shuffledOnce = false;
        titles.on('title', ({ id, title }) => this.applyTitle(id, title));
        config.on('change', () => this.rebuildFromConfig());
    }

    init() { this.rebuildFromConfig(true); }

    rebuildFromConfig(force = false) {
        const conf = this.config.player();
        const raw = String(conf.playlistUrls || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const shuffle = this.config.isShuffle();
        const key = JSON.stringify(raw) + '|' + shuffle;
        if (!force && key === this._lastKey) return;
        const rawChanged = JSON.stringify(raw) !== JSON.stringify(this._lastRaw || []);
        this._lastKey = key;
        this._lastRaw = raw;

        const list = [];
        raw.forEach((u, i) => {
            const d = extractYouTubeId(u);
            if (!d) return;
            list.push({
                uid: `pl:${i}:${d.id}`,
                id: d.id,
                type: d.type,
                index: i,
                title: d.type === 'playlist' ? 'Плейлист YouTube' : 'Загрузка названия…',
                user: 'Фоновая музыка',
                isBackground: true
            });
        });

        this.playlist = list;
        this.order = list.map(t => t.uid);
        if (shuffle) shuffleArray(this.order);
        // Пересборка порядка сбрасывает разовое перемешивание кнопкой.
        this._shuffledOnce = false;
        this.played = this.played.filter(uid => this.order.includes(uid));
        this.removed = rawChanged ? [] : this.removed.filter(uid => this.order.includes(uid));
        if (this.nowPlaying && this.nowPlaying.isBackground && !this.order.includes(this.nowPlaying.uid)) {
            this.nowPlaying = null;
        }
        this.cursor = this.nowPlaying ? this.order.indexOf(this.nowPlaying.uid) : -1;
        this.titles.request(list);
        this.emit('change');
    }

    /** Разовое перемешивание fokнового порядка. Текущий трек не перезапускается. */
    shuffleNow() {
        if (this.order.length < 2) {
            return { ok: false, message: 'Плейлист слишком короткий для перемешивания' };
        }
        shuffleArray(this.order);
        this._shuffledOnce = true;
        this.cursor = this.nowPlaying ? this.order.indexOf(this.nowPlaying.uid) : -1;
        console.log('[Queue] Плейлист перемешан вручную');
        this.emit('change');
        return { ok: true, message: 'Плейлист перемешан' };
    }

    applyTitle(id, title) {
        let changed = false;
        this.playlist.forEach(t => { if (t.id === id && t.title !== title) { t.title = title; changed = true; } });
        this.orders.forEach(t => { if (t.id === id && t.title !== title) { t.title = title; changed = true; } });
        if (this.nowPlaying && this.nowPlaying.id === id && this.nowPlaying.title !== title) {
            this.nowPlaying.title = title;
            changed = true;
        }
        if (changed) this.emit('change');
    }

    payload() {
        return {
            orders: this.orders.map(t => ({ ...t })),
            playlist: this.playlist.map(t => ({ ...t, played: this.played.includes(t.uid), removed: this.removed.includes(t.uid) })),
            order: this.order.slice(),
            nowPlaying: this.nowPlaying ? { ...this.nowPlaying } : null,
            cursor: this.cursor,
            shuffle: this.config.isShuffle() || this._shuffledOnce,
            bgEnabled: this.config.isBgEnabled(),
            enabled: this.config.isEnabled(),
            canPrev: this.history.length > 0,
            ts: Date.now()
        };
    }

    addOrder(url, user) {
        const d = extractYouTubeId(url);
        if (!d) return { ok: false, message: 'Не распознал ссылку YouTube' };
        const track = {
            uid: `ord:${++this.seq}:${d.id}`,
            id: d.id,
            type: d.type,
            title: d.type === 'playlist' ? 'Плейлист YouTube' : 'Загрузка названия…',
            user: user || 'Гость',
            isBackground: false
        };
        this.orders.push(track);
        this.titles.request([track]);
        this.emit('change');
        return { ok: true, message: 'Трек добавлен в очередь', track };
    }

    takeOrder(uid) {
        const t = this.orders.find(x => x.uid === uid);
        if (!t) return null;
        this.orders = this.orders.filter(x => x.uid !== uid);
        this.emit('change');
        return t;
    }

    findTrack(uid) {
        const o = this.orders.find(t => t.uid === uid);
        if (o) return { track: o, source: 'order' };
        const p = this.playlist.find(t => t.uid === uid);
        if (p) return { track: p, source: 'playlist' };
        if (this.nowPlaying && this.nowPlaying.uid === uid) return { track: this.nowPlaying, source: 'current' };
        return null;
    }

    setCurrent(track, { pushHistory = true } = {}) {
        if (!track) return;
        if (pushHistory && this.nowPlaying && this.nowPlaying.uid !== track.uid) {
            this.history.push(this.nowPlaying.uid);
            if (this.history.length > 60) this.history.shift();
        }
        this.nowPlaying = { ...track };
        if (track.isBackground) {
            const avail = this.order.filter(uid => !this.removed.includes(uid));
            if (this.played.length >= avail.length && avail.length > 0) this.played = [];
            if (!this.played.includes(track.uid)) this.played.push(track.uid);
            const idx = this.order.indexOf(track.uid);
            if (idx >= 0) this.cursor = idx;
        }
        this.titles.request([this.nowPlaying]);
        this.emit('change');
    }

    clearCurrent() {
        this.nowPlaying = null;
        this.emit('change');
    }

    pickNext() {
        if (this.orders.length > 0) return this.orders.shift();
        if (!this.config.isBgEnabled()) return null;
        const avail = this.order.filter(uid => !this.removed.includes(uid));
        if (avail.length === 0) return null;
        const total = this.order.length;
        const start = this.cursor < 0 ? -1 : this.cursor;
        for (let i = 1; i <= total; i++) {
            const idx = ((start + i) % total + total) % total;
            const uid = this.order[idx];
            if (this.removed.includes(uid)) continue;
            const track = this.playlist.find(t => t.uid === uid);
            if (!track) continue;
            this.cursor = idx;
            return track;
        }
        return null;
    }

    removeTrack(uid) {
        const before = this.orders.length;
        this.orders = this.orders.filter(t => t.uid !== uid);
        if (this.orders.length !== before) {
            this.emit('change');
            return { ok: true, message: 'Заказ удалён', wasOrder: true };
        }
        if (this.playlist.some(t => t.uid === uid)) {
            if (!this.removed.includes(uid)) this.removed.push(uid);
            this.emit('change');
            return { ok: true, message: 'Трек скрыт из плейлиста', wasPlaylist: true };
        }
        return { ok: false, message: 'Трек не найден' };
    }

    restoreTrack(uid) {
        this.removed = this.removed.filter(u => u !== uid);
        this.emit('change');
        return { ok: true, message: 'Трек возвращён в плейлист' };
    }

    clearOrders() {
        this.orders = [];
        this.emit('change');
        return { ok: true, message: 'Очередь заказов очищена' };
    }

    restartPlaylist() {
        this.played = [];
        this.cursor = -1;
        this.removed = [];
        const firstUid = this.order.find(uid => !this.removed.includes(uid));
        return this.playlist.find(t => t.uid === firstUid) || null;
    }

    previous() {
        if (this.history.length === 0) return null;
        const uid = this.history.pop();
        const found = this.findTrack(uid);
        return found ? found.track : null;
    }
}

module.exports = QueueStore;