let currentClient = null;
let currentChannel = null;
let globalWs = null;
let globalConfigData = null;

const AppParticles = {
    canvas: document.getElementById('particles-canvas'),
    ctx: null,
    particlesArray: [],
    animationId: null,
    
    spriteCanvas: null,
    spriteCtx: null,
    
    enabled: true,
    
    // СТРОГИЕ ЛИМИТЫ (Защита от краша OBS)
    LIMITS: {
        MAX_COUNT: 100, 
        MAX_DIST: 200,  
        MAX_SPEED: 2.0  
    },

    settings: { count: 30, speed: 0.2, distance: 80, color: '#FF4477' },
    cachedRgb: { r: 255, g: 68, b: 119 },
    lastHexColor: '#FF4477',

    init: function(config) {
        if (!this.canvas) return;
        if (!this.ctx) {
            this.ctx = this.canvas.getContext('2d', { alpha: true });
            this.spriteCanvas = document.createElement('canvas');
            this.spriteCtx = this.spriteCanvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }

        const oldCount = this.settings.count;
        const oldColor = this.settings.color;
        
        if (config.enabled !== undefined) this.enabled = String(config.enabled) === 'true';
        this.applySafeSettings(config);
        
        if (oldCount !== this.settings.count) this.initParticles();
        if (oldColor !== this.settings.color) this.preRenderSprite();

        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.animate();
    },

    applySafeSettings: function(newSettings) {
        if (newSettings.count !== undefined) this.settings.count = Math.min(Math.max(parseInt(newSettings.count), 10), this.LIMITS.MAX_COUNT);
        if (newSettings.distance !== undefined) this.settings.distance = Math.min(Math.max(parseInt(newSettings.distance), 25), this.LIMITS.MAX_DIST);
        if (newSettings.speed !== undefined) this.settings.speed = Math.min(Math.max(parseFloat(newSettings.speed), 0), this.LIMITS.MAX_SPEED);
        if (newSettings.color !== undefined) this.settings.color = newSettings.color;
    },

    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
        this.animationId = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.enabled) {
            const rgb = this.cachedRgb; 
            const speedMult = this.settings.speed;
            const linkDist = this.settings.distance;
            const linkDistSq = linkDist * linkDist; 

            for (let i = 0; i < this.particlesArray.length; i++) {
                let p = this.particlesArray[i];

                p.x += p.vx * speedMult;
                p.y += p.vy * speedMult;

                if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

                const spriteOffset = (p.radius + 10); 
                this.ctx.drawImage(this.spriteCanvas, p.x - spriteOffset, p.y - spriteOffset);
            }

            const BUCKET_COUNT = 20; 
            const MAX_OPACITY = 0.4;
            const lineBuckets = Array.from({length: BUCKET_COUNT}, () => []);

            for (let a = 0; a < this.particlesArray.length; a++) {
                let p1 = this.particlesArray[a];
                for (let b = a + 1; b < this.particlesArray.length; b++) {
                    let p2 = this.particlesArray[b];
                    
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
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
};

async function initTMI(config) {
    if (!config.twitchChannel) return;
    const channel = config.twitchChannel.replace(/[@#]/g, '').trim().toLowerCase();
    
    if (currentChannel === channel) return;
    currentChannel = channel;
    
    if (currentClient) await currentClient.disconnect();
    
    currentClient = new tmi.Client({ channels: [channel] });
    
    currentClient.on('message', (chan, tags, message) => {
        const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
        const msgLow = message.trim().toLowerCase();
        
        // !particles [кол-во] [дистанция] [скорость] [hex-цвет]
        // или !particles off / !particles on
        if (isMod && (msgLow.startsWith('!particles ') || msgLow.startsWith('!частицы '))) {
            const args = msgLow.split(' ');
            if (args.length >= 2) {
                if (globalWs && globalWs.readyState === WebSocket.OPEN && globalConfigData) {
                    if (!globalConfigData.widgets.particles) globalConfigData.widgets.particles = {};
                    
                    const subCmd = args[1];
                    let changed = false;

                    if (subCmd === 'on' || subCmd === 'off') {
                        globalConfigData.widgets.particles.enabled = (subCmd === 'on') ? 'true' : 'false';
                        changed = true;
                    } else if (args.length >= 5) {
                        globalConfigData.widgets.particles.count = parseInt(args[1]);
                        globalConfigData.widgets.particles.distance = parseInt(args[2]);
                        globalConfigData.widgets.particles.speed = parseFloat(args[3]);
                        globalConfigData.widgets.particles.color = args[4];
                        changed = true;
                    }
                    
                    if (changed) globalWs.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfigData }));
                }
            }
        }
    });
    
    await currentClient.connect();
}

function connectWS() {
    globalWs = new WebSocket('ws://localhost:42069');
    
    globalWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.event === 'CONFIG_UPDATED') {
                globalConfigData = message.data;
                initTMI(message.data);
                const pConf = message.data.widgets?.particles;
                if (pConf) AppParticles.init(pConf);
            }
        } catch (e) { console.error(e); }
    };
    
    globalWs.onclose = () => setTimeout(connectWS, 3000);
}

// Загрузка
fetch('http://localhost:42069/api/config')
    .then(res => res.json())
    .then(config => {
        globalConfigData = config;
        AppParticles.init(config.widgets?.particles || {});
        initTMI(config);
        connectWS();
    })
    .catch(() => {
        AppParticles.init({});
        connectWS();
    });