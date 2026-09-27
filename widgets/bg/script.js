// Этот скрипт просто слушает цвета из конфига (берет их от экрана старта), чтобы стиль был единым
function applyConfig(config) {
  if (!config || !config.widgets || !config.widgets.startscreen) return;
  const sConf = config.widgets.startscreen;
  
  if (sConf.accentPink) document.documentElement.style.setProperty('--accent-pink', sConf.accentPink);
  if (sConf.accentGreen) document.documentElement.style.setProperty('--accent-green', sConf.accentGreen);
}

function connectWS() {
  const ws = new WebSocket('ws://localhost:42069');
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'CONFIG_UPDATED') applyConfig(message.data);
    } catch (e) { }
  };
  ws.onclose = () => setTimeout(connectWS, 3000);
}

fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
    applyConfig(config);
    connectWS();
  })
  .catch(() => connectWS());