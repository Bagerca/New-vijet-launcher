/* ФАЙЛ: widgets/player/script.js — v6.1 (сохранение позиции при эстафете + команды !bgplay / !playerc) */
import { YouTubeWrapper } from './youtube.js';
import { extractYouTubeId } from './queue.js';
import { AvatarManager } from '../shared/AvatarManager.js';
import { icons } from '../../js/utils/icons.js';
import { WidgetCore } from '../shared/WidgetCore.js';

const PARAMS = new URLSearchParams(window.location.search);
const IS_DEMO = PARAMS.get('demo') === '1';
const IS_PREVIEW = PARAMS.get('preview') === '1';
const MODE = IS_DEMO ? 'demo' : 'obs';
const INSTANCE_ID = MODE + '-' + Math.random().toString(36).slice(2, 9);
console.log(`[Player:${MODE}] v6.1 старт, id=${INSTANCE_ID}`);

if (IS_PREVIEW && !IS_DEMO) {
    console.log('[Player] Статичное превью — логика отключена.');
} else {
    function hexToRgb(hex) {
        let h = String(hex || '#ff4d85').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `${isNaN(r) ? 255 : r}, ${isNaN(g) ? 77 : g}, ${isNaN(b) ? 133 : b}`;
    }

    const UI = {
        container: document.getElementById('widget-container'),
        nameLabel: document.getElementById('requester-name'),
        infoLabelText: document.getElementById('info-label-text'),
        avatarEl: document.getElementById('requester-avatar'),
        volLabel: document.getElementById('volume-level'),
        queueCount: document.getElementById('queue-count'),
        progressBar: document.getElementById('yt-progress-bar'),
        initIcons() {
            const v = document.getElementById('icon-volume');
            const q = document.getElementById('icon-queue');
            const vinyl = document.getElementById('bg-vinyl-icon');
            if (v && icons.volume) v.innerHTML = icons.volume();
            if (q && icons.queue) q.innerHTML = icons.queue();
            if (vinyl && icons.vinyl) vinyl.innerHTML = icons.vinyl();
        },
        updateStats(vol, qCount) {
            if (this.volLabel) this.volLabel.innerText = vol;
            if (this.queueCount && this.queueCount.innerText !== String(qCount)) {
                this.queueCount.innerText = qCount;
                this.queueCount.classList.remove('animate-pop');
                void this.queueCount.offsetWidth;
                this.queueCount.classList.add('animate-pop');
            }
        },
        showTrack(track, accentColor) {
            if (!this.container || !track) return;
            this.container.classList.remove('hidden');
            if (track.isBackground) {
                this.nameLabel.innerText = 'Фоновая музыка';
                this.infoLabelText.innerText = 'АВТОПЛЕЙЛИСТ';
                this.container.classList.add('mode-background');
            } else {
                this.nameLabel.innerText = track.user || 'Гость';
                this.infoLabelText.innerText = 'СЕЙЧАС ИГРАЕТ ЗАКАЗ';
                this.container.classList.remove('mode-background');
                AvatarManager.get(track.user || 'Гость', accentColor || '#ff4d85')
                    .then(url => { if (this.avatarEl) this.avatarEl.src = url; })
                    .catch(() => {});
            }
        },
        setPlayingState(isPlaying) {
            if (!this.container) return;
            this.container.classList.toggle('is-playing', !!isPlaying);
        },
        setProgress(p) {
            if (this.progressBar) this.progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, p || 0))})`;
        },
        hide() {
            this.setPlayingState(false);
            if (this.container) this.container.classList.add('hidden');
        }
    };

    const AppPlayer = {
        yt: null,
        track: null,
        state: 'IDLE',
        muted: false,
        active: MODE === 'obs',
        ordersCount: 0,
        wantPaused: false,
        watchdog: null,
        _endedTimer: null,
        _errorTimer: null,
        _verifyTimer: null,
        _expectedStart: null,
        _expectedSince: 0,
        config: { volume: 30, bgVolume: 15, accentColor: '#ff4d85', enabled: true, playlistEnabled: false },

        init() {
            UI.initIcons();
            this.yt = new YouTubeWrapper(MODE.toUpperCase(), 'yt-player', {
                onReady: () => {
                    this.applyVolume();
                    this.register();
                    this.report();
                },
                onStateChange: (code) => this.onYtState(code),
                onError: (code) => this.reportError('yt-error-' + code)
            });
            setInterval(() => this.register(), 2500);
            setInterval(() => this.report(), 1000);
            setInterval(() => this.tickProgress(), 400);
            setTimeout(() => this.register(), 250);
            setTimeout(() => this.register(), 1200);
        },

        register() {
            const ws = WidgetCore.ws;
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify({ event: 'PLAYER_REGISTER', mode: MODE, instanceId: INSTANCE_ID })); } catch (e) {}
            }
        },

        send(action, payload) { WidgetCore.sendAction(action, payload || {}); },

        cancelPendingReports() {
            if (this._endedTimer) { clearTimeout(this._endedTimer); this._endedTimer = null; }
            if (this._errorTimer) { clearTimeout(this._errorTimer); this._errorTimer = null; }
        },

        _clearSeekVerify() {
            if (this._verifyTimer) { clearTimeout(this._verifyTimer); this._verifyTimer = null; }
        },

        /**
         * YouTube иногда игнорирует startSeconds при повторной загрузке того же видео.
         * Контролируем фактическую позицию и доводим её принудительным seek.
         */
        _scheduleSeekVerify(uid, start) {
            this._clearSeekVerify();
            if (!(start > 1)) return;
            const run = (delay, retries) => {
                this._verifyTimer = setTimeout(() => {
                    this._verifyTimer = null;
                    if (!this.active || this.wantPaused) return;
                    if (!this.track || this.track.uid !== uid) return;
                    if (!this.yt || !this.yt.isReady) return;
                    const cur = this.yt.getCurrentTime();
                    if (Math.abs(cur - start) > 3) {
                        console.warn(`[Player:${MODE}] Позиция сброшена (${cur.toFixed(1)}s ≠ ${start.toFixed(1)}s) — принудительный seek`);
                        this.yt.seekTo(start);
                        this._expectedStart = start;
                        this._expectedSince = Date.now();
                        if (retries > 0) run(1500, retries - 1);
                    } else {
                        this._expectedStart = null;
                    }
                }, delay);
            };
            run(1300, 1);
        },

        report() {
            if (!this.active || !this.yt) return;
            const ws = WidgetCore.ws;
            if (!ws || ws.readyState !== 1) return;
            const t = this.yt.getTimes();
            let current = t.current;
            // Пока YouTube не подтвердил переданную позицию — не отдаём серверу ноль/старое значение.
            if (this._expectedStart !== null) {
                const expected = this._expectedStart;
                if (current >= expected - 2) {
                    this._expectedStart = null;
                } else if (Date.now() - this._expectedSince < 6000) {
                    current = Math.max(current, expected);
                } else {
                    this._expectedStart = null;
                }
            }
            try {
                ws.send(JSON.stringify({
                    event: 'PLAYER_TRANSPORT',
                    instanceId: INSTANCE_ID,
                    uid: this.track ? this.track.uid : null,
                    state: this.state,
                    currentTime: current,
                    duration: t.duration,
                    muted: this.muted
                }));
            } catch (e) {}
        },

        reportEnded() {
            if (!this.active || !this.track) return;
            if (this._endedTimer || this._errorTimer) return;
            const uid = this.track.uid;
            this._endedTimer = setTimeout(() => {
                this._endedTimer = null;
                if (!this.active || !this.track || this.track.uid !== uid) return;
                const ws = WidgetCore.ws;
                if (!ws || ws.readyState !== 1) return;
                console.log(`[Player:${MODE}] Трек завершён: ${uid}`);
                try { ws.send(JSON.stringify({ event: 'PLAYER_TRACK_ENDED', uid, instanceId: INSTANCE_ID })); } catch (e) {}
            }, 350);
        },

        reportError(reason) {
            if (!this.active || !this.track) return;
            if (this._errorTimer) return;
            if (this._endedTimer) { clearTimeout(this._endedTimer); this._endedTimer = null; }
            const uid = this.track.uid;
            this._errorTimer = setTimeout(() => {
                this._errorTimer = null;
                if (!this.active || !this.track || this.track.uid !== uid) return;
                const ws = WidgetCore.ws;
                if (!ws || ws.readyState !== 1) return;
                console.warn(`[Player:${MODE}] Ошибка воспроизведения (${reason}): ${uid}`);
                try { ws.send(JSON.stringify({ event: 'PLAYER_TRACK_ERROR', uid, instanceId: INSTANCE_ID, reason })); } catch (e) {}
            }, 900);
        },

        applyRoster(payload) {
            if (!payload) return;
            const nextActive = payload.active === MODE;
            if (nextActive === this.active) return;
            this.active = nextActive;
            if (!nextActive) {
                console.log(`[Player:${MODE}] Эстафета передана → пауза`);
                this.cancelPendingReports();
                this.clearWatchdog();
                this._clearSeekVerify();
                this._expectedStart = null;
                this.wantPaused = true;
                if (this.yt) this.yt.pause();
                this.state = 'PAUSED';
                UI.setPlayingState(false);
                UI.hide();
                this.pet(false);
            } else {
                console.log(`[Player:${MODE}] Принял эстафету`);
                this.register();
            }
        },

        loadTrack(payload, isAdopt) {
            if (!this.active || !payload || !payload.track) return;
            this.cancelPendingReports();
            this.clearWatchdog();
            this._clearSeekVerify();
            const track = payload.track;
            const start = Number(payload.startSeconds) || 0;
            const wantState = payload.state === 'PAUSED' ? 'PAUSED' : 'PLAYING';
            this.track = track;
            this.muted = !!payload.muted;
            this.wantPaused = wantState === 'PAUSED';
            this.state = wantState;
            this._expectedStart = start > 1 ? start : null;
            this._expectedSince = Date.now();
            UI.showTrack(track, this.config.accentColor);
            UI.setProgress(0);
            this.applyVolume();
            if (this.yt) {
                this.yt.load(track, start, wantState === 'PLAYING');
                if (wantState === 'PLAYING') this.yt.resume();
            }
            UI.setPlayingState(wantState === 'PLAYING');
            this.pet(wantState === 'PLAYING');
            this.startWatchdog();
            if (!this.wantPaused) this._scheduleSeekVerify(track.uid, start);
            console.log(`[Player:${MODE}] ${isAdopt ? 'Эстафета' : 'Загрузка'}: ${track.title || track.id} @ ${start.toFixed(1)}s (${wantState})`);
        },

        applyVolume() {
            if (!this.yt) return;
            const vol = this.track && this.track.isBackground ? this.config.bgVolume : this.config.volume;
            const safe = Math.max(0, Math.min(100, parseInt(vol) || 0));
            this.yt.setVolume(safe);
            UI.updateStats(safe, this.ordersCount);
        },

        applyConfig(pConf) {
            if (!pConf) return;
            this.config = { ...this.config, ...pConf };
            if (this.config.accentColor) {
                const hex = String(this.config.accentColor).startsWith('#') ? this.config.accentColor : `#${this.config.accentColor}`;
                document.documentElement.style.setProperty('--player-accent', hex);
                document.documentElement.style.setProperty('--player-accent-rgb', hexToRgb(hex));
            }
            this.applyVolume();
            this.register();
        },

        pet(active) {
            if (!this.active) return;
            if (WidgetCore.callbacks.onWidgetAction) {
                WidgetCore.callbacks.onWidgetAction('PET_BASE_STATE', { state: 'jam', active });
            }
        },

        onYtState(code) {
            if (!this.active) return;
            if (code === 1) {
                this.cancelPendingReports();
                this.clearWatchdog();
                if (this.wantPaused) { this.yt.pause(); return; }
                this.state = 'PLAYING';
                UI.setPlayingState(true);
                if (!this.muted) this.yt.unMute();
                this.pet(true);
                this.report();
            } else if (code === 2) {
                UI.setPlayingState(false);
                if (this.wantPaused) {
                    this.state = 'PAUSED';
                    this.pet(false);
                    this.report();
                }
            } else if (code === 3) {
                this.clearWatchdog();
                this.startWatchdog();
            } else if (code === 0) {
                UI.setPlayingState(false);
                this.pet(false);
                if (this.track && this.track.type === 'playlist' && !this.yt.isPlaylistEnded()) return;
                this.reportEnded();
            }
        },

        startWatchdog() {
            this.clearWatchdog();
            if (!this.active || this.wantPaused) return;
            this.watchdog = setTimeout(() => this._watchdogCheck(), 10000);
        },

        _watchdogCheck() {
            this.watchdog = null;
            if (!this.active || this.wantPaused || this.state !== 'PLAYING') return;
            const st = this.yt ? this.yt.getState() : -1;
            if (st === 1) return;
            if (st === 3) {
                this.watchdog = setTimeout(() => this._watchdogCheck(), 6000);
                return;
            }
            if (this.yt) this.yt.forcePlay();
            this.watchdog = setTimeout(() => {
                this.watchdog = null;
                if (!this.active || this.wantPaused || this.state !== 'PLAYING') return;
                const st2 = this.yt ? this.yt.getState() : -1;
                if (st2 === 1 || st2 === 3) return;
                this.reportError('watchdog');
            }, 4000);
        },

        clearWatchdog() {
            if (this.watchdog) clearTimeout(this.watchdog);
            this.watchdog = null;
        },

        tickProgress() {
            if (this.state === 'PLAYING' && this.yt && this.yt.isReady) {
                UI.setProgress(this.yt.getProgress());
            }
        },

        handleAction(action, payload = {}) {
            if (action === 'PLAYER_ROSTER') { this.applyRoster(payload); return; }
            if (action === 'PLAYER_QUEUE_STATE') {
                this.ordersCount = Array.isArray(payload.orders) ? payload.orders.length : 0;
                this.applyVolume();
                return;
            }
            if (action === 'PLAYER_LOAD_TRACK') { this.loadTrack(payload, false); return; }
            if (action === 'PLAYER_ADOPT_STATE') { this.loadTrack(payload, true); return; }
            if (action === 'PLAYER_STOP') {
                this.cancelPendingReports();
                this.clearWatchdog();
                this._clearSeekVerify();
                this._expectedStart = null;
                this.track = null;
                this.state = 'IDLE';
                this.wantPaused = false;
                if (this.yt) this.yt.stop();
                UI.hide();
                UI.setProgress(0);
                this.pet(false);
                return;
            }
            if (action === 'PLAYER_PAUSE') {
                if (!this.active || !this.track) return;
                const next = payload.state === 'PAUSED' ? 'PAUSED' : 'PLAYING';
                this.cancelPendingReports();
                this.wantPaused = next === 'PAUSED';
                this.state = next;
                if (this.wantPaused) {
                    this._clearSeekVerify();
                    this._expectedStart = null;
                }
                if (this.yt) { if (this.wantPaused) this.yt.pause(); else this.yt.resume(); }
                UI.setPlayingState(!this.wantPaused);
                this.pet(!this.wantPaused);
                if (!this.wantPaused) this.startWatchdog(); else this.clearWatchdog();
                this.report();
                return;
            }
            if (action === 'PLAYER_MUTE') {
                this.muted = !!payload.muted;
                if (this.yt) {
                    if (this.muted) this.yt.mute();
                    else if (this.state === 'PLAYING') this.yt.unMute();
                }
                this.report();
                return;
            }
            if (action === 'PLAYER_SEEK') {
                if (!this.active || !this.yt) return;
                this.cancelPendingReports();
                this._clearSeekVerify();
                this._expectedStart = null;
                this.yt.seekTo(Number(payload.seconds) || 0);
                UI.setProgress(this.yt.getProgress());
                this.startWatchdog();
                this.report();
                return;
            }
        },

        handleChat(cmd, args, tags) {
            if (!this.active) return;
            if (String(this.config.enabled) === 'false') return;
            const user = (tags && (tags['display-name'] || tags.username)) || 'Зритель';
            const url = (args || []).join(' ').trim();
            if (cmd === '!play' || cmd === '!sr') {
                if (url && extractYouTubeId(url)) this.send('PLAYER_ADD_TRACK', { url, user });
            } else if (cmd === '!skip') {
                this.send('PLAYER_SKIP', {});
            } else if (cmd === '!prev') {
                this.send('PLAYER_PREV', {});
            } else if (cmd === '!pause') {
                this.send('PLAYER_PAUSE', {});
            } else if (cmd === '!clear') {
                this.send('PLAYER_CLEAR', {});
            } else if (cmd === '!vol') {
                const vol = parseInt(args[0], 10);
                if (!isNaN(vol)) WidgetCore.updateWidgetConfig('player', { volume: Math.max(0, Math.min(100, vol)) });
            } else if (cmd === '!bgplay') {
                const arg = (args[0] || '').toLowerCase();
                const cur = this.config.playlistEnabled === true || String(this.config.playlistEnabled) === 'true';
                const next = arg === 'on' ? true : (arg === 'off' ? false : !cur);
                WidgetCore.updateWidgetConfig('player', { playlistEnabled: next });
                console.log(`[Player:${MODE}] !bgplay → фоновый плейлист ${next ? 'включён' : 'выключен'}`);
            } else if (cmd === '!playerc') {
                let color = (args[0] || '').trim();
                if (!color) return;
                if (!color.startsWith('#')) color = '#' + color;
                if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
                    WidgetCore.updateWidgetConfig('player', { accentColor: color });
                    console.log(`[Player:${MODE}] !playerc → ${color}`);
                }
            }
        }
    };

    AppPlayer.init();

    WidgetCore.init({
        onConfigUpdate: (config) => {
            if (config.widgets?.player) AppPlayer.applyConfig(config.widgets.player);
            AppPlayer.register();
        },
        onWidgetAction: (action, payload) => AppPlayer.handleAction(action, payload),
        onTwitchCommand: (cmd, args, tags) => AppPlayer.handleChat(cmd, args, tags)
    });
}