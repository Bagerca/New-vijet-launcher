/* ФАЙЛ: widgets/socials/networks.js — v1 (каталог платформ + единый нормализатор списка) */

export const PLATFORMS = {
    telegram: { id: 'telegram', title: 'Telegram', icon: 'telegram', color: '#24A1DE', placeholder: 't.me/channel', hint: 'Ссылка на канал или @ник', legacyKey: 'tgHandle' },
    tiktok: { id: 'tiktok', title: 'TikTok', icon: 'tiktok', color: '#FF0050', placeholder: '@nickname', hint: '@ник профиля', legacyKey: 'ttHandle', legacyAlt: 'tiktokHandle' },
    vk: { id: 'vk', title: 'ВКонтакте', icon: 'vk', color: '#0077FF', placeholder: 'vk.com/club123', hint: 'Ссылка на группу', legacyKey: 'vkHandle' },
    youtube: { id: 'youtube', title: 'YouTube', icon: 'youtube', color: '#FF0033', placeholder: 'youtube.com/@channel', hint: 'Ссылка на канал', legacyKey: null },
    discord: { id: 'discord', title: 'Discord', icon: 'discord', color: '#5865F2', placeholder: 'discord.gg/invite', hint: 'Инвайт сервера', legacyKey: null },
    instagram: { id: 'instagram', title: 'Instagram', icon: 'instagram', color: '#E1306C', placeholder: '@nickname', hint: '@ник профиля', legacyKey: null },
    twitch: { id: 'twitch', title: 'Twitch', icon: 'twitch', color: '#9146FF', placeholder: 'twitch.tv/channel', hint: 'Ссылка на канал', legacyKey: null },
    website: { id: 'website', title: 'Сайт', icon: 'globe', color: '#00E5FF', placeholder: 'example.com', hint: 'Любой адрес', legacyKey: null }
};

export function platformList() { return Object.values(PLATFORMS); }
export function getPlatform(id) { return PLATFORMS[String(id || '').toLowerCase()] || null; }

export function normalizeHex(value, fallback) {
    let h = String(value || '').trim();
    if (!h) return fallback;
    if (!h.startsWith('#')) h = '#' + h;
    if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
    return /^#[0-9a-f]{6}$/i.test(h) ? h : fallback;
}

export function intervalFrom(config) {
    const n = parseInt((config || {}).interval, 10);
    if (isNaN(n)) return 30;
    return Math.max(3, Math.min(600, n));
}

function legacyValue(config, platform) {
    const conf = config || {};
    const main = String(conf[platform.legacyKey] ?? '').trim();
    if (main) return main;
    if (platform.legacyAlt) return String(conf[platform.legacyAlt] ?? '').trim();
    return '';
}

/** Список по умолчанию — из старых плоских ключей конфига. */
export function defaultNetworks(config) {
    const out = [];
    platformList().forEach(p => {
        if (!p.legacyKey) return;
        const handle = legacyValue(config, p);
        if (!handle) return;
        out.push({ id: p.id, handle, color: p.color, enabled: true });
    });
    return out;
}

/**
 * Единый источник правды для виджета и панели.
 * Порядок, состав, цвет и включённость — из массива networks.
 * Значения handle для Telegram/TikTok/VK читаются из старых ключей,
 * чтобы старые «Оверлеи», мобильная панель и чат-команды не расходились.
 */
export function normalizeNetworks(config) {
    const conf = config || {};
    const raw = Array.isArray(conf.networks) ? conf.networks : null;
    const source = raw && raw.length ? raw : defaultNetworks(conf);
    const out = [];
    const seen = new Set();
    source.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || '').toLowerCase();
        const p = PLATFORMS[id];
        if (!p || seen.has(id)) return;
        seen.add(id);
        let handle = String(item.handle ?? '').trim();
        if (p.legacyKey) {
            const legacy = legacyValue(conf, p);
            if (legacy) handle = legacy;
        }
        out.push({
            id,
            handle,
            color: normalizeHex(item.color, p.color),
            enabled: item.enabled !== false && String(item.enabled) !== 'false'
        });
    });
    return out;
}

export function activeNetworks(config) {
    return normalizeNetworks(config).filter(n => n.enabled && n.handle);
}

export function serializeNetworks(list) {
    return (list || []).map(n => ({ id: n.id, handle: n.handle, color: n.color, enabled: !!n.enabled }));
}

/** Обратная запись в плоские ключи — мост совместимости. */
export function legacyPatch(list) {
    const patch = { tgHandle: '', ttHandle: '', vkHandle: '', tiktokHandle: '' };
    (list || []).forEach(n => {
        const p = getPlatform(n.id);
        if (p && p.legacyKey) patch[p.legacyKey] = n.handle || '';
    });
    return patch;
}