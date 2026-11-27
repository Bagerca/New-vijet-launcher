/* ФАЙЛ: widgets/alerts/types.js — v2 (каталог типов + нормализатор + карта реальных событий Twitch) */
export const ALERT_DEFAULTS = {
enabled: true,
soundEnabled: true,
volume: 40,
duration: 5,
scale: 100,
position: 'top'
};

export const ALERT_LIMITS = {
volume: [0, 100],
duration: [1, 30],
scale: [60, 150]
};

export const POSITIONS = [
{ id: 'top', label: 'Сверху' },
{ id: 'center', label: 'По центру' },
{ id: 'bottom', label: 'Снизу' }
];

export const QUEUE_MAX = 50;

export const ALERT_TYPES = [
{
id: 'follow', kind: 'standard', label: 'Фолловер', emoji: '💖', icon: null,
color: '#ff69b4', sound: 'follow.mp3', chat: 'follow', live: true,
phrase: 'отслеживает канал!', phraseMany: 'новых фолловеров!',
valueLabel: null, defaultValue: 0,
sample: { user: 'НовыйФолловер', message: '', value: 0 }
},
{
id: 'sub', kind: 'standard', label: 'Подписка', emoji: '⭐', icon: null,
color: '#00ff66', sound: 'sub.mp3', chat: 'sub', live: true,
phrase: 'оформил подписку!', valueLabel: null, defaultValue: 0,
sample: { user: 'СуперФанат', message: 'Обожаю твои стримы!', value: 0 }
},
{
id: 'resub', kind: 'standard', label: 'Ресаб', emoji: '🔥', icon: null,
color: '#ff4500', sound: 'resub.mp3', chat: 'resub', live: true,
phrase: 'с нами уже {value} мес.!', valueLabel: 'Месяцев подряд', defaultValue: 12,
sample: { user: 'ОлдРесабер', message: 'Обожаю этот стрим!', value: 12 }
},
{
id: 'gift', kind: 'standard', label: 'Подарок', emoji: '🎁', icon: null,
color: '#ff007f', sound: 'gift.mp3', chat: 'gift', live: true,
phrase: 'подарил подписку!', valueLabel: null, defaultValue: 0,
sample: { user: 'Богач', message: 'для СлучайныйЗритель', value: 0 }
},
{
id: 'streak', kind: 'standard', label: 'Стрик', emoji: '📺', icon: null,
color: '#00e5ff', sound: 'streak.mp3', chat: 'streak', live: false,
phrase: 'смотрит {value} стримов подряд!', valueLabel: 'Стримов подряд', defaultValue: 5,
sample: { user: 'ПреданныйЗритель', message: 'Смотрю каждый день!', value: 5 }
},
{
id: 'cheer', kind: 'standard', label: 'Биты', emoji: '💎', icon: null,
color: '#9146ff', sound: 'cheer.mp3', chat: 'cheer', live: true,
phrase: 'задонатил {value} битов!', valueLabel: 'Битов', defaultValue: 100,
sample: { user: 'Донатер', message: 'держись там!', value: 100 }
},
{
id: 'raid', kind: 'standard', label: 'Рейд', emoji: '🚀', icon: null,
color: '#00ff66', sound: 'raid.mp3', chat: 'raid', live: true,
phrase: 'привёл {value} зрителей!', valueLabel: 'Зрителей', defaultValue: 42,
sample: { user: 'ДружественныйСтример', message: '', value: 42 }
},
{
id: 'reward_series', kind: 'reward', label: 'Сериал', emoji: null, icon: 'alert_series',
color: '#a29bfe', sound: 'series.mp3', chat: 'series', badge: 'СЕРИАЛ', live: false,
phrase: null, valueLabel: null, defaultValue: 0,
sample: { user: 'Киноман', message: 'Во все тяжкие', value: 0 }
},
{
id: 'reward_movie', kind: 'reward', label: 'Фильм', emoji: null, icon: 'alert_movie',
color: '#fdcb6e', sound: 'movie.mp3', chat: 'movie', badge: 'ФИЛЬМ', live: false,
phrase: null, valueLabel: null, defaultValue: 0,
sample: { user: 'Зритель', message: 'Гарри Поттер', value: 0 }
},
{
id: 'reward_video', kind: 'reward', label: 'Видео', emoji: null, icon: 'alert_video',
color: '#74b9ff', sound: 'video.mp3', chat: 'video', badge: 'ВИДЕО', live: false,
phrase: null, valueLabel: null, defaultValue: 0,
sample: { user: 'Кекус', message: 'Смешные коты', value: 0 }
},
{
id: 'reward_game', kind: 'reward', label: 'Игра', emoji: null, icon: 'alert_game',
color: '#55efc4', sound: 'game.mp3', chat: 'game', badge: 'ИГРА', live: false,
phrase: null, valueLabel: null, defaultValue: 0,
sample: { user: 'Геймер', message: 'Го в Доту?', value: 0 }
},
{
id: 'reward_music', kind: 'reward', label: 'Музыка', emoji: null, icon: 'alert_music',
color: '#ff7675', sound: 'music.mp3', chat: 'music', badge: 'МУЗЫКА', live: false,
phrase: null, valueLabel: null, defaultValue: 0,
sample: { user: 'Меломан', message: 'Врубай фонк', value: 0 }
}
];

/** Какие реальные события канала превращаются в алерты. */
export const LIVE_EVENTS = [
{ kind: 'follow', label: 'Фолловеры', note: 'по приросту счётчика, раз в минуту' },
{ kind: 'sub', label: 'Подписки', note: 'мгновенно из чата канала' },
{ kind: 'resub', label: 'Ресабы', note: 'с количеством месяцев' },
{ kind: 'gift', label: 'Подарки сабов', note: 'включая массовые раздачи' },
{ kind: 'cheer', label: 'Биты', note: 'с суммой доната' },
{ kind: 'raid', label: 'Рейды', note: 'с числом зрителей' }
];

export function isTrue(v) { return v === true || String(v) === 'true'; }

export function clampInt(value, min, max, fallback) {
const n = parseInt(value, 10);
if (isNaN(n)) return fallback;
return Math.max(min, Math.min(max, n));
}

export function esc(s) {
return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function getType(id) {
return ALERT_TYPES.find(t => t.id === String(id || '').toLowerCase()) || null;
}

export function typeIds() { return ALERT_TYPES.map(t => t.id); }

export function soundFile(id) {
const t = getType(id);
return t ? t.sound : 'follow.mp3';
}

export function phraseFor(type, value, user) {
if (!type || !type.phrase) return '';
const n = Math.max(0, parseInt(value, 10) || 0);
if (type.phraseMany && n > 1) return `${n} ${type.phraseMany}`;
return type.phrase.replace('{value}', String(n));
}

export function chatArgToType(arg) {
const a = String(arg || '').toLowerCase();
if (!a) return null;
const direct = getType(a);
if (direct) return direct.id;
const byChat = ALERT_TYPES.find(t => t.chat === a);
return byChat ? byChat.id : null;
}

export function normalizeAlertConfig(raw) {
const c = { ...ALERT_DEFAULTS, ...(raw || {}) };
const n = (k) => clampInt(c[k], ALERT_LIMITS[k][0], ALERT_LIMITS[k][1], ALERT_DEFAULTS[k]);
const pos = POSITIONS.some(p => p.id === String(c.position)) ? String(c.position) : ALERT_DEFAULTS.position;
return {
enabled: c.enabled === undefined ? ALERT_DEFAULTS.enabled : isTrue(c.enabled),
soundEnabled: c.soundEnabled === undefined ? ALERT_DEFAULTS.soundEnabled : isTrue(c.soundEnabled),
volume: n('volume'),
duration: n('duration'),
scale: n('scale'),
position: pos
};
}