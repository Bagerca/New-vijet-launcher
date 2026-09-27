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
      const val = widgetConfig[control.key] !== undefined ? widgetConfig[control.key] : control.default;
      
      let inputHtml = '';
      if (control.type === 'range') {
        inputHtml = `<input type="range" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}" min="0" max="100">`;
      } else if (control.type === 'checkbox') {
        inputHtml = `<input type="checkbox" class="toggle-switch" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" ${val ? 'checked' : ''}>`;
      } else {
        inputHtml = `<input type="${control.type}" data-widget="${widget.id}" data-key="${control.key}" data-cmd="${control.cmd}" value="${val}">`;
      }
      
      return `
        <div class="control-group">
          <div class="label-row">
            <span>${control.label}</span>
            ${control.type === 'range' ? `<span id="val-${widget.id}-${control.key}">${val}%</span>` : `<span style="color:var(--text-muted)">${control.cmd}</span>`}
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
  
  // Поддержка чекбокса
  const value = target.type === 'checkbox' ? target.checked : target.value;

  if (target.type === 'range') {
    const valLabel = document.getElementById(`val-${widgetId}-${key}`);
    if (valLabel) valLabel.textContent = `${value}%`;
  }

  if (currentMode === 'ws') {
    if (!config.widgets[widgetId]) config.widgets[widgetId] = {};
    config.widgets[widgetId][key] = value;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: config }));
    }
  } else {
    // В режиме чата для чекбоксов копируем 'on' или 'off'
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
        // Частичное обновление чекбоксов, чтобы избежать перерендера при смене состояния
        widgetsManifest.forEach(w => w.controls.forEach(c => {
          if (c.type === 'checkbox') {
            const input = document.querySelector(`input[data-widget="${w.id}"][data-key="${c.key}"]`);
            if (input && document.activeElement !== input) {
              const newVal = config.widgets[w.id]?.[c.key] ?? c.default;
              if (input.checked !== newVal) input.checked = newVal;
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