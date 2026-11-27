/* ФАЙЛ: backend/tunnelService.js — v5 */
const os = require('os');
const localtunnel = require('localtunnel');

let tunnel = null;

function getLocalIP() {
const interfaces = os.networkInterfaces();
for (const name of Object.keys(interfaces)) {
for (const iface of interfaces[name]) {
if (iface.family === 'IPv4' && !iface.internal) return iface.address;
}
}
return '127.0.0.1';
}

async function toggleTunnel(port) {
if (tunnel) {
tunnel.close();
tunnel = null;
return { active: false, url: null };
}
try {
const randomPrefix = Math.random().toString(36).substring(2, 6);
tunnel = await localtunnel({ port, subdomain: `stream-panel-${randomPrefix}` });
tunnel.on('close', () => { tunnel = null; });
return { active: true, url: tunnel.url + '/panel/index.html' };
} catch (error) {
return { active: false, url: null, error: error.message };
}
}

function getTunnelStatus() {
return { active: !!tunnel, url: tunnel ? tunnel.url + '/panel/index.html' : null };
}

module.exports = { getLocalIP, toggleTunnel, getTunnelStatus };