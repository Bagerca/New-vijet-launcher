/* ФАЙЛ: backend/obs/layout.js — v2 (чат на игровой сцене: координаты из ручного экспорта, index 2 / X 6 / Y 296) */
const COLLECTION_NAME = 'New Stream Pack';
const SYS_AUDIO_SCENE = '⚙️ [Ядро] Звук (Система)';
const MIC_AUDIO_SCENE = '⚙️ [Ядро] Звук (Микрофон)';
const LEGACY_AUDIO_SCENE = '⚙️ [Ядро] Звуки и Системы';
const PACK_SCENES = [
'🔴 [Сцена] Начало',
'🗣 [Сцена] Общение',
'🎮 [Сцена] Игра',
'👋 [Сцена] Конец'
];
const BROWSER_CSS = 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }';
/** Реестр браузер-источников лаунчера. Пути относительные — сервер отдаёт их из widgets/. */
const WIDGETS = {
'Виджет: Рамка вебки': { url: '/frame/index.html', w: 1400, h: 850 },
'Виджет: Чат Twitch': { url: '/chat/index.html', w: 540, h: 1040 },
'Виджет: YouTube Плеер': { url: '/player/index.html', w: 480, h: 380 },
'Виджет: Шкала цели': { url: '/goal/index.html', w: 440, h: 100 },
'Виджет: Медиа Инфо': { url: '/media/index.html', w: 520, h: 220 },
'Виджет: Соцсети': { url: '/socials/index.html', w: 400, h: 120 },
'Виджет: Таймер стрима (Uptime)': { url: '/uptime/index.html', w: 300, h: 100 },
'Виджет: Счетчик смертей': { url: '/deaths/index.html', w: 250, h: 200 },
'Виджет: Бегущая строка': { url: '/ticker/index.html', w: 860, h: 120 },
'Виджет: Летящие смайлы': { url: '/emotes/index.html', w: 1920, h: 1080 },
'Виджет: Неоновые частицы': { url: '/particles/index.html', w: 1920, h: 1080 },
'Виджет: Реклама (Shoutout)': { url: '/shoutout/index.html', w: 1920, h: 1080 },
'Виджет: Оповещения (Alerts)': { url: '/alerts/index.html', w: 1920, h: 1080 },
'Виджет: Заглушка (Blur)': { url: '/blur/index.html', w: 1920, h: 1080 },
'Виджет: Экран Начала': { url: '/startscreen/index.html', w: 1920, h: 1080 },
'Виджет: Экран Конца': { url: '/endscreen/index.html', w: 1920, h: 1080 },
'Виджет: Фон Общения': { url: '/bg/index.html', w: 1920, h: 1080 },
'Виджет: Озвучка (TTS)': { url: '/tts/index.html', w: 1920, h: 1080 }
};
const INPUT_KINDS = {
mic: ['wasapi_input_capture', 'coreaudio_input_capture', 'pulse_input_capture', 'alsa_input_capture'],
desktop: ['wasapi_output_capture'],
webcam: ['dshow_input', 'av_capture'],
screen: ['monitor_capture', 'game_capture', 'window_capture'],
audioAny: [
'wasapi_input_capture', 'wasapi_output_capture', 'coreaudio_input_capture',
'pulse_input_capture', 'alsa_input_capture'
],
videoAny: ['dshow_input', 'monitor_capture', 'window_capture', 'game_capture']
};
// ==== ИДЕАЛЬНЫЙ ЛЕЙАУТ (Извлечен из ручной выгрузки пользователя) ====
// Чат на сценах Начало/Конец: источник 540×1040 @ 0.92 с обрезкой пустого верха (cropTop 80).
// Колонка баблов 460px ложится во внутренние поля карточки (1410..1870),
// низ колонки ≈ 1030 (нижнее поле карточки), верх 163 (под заголовком).
// Карточка чата стоит на 1390 — зазор 30px от центральной карточки (край 1360).
// Игровая сцена: чат подвинут вручную (index 2, X 6, Y 296, cropTop 347) и лежит НИЖЕ заглушки Blur —
// приватный режим закрывает и чат. Записи сцены идут по возрастанию index: порядок применения важен.
const LAYOUT = {
'🔴 [Сцена] Начало': {
'Виджет: Экран Начала': { index: 0, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Неоновые частицы': { index: 1, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Таймер стрима (Uptime)': { index: 2, positionX: 606, positionY: 980, scaleX: 1, scaleY: 1 },
'Виджет: Соцсети': { index: 3, positionX: 0, positionY: 960, scaleX: 1, scaleY: 1 },
'Виджет: Чат Twitch': { index: 4, positionX: 1392, positionY: 163, scaleX: 0.92, scaleY: 0.92, cropTop: 80 },
'Виджет: Шкала цели': { index: 5, positionX: 472, positionY: 0, scaleX: 1.29, scaleY: 1.29 },
'Виджет: Заглушка (Blur)': { index: 6, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Оповещения (Alerts)': { index: 7, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Реклама (Shoutout)': { index: 8, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Летящие смайлы': { index: 9, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Озвучка (TTS)': { index: 10, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__SYS_AUDIO__': { index: 11, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 }
},
'🗣 [Сцена] Общение': {
'Виджет: Фон Общения': { index: 0, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__WEBCAM__': { index: 1, positionX: 1328, positionY: 152, scaleX: -0.98, scaleY: 0.98, cropTop: 62, cropBottom: 189 },
'Виджет: Неоновые частицы': { index: 2, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Заглушка (Blur)': { index: 3, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Рамка вебки': { index: 4, positionX: 0, positionY: 140, scaleX: 1, scaleY: 1 },
'Виджет: Соцсети': { index: 5, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Бегущая строка': { index: 6, positionX: 535, positionY: 960, scaleX: 1, scaleY: 1 },
'Виджет: Медиа Инфо': { index: 7, positionX: 24, positionY: 856, scaleX: 1.08, scaleY: 1.08 },
'Виджет: Таймер стрима (Uptime)': { index: 8, positionX: 560, positionY: 885, scaleX: 1, scaleY: 1 },
'Виджет: Шкала цели': { index: 9, positionX: 880, positionY: 880, scaleX: 1, scaleY: 1 },
'Виджет: Счетчик смертей': { index: 10, positionX: 1069, positionY: 108, scaleX: 1, scaleY: 1 },
'Виджет: Чат Twitch': { index: 11, positionX: 1380, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: YouTube Плеер': { index: 12, positionX: 1410, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Летящие смайлы': { index: 13, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Реклама (Shoutout)': { index: 14, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Оповещения (Alerts)': { index: 15, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Озвучка (TTS)': { index: 16, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__SYS_AUDIO__': { index: 17, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__MIC_AUDIO__': { index: 18, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 }
},
'🎮 [Сцена] Игра': {
'__SCREEN__': { index: 0, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Неоновые частицы': { index: 1, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Чат Twitch': { index: 2, positionX: 6, positionY: 296, scaleX: 0.7, scaleY: 0.7, cropTop: 347 },
'Виджет: Заглушка (Blur)': { index: 3, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__WEBCAM__': { index: 4, positionX: 372, positionY: 162, scaleX: -0.28, scaleY: 0.28, cropTop: 62, cropBottom: 189 },
'Виджет: Рамка вебки': { index: 5, positionX: 0, positionY: 159, scaleX: 0.28, scaleY: 0.28 },
'Виджет: Счетчик смертей': { index: 6, positionX: 241, positionY: 136, scaleX: 0.52, scaleY: 0.52 },
'Виджет: Медиа Инфо': { index: 7, positionX: 0, positionY: 0, scaleX: 0.8, scaleY: 0.8 },
'Виджет: Соцсети': { index: 8, positionX: 1600, positionY: 0, scaleX: 0.8, scaleY: 0.8 },
'Виджет: Бегущая строка': { index: 9, positionX: 535, positionY: 960, scaleX: 1, scaleY: 1 },
'Виджет: Таймер стрима (Uptime)': { index: 10, positionX: 10, positionY: 1006, scaleX: 0.84, scaleY: 0.84 },
'Виджет: Шкала цели': { index: 11, positionX: 760, positionY: -10, scaleX: 1, scaleY: 1 },
'Виджет: YouTube Плеер': { index: 12, positionX: 1520, positionY: 750, scaleX: 0.8, scaleY: 0.8 },
'Виджет: Летящие смайлы': { index: 13, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Реклама (Shoutout)': { index: 14, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Оповещения (Alerts)': { index: 15, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Озвучка (TTS)': { index: 16, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__SYS_AUDIO__': { index: 17, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__MIC_AUDIO__': { index: 18, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 }
},
'👋 [Сцена] Конец': {
'Виджет: Экран Конца': { index: 0, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Неоновые частицы': { index: 1, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Таймер стрима (Uptime)': { index: 2, positionX: 606, positionY: 980, scaleX: 1, scaleY: 1 },
'Виджет: Соцсети': { index: 3, positionX: 0, positionY: 960, scaleX: 1, scaleY: 1 },
'Виджет: Чат Twitch': { index: 4, positionX: 1392, positionY: 163, scaleX: 0.92, scaleY: 0.92, cropTop: 80 },
'Виджет: Шкала цели': { index: 5, positionX: 471, positionY: 0, scaleX: 1.29, scaleY: 1.29 },
'Виджет: Заглушка (Blur)': { index: 6, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Оповещения (Alerts)': { index: 7, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Реклама (Shoutout)': { index: 8, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Летящие смайлы': { index: 9, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'Виджет: Озвучка (TTS)': { index: 10, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__SYS_AUDIO__': { index: 11, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 },
'__MIC_AUDIO__': { index: 12, positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 }
}
};
module.exports = {
COLLECTION_NAME,
SYS_AUDIO_SCENE,
MIC_AUDIO_SCENE,
LEGACY_AUDIO_SCENE,
PACK_SCENES,
BROWSER_CSS,
WIDGETS,
INPUT_KINDS,
LAYOUT
};