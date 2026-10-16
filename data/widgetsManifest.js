/* ФАЙЛ: data/widgetsManifest.js */

import { MediaLibrary } from '../widgets/media/media-db.js';

// Автоматически генерируем опции для выпадающего списка из базы данных
const libraryOptions = Object.keys(MediaLibrary).map(key => ({
  label: `[ID: ${key}] ${MediaLibrary[key].title}`,
  value: key
}));

const defaultPlaylist = [
  "https://youtu.be/I9Bjf_VmQxo?si=0ry7L1jbyp1m5S61",
  "https://youtu.be/kErWhzq5gTc?si=_fZ0ZuAMo6FMXO8L",
  "https://youtu.be/PACCO-0XnDU?si=Z5uH-Q5K5qC4ndfx",
  "https://youtu.be/T24rF_x0TmQ?si=CBm8MBs9tWZKnnDY",
  "https://youtu.be/hQC_eLX1n6g?si=FE5ZwnLWWAGiNbaP",
  "https://youtu.be/XlAul6spLkA?si=KcpGDjI_OAfbNeU_",
  "https://youtu.be/u61fUWCKAG4?si=Tx4tOlFXobQGlRPw",
  "https://youtu.be/S2ujotDMluo?si=iiKjA3qc9I8j5O-l",
  "https://youtu.be/GTm_-Ceb7KA?si=3wbO_2SQAmHbJgBg",
  "https://youtu.be/6D_TvwBCXx0?si=FisbszAteTv-HMQ4",
  "https://youtu.be/g3G1-z-W1vo?si=XM3Y7pgrm0VnArfU",
  "https://youtu.be/OJXi5BvR_DU?si=W6klHWV8c6PVup8L",
  "https://youtu.be/mNG9g1yUs0Y?si=FJo6XxI_eKB2zE50",
  "https://youtu.be/zzhBsV6FzQo?si=ThuZnY5cOBBFr6cL",
  "https://youtu.be/JUXM2jCxTqY?si=2-MHXtJ12Ylbipns",
  "https://youtu.be/EheOV-WBntw?si=iy09Cu4onsFqA8cG",
  "https://youtu.be/APIXKzYgImM?si=PO8IWHBBmn6SPADQ",
  "https://youtu.be/IUuhdIFllok?si=SU25AV3FpTgx4m1m",
  "https://youtu.be/knlw6kFP_RU?si=h6SS2T8h9t5j7r8z",
  "https://youtu.be/Qp3b-RXtz4w?si=yF8JV1O4zAgVhGjm",
  "https://youtu.be/6Ro7NubzE9A?si=pB7Ruo49_VN3ZfgI",
  "https://youtu.be/ulHcNwK1q_U?si=qJBmDjpGapQ6y7k2",
  "https://youtu.be/BFfRR171G7w?si=mCDXUbI_ject4_22",
  "https://youtu.be/9Zj0JOHJR-s?si=t3JXLfC9p9m1mg1w",
  "https://youtu.be/dnNSvR2wNSo?si=REpEeKa-WS7eDmW2",
  "https://youtu.be/_8JdKz76ZHk?si=Rp0lGjNuA211TimY",
  "https://youtu.be/1Wkkjboe48c?si=eBF5XWoKPC9Kb1bP",
  "https://youtu.be/EP_htfxJXfo?si=vMD0XBiA39gpi0Xm",
  "https://youtu.be/R4ci67fvLDM?si=kuL0tSsN0ZygYQZP"
].join("\n");

export const widgetsManifest = [
  {
    id: "frame",
    category: "overlay",
    title: "Неоновая рамка веб-камеры",
    description: "Выберите цвета для градиента. Обновляется в реальном времени.",
    controls: [
      { key: "color1", label: "Главный цвет (Цвет 1)", type: "color", default: "#00ff66", cmd: "!color1" },
      { key: "color2", label: "Вторичный цвет (Цвет 2)", type: "color", default: "#ff007f", cmd: "!color2" },
      { key: "isVisible", label: "Включить рамку", type: "checkbox", default: true, cmd: "!frame" }
    ]
  },
  {
    id: "pet",
    category: "overlay",
    title: "🦊 Интерактивный Питомец",
    description: "Кибер-лиса на рамке. Реагирует на чат, музыку, TTS и смерти.",
    controls: [
      { key: "enabled", label: "Показывать питомца", type: "checkbox", default: true, cmd: "!peton" },
      { key: "sleepTimeout", label: "Засыпает через (секунд тишины)", type: "number", default: 120, cmd: "!petsleep" },
      { key: "feedRewardName", label: "Награда за баллы (Кормление)", type: "text", default: "Покормить лису", cmd: "!petfeed" },
      { key: "vipUsers", label: "VIP зрители (Ники через запятую)", type: "textarea", default: "bagercaa, to_be_ang", cmd: "!petvip" },
      { key: "forbiddenWords", label: "Бан-ворды (через запятую)", type: "textarea", default: "даун, пидор, негр", cmd: "!petban" },
      { type: "button", label: "Тест: Напугать лису", action: "PET_EMOTION", payload: { emotion: "scared", duration: 4000 } }
    ]
  },
  {
    id: "alerts",
    category: "overlay",
    title: "🔔 Оповещения (Алерты)",
    description: "Настройка звука и таймингов для подписок, фолловеров и наград.",
    controls: [
      { key: "volume", label: "Громкость звука (%)", type: "range", default: 40, cmd: "!alertvol" },
      { key: "duration", label: "Длительность показа (секунды)", type: "number", default: 5, cmd: "!alertdur" },
      { type: "button", label: "Тест: Платная подписка", action: "TEST_ALERT", payload: { type: "sub", user: "СуперФанат", message: "Обожаю твои стримы!" } }
    ]
  },
  {
    id: "blur",
    category: "overlay",
    title: "🔒 Приватный режим (Заглушка)",
    description: "Перекрывает экран на 100% непрозрачной неоновой сеткой.",
    controls: [
      { key: "enabled", label: "Включить приватный режим", type: "checkbox", default: false, cmd: "!blur" },
      { key: "title", label: "Заголовок", type: "text", default: "ПРИВАТНЫЙ РЕЖИМ", cmd: "!blurtitle" },
      { key: "subtitle", label: "Подзаголовок", type: "text", default: "Экран временно скрыт", cmd: "!blursub" },
      { key: "accentColor", label: "Неоновый цвет", type: "color", default: "#ff007f", cmd: "!blurc" }
    ]
  },
  {
    id: "particles",
    category: "overlay",
    title: "✨ Неоновые частицы (Фон)",
    description: "Интерактивные созвездия на фоне трансляции.",
    controls: [
      { key: "enabled", label: "Включить частицы", type: "checkbox", default: true, cmd: "!particleson" },
      { key: "count", label: "Количество (10-100)", type: "number", default: 30, cmd: "!pcount" },
      { key: "distance", label: "Длина связей (25-200)", type: "number", default: 80, cmd: "!pdist" },
      { key: "speed", label: "Скорость (0.1 - 2.0)", type: "number", step: "0.1", default: 0.2, cmd: "!pspeed" },
      { key: "color", label: "Цвет", type: "color", default: "#ff007f", cmd: "!pcolor" }
    ]
  },
  {
    id: "deaths",
    category: "overlay",
    title: "💀 Счетчик смертей",
    description: "Интерактивный счетчик с комбо и тряской экрана.",
    controls: [
      { key: "enabled", label: "Отображать счетчик на экране", type: "checkbox", default: false, cmd: "!deathshow" },
      { key: "deathsCount", label: "Количество смертей", type: "number", default: 0, cmd: "!deathset" },
      { key: "color", label: "Цвет счетчика", type: "color", default: "#ff0050", cmd: "!deathc" }
    ]
  },
  {
    id: "emotes",
    category: "overlay",
    title: "🚀 Летящие смайлы (Emotes)",
    description: "Интерактивные смайлики из чата, летящие по экрану.",
    controls: [
      { key: "enabled", label: "Включить спавн смайлов", type: "checkbox", default: true, cmd: "!emoteson" },
      { key: "mode", label: "Режим анимации", type: "select", default: "bubble", cmd: "!emotesmode", options: [
        { label: "Пузыри (Плавное всплытие)", value: "bubble" },
        { label: "Фонтан (Резкий взрыв)", value: "fountain" }
      ]},
      { key: "maxEmotes", label: "Макс. смайлов за раз", type: "number", default: 20, cmd: "!emotesmax" }
    ]
  },
  {
    id: "shoutout",
    category: "overlay",
    title: "📢 Реклама стримера (Shoutout)",
    description: "3D-карточка рекомендации канала (!so @ник).",
    controls: [
      { key: "duration", label: "Длительность показа (секунды)", type: "number", default: 8, cmd: "!sodur" },
      { type: "button", label: "Тест: Реклама", action: "TEST_SHOUTOUT", payload: { user: "ksusha__sher" } }
    ]
  },
  {
    id: "goal",
    category: "overlay",
    title: "🎯 Шкала цели (Фолловеры)",
    description: "Умный виджет прогресса с автоматическим парсингом Twitch.",
    controls: [
      { key: "goalTarget", label: "Цель (Фолловеры)", type: "number", default: 200, cmd: "!goal" },
      { key: "goalTitle", label: "Текст цели", type: "text", default: "ФОЛЛОВЕРЫ:", cmd: "!goaltext" },
      { key: "goalColor", label: "Цвет цели", type: "color", default: "#00ff66", cmd: "!goalc" }
    ]
  },
  {
    id: "chat",
    category: "chat",
    title: "💬 Виджет Twitch Чата",
    description: "Киберпанк чат с плавной анимацией.",
    controls: [
      { key: "bgColor", label: "Цвет фона", type: "color", default: "#ffffff", cmd: "!chatbg" },
      { key: "bgOpacity", label: "Прозрачность фона (%)", type: "range", default: 95, cmd: "!chatop" },
      { key: "textColor", label: "Цвет текста", type: "color", default: "#2c2c2e", cmd: "!chatc" },
      { key: "fontSize", label: "Размер шрифта (px)", type: "number", default: 20, cmd: "!chatsz" }
    ]
  },
  {
    id: "player",
    category: "media",
    title: "📺 Умный Медиаплеер (YouTube)",
    description: "Запуск видео через чат-команды (!play / !sr) и фоновый плейлист.",
    controls: [
      { key: "videoUrl", label: "Прямой запуск (Вне очереди)", type: "text", default: "", cmd: "!forceplay" },
      { key: "accentColor", label: "Цвет акцентов", type: "color", default: "#ff4d85", cmd: "!playerc" },
      { type: "button", label: "⏭ Скипнуть трек", action: "PLAYER_SKIP", payload: {} },
      { type: "button", label: "⏹ Остановить плеер", action: "PLAYER_STOP", payload: {} },
      { key: "volume", label: "Громкость заказов зрителей (%)", type: "range", default: 30, cmd: "!vol" },
      { key: "playlistEnabled", label: "Включить фоновый плейлист", type: "checkbox", default: false, cmd: "!bgplay" },
      { key: "playlistUrls", label: "Ссылки для фона (каждая с новой строки)", type: "textarea", default: defaultPlaylist },
      { key: "playlistShuffle", label: "Случайный порядок (Shuffle)", type: "checkbox", default: true },
      { key: "bgVolume", label: "Громкость фоновой музыки (%)", type: "range", default: 15 }
    ]
  },
  {
    id: "ticker",
    category: "overlay",
    title: "📰 Бегущая строка (Ticker)",
    description: "Настройка новостной ленты внизу экрана.",
    controls: [
      { key: "isActive", label: "Включить строку", type: "checkbox", default: true, cmd: "!ticker" },
      { key: "speed", label: "Скорость (пиксели/сек)", type: "number", default: 120, cmd: "!tickerspd" },
      { key: "interval", label: "Интервал (сек)", type: "number", default: 60, cmd: "!tickerint" },
      { key: "messages", label: "Сообщения (каждое с новой строки)", type: "textarea", default: "<span class='t-highlight'>МУЗЫКА</span> Заказывайте треки!", cmd: "!tickermsg" },
      { type: "button", label: "Тест: Срочная новость", action: "TICKER_CUSTOM", payload: { msg: "ВНИМАНИЕ! Вы пробили цель по лайкам!", badge: "АЛЕРТ", color: "#00ff66" } }
    ]
  },
  {
    id: "socials",
    category: "overlay",
    title: "🔄 Ротатор соцсетей",
    description: "Анимированный блок со ссылками на соцсети.",
    controls: [
      { key: "isActive", label: "Включить ротатор", type: "checkbox", default: true, cmd: "!socials" },
      { key: "interval", label: "Смена слайда (сек)", type: "number", default: 30, cmd: "!socialsint" },
      { key: "tgHandle", label: "Telegram", type: "text", default: "t.me/yourchannel", cmd: "!stg" },
      { key: "ttHandle", label: "TikTok", type: "text", default: "@your_tiktok", cmd: "!stt" },
      { key: "vkHandle", label: "ВКонтакте", type: "text", default: "vk.com/yourgroup", cmd: "!svk" }
    ]
  },
  {
    id: "media",
    category: "overlay",
    title: "🎮 Карточка активности",
    description: "Оставьте ссылку на YouTube пустой, чтобы показать игру из базы.",
    controls: [
      { key: "isActive", label: "Показывать на экране", type: "checkbox", default: false, cmd: "" },
      { key: "libId", label: "Медиа из библиотеки", type: "select", default: "cs2", options: libraryOptions },
      { key: "ytLink", label: "Ссылка на YouTube (перекрывает библиотеку)", type: "text", default: "" }
    ]
  },
  {
    id: "uptime",
    category: "overlay",
    title: "⏱️ Таймер трансляции",
    description: "Время в эфире (автоматически парсится с Twitch).",
    controls: [
      { key: "isActive", label: "Показывать таймер", type: "checkbox", default: true, cmd: "!uptime" },
      { key: "testMode", label: "Форсировать режим В ЭФИРЕ", type: "checkbox", default: false, cmd: "!uptimetest" },
      { key: "accentColor", label: "Цвет акцента", type: "color", default: "#ff0050", cmd: "!uptimec" }
    ]
  },
  {
    id: "tts",
    category: "overlay",
    title: "🎙️ Озвучка чата (TTS)",
    description: "Синтез речи (робот) и неоновый эквалайзер.",
    controls: [
      { key: "enabled", label: "Включить TTS", type: "checkbox", default: true, cmd: "!ttson" },
      { key: "volume", label: "Громкость (%)", type: "range", default: 100, cmd: "!ttsvol" },
      { key: "maxLength", label: "Макс. символов", type: "number", default: 150, cmd: "!ttsmax" },
      { key: "customVoices", label: "Кастомные голоса (JSON)", type: "textarea", default: '{"bagercaa":{"pitch":0.2,"rate":0.8}}', cmd: "!ttsvoice" }
    ]
  },
  {
    id: "startscreen",
    category: "scene",
    title: "☀️ Экран начала",
    description: "Настройка экрана ожидания и таймера.",
    controls: [
      { key: "text1", label: "Строка 1", type: "text", default: "Ало,", cmd: "!st1" },
      { key: "text2", label: "Строка 2", type: "text", default: "Здравствуйте,", cmd: "!st2" },
      { key: "text3", label: "Строка 3", type: "text", default: "Добрый вечер", cmd: "!st3" },
      { key: "timerMinutes", label: "Таймер (минут)", type: "number", default: 5, cmd: "!timer" },
      { key: "accentPink", label: "Акцент 1 (Розовый)", type: "color", default: "#ff007f", cmd: "!sc1" },
      { key: "accentGreen", label: "Акцент 2 (Зеленый)", type: "color", default: "#00ff66", cmd: "!sc2" }
    ]
  },
  {
    id: "endscreen",
    category: "scene",
    title: "👋 Экран завершения",
    description: "Настройка финальной сцены.",
    controls: [
      { key: "title", label: "Главный текст", type: "text", default: "Спасибо за просмотр!", cmd: "!endtitle" },
      { key: "subtitle", label: "Подзаголовок", type: "text", default: "Увидимся на следующем стриме 💜", cmd: "!endsub" },
      { key: "accentPink", label: "Акцент 1 (Розовый)", type: "color", default: "#ff007f", cmd: "!ec1" },
      { key: "accentGreen", label: "Акцент 2 (Зеленый)", type: "color", default: "#00ff66", cmd: "!ec2" }
    ]
  }
];