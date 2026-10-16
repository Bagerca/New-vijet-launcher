/* ФАЙЛ: widgets/player/queue.js (Мозги очередей и плейлистов) */

export class PlayerQueue {
    constructor(onQueueUpdateCallback) {
        this.userQueue = [];
        this.bgPlaylist = [];
        this.bgShuffleBag = [];
        this.shuffleEnabled = true;
        this.onQueueUpdate = onQueueUpdateCallback;
        
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('uso_queue');
            if (saved) this.userQueue = JSON.parse(saved);
            this.onQueueUpdate(this.userQueue.length);
        } catch (e) { this.userQueue = []; }
    }

    save() {
        try { localStorage.setItem('uso_queue', JSON.stringify(this.userQueue)); } catch(e) {}
        this.onQueueUpdate(this.userQueue.length);
    }

    extractData(url) {
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
    }

    updateBgPlaylist(urlsText, shuffleEnabled) {
        const wasShuffle = this.shuffleEnabled;
        this.shuffleEnabled = shuffleEnabled;

        this.bgPlaylist = (urlsText || '').split('\n')
            .map(l => l.trim())
            .filter(l => l !== '')
            .map(url => this.extractData(url))
            .filter(data => data !== null);

        if (wasShuffle !== this.shuffleEnabled || this.bgShuffleBag.length === 0) {
            this.populateShuffleBag();
        }
    }

    populateShuffleBag() {
        this.bgShuffleBag = [...this.bgPlaylist];
        if (this.shuffleEnabled) {
            for (let i = this.bgShuffleBag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bgShuffleBag[i], this.bgShuffleBag[j]] = [this.bgShuffleBag[j], this.bgShuffleBag[i]];
            }
        }
    }

    add(url, user) {
        const ytData = this.extractData(url);
        if (!ytData) return false;
        
        this.userQueue.push({ type: ytData.type, id: ytData.id, user: user, isBackground: false });
        this.save();
        return true;
    }

    clearUserQueue() {
        this.userQueue = [];
        this.save();
    }

    getNext(isBgEnabled) {
        // 1. Приоритет зрителям
        if (this.userQueue.length > 0) {
            const track = this.userQueue.shift();
            this.save();
            return track;
        } 
        
        // 2. Фоновый плейлист
        if (isBgEnabled && this.bgPlaylist.length > 0) {
            if (this.bgShuffleBag.length === 0) this.populateShuffleBag();
            const track = this.bgShuffleBag.shift();
            track.isBackground = true;
            track.user = "STREAM VIBES";
            return track;
        }

        return null;
    }
}