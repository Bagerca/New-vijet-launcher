/* ФАЙЛ: widgets/media/dashboard/controls.js — v2 (ссылка, оформление, сброс — без пустых переключателей) */
import { youTubeId } from './library.js';

export class ControlsController {
    constructor({ root, store, toast }) {
        this.root = root;
        this.store = store;
        this.toast = toast;
        this.inputHandler = null;
        this.changeHandler = null;
        this.clickHandler = null;
        this.keyHandler = null;
        this._lastSig = '';
    }

    mount() {
        this.inputHandler = (e) => this._onInput(e);
        this.changeHandler = (e) => this._onChange(e);
        this.clickHandler = (e) => this._onClick(e);
        this.keyHandler = (e) => {
            if (e.key === 'Enter' && e.target && e.target.id === 'md-yt-input') {
                e.preventDefault();
                this._applyLink();
            }
        };
        this.root.addEventListener('input', this.inputHandler);
        this.root.addEventListener('change', this.changeHandler);
        this.root.addEventListener('click', this.clickHandler);
        this.root.addEventListener('keydown', this.keyHandler);
    }

    unmount() {
        if (this.inputHandler) this.root.removeEventListener('input', this.inputHandler);
        if (this.changeHandler) this.root.removeEventListener('change', this.changeHandler);
        if (this.clickHandler) this.root.removeEventListener('click', this.clickHandler);
        if (this.keyHandler) this.root.removeEventListener('keydown', this.keyHandler);
    }

    _set(patch) {
        try {
            this.store.updateConfig({ widgets: { media: patch } });
        } catch (e) {
            console.error('[MediaControls] Не удалось сохранить настройку:', e);
            this.toast.error('Настройка не сохранилась.');
        }
    }

    _onInput(e) {
        const t = e.target;
        if (t.id === 'md-yt-input') { this._previewLink(t.value); return; }
        if (!t.hasAttribute || !t.hasAttribute('data-md-key')) return;
        const key = t.getAttribute('data-md-key');
        if (t.type === 'color') {
            const hex = document.getElementById('md-color-hex');
            if (hex) hex.textContent = t.value;
            this._set({ [key]: t.value });
        } else if (t.type === 'text') {
            this._set({ [key]: t.value });
        }
    }

    _onChange(e) {
        const t = e.target;
        if (!t.hasAttribute || !t.hasAttribute('data-md-key')) return;
        if (t.type === 'checkbox') {
            const key = t.getAttribute('data-md-key');
            this._set({ [key]: t.checked });
            if (key === 'isActive') {
                this.toast.show(t.checked ? 'Карточка показана на стриме.' : 'Карточка скрыта со стрима.', t.checked ? 'success' : 'info');
            }
        }
    }

    _onClick(e) {
        const t = e.target;

        if (t.closest('#md-yt-apply')) { e.preventDefault(); this._applyLink(); return; }

        if (t.closest('#md-yt-clear')) {
            e.preventDefault();
            const input = document.getElementById('md-yt-input');
            if (input) input.value = '';
            this._set({ ytLink: '' });
            this._previewLink('');
            this.toast.info('Ссылка убрана — показываем выбранное из библиотеки.');
            return;
        }

        if (t.closest('#md-reset')) {
            e.preventDefault();
            const input = document.getElementById('md-yt-input');
            if (input) input.value = '';
            this.store.resetWidgetToDefaults('media');
            this._previewLink('');
            this.toast.success('Настройки карточки сброшены.');
        }
    }

    _applyLink() {
        const input = document.getElementById('md-yt-input');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) { this.toast.info('Вставьте ссылку на YouTube.'); return; }
        const id = youTubeId(raw);
        if (!id) { this.toast.error('Не распознал ссылку YouTube.'); return; }
        this._set({ ytLink: raw, isActive: true });
        this.toast.success('Реакция показана на экране.');
    }

    _previewLink(value) {
        const raw = String(value || '').trim();
        const id = youTubeId(raw);
        const wrap = document.getElementById('md-yt-preview');
        const thumb = document.getElementById('md-yt-thumb');
        const idEl = document.getElementById('md-yt-id');
        const note = document.getElementById('md-yt-error');
        const apply = document.getElementById('md-yt-apply');

        if (wrap) wrap.classList.toggle('is-visible', Boolean(raw));
        if (apply) apply.disabled = !id;

        if (thumb) {
            const url = id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : '';
            if (thumb.dataset.src !== url) {
                thumb.dataset.src = url;
                if (url) { thumb.src = url; thumb.classList.remove('is-broken'); }
                else { thumb.removeAttribute('src'); thumb.classList.add('is-broken'); }
            }
        }
        if (idEl) idEl.textContent = id ? `ID: ${id}` : 'Ссылка не распознана';
        if (note) {
            note.classList.toggle('is-error', Boolean(raw) && !id);
            note.textContent = !raw
                ? 'Вставьте ссылку — карточка переключится в режим реакции.'
                : (id ? 'Готово к показу. Нажмите «Показать».' : 'Нужна ссылка youtu.be / youtube.com или ID из 11 символов.');
        }
    }

    evaluate(state) {
        const c = state.config.widgets.media || {};
        const link = String(c.ytLink || '').trim();

        const autoColor = c.autoColor === undefined ? true : (c.autoColor === true || String(c.autoColor) === 'true');
        const colorRow = document.getElementById('md-color-row');
        if (colorRow) colorRow.classList.toggle('is-disabled', autoColor);
        const colorInput = this.root.querySelector('[data-md-key="accentColor"]');
        if (colorInput) {
            colorInput.disabled = autoColor;
            if (document.activeElement !== colorInput && c.accentColor && colorInput.value !== String(c.accentColor)) {
                colorInput.value = String(c.accentColor);
            }
        }
        const hex = document.getElementById('md-color-hex');
        if (hex) hex.textContent = autoColor ? 'АВТО' : String(c.accentColor || '#ff4d85');

        this.root.querySelectorAll('[data-md-key]').forEach(input => {
            const key = input.getAttribute('data-md-key');
            const val = c[key];
            if (val === undefined || document.activeElement === input) return;
            if (input.type === 'checkbox') {
                const checked = val === true || String(val) === 'true';
                if (input.checked !== checked) input.checked = checked;
            } else if (input.type === 'text') {
                if (input.value !== String(val)) input.value = String(val);
            }
        });

        const ytInput = document.getElementById('md-yt-input');
        if (ytInput && document.activeElement !== ytInput && ytInput.value !== link) {
            ytInput.value = link;
        }

        const sig = JSON.stringify([link, c.libId, c.isActive]);
        if (sig !== this._lastSig) {
            this._lastSig = sig;
            this._previewLink(ytInput ? ytInput.value : link);
        }
    }
}