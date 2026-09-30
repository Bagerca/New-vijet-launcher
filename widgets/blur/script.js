// Используем относительный путь для иконок (чтобы работало через file://)
import { icons } from '../../js/utils/icons.js';
import { WidgetCore } from '../shared/WidgetCore.js';

function hexToRgb(hex) {
    let h = (hex || '#ff4d85').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substring(0, 2), 16) || 255;
    const g = parseInt(h.substring(2, 4), 16) || 77;
    const b = parseInt(h.substring(4, 6), 16) || 133;
    return `${r}, ${g}, ${b}`;
}

const AppBlur = {
    container: document.getElementById('screen-blur-overlay'),
    titleEl: document.getElementById('blur-title-el'),
    subEl: document.getElementById('blur-sub-el'),

    init: function() {
        document.getElementById('blur-icon-slot').innerHTML = icons.lock();
    },

    applyConfig: function(config) {
        if (!config) return;

        if (config.enabled !== undefined) {
            this.toggle(String(config.enabled) === 'true');
        }
        
        if (config.title !== undefined) this.titleEl.textContent = config.title;
        if (config.subtitle !== undefined) this.subEl.textContent = config.subtitle;
        
        if (config.accentColor) {
            const rgb = hexToRgb(config.accentColor);
            document.documentElement.style.setProperty('--blur-rgb', rgb);
        }
    },

    toggle: function(isActive) {
        if (!this.container) return;
        if (isActive) {
            this.container.classList.add('blur-active');
        } else {
            this.container.classList.remove('blur-active');
        }
    }
};

AppBlur.init();

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ЧЕРЕЗ ЯДРО
// ==========================================
WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.blur) AppBlur.applyConfig(config.widgets.blur);
    },

    onTwitchCommand: (cmd, args) => {
        let conf = { ...(WidgetCore.globalConfig.widgets.blur || {}) };
        let changed = false;

        if (cmd === '!blur' || cmd === '!блюр') {
            const arg = args[0] ? args[0].toLowerCase() : null;
            if (arg === 'on') conf.enabled = true;
            else if (arg === 'off') conf.enabled = false;
            // Если аргумента нет, работаем как переключатель
            else conf.enabled = !(conf.enabled === true || String(conf.enabled) === 'true');
            changed = true;
        }
        else if (cmd === '!blurtitle') {
            const text = args.join(' ');
            if (text) { conf.title = text; changed = true; }
        }
        else if (cmd === '!blursub') {
            const text = args.join(' ');
            if (text) { conf.subtitle = text; changed = true; }
        }
        else if (cmd === '!blurc') {
            const color = args[0];
            if (color) {
                conf.accentColor = color.startsWith('#') ? color : `#${color}`;
                changed = true;
            }
        }

        if (changed) {
            WidgetCore.updateWidgetConfig('blur', conf);
        }
    }
});