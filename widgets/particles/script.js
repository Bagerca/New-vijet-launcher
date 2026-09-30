import { WidgetCore } from '../shared/WidgetCore.js';

const AppParticles = {
    canvas: document.getElementById('particles-canvas'),
    ctx: null,
    particlesArray: [],
    animationId: null,
    isLoopRunning: false,
    
    spriteCanvas: null,
    spriteCtx: null,
    
    enabled: true,
    
    // СТРОГИЕ ЛИМИТЫ (Защита от краша OBS)
    LIMITS: {
        MAX_COUNT: 80,   // Снизил до 80 для производительности OBS
        MAX_DIST: 200,  
        MAX_SPEED: 2.0  
    },

    settings: { count: 35, speed: 0.2, distance: 100, color: '#ff4d85' },
    cachedRgb: { r: 255, g: 77, b: 133 },
    lastHexColor: '#ff4d85',

    init: function() {
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.spriteCanvas = document.createElement('canvas');
        this.spriteCtx = this.spriteCanvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => {
            // Debounce для оптимизации при ресайзе
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.resize(), 200);
        });
    },

    applyConfig: function(config) {
        if (!config) return;

        const wasEnabled = this.enabled;
        this.enabled = config.enabled !== false && String(config.enabled) !== 'false';

        const oldCount = this.settings.count;
        const oldColor = this.settings.color;
        
        if (config.count !== undefined) this.settings.count = Math.min(Math.max(parseInt(config.count), 10), this.LIMITS.MAX_COUNT);
        if (config.distance !== undefined) this.settings.distance = Math.min(Math.max(parseInt(config.distance), 25), this.LIMITS.MAX_DIST);
        if (config.speed !== undefined) this.settings.speed = Math.min(Math.max(parseFloat(config.speed), 0), this.LIMITS.MAX_SPEED);
        if (config.color !== undefined) this.settings.color = config.color;
        
        if (oldCount !== this.settings.count) this.initParticles();
        if (oldColor !== this.settings.color) this.preRenderSprite();

        // Главная оптимизация: Запускаем цикл только если включено, убиваем если выключено
        if (this.enabled && !this.isLoopRunning) {
            this.animate();
        } else if (!this.enabled && this.isLoopRunning) {
            cancelAnimationFrame(this.animationId);
            this.isLoopRunning = false;
            // Очищаем экран, чтобы не висели застывшие точки
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // При ресайзе переинициализируем точки, чтобы они не улетели за новые границы
        if (this.particlesArray.length > 0) this.initParticles();
    },

    hexToRgbCached: function(hex) {
        if (hex === this.lastHexColor) return this.cachedRgb;
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            this.cachedRgb = { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
            this.lastHexColor = hex;
        }
        return this.cachedRgb;
    },

    preRenderSprite: function() {
        const rgb = this.hexToRgbCached(this.settings.color);
        const radius = 3; 
        const glow = 10;  
        const size = (radius + glow) * 2;
        
        this.spriteCanvas.width = size;
        this.spriteCanvas.height = size;
        
        this.spriteCtx.clearRect(0, 0, size, size);
        this.spriteCtx.beginPath();
        this.spriteCtx.arc(size/2, size/2, radius, 0, Math.PI * 2);
        this.spriteCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
        this.spriteCtx.shadowBlur = glow;
        this.spriteCtx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        this.spriteCtx.fill();
    },

    initParticles: function() {
        this.particlesArray = [];
        const maxParticles = Math.min(this.settings.count, this.LIMITS.MAX_COUNT); 
        for (let i = 0; i < maxParticles; i++) {
            this.particlesArray.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 2 + 1,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5
            });
        }
    },

    animate: function() {
        if (!this.enabled) {
            this.isLoopRunning = false;
            return; // Прерываем цикл, сохраняем 100% CPU
        }
        
        this.isLoopRunning = true;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const rgb = this.cachedRgb; 
        const speedMult = this.settings.speed;
        const linkDist = this.settings.distance;
        const linkDistSq = linkDist * linkDist; 

        // 1. Движение частиц
        for (let i = 0; i < this.particlesArray.length; i++) {
            let p = this.particlesArray[i];

            p.x += p.vx * speedMult;
            p.y += p.vy * speedMult;

            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            const spriteOffset = (p.radius + 10); 
            this.ctx.drawImage(this.spriteCanvas, p.x - spriteOffset, p.y - spriteOffset);
        }

        // 2. Линии ( Constellation )
        const BUCKET_COUNT = 20; 
        const MAX_OPACITY = 0.4;
        const lineBuckets = Array.from({length: BUCKET_COUNT}, () => []);

        for (let a = 0; a < this.particlesArray.length; a++) {
            let p1 = this.particlesArray[a];
            for (let b = a + 1; b < this.particlesArray.length; b++) {
                let p2 = this.particlesArray[b];
                
                // Предварительный быстрый тест по осям
                if (Math.abs(p1.x - p2.x) > linkDist || Math.abs(p1.y - p2.y) > linkDist) continue;

                let dx = p1.x - p2.x;
                let dy = p1.y - p2.y;
                let distSq = dx * dx + dy * dy;

                if (distSq < linkDistSq) {
                    let distance = Math.sqrt(distSq);
                    let opacity = 1 - (distance / linkDist);
                    opacity *= MAX_OPACITY; 
                    
                    let bucketIndex = Math.floor((opacity / MAX_OPACITY) * BUCKET_COUNT);
                    if (bucketIndex >= BUCKET_COUNT) bucketIndex = BUCKET_COUNT - 1;
                    if (bucketIndex < 0) continue;

                    lineBuckets[bucketIndex].push(p1.x, p1.y, p2.x, p2.y);
                }
            }
        }

        // Отрисовка батчами (значительно экономит CPU)
        this.ctx.lineWidth = 1;
        for (let i = 0; i < BUCKET_COUNT; i++) {
            let bucket = lineBuckets[i];
            if (bucket.length === 0) continue;
            
            let alpha = (i / BUCKET_COUNT) * MAX_OPACITY + (MAX_OPACITY / BUCKET_COUNT / 2);
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

            for (let j = 0; j < bucket.length; j += 4) {
                this.ctx.moveTo(bucket[j], bucket[j+1]);
                this.ctx.lineTo(bucket[j+2], bucket[j+3]);
            }
            this.ctx.stroke(); 
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
};

// ==========================================
// ИНИЦИАЛИЗАЦИЯ ЧЕРЕЗ ЯДРО
// ==========================================

AppParticles.init();

WidgetCore.init({
    onConfigUpdate: (config) => {
        if (config.widgets?.particles) AppParticles.applyConfig(config.widgets.particles);
    },

    onTwitchCommand: (cmd, args) => {
        if (cmd === '!particles' || cmd === '!частицы') {
            const arg0 = args[0] ? args[0].toLowerCase() : null;
            let conf = { ...(WidgetCore.globalConfig.widgets.particles || {}) };
            let changed = false;

            if (arg0 === 'on') {
                conf.enabled = true;
                changed = true;
            } 
            else if (arg0 === 'off') {
                conf.enabled = false;
                changed = true;
            } 
            // Парсим: !particles [count] [dist] [speed] [color]
            else if (args.length >= 4) {
                const count = parseInt(args[0]);
                const dist = parseInt(args[1]);
                const speed = parseFloat(args[2]);
                let color = args[3];
                
                if (!color.startsWith('#')) color = `#${color}`;

                if (!isNaN(count) && !isNaN(dist) && !isNaN(speed)) {
                    conf.count = count;
                    conf.distance = dist;
                    conf.speed = speed;
                    conf.color = color;
                    conf.enabled = true; // Автоматически включаем
                    changed = true;
                }
            }

            if (changed) {
                WidgetCore.updateWidgetConfig('particles', conf);
            }
        }
    }
});