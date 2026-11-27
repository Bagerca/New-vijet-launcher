/* ФАЙЛ: backend/player/playerCommands.js — v6.2 (стоп по умолчанию + разовое перемешивание плейлиста) */
const EventEmitter = require('events');

const ALIASES = {
    PLAYER_CMD_ADD: 'PLAYER_ADD_TRACK',
    PLAYER_CMD_PLAY_UID: 'PLAYER_PLAY_SPECIFIC',
    PLAYER_CMD_REMOVE: 'PLAYER_REMOVE_TRACK'
};

const COMMANDS = new Set([
    'PLAYER_ADD_TRACK', 'PLAYER_PLAY_SPECIFIC', 'PLAYER_REMOVE_TRACK', 'PLAYER_RESTORE_TRACK',
    'PLAYER_CLEAR', 'PLAYER_SKIP', 'PLAYER_PREV', 'PLAYER_PLAYLIST_RESTART', 'PLAYER_SHUFFLE_PLAYLIST',
    'PLAYER_STOP', 'PLAYER_PAUSE', 'PLAYER_MUTE', 'PLAYER_SEEK'
]);

const ADVANCE_COOLDOWN = 1500;
const MAX_ERRORS_PER_TRACK = 2;
const MAX_CONSECUTIVE_FAILURES = 3;

class PlayerCommands extends EventEmitter {
    constructor({ config, queue, transport, registry }) {
        super();
        this.config = config;
        this.queue = queue;
        this.transport = transport;
        this.registry = registry;
        // Сервер стартует в состоянии «остановлен».
        // Музыку запускают только: заказ (!play / форма / панель), скип, клик по треку,
        // «плейлист с начала» или кнопка ▶ в дашборде.
        this.userStopped = true;
        this.pendingAdvance = false;
        this.pendingReason = '';
        this._advanceTimer = null;
        this._lastAdvanceAt = 0;
        this._errors = new Map();
        this._consecutiveFailures = 0;
        console.log('[PlayerCommands] v6.2: автозапуск при подключении отключён — старт только вручную или по заказу.');
    }

    normalize(action) { return ALIASES[action] || action; }
    isPlayerCommand(action) { return COMMANDS.has(action); }
    hasActivePlayer() { return this.registry.hasActive(); }

    notice(level, text) {
        console.log(`[Notice:${level}] ${text}`);
        this.emit('notice', { level, text, ts: Date.now() });
    }

    _load(track, startSeconds = 0, state = 'PLAYING') {
        this.queue.setCurrent(track);
        this.transport.start(track, startSeconds, state);
        this.userStopped = false;
        this.pendingAdvance = false;
        this._lastAdvanceAt = Date.now();
        this.emit('load', { track: { ...track }, startSeconds, state, muted: this.transport.muted });
    }

    _scheduleAdvance(reason, delay) {
        if (this._advanceTimer) clearTimeout(this._advanceTimer);
        this._advanceTimer = setTimeout(() => {
            this._advanceTimer = null;
            this.advance(reason, { force: true });
        }, Math.max(0, delay));
    }

    advance(reason, { force = false } = {}) {
        if (!this.hasActivePlayer()) {
            this.pendingAdvance = true;
            this.pendingReason = reason;
            console.log(`[Queue] ${reason}: нет активного плеера — отложено до подключения`);
            return { ok: true, deferred: true, message: 'Плеер не подключён — трек запустится автоматически' };
        }
        if (this.userStopped && !force) {
            return { ok: false, message: 'Плеер остановлен вручную' };
        }
        const since = Date.now() - this._lastAdvanceAt;
        if (!force && since < ADVANCE_COOLDOWN) {
            this._scheduleAdvance(reason, ADVANCE_COOLDOWN - since);
            return { ok: true, deferred: true, message: 'Команда принята (защита от частых переключений)' };
        }
        const next = this.queue.pickNext();
        if (next) {
            console.log(`[Queue] ${reason}: ${next.title || next.id}`);
            this._load(next, 0, 'PLAYING');
            return { ok: true, message: 'Следующий трек' };
        }
        this.queue.clearCurrent();
        this.transport.stop();
        this.pendingAdvance = false;
        this._lastAdvanceAt = Date.now();
        this.emit('stop');
        return { ok: true, message: 'Очередь пуста' };
    }

    retryCurrent(reason) {
        const track = this.queue.nowPlaying;
        if (!track) return false;
        const seconds = this.transport.currentSeconds();
        console.log(`[Queue] ${reason}: повторная загрузка ${track.title || track.id} @ ${seconds.toFixed(1)}s`);
        this.transport.start(track, seconds, 'PLAYING');
        this._lastAdvanceAt = Date.now();
        this.emit('load', { track: { ...track }, startSeconds: seconds, state: 'PLAYING', muted: this.transport.muted });
        return true;
    }

    stop(byUser = true) {
        if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
        this.pendingAdvance = false;
        this._errors.clear();
        this._consecutiveFailures = 0;
        this.queue.clearCurrent();
        this.transport.stop();
        if (byUser) this.userStopped = true;
        this._lastAdvanceAt = Date.now();
        this.emit('stop');
    }

    adopt(mode) {
        if (!mode) return;
        if (this.queue.nowPlaying) {
            this.emit('loadTo', {
                mode,
                track: { ...this.queue.nowPlaying },
                startSeconds: this.transport.currentSeconds(),
                state: this.transport.state === 'PAUSED' ? 'PAUSED' : 'PLAYING',
                muted: this.transport.muted
            });
        } else {
            this.emit('stopTo', { mode });
        }
    }

    onActiveChanged(active) {
        if (!active) return;
        // Продолжение уже идущей сессии (эстафета/переподключение).
        if (this.queue.nowPlaying) { this.adopt(active); return; }
        // Заказ, пришедший пока плеер был офлайн.
        if (this.pendingAdvance) {
            const reason = this.pendingReason || 'ОТЛОЖЕННЫЙ СТАРТ';
            this.pendingAdvance = false;
            this.advance(reason, { force: true });
            return;
        }
        if (!this.userStopped && this.config.isEnabled() && (this.queue.orders.length > 0 || this.config.isBgEnabled())) {
            this.advance('АВТОСТАРТ', { force: true });
        }
    }

    onConfigChange({ autostart = false } = {}) {
        if (!this.config.isEnabled()) { this.stop(false); return; }
        if (!autostart) return;
        if (!this.hasActivePlayer()) return;
        if (this.queue.nowPlaying || this.userStopped) return;
        if (this.queue.orders.length > 0 || this.config.isBgEnabled()) this.advance('КОНФИГ', { force: true });
    }

    onTransportReport(payload) {
        if (!payload) return;
        if (payload.state === 'PLAYING' && Number(payload.currentTime) > 0.5) {
            this._consecutiveFailures = 0;
            const uid = this.queue.nowPlaying ? this.queue.nowPlaying.uid : null;
            if (uid) this._errors.delete(uid);
        }
    }

    handleTrackEnded(payload = {}) {
        const uid = this.queue.nowPlaying ? this.queue.nowPlaying.uid : null;
        if (!uid || payload.uid !== uid) return;
        this._errors.delete(uid);
        this._consecutiveFailures = 0;
        this.advance('КОНЕЦ ТРЕКА', { force: true });
    }

    handleTrackError(payload = {}) {
        const current = this.queue.nowPlaying;
        if (!current || payload.uid !== current.uid) return;
        const count = (this._errors.get(current.uid) || 0) + 1;
        this._errors.set(current.uid, count);
        console.warn(`[Queue] Ошибка трека (${count}/${MAX_ERRORS_PER_TRACK}) ${current.title || current.id}: ${payload.reason || 'unknown'}`);
        if (count < MAX_ERRORS_PER_TRACK) {
            this.retryCurrent('ПОВТОР ПОСЛЕ ОШИБКИ');
            return;
        }
        this._errors.delete(current.uid);
        this._consecutiveFailures++;
        if (this._consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            this.stop(true);
            this.notice('error', 'YouTube не отвечает: 3 трека подряд не запустились. Проверь сеть и доступность видео, затем нажми «Скип».');
            return;
        }
        this.advance('ОШИБКА ТРЕКА', { force: true });
    }

    handle(action, payload = {}) {
        switch (action) {
            case 'PLAYER_ADD_TRACK': {
                const res = this.queue.addOrder(payload.url, payload.user);
                if (res.ok) {
                    this.userStopped = false;
                    if (!this.queue.nowPlaying && this.config.isEnabled()) this.advance('ДОБАВЛЕНО', { force: true });
                }
                return res;
            }
            case 'PLAYER_PLAY_SPECIFIC': {
                const found = this.queue.findTrack(payload.uid);
                if (!found) return { ok: false, message: 'Трек не найден в очереди' };
                if (!this.hasActivePlayer()) return { ok: false, message: 'Нет активного плеера' };
                if (found.source === 'order') this.queue.takeOrder(payload.uid);
                if (found.source === 'playlist' && this.queue.removed.includes(payload.uid)) this.queue.restoreTrack(payload.uid);
                this._consecutiveFailures = 0;
                this._errors.delete(payload.uid);
                this._load(found.track, 0, 'PLAYING');
                return { ok: true, message: 'Трек запущен' };
            }
            case 'PLAYER_REMOVE_TRACK': {
                const res = this.queue.removeTrack(payload.uid);
                if (res.ok && res.wasPlaylist && this.queue.nowPlaying && this.queue.nowPlaying.uid === payload.uid) {
                    this.advance('УДАЛЁН ТЕКУЩИЙ', { force: true });
                }
                return res;
            }
            case 'PLAYER_RESTORE_TRACK':
                return this.queue.restoreTrack(payload.uid);
            case 'PLAYER_CLEAR':
                return this.queue.clearOrders();
            case 'PLAYER_SKIP':
                this.userStopped = false;
                this._consecutiveFailures = 0;
                return this.advance('СКИП', { force: true });
            case 'PLAYER_PREV': {
                if (!this.hasActivePlayer()) return { ok: false, message: 'Нет активного плеера' };
                this.userStopped = false;
                this._consecutiveFailures = 0;
                if (this.queue.history.length === 0) {
                    if (this.queue.nowPlaying) {
                        this._load(this.queue.nowPlaying, 0, 'PLAYING');
                        return { ok: true, message: 'Трек с начала' };
                    }
                    return { ok: false, message: 'История пуста' };
                }
                const track = this.queue.previous();
                if (!track) return { ok: false, message: 'Предыдущий трек недоступен' };
                this.queue.setCurrent(track, { pushHistory: false });
                this.transport.start(track, 0, 'PLAYING');
                this.pendingAdvance = false;
                this._lastAdvanceAt = Date.now();
                this.emit('load', { track: { ...track }, startSeconds: 0, state: 'PLAYING', muted: this.transport.muted });
                return { ok: true, message: 'Предыдущий трек' };
            }
            case 'PLAYER_PLAYLIST_RESTART': {
                if (!this.hasActivePlayer()) return { ok: false, message: 'Нет активного плеера' };
                const track = this.queue.restartPlaylist();
                if (!track) return { ok: false, message: 'Плейлист пуст' };
                this._consecutiveFailures = 0;
                this._load(track, 0, 'PLAYING');
                return { ok: true, message: 'Плейлист запущен с начала' };
            }
            case 'PLAYER_SHUFFLE_PLAYLIST':
                return this.queue.shuffleNow();
            case 'PLAYER_STOP':
                this.stop(true);
                return { ok: true, message: 'Плеер остановлен' };
            case 'PLAYER_PAUSE': {
                if (!this.queue.nowPlaying) return { ok: false, message: 'Нечего ставить на паузу' };
                const next = this.transport.togglePause();
                this.emit('pause', { state: next });
                return { ok: true, message: next === 'PAUSED' ? 'Пауза' : 'Продолжаем' };
            }
            case 'PLAYER_MUTE':
                this.transport.setMuted(payload.muted);
                this.emit('mute', { muted: this.transport.muted });
                return { ok: true, message: this.transport.muted ? 'Звук выключен' : 'Звук включён' };
            case 'PLAYER_SEEK': {
                if (!this.queue.nowPlaying) return { ok: false, message: 'Нет активного трека' };
                this.transport.seek(payload.seconds);
                this.emit('seek', { seconds: this.transport.currentTime });
                return { ok: true, message: 'Перемотка' };
            }
            default:
                return { ok: false, message: 'Неизвестная команда' };
        }
    }
}

module.exports = PlayerCommands;