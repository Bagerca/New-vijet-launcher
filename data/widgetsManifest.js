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
      { key: "maxEmotes", label: "Макс. смайлов за раз", type: "number", default: 20, cmd: "!emotesmax" },
      { type: "button", label: "Тест: Взрыв смайлов", action: "TEST_EMOTES", payload: {} }
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
      { key: "bgColor", label: "Цвет фона", type: "color", default: "#101218", cmd: "!chatbg" },
      { key: "bgOpacity", label: "Прозрачность фона (%)", type: "range", default: 85, cmd: "!chatop" },
      { key: "textColor", label: "Цвет текста", type: "color", default: "#ffffff", cmd: "!chatc" },
      { key: "fontSize", label: "Размер шрифта (px)", type: "number", default: 16, cmd: "!chatsz" }
    ]
  },
  {
    id: "player",
    category: "media",
    title: "📺 Умный Медиаплеер (YouTube)",
    description: "Запуск видео через чат-команды (!play).",
    controls: [
      { key: "videoUrl", label: "Прямой запуск (Ссылка на YouTube)", type: "text", default: "", cmd: "!play" },
      { key: "volume", label: "Громкость (%)", type: "range", default: 30, cmd: "!vol" }
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
    description: "Блок с обложкой игры или видео на экране.",
    controls: [
      { key: "isActive", label: "Включить карточку", type: "checkbox", default: false, cmd: "!mediacard" },
      { key: "type", label: "Тип контента", type: "select", default: "game", cmd: "!mediatype", options: [
        { label: "Игра (Авто-поиск Steam)", value: "game" },
        { label: "YouTube Видео", value: "yt" }
      ]},
      { key: "query", label: "Название игры или ссылка YT", type: "text", default: "Minecraft", cmd: "!mediaquery", description: "Игры из базы: Subnautica, Minecraft, Lethal Company, CS2, Valorant, Atomic Heart, Stalker" }
    ]
  },
  {
    id: "uptime",
    category: "overlay",
    title: "⏱️ Таймер трансляции",
    description: "Время в эфире (автоматически парсится с Twitch).",
    controls: [
      { key: "isActive", label: "Показывать таймер", type: "checkbox", default: true, cmd: "!uptime" },
      { key: "testMode", label: "Форсировать режим В ЭФИРЕ", type: "checkbox", default: false, cmd: "!uptimetest" }
    ]
  },
  {
    id: "tts",
    category: "overlay",
    title: "🎙️ Озвучка чата (TTS)",
    description: "Синтез речи (робот) и неоновый эквалайзер.",
    controls: [
      { key: "enabled", label: "Включить TTS", type: "checkbox", default: true, cmd: "!tts" },
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