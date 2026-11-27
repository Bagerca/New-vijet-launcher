/* ФАЙЛ: js/utils/hashParams.js — v5 */
export function getHashParams() {
try {
const query = window.location.hash.split('?')[1] || '';
return Object.fromEntries(new URLSearchParams(query).entries());
} catch (e) {
console.warn('[hashParams] Ошибка чтения параметров:', e);
return {};
}
}

export function setHashParams(updates, { base } = {}) {
const hashBase = base || (window.location.hash.split('?')[0]) || '#/home';
const sp = new URLSearchParams(window.location.hash.split('?')[1] || '');
Object.entries(updates).forEach(([key, value]) => {
if (value === null || value === undefined || value === '') sp.delete(key);
else sp.set(key, String(value));
});
const q = sp.toString();
window.location.hash = hashBase + (q ? `?${q}` : '');
}

export function toggleHashParam(key, onValue = '1') {
const params = getHashParams();
const next = params[key] === onValue ? null : onValue;
setHashParams({ [key]: next });
return next === onValue;
}