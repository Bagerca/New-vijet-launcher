/* ====================================================================
   МЕНЕДЖЕР АВАТАРОК (Shared Module)
   Кэширует аватарки Twitch в RAM и LocalStorage.
   Доступен для импорта во все виджеты.
   ==================================================================== */

export const AvatarManager = {
  CACHE_KEY: 'uso_avatars_lru',
  MAX_CACHED_USERS: 150, 
  ramCache: {},
  saveTimeout: null,

  init: function() {
    try {
      const saved = localStorage.getItem(this.CACHE_KEY);
      if (saved) this.ramCache = JSON.parse(saved);
    } catch(e) { 
      this.ramCache = {}; 
    }
  },

  syncToDisk: function() {
    const keys = Object.keys(this.ramCache);
    if (keys.length > this.MAX_CACHED_USERS) {
      keys.sort((a, b) => this.ramCache[a].ts - this.ramCache[b].ts);
      const itemsToRemove = keys.length - this.MAX_CACHED_USERS;
      for (let i = 0; i < itemsToRemove; i++) delete this.ramCache[keys[i]];
    }
    try { 
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.ramCache)); 
    } catch(e) { 
      this.ramCache = {}; 
      localStorage.removeItem(this.CACHE_KEY); 
    }
  },

  get: async function(username, fallbackColor = '#FF4477') {
    const cleanName = username.toLowerCase();
    
    // 1. Быстрый ответ из RAM (Кэш)
    if (this.ramCache[cleanName]) {
      this.ramCache[cleanName].ts = Date.now();
      return this.ramCache[cleanName].value;
    }
    
    // 2. Запрос к API Twitch
    try {
      const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${cleanName}`);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      if (data && data.length > 0 && data[0].logo) {
        this._saveToRam(cleanName, data[0].logo);
        return data[0].logo;
      }
      throw new Error("No Avatar");
    } catch (e) {
      // 3. Заглушка, если API недоступно или у юзера нет авы
      const hexColor = fallbackColor.replace('#', '');
      const fallbackUrl = `https://ui-avatars.com/api/?name=${cleanName}&background=${hexColor}&color=fff&size=64&bold=true`;
      this._saveToRam(cleanName, fallbackUrl);
      return fallbackUrl;
    }
  },

  _saveToRam: function(key, value) {
    this.ramCache[key] = { value: value, ts: Date.now() };
    
    // Отложенная запись на диск (Debounce 5 сек)
    // Чтобы при массовом спаме не насиловать LocalStorage
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.syncToDisk(), 5000);
  }
};

// Автоматическая инициализация при импорте
AvatarManager.init();