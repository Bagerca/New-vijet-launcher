import { widgetsManifest } from '/data/widgetsManifest.js';

let ws = null;
let config = { widgets: {} };
let currentMode = 'ws';

const statusEl = document.getElementById('status');
const container = document.getElementById('widgets-container');
const toast = document.getElementById('toast');

document.getElementById('btn-ws').addEventListener('click', (e) => setMode('ws', e.target));
document.getElementById('btn-chat').addEventListener('click', (e) => setMode('chat', e.target));

function setMode(mode, targetBtn) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  targetBtn.classList.add('active');
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function renderUI() {
  container.innerHTML = widgetsManifest.map(widget => {
    const widgetConfig = config.widgets[widget.id] || {};
    
    const controlsHtml = widget.controls.map(control => {
      // Игнорируем кнопки в панели модератора
      if (control.type === 'button') return '';

      const val = widgetConfig[control.key] !== undefined ? widgetConfig[control.key] : control.default;
      
      let inputHtml = '';
      if (control.type === 'range') {
        inputHtml = `<input type="range" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}" min="0" max="100">`;
      } else if (control.type === 'checkbox') {
        inputHtml = `<input type="checkbox" class="toggle-switch" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" ${val ? 'checked' : ''}>`;
      } else if (control.type === 'select') {
        const opts = control.options.map(o => `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
        inputHtml = `<select data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}">${opts}</select>`;
      } else if (control.type === 'textarea') {
        inputHtml = `<textarea data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}">${val}</textarea>`;
      } else {
        inputHtml = `<input type="${control.type}" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}">`;
      }
      
      return `
        <div class="control-group">
          <div class="label-row">
            <span>${control.label}</span>
            ${control.type === 'range' ? `<span id="val-${widget.id}-${control.key}">${val}</span>` : `<span style="color:var(--text-muted)">${control.cmd || ''}</span>`}
          </div>
          ${inputHtml}
        </div>`;
    }).join('');
    
    return `<div class="card"><h2 class="card-title">${widget.title}</h2>${controlsHtml}</div>`;
  }).join('');
}

function handleInput(e) {
  const target = e.target;
  if (!target.hasAttribute('data-widget')) return;

  const widgetId = target.getAttribute('data-widget');
  const key = target.getAttribute('data-key');
  const cmd = target.getAttribute('data-cmd');
  
  const value = target.type === 'checkbox' ? target.checked : target.value;

  if (target.type === 'range') {
    const valLabel = document.getElementById(`val-${widgetId}-${key}`);
    if (valLabel) valLabel.textContent = value;
  }

  if (currentMode === 'ws') {
    if (!config.widgets[widgetId]) config.widgets[widgetId] = {};
    config.widgets[widgetId][key] = value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: config }));
    }
  } else {
    // В режиме чата копируем команду в буфер
    if (!cmd) {
      showToast('У этой настройки нет чат-команды');
      return;
    }
    let cmdValue = value;
    if (target.type === 'checkbox') cmdValue = value ? 'on' : 'off';
    
    const fullCmd = `${cmd} ${cmdValue}`;
    navigator.clipboard.writeText(fullCmd)
      .then(() => showToast(`Скопировано: ${fullCmd}`))
      .catch(() => showToast(`Команда: ${fullCmd}`));
  }
}

container.addEventListener('input', handleInput);

async function init() {
  try {
    const res = await fetch('/api/config');
    config = await res.json();
    renderUI();
    connectWS();
  } catch (e) {
    statusEl.textContent = 'Ошибка загрузки';
  }
}

function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(protocol + window.location.host);
  
  ws.onopen = () => {
    statusEl.textContent = 'Online';
    statusEl.classList.add('online');
  };
  
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === 'CONFIG_UPDATED') {
        config = msg.data;
        
        // Синхронизация всех полей с анимацией
        widgetsManifest.forEach(w => w.controls.forEach(c => {
          if (c.type === 'button') return;
          const input = document.querySelector(`[data-widget="${w.id}"][data-key="${c.key}"]`);
          
          if (input && document.activeElement !== input) {
            const newVal = config.widgets[w.id]?.[c.key] ?? c.default;
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
                if (c.type === 'range') {
                  const valLabel = document.getElementById(`val-${w.id}-${c.key}`);
                  if (valLabel) valLabel.textContent = newVal;
                }
              }
            }

            if (isChanged) {
              const group = input.closest('.control-group');
              if (group) {
                group.classList.remove('flash-update');
                void group.offsetWidth;
                group.classList.add('flash-update');
              }
            }
          }
        }));
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    statusEl.textContent = 'Offline';
    statusEl.classList.remove('online');
    setTimeout(connectWS, 2000);
  };
}

init();