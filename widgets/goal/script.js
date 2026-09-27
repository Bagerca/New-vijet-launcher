import { icons } from '/js/utils/icons.js';

const GoalModule = {
  currentFollowers: -1,
  displayFollowers: 0, 
  animationFrameId: null,
  target: 200,
  title: "ФОЛЛОВЕРЫ:",
  channel: "",

  init: function() {
    document.getElementById('goal-icon').innerHTML = icons.target();
    this.fetchData();
    setInterval(() => this.fetchData(), 30000);
  },

  updateConfig: function(globalConfig) {
    if (globalConfig.twitchChannel) this.channel = globalConfig.twitchChannel;
    
    const goalConf = globalConfig.widgets?.goal || {};
    
    if (goalConf.goalTarget) this.target = parseInt(goalConf.goalTarget);
    if (goalConf.goalTitle) this.title = goalConf.goalTitle;
    
    if (goalConf.goalColor) {
      document.getElementById('goal-container').style.setProperty('--goal-color', goalConf.goalColor);
    }

    document.getElementById('goal-title-el').textContent = this.title;
    document.getElementById('goal-max').textContent = this.target;

    if (this.currentFollowers !== -1) {
      this.animateValue(this.currentFollowers, true);
    }
  },

  fetchData: async function() {
    if (!this.channel) return;
    try {
      const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${this.channel}`);
      if (!res.ok) return;
      const data = await res.json();
      
      if (data && data.length > 0) {
        const followers = data[0].followers || 0;
        if (followers !== this.currentFollowers) {
          this.animateValue(followers);
        }
      }
    } catch (err) { 
      console.warn("[Goal] Не удалось обновить фолловеров."); 
    }
  },

  animateValue: function(targetValue, forceUpdate = false) {
    const elCurrent = document.getElementById('goal-current');
    const elBar = document.getElementById('goal-bar-fill');
    const elIcon = document.getElementById('goal-icon');
    const maxTarget = this.target;
    const container = document.getElementById('goal-container');

    const isFirstLoad = this.currentFollowers === -1 || forceUpdate;
    this.currentFollowers = targetValue;

    let percent = Math.min((targetValue / maxTarget) * 100, 100);
    elBar.style.width = `${percent}%`;

    if (targetValue >= maxTarget) container.classList.add('goal-completed');
    else container.classList.remove('goal-completed');

    if (!isFirstLoad && this.displayFollowers < targetValue) {
      elIcon.classList.remove('icon-beat');
      void elIcon.offsetWidth; 
      elIcon.classList.add('icon-beat');
    }

    const startValue = this.displayFollowers;
    const diff = Math.abs(targetValue - startValue);
    const duration = diff <= 1 ? 400 : Math.min(1500, Math.max(600, diff * 50));
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      this.displayFollowers = Math.floor(startValue + (targetValue - startValue) * easeOut);
      elCurrent.innerText = this.displayFollowers;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        elCurrent.innerText = targetValue;
        this.displayFollowers = targetValue;
        if (!isFirstLoad && diff > 0) {
          elCurrent.classList.add('pop-text');
          setTimeout(() => elCurrent.classList.remove('pop-text'), 300);
        }
      }
    };

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(updateCounter);
  }
};

function connectWS() {
  const ws = new WebSocket('ws://localhost:42069');
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'CONFIG_UPDATED') {
        GoalModule.updateConfig(message.data);
      }
    } catch (e) { }
  };
  ws.onclose = () => setTimeout(connectWS, 3000);
}

fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
    GoalModule.updateConfig(config);
    GoalModule.init();
    connectWS();
  })
  .catch(() => {
    GoalModule.init();
    connectWS();
  });