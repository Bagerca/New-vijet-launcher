const AppTicker = {
    container: document.getElementById('ticker-container'),
    maskEl: document.getElementById('ticker-mask'),
    textEl: document.getElementById('ticker-text'),
    badgeTextEl: document.getElementById('ticker-badge-text'),
    badgeDotEl: document.querySelector('#ticker-badge .t-dot'),
    
    priorityQueue: [],      
    messageBagRaw: [],      
    messageBag: [],         
    
    state: 0,               
    currentIsPriority: false, 
    
    intervalTimerId: null,
    textMotionTimerId: null,
    hideTimerId: null,
    
    speed: 120, 
    intervalMs: 60000, 

    init: function() {
        // Подключаем слушатели LocalStorage для Live Preview тестов
        fetch('/api/config')
          .then(res => res.json())
          .then(config => {
              this.applyConfig(config.widgets?.ticker || {});
              this.connectWS();
          })
          .catch(() => {
              const saved = localStorage.getItem('stream_pack_config');
              if (saved) {
                  const conf = JSON.parse(saved);
                  this.applyConfig(conf.widgets?.ticker || {});
              }
              this.connectWS();
          });

        window.addEventListener('storage', (e) => {
            if (e.key === 'stream_pack_config' && e.newValue) {
                const conf = JSON.parse(e.newValue);
                this.applyConfig(conf.widgets?.ticker || {});
            }
            if (e.key === 'stream_pack_action' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.action === 'TICKER_CUSTOM') {
                        this.forceShowImmediate(data.payload.msg, data.payload.badge, data.payload.color);
                    }
                } catch(err){}
            }
        });
    },

    connectWS: function() {
        const ws = new WebSocket('ws://localhost:42069');
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.event === 'CONFIG_UPDATED') {
                this.applyConfig(message.data.widgets?.ticker);
            } 
            else if (message.event === 'WIDGET_ACTION' && message.action === 'TICKER_CUSTOM') {
                this.forceShowImmediate(message.payload.msg, message.payload.badge, message.payload.color);
            }
        };
        ws.onclose = () => setTimeout(() => this.connectWS(), 3000);
    },

    applyConfig: function(config) {
        if (!config) return;
        const isOff = config.isActive === false || String(config.isActive) === 'false';
        if (isOff) {
            this.container.classList.add('hidden');
            clearTimeout(this.intervalTimerId);
            return;
        }

        this.speed = parseInt(config.speed) || 120;
        this.intervalMs = (parseInt(config.interval) || 60) * 1000;

        const msgStr = config.messages || "<span class='t-highlight'>СИСТЕМА</span> Настройте бегущую строку в панели.";
        this.messageBagRaw = msgStr.split('\n').map(m => m.trim()).filter(m => m !== '');

        if (this.state === 0 && this.priorityQueue.length === 0) {
           this.fillBag();
           this.scheduleNext();
        }
    },

    fillBag: function() {
        let msgs = [...(this.messageBagRaw || [])];
        if (msgs.length === 0) msgs = ["Пусто"];
        
        for (let i = msgs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [msgs[i], msgs[j]] = [msgs[j], msgs[i]];
        }
        this.messageBag = msgs;
    },

    getDefaultMessage: function() {
        if (this.messageBag.length === 0) this.fillBag();
        const msg = this.messageBag.pop();
        return { html: msg, badge: "ИНФО", color: "#00ff66" };
    },

    scheduleNext: function() {
        clearTimeout(this.intervalTimerId);
        this.intervalTimerId = setTimeout(() => {
            if (this.state === 0 && this.priorityQueue.length === 0) {
                this.playNext();
            }
        }, this.intervalMs);
    },

    forceShowImmediate: function(msg, badgeName = "СИСТЕМА", color = "#ff007f") {
        this.priorityQueue.push({ html: msg, badge: badgeName, color: color });
        
        if (this.state === 0) {
            this.playNext();
        } 
        else if (this.state === 1 && !this.currentIsPriority) {
            this.interrupt();
        }
    },

    interrupt: function() {
        if (this.state !== 1) return; 
        this.state = 2; 
        
        clearTimeout(this.textMotionTimerId);
        clearTimeout(this.hideTimerId);
        
        this.textEl.style.transition = 'none'; 
        this.container.classList.remove('visible');
        this.container.classList.add('is-leaving');
        
        setTimeout(() => {
            this.container.classList.add('hidden');
            this.container.classList.remove('is-leaving');
            this.state = 0; 
            this.playNext(); 
        }, 600);
    },

    playNext: function() {
        if (this.state !== 0) return; 
        this.state = 1; 
        clearTimeout(this.intervalTimerId);
        
        let item;
        if (this.priorityQueue.length > 0) {
            item = this.priorityQueue.shift();
            this.currentIsPriority = true; 
        } else {
            item = this.getDefaultMessage();
            this.currentIsPriority = false; 
        }
        
        this.badgeTextEl.innerText = item.badge;
        this.badgeDotEl.style.backgroundColor = item.color;
        this.badgeDotEl.style.boxShadow = `0 0 10px ${item.color}`;
        this.textEl.innerHTML = item.html;
        this.textEl.style.transition = 'none';
        
        this.container.classList.remove('hidden', 'is-leaving');
        void this.container.offsetWidth; 
        
        const maskWidth = this.maskEl.offsetWidth;
        const textWidth = this.textEl.scrollWidth;
        this.textEl.style.transform = `translate3d(${maskWidth}px, 0, 0)`;
        void this.textEl.offsetWidth; 
        
        const distance = maskWidth + textWidth; 
        const duration = distance / this.speed;

        this.container.classList.add('visible'); 
        
        this.textMotionTimerId = setTimeout(() => {
            this.textEl.style.transition = `transform ${duration}s linear`;
            this.textEl.style.transform = `translate3d(-${textWidth + 50}px, 0, 0)`;
        }, 800);
        
        this.hideTimerId = setTimeout(() => {
            this.hideTicker();
        }, 800 + (duration * 1000) + 200); 
    },

    hideTicker: function() {
        if (this.state !== 1) return; 
        this.state = 2; 
        
        this.container.classList.remove('visible');
        this.container.classList.add('is-leaving');
        
        setTimeout(() => {
            this.container.classList.add('hidden');
            this.container.classList.remove('is-leaving');
            this.state = 0; 
            
            if (this.priorityQueue.length > 0) this.playNext();
            else this.scheduleNext(); 
        }, 600);
    }
};

AppTicker.init();