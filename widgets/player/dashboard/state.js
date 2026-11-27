/* ФАЙЛ: widgets/player/dashboard/state.js — v5.1 (hotfix: удалена задвоенная копия модуля) */
import { QueueMirror } from '../queue.js';

export class DashboardState {
    constructor() {
        this.roster = { players: [], active: null, preferred: null };
        this.queue = new QueueMirror();
        this.transport = { state: 'IDLE', currentTime: 0, duration: 0, muted: false, uid: null, _recv: 0 };
        this.demoWanted = false;
        this.listeners = new Set();
        console.log('[Dash:state] v5.1 инициализирован (единая копия модуля)');
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    emit() {
        this.listeners.forEach(fn => {
            try { fn(this); } catch (e) { console.error('[Dash:state] Ошибка слушателя:', e); }
        });
    }

    applyRoster(payload) {
        if (!payload) {
            console.warn('[Dash:state] applyRoster: пустой payload, пропускаю');
            return;
        }
        const prevActive = this.roster.active;
        this.roster = {
            players: Array.isArray(payload.players) ? payload.players : [],
            active: payload.active || null,
            preferred: payload.preferred || null
        };
        if (this.roster.active !== prevActive) {
            console.log(`[Dash:state] Активный плеер: ${prevActive || 'нет'} → ${this.roster.active || 'нет'}`);
        }
        this.emit();
    }

    applyQueue(payload) {
        if (!payload) {
            console.warn('[Dash:state] applyQueue: пустой payload, пропускаю');
            return;
        }
        this.queue.apply(payload);
        this.emit();
    }

    applyTransport(payload) {
        if (!payload) {
            console.warn('[Dash:state] applyTransport: пустой payload, пропускаю');
            return;
        }
        this.transport = {
            state: payload.state || 'IDLE',
            currentTime: Number(payload.currentTime) || 0,
            duration: Number(payload.duration) || 0,
            muted: !!payload.muted,
            uid: payload.uid || null,
            _recv: performance.now()
        };
        this.emit();
    }

    has(mode) { return this.roster.players.some(p => p.mode === mode); }

    activeMode() {
        if (this.roster.active) return this.roster.active;
        if (this.has('obs')) return 'obs';
        if (this.has('demo')) return 'demo';
        return null;
    }

    setDemoWanted(value) {
        this.demoWanted = !!value;
        this.emit();
    }
}