const AppSocials = {
    container: document.getElementById('social-rotator'),
    currentIndex: 0,
    intervalId: null,
    networks: [],
    currentIntervalSec: 30,
    
    icons: {
        telegram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>`,
        vk: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.162 18.994c.609 0 .858-.406.851-.915-.031-1.917.714-2.949 2.059-1.604 1.488 1.488 1.796 2.519 3.603 2.519h3.2c.808 0 1.126-.26 1.126-.668 0-.863-1.421-2.386-2.625-3.504-1.686-1.565-1.765-1.602-.313-3.486 1.801-2.339 2.583-3.929 2.378-4.542-.187-.557-1.126-.64-1.126-.64h-3.834c-.421 0-.693.208-.858.557C17.07 7.79 16.037 10.272 14.548 11.53c-.886.745-1.162.775-1.162.24V6.853c0-.609-.26-1.02-1.02-1.02h-4.382c-.378 0-.609.183-.609.431 0 .431.64.557.858 1.801.328 1.884.281 3.513-.378 3.96-.543.368-1.503-.178-3.324-3.535C3.763 7.028 3.42 6.13 3.056 6.13H-.26c-.457 0-.583.218-.583.473 0 .473.858 2.059 4.148 6.551 2.859 3.896 5.86 6.175 9.07 6.175h.787z"/></svg>`,
        tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.75 3.85-2.05 5.25-1.31 1.41-3.23 2.24-5.23 2.27-1.96.04-3.92-.66-5.35-1.98-1.44-1.33-2.31-3.2-2.37-5.18-.05-1.92.76-3.83 2.11-5.18 1.34-1.35 3.23-2.13 5.15-2.19v4.06c-1.19.01-2.34.61-3.08 1.54-.74.93-1.07 2.15-.9 3.33.16 1.17.84 2.23 1.83 2.84 1.01.62 2.25.75 3.38.38 1.13-.37 2.05-1.18 2.56-2.23.51-1.05.61-2.29.28-3.4-.33-1.11-1.05-2.07-2.02-2.68V.02z"/></svg>`
    },

    init: function() {
        this.connectWS();
    },
    
    connectWS: function() {
        const ws = new WebSocket('ws://localhost:42069');
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.event === 'CONFIG_UPDATED' && message.data.widgets?.socials) {
                    this.applyConfig(message.data.widgets.socials);
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
            clearInterval(this.intervalId);
            return;
        }

        // Парсим массив соцсетей из инпутов конфига
        const newNetworks = [];
        if (config.tgHandle && config.tgHandle.trim() !== '') {
            newNetworks.push({ id: "telegram", title: "Telegram", handle: config.tgHandle.trim(), color: "#24A1DE" });
        }
        if (config.tiktokHandle && config.tiktokHandle.trim() !== '') { 
            newNetworks.push({ id: "tiktok", title: "TikTok", handle: config.tiktokHandle.trim(), color: "#FF0050" });
        } else if (config.ttHandle && config.ttHandle.trim() !== '') {
            newNetworks.push({ id: "tiktok", title: "TikTok", handle: config.ttHandle.trim(), color: "#FF0050" });
        }
        if (config.vkHandle && config.vkHandle.trim() !== '') {
            newNetworks.push({ id: "vk", title: "ВКонтакте", handle: config.vkHandle.trim(), color: "#0077FF" });
        }

        if (newNetworks.length === 0) {
            this.container.classList.add('hidden');
            clearInterval(this.intervalId);
            return;
        }

        this.networks = newNetworks;
        this.container.classList.remove('hidden');

        // Если интервал изменился, перезапускаем таймер
        const newInterval = parseInt(config.interval) || 30;
        if (newInterval !== this.currentIntervalSec || !this.intervalId) {
            this.currentIntervalSec = newInterval;
            this.startRotation();
        }

        // Сразу отображаем первую
        if (this.currentIndex >= this.networks.length) this.currentIndex = 0;
        this.render();
        setTimeout(() => this.container.classList.remove('fade-out'), 500);
    },

    startRotation: function() {
        clearInterval(this.intervalId);
        if (this.networks.length > 1) {
            this.intervalId = setInterval(() => {
                this.next();
            }, this.currentIntervalSec * 1000);
        }
    },
    
    next: function() {
        this.container.classList.add('fade-out');
        
        setTimeout(() => {
            this.currentIndex = (this.currentIndex + 1) % this.networks.length;
            this.render();
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.container.classList.remove('fade-out');
                });
            });
        }, 500); 
    },

    render: function() {
        if (!this.networks[this.currentIndex]) return;
        
        const data = this.networks[this.currentIndex];
        const iconSvg = this.icons[data.id] || this.icons.telegram; 

        this.container.style.setProperty('--social-color', data.color);
        this.container.style.setProperty('--social-glow', data.color + '26'); 

        this.container.innerHTML = `
            <div class="social-icon-wrapper" style="color: ${data.color}; background: ${data.color}15; border: 1px solid ${data.color}25;">
                ${iconSvg}
            </div>
            <div class="social-info">
                <div class="social-badge">
                    <div class="social-dot" style="background: ${data.color}; box-shadow: 0 0 6px ${data.color};"></div>
                    <span style="color: ${data.color};">${data.title}</span>
                </div>
                <span class="social-handle">${data.handle}</span>
            </div>
        `;
    }
};

fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
      AppSocials.applyConfig(config.widgets?.socials || {});
      AppSocials.init();
  })
  .catch(() => AppSocials.init());