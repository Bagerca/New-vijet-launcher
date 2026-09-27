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
        if (control.type === 'button') {
          return UIControls.Button(control.label, control.action, control.payload);
        }

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

      return `
        <section class="card widget-card" id="widget-${widget.id}" data-search="${widget.title.toLowerCase()} ${widget.description.toLowerCase()}" style="display: flex; flex-direction: column;">
          <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
            <div style="flex: 1;">
              <div class="badge ${dotClass} mb-xs" id="status-${widget.id}">${dotText}</div>
              <h3 class="text-lg text-bold" style="color: var(--accent-primary); text-shadow: 0 0 10px var(--accent-glow);">${widget.title}</h3>
              <p class="text-secondary text-sm mt-xs" style="line-height: 1.5; max-width: 90%;">${widget.description}</p>
            </div>
            <div style="transform: scale(1.2); transform-origin: right top;">
              ${masterToggleHtml}
            </div>
          </header>

          <form onsubmit="return false;" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <fieldset style="border: none; padding: 0; margin: 0; display: flex; flex-direction: column;">
              ${controlsHtml}
            </fieldset>
            
            <div class="d-flex justify-between align-center mt-md pt-md" style="border-top: 1px solid var(--border-subtle);">
              <button class="btn btn-secondary btn-preview" data-preview="${widget.id}" style="padding: 8px 12px; font-size: 12px;">${icons.eye()} Предпросмотр</button>
              <button class="btn btn-danger btn-reset" data-reset="${widget.id}" style="padding: 8px 12px; font-size: 12px; border: none;">${icons.trash()} Сброс</button>
            </div>
          </form>
        </section>
      `;
    }).join('');

    return `
      <header class="view-header">
        <h1 class="view-title">Оверлеи и Виджеты</h1>
        <p class="view-subtitle">Настройте внешний вид стрима. Все изменения мгновенно применяются в предпросмотре и OBS.</p>
      </header>
      
      <div class="d-flex justify-between align-center mb-md flex-wrap gap-md">
        <nav class="tabs" style="margin-bottom: 0; border: none; padding: 0;">${tabsHtml}</nav>
        <div class="search-wrapper" style="margin-bottom: 0; width: 300px;">
          ${icons.search()}
          <input type="text" id="widget-search" class="search-input" placeholder="Поиск по виджетам..." aria-label="Поиск">
        </div>
      </div>

      <div id="widgets-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 32px;">
        ${widgetsHtml || '<p class="text-muted w-full" style="font-size: 18px; padding: 40px; text-align: center; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-hover);">Ничего не найдено.</p>'}
      </div>

      <!-- Live Preview Modal -->
      <div id="preview-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="preview-title">Live Preview</h3>
            <button class="modal-close" id="preview-close">${icons.close()}</button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-md text-sm">Виджет отрисовывается в реальном времени. Изменяйте настройки на фоне или жмите тестовые кнопки.</p>
            <div class="preview-container" id="preview-box">
              <iframe id="preview-iframe" class="preview-iframe" src=""></iframe>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  mount: (params, state) => {
    const container = document.getElementById('widgets-container');
    const searchInput = document.getElementById('widget-search');
    const previewModal = document.getElementById('preview-modal');
    const previewBox = document.getElementById('preview-box');
    const previewIframe = document.getElementById('preview-iframe');
    const previewClose = document.getElementById('preview-close');
    const previewTitle = document.getElementById('preview-title');
    
    if (!container) return;

    // ГАРАНТИРОВАННОЕ МАСШТАБИРОВАНИЕ IFRAME ПРИ ПОМОЩИ JS
    WidgetsView._resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const scale = width / 1920;
        if (previewIframe) {
          previewIframe.style.transform = `scale(${scale})`;
        }
      }
    });
    if (previewBox) WidgetsView._resizeObserver.observe(previewBox);

    const closeModal = () => {
      previewModal.classList.remove('active');
      setTimeout(() => previewIframe.src = '', 300); 
    };

    if (previewClose) previewClose.addEventListener('click', closeModal);
    if (previewModal) previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) closeModal();
    });

    WidgetsView._searchHandler = (e) => {
      const term = e.target.value.toLowerCase();
      const cards = container.querySelectorAll('.widget-card');
      let visibleCount = 0;
      
      cards.forEach(card => {
        const searchText = card.getAttribute('data-search');
        if (searchText.includes(term)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      
      let emptyMsg = document.getElementById('empty-search-msg');
      if (visibleCount === 0 && cards.length > 0) {
        if (!emptyMsg) {
          emptyMsg = document.createElement('p');
          emptyMsg.id = 'empty-search-msg';
          emptyMsg.className = 'text-muted w-full';
          emptyMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px;';
          emptyMsg.textContent = 'Ничего не найдено по вашему запросу.';
          container.appendChild(emptyMsg);
        }
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    };

    if (searchInput) searchInput.addEventListener('input', WidgetsView._searchHandler);

    WidgetsView._inputHandler = (e) => {
      const target = e.target;
      if (target.hasAttribute('data-widget') && target.hasAttribute('data-key')) {
        const widgetId = target.getAttribute('data-widget');
        const key = target.getAttribute('data-key');
        
        let value = target.type === 'checkbox' ? target.checked : target.value;

        if (target.type === 'range') {
          const valLabel = document.getElementById(`val-${widgetId}-${key}`);
          if (valLabel) valLabel.textContent = value;
        }

        const currentConfig = store.getState().config;
        const newWidgetsConfig = { ...currentConfig.widgets };
        if (!newWidgetsConfig[widgetId]) newWidgetsConfig[widgetId] = {};
        newWidgetsConfig[widgetId] = { ...newWidgetsConfig[widgetId], [key]: value };

        store.updateConfig({ widgets: newWidgetsConfig });
      }
    };

    WidgetsView._clickHandler = (e) => {
      const btnReset = e.target.closest('.btn-reset');
      const btnPreview = e.target.closest('.btn-preview');
      const btnTest = e.target.closest('.btn-test-action');

      if (btnReset) {
        store.resetWidgetToDefaults(btnReset.getAttribute('data-reset'));
      }
      
      if (btnTest) {
        const action = btnTest.getAttribute('data-action');
        const payloadStr = btnTest.getAttribute('data-payload');
        let payload = {};
        try { payload = JSON.parse(payloadStr); } catch(err){}
        store.broadcastAction(action, payload);
      }

      if (btnPreview) {
        const widgetId = btnPreview.getAttribute('data-preview');
        const manifest = store.getState().widgetsManifest.find(w => w.id === widgetId);
        previewTitle.textContent = `Превью: ${manifest.title}`;
        
        previewIframe.src = `widgets/${widgetId}/index.html`;
        previewModal.classList.add('active');
      }
    };

    container.addEventListener('input', WidgetsView._inputHandler);
    container.addEventListener('click', WidgetsView._clickHandler);

    WidgetsView._unsubStore = store.subscribe((newState) => {
      const manifest = newState.widgetsManifest;
      const config = newState.config.widgets;

      manifest.forEach(widget => {
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
            if (input.type === 'checkbox') {
              const isChecked = newVal === true || String(newVal) === 'true';
              if (input.checked !== isChecked) input.checked = isChecked;
            } else {
              if (input.value !== String(newVal)) {
                input.value = newVal;
                if (control.type === 'range') {
                  const valLabel = document.getElementById(`val-${widget.id}-${control.key}`);
                  if (valLabel) valLabel.textContent = newVal;
                }
              }
            }
          }
        });

        const dot = document.getElementById(`status-${widget.id}`);
        if (dot) {
          if (isMasterActive) {
            dot.className = 'badge badge-success mb-xs';
            dot.textContent = 'АКТИВЕН';
          } else {
            dot.className = 'badge badge-danger mb-xs';
            dot.textContent = 'ОТКЛЮЧЕН';
          }
        }
      });
    });
  },

  unmount: () => {
    const container = document.getElementById('widgets-container');
    const searchInput = document.getElementById('widget-search');
    
    if (WidgetsView._resizeObserver) {
      WidgetsView._resizeObserver.disconnect();
      WidgetsView._resizeObserver = null;
    }

    if (container) {
      if (WidgetsView._inputHandler) container.removeEventListener('input', WidgetsView._inputHandler);
      if (WidgetsView._clickHandler) container.removeEventListener('click', WidgetsView._clickHandler);
    }
    if (searchInput && WidgetsView._searchHandler) searchInput.removeEventListener('input', WidgetsView._searchHandler);
    if (WidgetsView._unsubStore) WidgetsView._unsubStore();
  }
};