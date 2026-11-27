/* ФАЙЛ: widgets/player/dashboard/controls.js — v7 (▶-старт, shuffle-кнопка, копирование чипов, mute) */
import { icons } from '../../../js/utils/icons.js';
import { copyText } from '../../../js/utils/clipboard.js';
import { formatTime } from '../queue.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');

export class ControlsController {
    constructor({ root, state, toast, onCmd, onAddTrack }) {
        this.root = root;
        this.state = state;
        this.toast = toast;
        this.onCmd = onCmd;
        this.onAddTrack = onAddTrack;
        this.raf = null;
        this.dragging = false;
        this.dragRatio = 0;
        this.clearArmed = false;
        this.clearTimer = null;
        this.chipTimers = new Map();
        this.clickHandler = null;
        this.keyHandler = null;
        this.seekDown = null;
        this.seekMove = null;
        this.seekUp = null;
    }

    mount() {
        this.clickHandler = (e) => this._onClick(e);
        this.keyHandler = (e) => {
            if (e.key === 'Enter' && e.target && e.target.id === 'pd-input') {
                e.preventDefault();
                this._addTrack();
            }
        };
        this.root.addEventListener('click', this.clickHandler);
        this.root.addEventListener('keydown', this.keyHandler);
        const seek = document.getElementById('pd-seek');
        this.seekDown = (e) => this._onSeekDown(e);
        this.seekMove = (e) => this._onSeekMove(e);
        this.seekUp = (e) => this._onSeekUp(e);
        if (seek) seek.addEventListener('pointerdown', this.seekDown);
        window.addEventListener('pointermove', this.seekMove);
        window.addEventListener('pointerup', this.seekUp);
        const loop = () => { this._tickProgress(); this.raf = requestAnimationFrame(loop); };
        this.raf = requestAnimationFrame(loop);
    }

    unmount() {
        if (this.raf) cancelAnimationFrame(this.raf);
        if (this.clearTimer) clearTimeout(this.clearTimer);
        for (const t of this.chipTimers.values()) clearTimeout(t);
        this.chipTimers.clear();
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.keyHandler) this.root.removeEventListener('keydown', this.keyHandler);
        const seek = document.getElementById('pd-seek');
        if (seek && this.seekDown) seek.removeEventListener('pointerdown', this.seekDown);
        if (this.seekMove) window.removeEventListener('pointermove', this.seekMove);
        if (this.seekUp) window.removeEventListener('pointerup', this.seekUp);
    }

    _onClick(e) {
        const t = e.target;

        const chip = t.closest('.pd-chip');
        if (chip) {
            e.preventDefault();
            this._copyChip(chip);
            return;
        }

        const shuffle = t.closest('#pd-shuffle');
        if (shuffle && !shuffle.disabled) {
            e.preventDefault();
            shuffle.classList.add('is-spin');
            setTimeout(() => { if (shuffle.isConnected) shuffle.classList.remove('is-spin'); }, 620);
            this.onCmd('PLAYER_SHUFFLE_PLAYLIST', {}, { okToast: 'Плейлист перемешан.' });
            return;
        }

        if (t.closest('#pd-mute')) {
            e.preventDefault();
            this.onCmd('PLAYER_MUTE', { muted: !this.state.transport.muted }, { silent: true });
            return;
        }

        const clear = t.closest('#pd-clear');
        if (clear && !clear.disabled) {
            e.preventDefault();
            if (!this.clearArmed) {
                this.clearArmed = true;
                clear.classList.add('is-armed');
                this.toast.info('Очистить все заказы? Нажмите корзину ещё раз.');
                clearTimeout(this.clearTimer);
                this.clearTimer = setTimeout(() => { this.clearArmed = false; clear.classList.remove('is-armed'); }, 3000);
            } else {
                this.clearArmed = false;
                clearTimeout(this.clearTimer);
                clear.classList.remove('is-armed');
                this.onCmd('PLAYER_CLEAR', {}, { okToast: 'Очередь заказов очищена.' });
            }
            return;
        }

        // Центральная кнопка в простое = СТАРТ очереди (сначала заказы, потом фон).
        const main = t.closest('#pd-pause');
        if (main && !main.disabled && !this.state.queue.nowPlaying) {
            e.preventDefault();
            const q = this.state.queue;
            const playable = q.orders.length > 0 || (q.bgEnabled && q.playlist.some(x => !x.removed));
            if (!playable) {
                this.toast.info('Очередь пуста. Добавьте трек или включите фоновый плейлист.');
                return;
            }
            this.onCmd('PLAYER_SKIP', {}, { silent: true });
            return;
        }

        const cmd = t.closest('[data-pd-cmd]');
        if (cmd && !cmd.disabled) {
            e.preventDefault();
            this.onCmd(cmd.getAttribute('data-pd-cmd'), {}, { silent: true });
            return;
        }

        const add = t.closest('#pd-add');
        if (add && !add.disabled) {
            e.preventDefault();
            this._addTrack();
        }
    }

    async _copyChip(chip) {
        const text = chip.getAttribute('data-copy') || '';
        const ok = await copyText(text);
        if (!ok) {
            this.toast.error(`Не удалось скопировать. Команда: ${text.trim()}`);
            return;
        }
        this.toast.success(`Скопировано: ${text.trim()}`);
        const iconEl = chip.querySelector('.pd-chip-ic');
        if (iconEl) iconEl.innerHTML = ic('check');
        chip.classList.add('is-copied');
        const old = this.chipTimers.get(chip);
        if (old) clearTimeout(old);
        this.chipTimers.set(chip, setTimeout(() => {
            this.chipTimers.delete(chip);
            if (!chip.isConnected) return;
            chip.classList.remove('is-copied');
            const el = chip.querySelector('.pd-chip-ic');
            if (el) el.innerHTML = ic('copy');
        }, 1400));
    }

    _addTrack() {
        const input = document.getElementById('pd-input');
        if (!input) return;
        const url = input.value.trim();
        if (!url) return;
        if (this.onAddTrack(url)) input.value = '';
    }

    _liveSeconds() {
        const t = this.state.transport;
        if (this.dragging) return this.dragRatio * (t.duration || 0);
        let cur = t.currentTime || 0;
        if (t.state === 'PLAYING' && t.duration > 0) {
            cur = Math.min(t.duration, cur + (performance.now() - (t._recv || performance.now())) / 1000);
        }
        return cur;
    }

    _tickProgress() {
        const t = this.state.transport;
        const dur = t.duration || 0;
        const cur = this._liveSeconds();
        const ratio = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;
        const fill = document.getElementById('pd-seek-fill');
        const knob = document.getElementById('pd-seek-knob');
        const curEl = document.getElementById('pd-time-cur');
        const durEl = document.getElementById('pd-time-dur');
        if (fill) fill.style.width = `${(ratio * 100).toFixed(2)}%`;
        if (knob) knob.style.left = `${(ratio * 100).toFixed(2)}%`;
        if (curEl) curEl.textContent = formatTime(cur);
        if (durEl) durEl.textContent = dur > 0 ? formatTime(dur) : '—:—';
    }

    _seekRatioFromEvent(e) {
        const seek = document.getElementById('pd-seek');
        if (!seek) return 0;
        const rect = seek.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }

    _onSeekDown(e) {
        const seek = document.getElementById('pd-seek');
        if (!seek || seek.classList.contains('is-disabled')) return;
        if (!this.state.transport.duration) return;
        e.preventDefault();
        this.dragging = true;
        this.dragRatio = this._seekRatioFromEvent(e);
        seek.classList.add('is-dragging');
        try { seek.setPointerCapture(e.pointerId); } catch (err) {}
        this._tickProgress();
    }

    _onSeekMove(e) {
        if (!this.dragging) return;
        this.dragRatio = this._seekRatioFromEvent(e);
        this._tickProgress();
    }

    _onSeekUp() {
        if (!this.dragging) return;
        this.dragging = false;
        const seek = document.getElementById('pd-seek');
        if (seek) seek.classList.remove('is-dragging');
        const seconds = this.dragRatio * (this.state.transport.duration || 0);
        this.state.transport.currentTime = seconds;
        this.state.transport._recv = performance.now();
        this.onCmd('PLAYER_SEEK', { seconds }, { silent: true });
        this._tickProgress();
    }

    evaluate(online) {
        const mode = this.state.activeMode();
        const q = this.state.queue;
        const t = this.state.transport;
        const now = q.nowPlaying;
        const canCmd = Boolean(mode) && online && q.enabled;

        this.root.querySelectorAll('[data-pd-cmd]').forEach(b => { b.disabled = !canCmd; });

        const pauseBtn = document.getElementById('pd-pause');
        if (pauseBtn) {
            const idle = !now;
            pauseBtn.innerHTML = idle ? ic('play') : (t.state === 'PAUSED' ? ic('play') : ic('pause'));
            pauseBtn.title = idle ? 'Запустить плеер' : (t.state === 'PAUSED' ? 'Продолжить' : 'Пауза');
            pauseBtn.disabled = !canCmd;
            pauseBtn.classList.toggle('is-start', idle && canCmd);
        }

        const muteBtn = document.getElementById('pd-mute');
        if (muteBtn) {
            muteBtn.disabled = !canCmd;
            muteBtn.classList.toggle('is-muted', t.muted);
            muteBtn.innerHTML = t.muted ? ic('volumeX') : ic('volume');
            muteBtn.title = t.muted ? 'Включить звук' : 'Заглушить всё (громкость сохранится)';
        }

        const shuffleBtn = document.getElementById('pd-shuffle');
        if (shuffleBtn) shuffleBtn.disabled = !online || !q.enabled || q.playlist.length < 2;

        const input = document.getElementById('pd-input');
        const addBtn = document.getElementById('pd-add');
        const canAdd = Boolean(mode) && online && q.enabled;
        if (input) input.disabled = !canAdd;
        if (addBtn) addBtn.disabled = !canAdd;

        const nowTitle = document.getElementById('pd-now-title');
        const nowMeta = document.getElementById('pd-now-meta');
        if (nowTitle) nowTitle.textContent = now ? (now.title || 'Загрузка названия…') : (q.enabled ? 'Ничего не играет' : 'Плеер выключен');
        if (nowMeta) {
            nowMeta.textContent = now ? (now.isBackground ? 'ФОНОВЫЙ ПЛЕЙЛИСТ' : `ЗАКАЗ: ${now.user}`) : '—';
            nowMeta.classList.toggle('is-bg', !now || !!now.isBackground);
        }

        const seek = document.getElementById('pd-seek');
        if (seek) seek.classList.toggle('is-disabled', !now || !canCmd);
    }
}