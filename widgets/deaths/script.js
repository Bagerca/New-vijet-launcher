import { WidgetCore } from '../shared/WidgetCore.js';

function restartAnimation(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth; 
    element.classList.add(className);
}

const AppDeaths = {
    container: document.getElementById('deaths-container'),
    countText: document.getElementById('deaths-count'),
    comboEl: document.getElementById('deaths-combo'),
    shakerEl: document.getElementById('deaths-shaker'), // Новый элемент для тряски
    
    count: 0,
    isVisible: false,
    comboCount: 0,
    comboTimer: null,

    applyConfig: function(config) {
        if (!config) return;

        if (config.enabled !== undefined) {
            const isEnabled = config.enabled === true || String(config.enabled) === 'true';
            this.toggle(isEnabled);
        }
        if (config.color) {
            document.documentElement.style.setProperty('--death-color', config.color);
        }

        const newCount = parseInt(config.deathsCount) || 0;
        if (newCount > this.count) this.handleHit(newCount - this.count);
        this.count = Math.max(0, newCount);
        this.render();
    },

    toggle: function(forceState) {
        if (!this.container) return;
        const newState = forceState !== undefined ? forceState : !this.isVisible;
        
        if (newState && !this.isVisible) {
            this.container.classList.remove('hidden');
            restartAnimation(this.countText, 'animate-pop-red');
        } else if (!newState) {
            this.container.classList.add('hidden');
        }
        this.isVisible = newState;
    },

    handleHit: function(delta) {
        if (!this.isVisible) this.toggle(true);

        // Трясем ТОЛЬКО внутренний блок, чтобы комбо не шаталось
        restartAnimation(this.shakerEl, 'damage-shake');

        this.comboCount += delta;
        if (this.comboCount > 1) {
            this.comboEl.innerText = `x${this.comboCount} COMBO!`;
            
            // Запускаем комбо и отпускаем счетчик вниз
            this.comboEl.classList.remove('combo-out');
            restartAnimation(this.comboEl, 'combo-in');
            this.container.classList.add('has-combo'); // Запускает translateY в CSS
        }

        // Обновляем таймер на исчезновение комбо
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => {
            this.comboCount = 0;
            // Убираем комбо и подтягиваем счетчик обратно наверх
            this.comboEl.classList.remove('combo-in');
            this.comboEl.classList.add('combo-out');
            this.container.classList.remove('has-combo');
        }, 8000);

        if (!document.hidden) {
            try {
                const audio = new Audio('../../data/sounds/death.mp3');
                audio.volume = 0.6;
                audio.play().catch(e => {});
            } catch (e) {}
        }

        if (WidgetCore.ws && WidgetCore.ws.readyState === WebSocket.OPEN) {
            WidgetCore.ws.send(JSON.stringify({ event: 'WIDGET_ACTION', action: 'PET_EMOTION', payload: { emotion: 'scared', duration: 4000 } }));
        }
    },

    render: function() {
        if (this.countText.innerText !== String(this.count)) {
            this.countText.innerText = this.count;
            restartAnimation(this.countText, 'animate-pop-red');
        }
    }
};

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ЧЕРЕЗ ЯДРО
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.deaths) AppDeaths.applyConfig(config.widgets.deaths);
    },

    onTwitchCommand: (cmd, args) => {
        const allowedCmds = ['!death', '!deaths', '!смерть'];
        
        if (allowedCmds.includes(cmd)) {
            const arg = args[0] ? args[0].toLowerCase() : null;
            let currentConf = { ...(WidgetCore.globalConfig.widgets.deaths || { deathsCount: 0, enabled: false }) };
            let currentCount = parseInt(currentConf.deathsCount) || 0;
            let changed = false;

            if (!arg || arg === '+') { 
                currentConf.deathsCount = currentCount + 1; 
                currentConf.enabled = true;
                changed = true; 
            } 
            else if (arg === '-' || arg === 'sub') { 
                currentConf.deathsCount = Math.max(0, currentCount - 1); 
                changed = true; 
            } 
            else if (arg === 'reset' || arg === 'clear') { 
                currentConf.deathsCount = 0; 
                changed = true; 
            } 
            else if (arg === 'set' && args[1]) { 
                const val = parseInt(args[1]); 
                if (!isNaN(val)) { 
                    currentConf.deathsCount = Math.max(0, val); 
                    currentConf.enabled = true;
                    changed = true; 
                } 
            } 
            else if (arg === 'on' || arg === 'show') { 
                currentConf.enabled = true; 
                changed = true; 
            } 
            else if (arg === 'off' || arg === 'hide') { 
                currentConf.enabled = false; 
                changed = true; 
            }

            if (changed) {
                WidgetCore.updateWidgetConfig('deaths', currentConf);
            }
        }
    }
});