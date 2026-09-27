const AppUptime = {
    container: document.getElementById('uptime-container'),
    valueEl: document.getElementById('uptime-value'),
    dotEl: document.getElementById('up-dot'),
    pillBg: document.getElementById('up-pill-bg'),
    textEl: document.getElementById('up-text'),
    
    startTime: null,
    timerInterval: null,
    isTestMode: false,
    isLive: false,
    twitchChannel: "",

    init: function() {
        this.connectWS();
        setInterval(() => this.fetchStreamStatus(), 30000);
        this.timerInterval = setInterval(() => this.tick(), 1000);
    },

    connectWS: function() {
        const ws = new WebSocket('ws://localhost:42069');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.event === 'CONFIG_UPDATED') {
                    this.twitchChannel = message.data.twitchChannel;
                    this.applyConfig(message.data.widgets?.uptime || {});
                }
            } catch (e) {}
        };
        ws.onclose = () => setTimeout(() => this.connectWS(), 3000);
    },

    applyConfig: function(config) {
        // ИСПРАВЛЕНО: безопасная проверка строки "false"
        const isOff = config.isActive === false || String(config.isActive) === 'false';
        if (isOff) {
            this.container.classList.add('hidden');
            return;
        }

        // ИСПРАВЛЕНО: безопасная проверка строки "true"
        if (config.testMode === true || String(config.testMode) === 'true') {
            this.enableTestMode();
        } else {
            this.isTestMode = false;
            this.fetchStreamStatus();
        }
    },

    setUIState: function(isLive) {
        if (isLive) {
            this.dotEl.style.background = '#FF0050';
            this.dotEl.style.boxShadow = '0 0 8px #FF0050';
            this.textEl.innerText = 'В ЭФИРЕ';
            this.textEl.style.color = '#FF0050';
            this.pillBg.style.background = 'rgba(255, 0, 80, 0.1)';
            this.pillBg.style.borderColor = 'rgba(255, 0, 80, 0.15)';
        } else {
            this.dotEl.style.background = '#888888';
            this.dotEl.style.boxShadow = 'none';
            this.textEl.innerText = 'ОФФЛАЙН';
            this.textEl.style.color = '#888888';
            this.pillBg.style.background = 'rgba(0, 0, 0, 0.05)';
            this.pillBg.style.borderColor = 'rgba(0, 0, 0, 0.05)';
        }
    },

    fetchStreamStatus: async function() {
        if (this.isTestMode || !this.twitchChannel) return;

        try {
            const cleanChannel = this.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
            const response = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${cleanChannel}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const user = data[0];
                    if (user.stream && user.stream.createdAt) {
                        this.startTime = new Date(user.stream.createdAt).getTime();
                        this.isLive = true;
                        this.setUIState(true);
                        this.container.classList.remove('hidden');
                    } else {
                        this.isLive = false;
                        this.startTime = null;
                        this.valueEl.innerText = "00:00:00";
                        this.setUIState(false);
                        this.container.classList.remove('hidden');
                    }
                }
            }
        } catch (err) {
            console.warn("[Uptime] Не удалось получить статус стрима.");
        }
    },

    enableTestMode: function() {
        this.isTestMode = true;
        this.isLive = true;
        this.startTime = Date.now() - (1 * 3600 + 23 * 60 + 45) * 1000;
        this.setUIState(true);
        this.container.classList.remove('hidden');
        this.tick();
    },

    tick: function() {
        if (!this.isLive || !this.startTime) return;

        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        if (elapsed < 0) return;

        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        const pad = (num) => String(num).padStart(2, '0');

        if (hours > 0) {
            this.valueEl.innerText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        } else {
            this.valueEl.innerText = `${pad(minutes)}:${pad(seconds)}`;
        }
    }
};

fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
      AppUptime.twitchChannel = config.twitchChannel;
      AppUptime.applyConfig(config.widgets?.uptime || {});
      AppUptime.init();
  })
  .catch(() => AppUptime.init());