/* ФАЙЛ: js/components/externalSources/controller.js — v1 (стейт, IPC, dropzone, жизненный цикл карточки) */
import { store } from '../../store.js';
import { EXT_DEFAULTS, MAX_KEY_BYTES, renderCard } from './card.js';

const SLOT_ID = 'external-card-slot';

function api() { return window.obsAPI || null; }
function has(name) {
  const a = api();
  return Boolean(a && typeof a[name] === 'function');
}

class ExternalSourcesController {
  constructor() {
    this.state = { ...EXT_DEFAULTS };
    this._token = 0;
    this._docDragOver = null;
    this._docDrop = null;
    this._mounted = false;
  }

  /* ---------- рендер ---------- */

  refresh() {
    const slot = document.getElementById(SLOT_ID);
    if (!slot) return;
    try {
      slot.innerHTML = renderCard(this.state, Boolean(store.getState().isElectronEnv));
      this._bind();
    } catch (e) {
      console.error('[ExternalSources] Не удалось перерисовать карточку:', e);
    }
  }

  _busy() {
    const s = this.state;
    return Boolean(s.importing || s.applying || s.loading);
  }

  _importDisabled() {
    return !store.getState().isElectronEnv || !this.state.supported || this._busy();
  }

  /* ---------- привязка событий ---------- */

  _bind() {
    const btnApply = document.getElementById('btn-external-apply');
    const btnRefresh = document.getElementById('btn-external-refresh');
    const btnCreate = document.getElementById('btn-external-create');
    const btnReveal = document.getElementById('btn-external-reveal');

    if (btnApply) btnApply.onclick = () => this.apply();
    if (btnRefresh) btnRefresh.onclick = () => {
      this.state.loading = true;
      this.state.lastResult = null;
      this.refresh();
      this.load();
    };
    if (btnCreate) btnCreate.onclick = () => this.create();
    if (btnReveal) btnReveal.onclick = () => this.reveal();

    const drop = document.getElementById('ext-dropzone');
    const fileInput = document.getElementById('ext-file-input');
    if (!drop || !fileInput) return;

    drop.onclick = () => { if (!this._importDisabled()) fileInput.click(); };
    drop.onkeydown = (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && !this._importDisabled()) {
        ev.preventDefault();
        fileInput.click();
      }
    };
    fileInput.onchange = () => {
      const f = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (f) this.importFile(f);
    };
    drop.ondragenter = (ev) => {
      ev.preventDefault();
      if (!this._importDisabled()) drop.classList.add('is-over');
    };
    drop.ondragover = (ev) => {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
      if (!this._importDisabled()) drop.classList.add('is-over');
    };
    drop.ondragleave = (ev) => {
      ev.preventDefault();
      if (ev.relatedTarget && drop.contains(ev.relatedTarget)) return;
      drop.classList.remove('is-over');
    };
    drop.ondrop = (ev) => {
      ev.preventDefault();
      drop.classList.remove('is-over');
      if (this._importDisabled()) return;
      const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) {
        this.importFile(f);
      } else {
        this.state.lastResult = { ok: false, level: 'error', text: 'В перетаскивании не найден файл. Перетащите .json из проводника.' };
        this.refresh();
      }
    };
  }

  /* ---------- операции ---------- */

  async load() {
    const token = this._token;
    if (!has('getExternalSources')) {
      this.state = { ...this.state, loading: false, supported: false };
      this.refresh();
      return;
    }
    try {
      const data = await api().getExternalSources();
      if (token !== this._token) return;
      this.state = { ...this.state, ...(data || {}), loading: false, supported: true, applying: false };
      console.log('[ExternalSources] Источников:', (data && data.count) || 0, '· файл:', data && data.exists ? 'найден' : 'отсутствует');
    } catch (err) {
      if (token !== this._token) return;
      console.error('[ExternalSources] Чтение ключа провалено:', err);
      this.state = { ...this.state, loading: false, ok: false, errors: [err.message] };
    }
    this.refresh();
  }

  async apply() {
    if (!has('applyExternalSources')) return;
    const token = this._token;
    this.state.applying = true;
    this.state.lastResult = null;
    this.refresh();
    store.addLog('Применяю внешние источники в OBS (включая самопрослушивание)...', 'info');
    try {
      const res = await api().applyExternalSources(store.getState().config.obsPath);
      if (token !== this._token) return;
      const ok = Boolean(res && res.status === 'ok');
      this.state.applying = false;
      this.state.lastResult = {
        ok,
        text: (res && res.message) || (ok ? 'Источники применены.' : 'Источники не применены — смотрите журнал на Дашборде.')
      };
    } catch (err) {
      if (token !== this._token) return;
      this.state.applying = false;
      this.state.lastResult = { ok: false, level: 'error', text: err.message };
      store.addLog(`Сбой применения внешних источников: ${err.message}`, 'error');
    }
    this.refresh();
  }

  async create() {
    if (!has('createExternalSources')) return;
    const token = this._token;
    try {
      const res = await api().createExternalSources();
      if (token !== this._token) return;
      this.state.lastResult = {
        ok: Boolean(res && res.status === 'ok'),
        text: (res && res.message) || 'Готово.'
      };
    } catch (err) {
      if (token !== this._token) return;
      this.state.lastResult = { ok: false, level: 'error', text: err.message };
    }
    this.refresh();
    await this.load();
  }

  async reveal() {
    if (!has('revealExternalSources')) return;
    try {
      const res = await api().revealExternalSources();
      if (res && res.status !== 'ok') store.addLog(`Не удалось открыть папку: ${res.message}`, 'warn');
    } catch (err) {
      store.addLog(`Не удалось открыть папку: ${err.message}`, 'error');
    }
  }

  _reject(text) {
    this.state.lastResult = { ok: false, level: 'error', text };
    this.refresh();
  }

  async importFile(file) {
    if (!has('importExternalSources')) {
      this._reject('Импорт доступен только в лаунчере (Electron).');
      return;
    }
    if (this.state.importing || !file) return;

    const name = String(file.name || 'key.json');
    if (!/\.json$/i.test(name)) { this._reject(`«${name}» — нужен файл с расширением .json.`); return; }
    if (file.size > MAX_KEY_BYTES) { this._reject('Файл больше 1 МБ — это не ключ внешних источников.'); return; }
    if (file.size === 0) { this._reject('Файл пуст.'); return; }

    const token = this._token;
    this.state.importing = true;
    this.state.lastResult = null;
    this.refresh();
    store.addLog(`Импорт ключа внешних источников: ${name}...`, 'info');
    console.log('[ExternalSources] Импорт ключа:', name, file.size, 'байт');

    let imported = false;
    try {
      let text;
      if (typeof file.text === 'function') {
        text = await file.text();
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
          reader.readAsText(file);
        });
      }
      if (token !== this._token) return;

      const res = await api().importExternalSources(text, name);
      if (token !== this._token) return;
      this.state.importing = false;

      if (res && res.status === 'ok') {
        imported = true;
        const warnNote = (res.warnings && res.warnings.length) ? ` Предупреждений: ${res.warnings.length} (см. журнал).` : '';
        this.state.lastResult = {
          ok: true,
          text: `Ключ принят: ${res.count} источник(ов), активных ${res.activeCount}.${res.replaced ? ' Предыдущий ключ сохранён в external-sources.backup.json.' : ''}${warnNote} Нажмите «Применить в OBS».`
        };
      } else {
        const errs = res && res.errors && res.errors.length ? ` ${res.errors.slice(0, 3).join('; ')}` : '';
        this.state.lastResult = {
          ok: false,
          level: 'error',
          text: `Файл отклонён: ${(res && res.message) || 'неизвестная ошибка'}.${errs} Текущий ключ не изменён.`
        };
      }
    } catch (err) {
      if (token !== this._token) return;
      this.state.importing = false;
      this.state.lastResult = { ok: false, level: 'error', text: `Сбой импорта: ${err.message}` };
      store.addLog(`Сбой импорта ключа: ${err.message}`, 'error');
      console.error('[ExternalSources] Импорт упал:', err);
    }

    this.refresh();
    if (imported) await this.load();
  }

  /* ---------- жизненный цикл ---------- */

  mount(state) {
    this._token++;
    this._mounted = true;
    const envOK = Boolean(state && state.isElectronEnv);
    this.state = { ...EXT_DEFAULTS, loading: envOK, supported: envOK };

    // Случайный дроп файла мимо зоны не должен уводить Electron на file:// страницу.
    this._docDragOver = (ev) => ev.preventDefault();
    this._docDrop = (ev) => ev.preventDefault();
    document.addEventListener('dragover', this._docDragOver);
    document.addEventListener('drop', this._docDrop);

    this.refresh();
    if (envOK) this.load();
    console.log('[ExternalSources] карточка смонтирована, Electron:', envOK);
  }

  unmount() {
    this._token++;
    this._mounted = false;
    if (this._docDragOver) document.removeEventListener('dragover', this._docDragOver);
    if (this._docDrop) document.removeEventListener('drop', this._docDrop);
    this._docDragOver = null;
    this._docDrop = null;
  }
}

/** Модульный синглтон: render() экрана вызывается раньше mount(), состояние должно переживать переходы. */
export const externalSources = new ExternalSourcesController();