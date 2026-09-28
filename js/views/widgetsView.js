import { store } from '../store.js';
import { icons } from '../utils/icons.js';
import { UIControls } from '../components/UIControls.js';

export const WidgetsView = {
  _inputHandler: null,
  _clickHandler: null,
  _searchHandler: null,
  _unsubStore: null,
  _resizeObserver: null,

  render: (state, params) => {
    const manifest = state.widgetsManifest;
    const config = state.config.widgets;
    const activeCategory = params?.cat || 'all';
    const searchQuery = params?.search || '';

    const tabs = [
      { id: 'all', label: 'Все' },
      { id: 'overlay', label: 'Оверлеи' },
      { id: 'scene', label: 'Сцены' },
      { id: 'chat', label: 'Чат' },
      { id: 'media', label: 'Медиа' }
    ];

    const tabsHtml = tabs.map(t => 
      `<a href="#/widgets?cat=${t.id}" class="tab ${activeCategory === t.id ? 'active' : ''}">${t.label}</a>`
    ).join('');

    const filteredManifest = activeCategory === 'all' 
      ? manifest 
      : manifest.filter(w => w.category === activeCategory);

    const widgetsHtml = filteredManifest.map(widget => {
      const widgetConfig = config[widget.id] || {};
      const masterControlKeys = ['enabled', 'isActive', 'isVisible'];
      let masterControl = widget.controls.find(c => c.type === 'checkbox' && masterControlKeys.includes(c.key));
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
        masterToggleHtml = UIControls.ToggleSwitch(widget.id, masterControl.key, val, "");
        isMasterActive = val === true || String(val) === 'true';
      }
      
      const dotClass = isMasterActive ? 'badge-success' : 'badge-danger';
      const dotText = isMasterActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН';
      const isVisibleBySearch = widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 'flex' : 'none';

      return `
        <article class="card widget-card" id="widget-${widget.id}" data-search="${widget.title.toLowerCase()} ${widget.description.toLowerCase()}" style="display: ${searchQuery ? isVisibleBySearch : 'flex'}; flex-direction: column;">
          <header class="d-flex justify-between align-start mb-md pb-sm border-bottom">
            <div class="flex-1">
              <div class="badge ${dotClass} mb-xs" id="status-${widget.id}">${dotText}</div>
              <h3 class="text-lg text-bold" style="color: var(--accent-primary); text-shadow: 0 0 10px var(--accent-glow);">${widget.title}</h3>
              <p class="text-secondary text-sm mt-xs" style="line-height: 1.5; max-width: 90%;">${widget.description}</p>
            </div>
            <div style="transform: scale(1.2); transform-origin: right top;">${masterToggleHtml}</div>
          </header>
          <form onsubmit="return false;" class="d-flex flex-column flex-1 justify-between">
            <fieldset style="border: none; padding: 0; margin: 0; display: flex; flex-direction: column;">
              ${controlsHtml}
            </fieldset>
            <div class="d-flex justify-between align-center mt-md pt-md border-top">
              <button class="btn btn-secondary btn-preview" data-preview="${widget.id}" style="padding: 8px 12px; font-size: 12px;">${icons.eye()} Предпросмотр</button>
              <button class="btn btn-danger btn-reset" data-reset="${widget.id}" style="padding: 8px 12px; font-size: 12px; border: none;">${icons.trash()} Сброс</button>
            </div>
          </form>
        </article>
      `;
    }).join('');

    return `
      <header class="view-header">
        <h1 class="view-title">Оверлеи и Виджеты</h1>
        <p class="view-subtitle">Настройте внешний вид стрима. Все изменения мгновенно применяются в предпросмотре и OBS.</p>
      </header>
      
      <div class="d-flex justify-between align-center mb-md flex-wrap gap-md">
        <nav class="tabs" style="margin-bottom: 0; border: none; padding: 0;">${tabsHtml}</nav>
        <div class="search-wrapper" style="margin-bottom: 0;">
          ${icons.search()}
          <input type="text" id="widget-search" class="search-input" value="${searchQuery}" placeholder="Поиск по виджетам...">
        </div>
      </div>

      <div id="widgets-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 32px;">
        ${widgetsHtml || '<p class="text-muted w-full text-center" style="padding: 40px;">Ничего не найдено.</p>'}
      </div>

      <!-- Live Preview Modal (Семантичный <dialog>) -->
      <dialog id="preview-modal" class="modal-dialog">
        <div class="modal-content">
          <header class="modal-header">
            <h3 class="modal-title" id="preview-title">Live Preview</h3>
            <form method="dialog"><button class="modal-close" id="preview-close">${icons.close()}</button></form>
          </header>
          <div class="modal-body">
            <div class="preview-container" id="preview-box">
              <iframe id="preview-iframe" class="preview-iframe" src=""></iframe>
            </div>
          </div>
        </div>
      </dialog>
    `;
  },

  onParamsChange: (params, state) => {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-iframe');
    const title = document.getElementById('preview-title');
    
    // Deep Link: Открытие/закрытие модалки по URL
    if (params.preview) {
        const manifest = state.widgetsManifest.find(w => w.id === params.preview);
        if (manifest && modal && !modal.open) {
            title.textContent = `Превью: ${manifest.title}`;
            iframe.src = `widgets/${params.preview}/index.html`;
            modal.showModal();
        }
    } else {
        if (modal && modal.open) {
            modal.close();
            setTimeout(() => iframe.src = '', 300);
        }
    }
  },

  mount: (params, state) => {
    const container = document.getElementById('widgets-container');
    const searchInput = document.getElementById('widget-search');
    const previewModal = document.getElementById('preview-modal');
    const previewBox = document.getElementById('preview-box');
    const previewIframe = document.getElementById('preview-iframe');

    if (!container) return;

    WidgetsView._resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (previewIframe) previewIframe.style.transform = `scale(${entry.contentRect.width / 1920})`;
      }
    });
    if (previewBox) WidgetsView._resizeObserver.observe(previewBox);

    // Закрытие модалки по кнопке/Escape синхронизирует URL
    if (previewModal) {
      previewModal.addEventListener('close', () => {
        const hashBase = window.location.hash.split('?')[0];
        const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (searchParams.has('preview')) {
            searchParams.delete('preview');
            window.location.hash = `${hashBase}?${searchParams.toString()}`;
        }
        setTimeout(() => previewIframe.src = '', 300);
      });
      previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) previewModal.close();
      });
    }

    // Если зашли по прямой ссылке с открытой модалкой
    if (params.preview) WidgetsView.onParamsChange(params, state);

    WidgetsView._searchHandler = (e) => {
      const term = e.target.value.toLowerCase();
      const cards = container.querySelectorAll('.widget-card');
      cards.forEach(card => {
        card.style.display = card.getAttribute('data-search').includes(term) ? 'flex' : 'none';
      });
    };
    if (searchInput) searchInput.addEventListener('input', WidgetsView._searchHandler);

    WidgetsView._inputHandler = (e) => {
      const target = e.target;
      if (target.hasAttribute('data-widget') && target.hasAttribute('data-key')) {
        const widgetId = target.getAttribute('data-widget');
        const key = target.getAttribute('data-key');
        const value = target.type === 'checkbox' ? target.checked : target.value;

        if (target.type === 'range') {
          const valLabel = document.getElementById(`val-${widgetId}-${key}`);
          if (valLabel) valLabel.textContent = value;
        }

        const newWidgetsConfig = { ...store.getState().config.widgets };
        if (!newWidgetsConfig[widgetId]) newWidgetsConfig[widgetId] = {};
        newWidgetsConfig[widgetId] = { ...newWidgetsConfig[widgetId], [key]: value };

        store.updateConfig({ widgets: newWidgetsConfig });
      }
    };

    WidgetsView._clickHandler = (e) => {
      const btnReset = e.target.closest('.btn-reset');
      const btnPreview = e.target.closest('.btn-preview');
      const btnTest = e.target.closest('.btn-test-action');

      if (btnReset) store.resetWidgetToDefaults(btnReset.getAttribute('data-reset'));
      if (btnTest) {
        let payload = {};
        try { payload = JSON.parse(btnTest.getAttribute('data-payload')); } catch(err){}
        store.broadcastAction(btnTest.getAttribute('data-action'), payload);
      }
      if (btnPreview) {
        const widgetId = btnPreview.getAttribute('data-preview');
        const hashBase = window.location.hash.split('?')[0];
        const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        searchParams.set('preview', widgetId);
        window.location.hash = `${hashBase}?${searchParams.toString()}`;
      }
    };

    container.addEventListener('input', WidgetsView._inputHandler);
    container.addEventListener('click', WidgetsView._clickHandler);

    // === РЕАКТИВНАЯ СИНХРОНИЗАЦИЯ STORE ===
    WidgetsView._unsubStore = store.subscribe((newState) => {
      const config = newState.config.widgets;

      newState.widgetsManifest.forEach(widget => {
        let isMasterActive = true;
        const masterControlKeys = ['enabled', 'isActive', 'isVisible'];

        widget.controls.forEach(control => {
          if (control.type === 'button') return;
          const newVal = config[widget.id]?.[control.key] ?? control.default;
          
          if (masterControlKeys.includes(control.key)) {
             isMasterActive = newVal === true || String(newVal) === 'true';
          }

          const input = document.querySelector(`[data-widget="${widget.id}"][data-key="${control.key}"]`);
          if (input && document.activeElement !== input) {
            let isChanged = false;
            
            if (input.type === 'checkbox') {
              const isChecked = newVal === true || String(newVal) === 'true';
              if (input.checked !== isChecked) {
                  input.checked = isChecked;
                  isChanged = true;
              }
            } else {
              if (input.value !== String(newVal)) {
                input.value = newVal;
                isChanged = true;
                if (control.type === 'range') {
                  const valLabel = document.getElementById(`val-${widget.id}-${control.key}`);
                  if (valLabel) valLabel.textContent = newVal;
                }
              }
            }

            // Вспышка при изменении извне
            if (isChanged) {
              const wrapper = input.closest('.control-group');
              if (wrapper) {
                  wrapper.classList.remove('flash-update');
                  void wrapper.offsetWidth; 
                  wrapper.classList.add('flash-update');
              }
            }
          }
        });

        const dot = document.getElementById(`status-${widget.id}`);
        if (dot) {
          dot.className = isMasterActive ? 'badge badge-success mb-xs' : 'badge badge-danger mb-xs';
          dot.textContent = isMasterActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН';
        }
      });
    });
  },

  unmount: () => {
    const container = document.getElementById('widgets-container');
    const searchInput = document.getElementById('widget-search');
    if (WidgetsView._resizeObserver) WidgetsView._resizeObserver.disconnect();
    if (container) {
      container.removeEventListener('input', WidgetsView._inputHandler);
      container.removeEventListener('click', WidgetsView._clickHandler);
    }
    if (searchInput) searchInput.removeEventListener('input', WidgetsView._searchHandler);
    if (WidgetsView._unsubStore) WidgetsView._unsubStore();
  }
};