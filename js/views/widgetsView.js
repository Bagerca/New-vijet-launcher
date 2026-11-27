/* ФАЙЛ: js/views/widgetsView.js — v3 (очередь на перенос: перенесённые в 2.0 скрыты, карта миграции, живые фильтры) */
import { store } from '../store.js';
import { icons } from '../utils/icons.js';
import { UIControls } from '../components/UIControls.js';
import { paintRange, paintRanges } from '../utils/rangeFill.js';
import { setHashParams } from '../utils/hashParams.js';
import { isMigrated, migrationOf, v2Href, migrationStats, migratedChips } from '../../data/v2Registry.js';

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'overlay', label: 'Оверлеи' },
  { id: 'scene', label: 'Сцены' },
  { id: 'chat', label: 'Чат' },
  { id: 'media', label: 'Медиа' }
];

const MASTER_KEYS = ['enabled', 'isActive', 'isVisible', 'playlistEnabled'];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Ссылка на вкладку с сохранением остальных параметров (кроме открытого превью). */
function tabHref(params, updates) {
  const merged = { ...(params || {}), preview: null, ...updates };
  const sp = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    if (k === 'cat' && v === 'all') return;
    sp.set(k, String(v));
  });
  const q = sp.toString();
  return `#/widgets${q ? `?${q}` : ''}`;
}

function renderMigrationPanel(stats, manifest, showDone) {
  const chips = migratedChips(manifest);
  const segments = manifest.map(w => {
    const done = isMigrated(w.id);
    const mig = migrationOf(w.id);
    const title = done
      ? `${w.title} — перенесён в 2.0 (${mig ? mig.label : w.id})`
      : `${w.title} — ещё в очереди`;
    return `<span class="wg-seg ${done ? 'is-done' : ''}" title="${esc(title)}"></span>`;
  }).join('');

  const doneChips = chips.map(c => `
<a class="wg-chip is-done" href="${c.href}" title="Открыть дашборд 2.0: ${esc(c.label)}">
${icons.check()}<span>${esc(c.label)}</span>
</a>`).join('');

  const todoChips = stats.todo.map(w => `
<button class="wg-chip is-todo" type="button" data-wg-jump="${esc(w.id)}" title="Показать карточку ${esc(w.title)}">
${icons.chevronDown()}<span>${esc(w.title)}</span>
</button>`).join('');

  return `
<section class="card wg-migration">
  <header class="wg-mig-head">
    <div class="wg-mig-left">
      <span class="wg-mig-ic">${icons.layers()}</span>
      <div class="wg-mig-copy">
        <h3 class="wg-mig-title">Очередь на перенос в «Оверлеи 2.0»</h3>
        <p class="wg-mig-sub">
          Ниже — только виджеты, у которых ещё нет нового дашборда.
          Готовые скрыты из списка, но их настройки никуда не делись: они живут в 2.0 и в мобильной панели.
        </p>
      </div>
    </div>
    <div class="wg-mig-score">
      <span class="wg-mig-big">${stats.todoCount}</span>
      <span class="wg-mig-big-label">осталось перенести</span>
      <span class="wg-mig-fraction">${stats.doneCount} / ${stats.total} готово · ${stats.percent}%</span>
    </div>
  </header>

  <div class="wg-map" role="img" aria-label="Карта переноса: ${stats.doneCount} из ${stats.total} виджетов готовы">${segments}</div>

  <div class="wg-mig-rows">
    <div class="wg-mig-row">
      <span class="wg-row-label is-done">${icons.check()} Готово · ${stats.doneCount}</span>
      <div class="wg-chip-row">${doneChips || '<span class="wg-row-empty">Пока ничего не перенесено</span>'}</div>
    </div>
    <div class="wg-mig-row">
      <span class="wg-row-label is-todo">${icons.flask()} В очереди · ${stats.todoCount}</span>
      <div class="wg-chip-row">${todoChips || '<span class="wg-row-empty">Всё перенесено — очередь пуста</span>'}</div>
    </div>
  </div>

  <footer class="wg-mig-foot">
    <label class="wg-toggle" title="Показать карточки уже перенесённых виджетов отдельным блоком">
      <input type="checkbox" id="wg-show-done" ${showDone ? 'checked' : ''}>
      <span class="wg-toggle-track"></span>
      <span class="wg-toggle-label">Показывать перенесённые (${stats.doneCount})</span>
    </label>
    <a class="btn btn-secondary" href="#/widgets-v2">${icons.layers()} Открыть 2.0</a>
  </footer>
</section>`;
}

function renderCard(widget, config, searchQuery) {
  const widgetConfig = config[widget.id] || {};
  const masterControl = widget.controls.find(c => c.type === 'checkbox' && MASTER_KEYS.includes(c.key));
  const bodyControls = widget.controls.filter(c => c !== masterControl);

  const controlsHtml = bodyControls.map(control => {
    if (control.type === 'button') return UIControls.Button(control.label, control.action, control.payload);
    const val = widgetConfig[control.key] !== undefined ? widgetConfig[control.key] : control.default;
    let inputHtml = '';
    if (control.type === 'range') inputHtml = UIControls.RangeSlider(widget.id, control.key, val);
    else if (control.type === 'checkbox') inputHtml = UIControls.ToggleSwitch(widget.id, control.key, val, control.label);
    else if (control.type === 'color') inputHtml = UIControls.ColorInput(widget.id, control.key, val);
    else if (control.type === 'select') inputHtml = UIControls.Select(widget.id, control.key, val, control.options);
    else if (control.type === 'textarea') inputHtml = UIControls.Textarea(widget.id, control.key, val, control.label);
    else if (control.type === 'number') inputHtml = UIControls.NumberInput(widget.id, control.key, val);
    else inputHtml = UIControls.TextInput(widget.id, control.key, val, control.label);
    if (control.type === 'checkbox') return inputHtml;
    return UIControls.LabelWrapper(control.label, inputHtml, control.description);
  }).join('');

  let masterToggleHtml = '';
  let isMasterActive = true;
  if (masterControl) {
    const val = widgetConfig[masterControl.key] !== undefined ? widgetConfig[masterControl.key] : masterControl.default;
    masterToggleHtml = UIControls.ToggleSwitch(widget.id, masterControl.key, val, '');
    isMasterActive = val === true || String(val) === 'true';
  }

  const mig = migrationOf(widget.id);
  const done = Boolean(mig);
  const haystack = `${widget.title} ${widget.description}`.toLowerCase();
  const visibleBySearch = !searchQuery || haystack.includes(searchQuery.toLowerCase());

  const statusBadge = done
    ? `<span class="badge badge-success mb-xs" id="status-${widget.id}">ПЕРЕНЕСЁН</span>`
    : `<span class="badge ${isMasterActive ? 'badge-success' : 'badge-danger'} mb-xs" id="status-${widget.id}">${isMasterActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН'}</span>`;

  const queueTag = done
    ? `<span class="wg-card-tag is-done">${icons.check()} есть дашборд 2.0</span>`
    : `<span class="wg-card-tag is-todo">${icons.flask()} нужен дашборд 2.0</span>`;

  const v2Button = done
    ? `<a class="btn btn-primary wg-btn-v2" href="${v2Href(widget.id)}" title="Открыть новый дашборд">${icons.layers()} В 2.0</a>`
    : '';

  return `
<article class="card widget-card wg-card ${done ? 'is-migrated' : ''}" id="widget-${widget.id}"
  data-search="${esc(haystack)}" data-kind="${done ? 'done' : 'todo'}"
  style="display: ${visibleBySearch ? 'flex' : 'none'};">
  <header class="wg-card-head">
    <div class="flex-1">
      ${statusBadge}
      <h3 class="text-lg text-bold wg-card-title">${widget.title}</h3>
      <p class="text-secondary text-sm wg-card-desc">${widget.description}</p>
      ${queueTag}
    </div>
    <div class="wg-card-master">${masterToggleHtml}</div>
  </header>
  <form onsubmit="return false;" class="d-flex flex-column flex-1 justify-between">
    <fieldset class="wg-fieldset">
      ${controlsHtml}
    </fieldset>
    <div class="wg-card-foot">
      <button class="btn btn-secondary btn-preview" data-preview="${widget.id}" type="button">${icons.eye()} Предпросмотр</button>
      ${v2Button}
      <button class="btn btn-danger btn-reset" data-reset="${widget.id}" type="button">${icons.trash()} Сброс</button>
    </div>
  </form>
</article>`;
}

function renderSection(kind, list, config, searchQuery, showDone) {
  const isTodo = kind === 'todo';
  const title = isTodo ? 'Осталось перенести' : 'Уже в «Оверлеях 2.0»';
  const hint = isTodo
    ? 'Эти виджеты настраиваются только здесь — новых дашбордов у них ещё нет.'
    : 'Правки лучше делать в новом интерфейсе. Старые контролы работают, но могут разъехаться с 2.0.';
  const emptyDefault = isTodo
    ? 'В этой категории всё перенесено — новых задач нет.'
    : 'Перенесённых виджетов в этой категории нет.';

  const cards = list.map(w => renderCard(w, config, searchQuery)).join('');

  return `
<section class="wg-section">
  <div class="wg-section-head">
    <div>
      <h2 class="wg-section-title ${isTodo ? 'is-todo' : 'is-done'}">
        ${isTodo ? icons.flask() : icons.check()} ${title}
        <span class="wg-count-pill" id="wg-count-${kind}">${list.length}</span>
      </h2>
      <p class="wg-section-hint">${hint}</p>
    </div>
    ${!isTodo ? `<a class="btn btn-secondary" href="#/widgets-v2">${icons.layers()} Перейти к 2.0</a>` : ''}
  </div>
  <div class="wg-grid" id="wg-grid-${kind}">${cards}</div>
  <div class="wg-empty ${list.length ? 'is-hidden' : ''}" id="wg-empty-${kind}">
    ${icons.search()}
    <span class="wg-empty-text" id="wg-empty-text-${kind}" data-default="${esc(emptyDefault)}">${esc(emptyDefault)}</span>
    ${isTodo && !showDone ? `<a class="btn btn-secondary" href="#/widgets-v2">${icons.layers()} Открыть готовые дашборды</a>` : ''}
  </div>
</section>`;
}

export const WidgetsView = {
  _inputHandler: null,
  _changeHandler: null,
  _clickHandler: null,
  _searchHandler: null,
  _unsubStore: null,
  _resizeObserver: null,
  _lastParams: {},
  _silentClose: false,
  _jumpTimers: new Map(),

  render: (state, params) => {
    const manifest = Array.isArray(state.widgetsManifest) ? state.widgetsManifest : [];
    const config = state.config.widgets || {};
    const stats = migrationStats(manifest);
    const showDone = params?.done === '1';
    const activeCategory = params?.cat || 'all';
    const searchQuery = params?.search || '';

    WidgetsView._lastParams = { ...(params || {}) };

    const pool = showDone ? manifest : stats.todo;
    const counts = { all: pool.length };
    CATEGORIES.forEach(c => {
      if (c.id !== 'all') counts[c.id] = pool.filter(w => w.category === c.id).length;
    });

    const tabsHtml = CATEGORIES.map(t => {
      const n = counts[t.id] || 0;
      return `<a href="${tabHref(params, { cat: t.id })}" class="tab wg-tab ${activeCategory === t.id ? 'active' : ''}">
        <span>${t.label}</span><span class="wg-tab-count ${n === 0 ? 'is-zero' : ''}">${n}</span>
      </a>`;
    }).join('');

    const filtered = activeCategory === 'all' ? pool : pool.filter(w => w.category === activeCategory);
    const todoList = filtered.filter(w => !isMigrated(w.id));
    const doneList = filtered.filter(w => isMigrated(w.id));

    console.log(`[Widgets] Очередь: ${stats.todoCount} из ${stats.total} · категория ${activeCategory} · перенесённые ${showDone ? 'видны' : 'скрыты'}`);

    return `
<header class="view-header">
  <h1 class="view-title">Оверлеи 1.0 — очередь на перенос</h1>
  <p class="view-subtitle">Старый интерфейс настроек. Показаны только виджеты без дашборда в «Оверлеях 2.0».</p>
</header>

${renderMigrationPanel(stats, manifest, showDone)}

<div class="wg-toolbar">
  <nav class="tabs wg-tabs">${tabsHtml}</nav>
  <div class="search-wrapper wg-search">
    ${icons.search()}
    <input type="text" id="widget-search" class="search-input" value="${esc(searchQuery)}" placeholder="Поиск по виджетам..." aria-label="Поиск по виджетам">
    <button class="wg-search-clear ${searchQuery ? '' : 'is-hidden'}" id="wg-search-clear" type="button" title="Очистить поиск" aria-label="Очистить поиск">${icons.close()}</button>
  </div>
</div>

<div id="widgets-root">
  ${renderSection('todo', todoList, config, searchQuery, showDone)}
  ${showDone ? renderSection('done', doneList, config, searchQuery, showDone) : ''}
</div>

<dialog id="preview-modal" class="modal-dialog">
  <div class="modal-content">
    <header class="modal-header">
      <h3 class="modal-title" id="preview-title">Live Preview</h3>
      <form method="dialog"><button class="modal-close" id="preview-close" type="submit">${icons.close()}</button></form>
    </header>
    <div class="modal-body">
      <div class="preview-container" id="preview-box">
        <iframe id="preview-iframe" class="preview-iframe" src=""></iframe>
      </div>
    </div>
  </div>
</dialog>`;
  },

  /* ---------- параметры маршрута ---------- */

  onParamsChange: (params, state) => {
    const prev = WidgetsView._lastParams || {};
    const structural =
      (params?.cat || 'all') !== (prev.cat || 'all') ||
      (params?.done === '1') !== (prev.done === '1') ||
      (params?.search || '') !== (prev.search || '');
    if (structural) return false; // роутер перерисует экран целиком
    WidgetsView._syncPreview(params, state);
    return true;
  },

  _syncPreview: (params, state) => {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-iframe');
    const title = document.getElementById('preview-title');
    if (!modal || !iframe) return;
    const id = params?.preview;
    if (id) {
      const widget = (state.widgetsManifest || []).find(w => w.id === id);
      if (!widget) return;
      if (title) title.textContent = `Превью: ${widget.title}`;
      const src = `widgets/${id}/index.html?preview=1`;
      if (iframe.getAttribute('src') !== src) iframe.setAttribute('src', src);
      if (!modal.open) { try { modal.showModal(); } catch (e) { console.warn('[Widgets] showModal:', e); } }
    } else if (modal.open) {
      WidgetsView._silentClose = true;
      modal.close();
      iframe.setAttribute('src', '');
    }
  },

  /* ---------- живой поиск ---------- */

  _applySearch: (term) => {
    const root = document.getElementById('widgets-root');
    if (!root) return;
    const q = String(term || '').trim().toLowerCase();
    root.querySelectorAll('.widget-card').forEach(card => {
      const hay = card.getAttribute('data-search') || '';
      card.style.display = !q || hay.includes(q) ? 'flex' : 'none';
    });
    ['todo', 'done'].forEach(kind => {
      const grid = document.getElementById(`wg-grid-${kind}`);
      if (!grid) return;
      const visible = Array.from(grid.querySelectorAll('.widget-card')).filter(c => c.style.display !== 'none').length;
      const counter = document.getElementById(`wg-count-${kind}`);
      if (counter) counter.textContent = String(visible);
      const empty = document.getElementById(`wg-empty-${kind}`);
      const text = document.getElementById(`wg-empty-text-${kind}`);
      if (text) text.textContent = q ? `По запросу «${term}» ничего не найдено.` : (text.dataset.default || '');
      if (empty) empty.classList.toggle('is-hidden', visible > 0);
    });
    const clear = document.getElementById('wg-search-clear');
    if (clear) clear.classList.toggle('is-hidden', !q);
  },

  _jumpTo: (id) => {
    const search = document.getElementById('widget-search');
    if (search && search.value) { search.value = ''; WidgetsView._applySearch(''); }
    const card = document.getElementById(`widget-${id}`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('is-flash');
    void card.offsetWidth;
    card.classList.add('is-flash');
    const old = WidgetsView._jumpTimers.get(id);
    if (old) clearTimeout(old);
    WidgetsView._jumpTimers.set(id, setTimeout(() => {
      WidgetsView._jumpTimers.delete(id);
      if (card.isConnected) card.classList.remove('is-flash');
    }, 1300));
  },

  /* ---------- жизненный цикл ---------- */

  mount: (params, state) => {
    const root = document.getElementById('widgets-root');
    const searchInput = document.getElementById('widget-search');
    const previewModal = document.getElementById('preview-modal');
    const previewBox = document.getElementById('preview-box');
    const previewIframe = document.getElementById('preview-iframe');
    if (!root) return;

    paintRanges(root);
    if (params?.search) WidgetsView._applySearch(params.search);

    WidgetsView._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (previewIframe) previewIframe.style.transform = `scale(${entry.contentRect.width / 1920})`;
      }
    });
    if (previewBox) WidgetsView._resizeObserver.observe(previewBox);

    if (previewModal) {
      previewModal.addEventListener('close', () => {
        if (WidgetsView._silentClose) { WidgetsView._silentClose = false; return; }
        setHashParams({ preview: null }, { base: '#/widgets' });
        setTimeout(() => { if (previewIframe && previewIframe.isConnected) previewIframe.setAttribute('src', ''); }, 280);
      });
      previewModal.addEventListener('click', (e) => { if (e.target === previewModal) previewModal.close(); });
    }
    if (params?.preview) WidgetsView._syncPreview(params, state);

    WidgetsView._searchHandler = (e) => WidgetsView._applySearch(e.target.value);
    if (searchInput) searchInput.addEventListener('input', WidgetsView._searchHandler);

    WidgetsView._changeHandler = (e) => {
      if (e.target && e.target.id === 'wg-show-done') {
        setHashParams({ done: e.target.checked ? '1' : null }, { base: '#/widgets' });
      }
    };
    root.addEventListener('change', WidgetsView._changeHandler);
    const panelToggle = document.getElementById('wg-show-done');
    if (panelToggle) panelToggle.addEventListener('change', WidgetsView._changeHandler);

    WidgetsView._inputHandler = (e) => {
      const target = e.target;
      if (!target.hasAttribute || !target.hasAttribute('data-widget') || !target.hasAttribute('data-key')) return;
      const widgetId = target.getAttribute('data-widget');
      const key = target.getAttribute('data-key');
      const value = target.type === 'checkbox' ? target.checked : target.value;
      if (target.type === 'range') {
        const valLabel = document.getElementById(`val-${widgetId}-${key}`);
        if (valLabel) valLabel.textContent = value;
        paintRange(target);
      }
      const newWidgetsConfig = { ...store.getState().config.widgets };
      if (!newWidgetsConfig[widgetId]) newWidgetsConfig[widgetId] = {};
      newWidgetsConfig[widgetId] = { ...newWidgetsConfig[widgetId], [key]: value };
      store.updateConfig({ widgets: newWidgetsConfig });
    };
    root.addEventListener('input', WidgetsView._inputHandler);

    WidgetsView._clickHandler = (e) => {
      const jump = e.target.closest('[data-wg-jump]');
      if (jump) { e.preventDefault(); WidgetsView._jumpTo(jump.getAttribute('data-wg-jump')); return; }
      if (e.target.closest('#wg-search-clear')) {
        e.preventDefault();
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        WidgetsView._applySearch('');
        return;
      }
      const btnReset = e.target.closest('.btn-reset');
      if (btnReset) { store.resetWidgetToDefaults(btnReset.getAttribute('data-reset')); return; }
      const btnTest = e.target.closest('.btn-test-action');
      if (btnTest) {
        let payload = {};
        try { payload = JSON.parse(btnTest.getAttribute('data-payload')); } catch (err) {}
        store.broadcastAction(btnTest.getAttribute('data-action'), payload);
        return;
      }
      const btnPreview = e.target.closest('.btn-preview');
      if (btnPreview) {
        e.preventDefault();
        setHashParams({ preview: btnPreview.getAttribute('data-preview') }, { base: '#/widgets' });
      }
    };
    root.addEventListener('click', WidgetsView._clickHandler);

    const panel = document.querySelector('.wg-migration');
    if (panel) panel.addEventListener('click', WidgetsView._clickHandler);

    WidgetsView._unsubStore = store.subscribe((newState) => {
      const config = newState.config.widgets;
      (newState.widgetsManifest || []).forEach(widget => {
        let isMasterActive = true;
        widget.controls.forEach(control => {
          if (control.type === 'button') return;
          const newVal = config[widget.id]?.[control.key] ?? control.default;
          if (MASTER_KEYS.includes(control.key)) isMasterActive = newVal === true || String(newVal) === 'true';
          const input = root.querySelector(`[data-widget="${widget.id}"][data-key="${control.key}"]`);
          if (!input || document.activeElement === input) {
            if (input && control.type === 'range') paintRange(input);
            return;
          }
          let isChanged = false;
          if (input.type === 'checkbox') {
            const isChecked = newVal === true || String(newVal) === 'true';
            if (input.checked !== isChecked) { input.checked = isChecked; isChanged = true; }
          } else if (input.value !== String(newVal)) {
            input.value = newVal;
            isChanged = true;
            if (control.type === 'range') {
              const valLabel = document.getElementById(`val-${widget.id}-${control.key}`);
              if (valLabel) valLabel.textContent = newVal;
            }
          }
          if (control.type === 'range') paintRange(input);
          if (isChanged) {
            const wrapper = input.closest('.control-group');
            if (wrapper) {
              wrapper.classList.remove('flash-update');
              void wrapper.offsetWidth;
              wrapper.classList.add('flash-update');
            }
          }
        });
        if (isMigrated(widget.id)) return; // у перенесённых бейдж статичный: «ПЕРЕНЕСЁН»
        const dot = document.getElementById(`status-${widget.id}`);
        if (dot) {
          dot.className = isMasterActive ? 'badge badge-success mb-xs' : 'badge badge-danger mb-xs';
          dot.textContent = isMasterActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН';
        }
      });
    });
  },

  unmount: () => {
    const root = document.getElementById('widgets-root');
    const panel = document.querySelector('.wg-migration');
    const searchInput = document.getElementById('widget-search');
    const panelToggle = document.getElementById('wg-show-done');
    const modal = document.getElementById('preview-modal');

    if (WidgetsView._resizeObserver) { WidgetsView._resizeObserver.disconnect(); WidgetsView._resizeObserver = null; }
    if (root) {
      if (WidgetsView._inputHandler) root.removeEventListener('input', WidgetsView._inputHandler);
      if (WidgetsView._clickHandler) root.removeEventListener('click', WidgetsView._clickHandler);
      if (WidgetsView._changeHandler) root.removeEventListener('change', WidgetsView._changeHandler);
    }
    if (panel && WidgetsView._clickHandler) panel.removeEventListener('click', WidgetsView._clickHandler);
    if (panelToggle && WidgetsView._changeHandler) panelToggle.removeEventListener('change', WidgetsView._changeHandler);
    if (searchInput && WidgetsView._searchHandler) searchInput.removeEventListener('input', WidgetsView._searchHandler);
    if (WidgetsView._unsubStore) { WidgetsView._unsubStore(); WidgetsView._unsubStore = null; }
    for (const t of WidgetsView._jumpTimers.values()) clearTimeout(t);
    WidgetsView._jumpTimers.clear();
    if (modal && modal.open) {
      WidgetsView._silentClose = true;
      modal.close();
    }
    const iframe = document.getElementById('preview-iframe');
    if (iframe) iframe.setAttribute('src', '');
  }
};