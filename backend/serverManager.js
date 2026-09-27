const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const localtunnel = require('localtunnel');
const configManager = require('./configManager');

const PORT = 42069;

let wss = null;
let tunnel = null;
let remoteUpdateCallback = null;

function setRemoteUpdateCallback(cb) { remoteUpdateCallback = cb; }

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function startServers() {
  const httpServer = http.createServer((req, res) => {
    const reqUrlBase = req.url.split('?')[0];

    // Логируем все HTTP запросы
    console.log(`[HTTP] Запрос: ${reqUrlBase}`);

    if (reqUrlBase === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(configManager.getConfig()));
      return;
    }

    let reqUrl = reqUrlBase === '/' ? '/frame/index.html' : reqUrlBase;
    let filePath;

    if (reqUrl.startsWith('/data/')) {
      filePath = path.join(__dirname, '..', reqUrl);
    } else {
      filePath = path.join(__dirname, '..', 'widgets', reqUrl);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, '..', reqUrl);
      }
    }
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`[HTTP] ОШИБКА 404: Файл не найден -> ${filePath}`);
        res.writeHead(404);
        res.end('File not found');
      } else {
        let ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/html; charset=utf-8';
        if (ext === '.js' || ext === '.mjs') contentType = 'text/javascript; charset=utf-8';
        else if (ext === '.css') contentType = 'text/css; charset=utf-8';
        else if (ext === '.json') contentType = 'application/json; charset=utf-8';
        else if (ext === '.svg') contentType = 'image/svg+xml; charset=utf-8';

        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        res.end(content, 'utf-8');
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[HTTP/WS] Единый сервер запущен на порту ${PORT}`);
  });

  wss = new WebSocket.Server({ server: httpServer });
  
  wss.on('connection', (ws, req) => {
    console.log(`[WS] Новое подключение! Клиентов активно: ${wss.clients.size}`);
    
    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        console.log(`[WS] Получено событие: ${parsed.event}`);
        
        if (parsed.event === 'UPDATE_CONFIG' && parsed.data) {
          configManager.saveConfig(parsed.data);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ event: 'CONFIG_UPDATED', data: parsed.data }));
            }
          });
          if (remoteUpdateCallback) remoteUpdateCallback(parsed.data);
        }
        else if (parsed.event === 'WIDGET_ACTION') {
          console.log(`[WS] Пересылка WIDGET_ACTION: ${parsed.action}`);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      } catch (e) { 
        console.error('[WS] Ошибка обработки сообщения:', e); 
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Клиент отключился. Осталось: ${wss.clients.size}`);
    });
  });
}

function broadcastToWidgets(data) {
  if (!wss) return;
  console.log(`[WS] Бродкаст всем виджетам: ${data.event}`);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
  });
}

async function toggleTunnel() {
  if (tunnel) {
    tunnel.close();
    tunnel = null;
    return { active: false, url: null };
  } else {
    try {
      const randomPrefix = Math.random().toString(36).substring(2, 6);
      tunnel = await localtunnel({ port: PORT, subdomain: `stream-panel-${randomPrefix}` });
      tunnel.on('close', () => { tunnel = null; });
      return { active: true, url: tunnel.url + '/panel/index.html' };
    } catch (error) {
      return { active: false, url: null, error: error.message };
    }
  }
}

function getTunnelStatus() {
  return { active: !!tunnel, url: tunnel ? tunnel.url + '/panel/index.html' : null };
}

module.exports = { startServers, broadcastToWidgets, setRemoteUpdateCallback, getLocalIP, toggleTunnel, getTunnelStatus, PORT_HTTP: PORT };