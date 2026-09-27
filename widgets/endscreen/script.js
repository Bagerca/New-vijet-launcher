const titleEl = document.getElementById('title-el');
const subtitleEl = document.getElementById('subtitle-el');

function applyConfig(config) {
  if (!config || !config.widgets || !config.widgets.endscreen) return;
  const endConfig = config.widgets.endscreen;

  // Разрешаем использование HTML тега <br> для переноса строк
  if (endConfig.title !== undefined) {
    titleEl.innerHTML = endConfig.title;
  }
  
  if (endConfig.subtitle !== undefined) {
    subtitleEl.innerHTML = endConfig.subtitle;
  }
  
  if (endConfig.accentPink) document.documentElement.style.setProperty('--accent-pink', endConfig.accentPink);
  if (endConfig.accentGreen) document.documentElement.style.setProperty('--accent-green', endConfig.accentGreen);
}

function connectWS() {
  const ws = new WebSocket('ws://localhost:42069');
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'CONFIG_UPDATED') {
        applyConfig(message.data);
      }
    } catch (e) {
      console.error('Ошибка WebSocket (EndScreen):', e);
    }
  };
  
  ws.onclose = () => setTimeout(connectWS, 3000);
}

// Первичная загрузка
fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
    applyConfig(config);
    connectWS();
  })
  .catch(() => connectWS());