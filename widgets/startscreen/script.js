const line1 = document.getElementById('line1');
const line2 = document.getElementById('line2');
const line3 = document.getElementById('line3');
const timerEl = document.getElementById('starting-timer');

let countdownInterval = null;
let currentConfiguredMinutes = -1; 

function startTimer(minutes) {
  clearInterval(countdownInterval);
  let totalSeconds = parseInt(minutes) * 60;
  timerEl.classList.remove('timer-done');
  
  if (totalSeconds <= 0) {
    timerEl.textContent = "ПОГНАЛИ!";
    timerEl.classList.add('timer-done');
    return;
  }

  updateTimerDisplay(totalSeconds);
  countdownInterval = setInterval(() => {
    totalSeconds--;
    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);
      timerEl.textContent = "ПОГНАЛИ!";
      timerEl.classList.add('timer-done');
      return;
    }
    updateTimerDisplay(totalSeconds);
  }, 1000);
}

function updateTimerDisplay(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

function applyConfig(config) {
  if (!config || !config.widgets || !config.widgets.startscreen) return;
  const sConf = config.widgets.startscreen;

  if (sConf.text1 !== undefined) line1.textContent = sConf.text1;
  if (sConf.text2 !== undefined) line2.textContent = sConf.text2;
  if (sConf.text3 !== undefined) line3.textContent = sConf.text3;
  
  if (sConf.accentPink) document.documentElement.style.setProperty('--accent-pink', sConf.accentPink);
  if (sConf.accentGreen) document.documentElement.style.setProperty('--accent-green', sConf.accentGreen);

  const targetMinutes = sConf.timerMinutes !== undefined ? sConf.timerMinutes : 5;
  if (targetMinutes !== currentConfiguredMinutes) {
    currentConfiguredMinutes = targetMinutes;
    startTimer(targetMinutes);
  }
}

function connectWS() {
  const ws = new WebSocket('ws://localhost:42069');
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'CONFIG_UPDATED') applyConfig(message.data);
    } catch (e) { }
  };
  ws.onclose = () => setTimeout(connectWS, 3000);
}

fetch('http://localhost:42069/api/config')
  .then(res => res.json())
  .then(config => {
    applyConfig(config);
    connectWS();
  })
  .catch(() => {
    if (currentConfiguredMinutes === -1) {
      currentConfiguredMinutes = 5;
      startTimer(5);
    }
    connectWS();
  });