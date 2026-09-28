/* ФАЙЛ: widgets/chat/script.js */

import { widgetsManifest } from '../../data/widgetsManifest.js';
import { AvatarManager } from '../shared/AvatarManager.js';

const AppChat = {
  container: document.getElementById('chat-messages'),
  maxMessages: 15,

  renderSystemMessage: function(text, isError = false) {
    const block = document.createElement('div');
    block.className = `chat-block`;
    block.innerHTML = `<div class="message-system ${isError ? 'error' : ''}">🔧 ${text}</div>`;
    this._appendAndCleanup(block);
  },

  updateAvatar: function(id, avatarUrl) {
    const msgBlock = document.getElementById(id);
    if (msgBlock) msgBlock.style.setProperty('--avatar-img', `url('${avatarUrl}')`);
  },

  renderMessage: function(data) {
    let stateClasses = ''; 
    let badgesHTML = '';
    
    if (data.isFirstTime) stateClasses += ' is-first-time';
    if (data.isHighlighted) stateClasses += ' is-highlighted';

    const blockDiv = document.createElement('div');
    blockDiv.id = data.id; 
    blockDiv.className = `chat-block${stateClasses}`;
    blockDiv.setAttribute('data-style', data.styleName ? data.styleName : 'default');
    blockDiv.setAttribute('data-user', data.user.toLowerCase());
    
    blockDiv.style.setProperty('--user-color', data.color);
    blockDiv.style.setProperty('--avatar-img', `url('${data.avatarUrl}')`);
    blockDiv.style.willChange = 'transform, opacity';

    blockDiv.innerHTML = `
      <div class="chat-fx-backdrop"></div>
      <div class="chat-bubble">
        <div class="chat-bubble-bg"></div>
        <div class="chat-avatar-slot">
          <div class="chat-avatar"></div>
        </div>
        <div class="chat-content">
          <div class="chat-header">
            <div class="chat-header-info">
              ${badgesHTML ? `<div class="chat-badges-wrap">${badgesHTML}</div>` : ''}
              <span class="chat-user">${data.user}</span>
            </div>
            <div class="chat-header-right">
              <span class="chat-time">${data.time}</span>
            </div>
          </div>
          <div class="chat-text">
            <div class="chat-text-inner">${data.htmlText}</div>
          </div>
        </div>
      </div>
      <div class="chat-fx-front"></div>
    `;
    
    this._appendAndCleanup(blockDiv);
  },

  _appendAndCleanup: function(blockEl) {
    this.container.appendChild(blockEl);
    
    const activeMessages = Array.from(this.container.querySelectorAll('.chat-block:not(.chat-out)'));
    if (activeMessages.length > this.maxMessages) {
      const excessCount = activeMessages.length - this.maxMessages;
      for (let i = 0; i < excessCount; i++) {
        const msgToHide = activeMessages[i];
        msgToHide.classList.add('chat-out');
        msgToHide.addEventListener('animationend', (e) => {
          if (e.animationName === 'slideOutChat') {
            msgToHide.style.setProperty('--avatar-img', 'none'); 
            msgToHide.remove();
          }
        }, { once: true });
      }
    }
  }
};

let currentClient = null, currentChannel = null, globalConfig = null, ws = null;
const commandMap = {};

widgetsManifest.forEach(w => w.controls.forEach(c => { 
  if (c.cmd) commandMap[c.cmd.toLowerCase()] = { widgetId: w.id, key: c.key }; 
}));

function hexToRgba(hex, opacityPercentage) {
    let h = (hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substring(0, 2), 16) || 255;
    const g = parseInt(h.substring(2, 4), 16) || 255;
    const b = parseInt(h.substring(4, 6), 16) || 255;
    const a = (opacityPercentage !== undefined ? opacityPercentage : 95) / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function applyChatStyles(chatConfig) {
  if (!chatConfig) return;
  const finalBgColor = hexToRgba(chatConfig.bgColor, chatConfig.bgOpacity);
  document.documentElement.style.setProperty('--chat-bg-color', finalBgColor);
  if (chatConfig.textColor) document.documentElement.style.setProperty('--chat-text-color', chatConfig.textColor);
  if (chatConfig.fontSize) document.documentElement.style.setProperty('--chat-font-size', `${chatConfig.fontSize}px`);
}

function parseEmotes(text, emotes) {
  if (!emotes) return text;
  const stringReplacements = [];
  Object.entries(emotes).forEach(([id, positions]) => {
    const position = positions[0];
    const [start, end] = position.split("-").map(Number);
    const emoteName = text.substring(start, end + 1);
    stringReplacements.push({
      stringToReplace: emoteName,
      replacement: `<img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0" alt="${emoteName}">`
    });
  });
  return stringReplacements.reduce((acc, { stringToReplace, replacement }) => {
    return acc.split(stringToReplace).join(replacement);
  }, text);
}

async function init() {
  try {
    globalConfig = await (await fetch('http://localhost:42069/api/config')).json();
    applyChatStyles(globalConfig.widgets?.chat);
    
    currentChannel = globalConfig.twitchChannel || 'ksusha__sher';
    let channel = currentChannel.replace(/[@#]/g, '').trim().toLowerCase();
    AppChat.renderSystemMessage(`Подключение к чату: ${channel}...`);

    currentClient = new tmi.Client({ connection: { reconnect: true, secure: true }, channels: [channel] });
    currentClient.on('connected', () => AppChat.renderSystemMessage(`Успешно подключено!`, false));
    
    currentClient.on('message', (channel, tags, message) => {
      const isMod = tags.mod || (tags.badges && tags.badges.broadcaster === '1');
      if (isMod && message.startsWith('!')) {
        const args = message.trim().split(' ');
        const cmd = args[0].toLowerCase();
        const value = args.slice(1).join(' ');
        
        // ==== УМНЫЙ ПАРСЕР ДЛЯ ВИДЖЕТА MEDIA ====
        if (cmd === '!media' || cmd === '!медиа') {
          const arg = args[1];
          if (arg) {
             let newMediaConf = { ...(globalConfig.widgets.media || {}) };
             let changed = false;

             if (arg === 'on' || arg === 'show') {
                 newMediaConf.isActive = true;
                 changed = true;
             } else if (arg === 'off' || arg === 'hide') {
                 newMediaConf.isActive = false;
                 changed = true;
             } else if (arg.includes('youtu.be') || arg.includes('youtube.com')) {
                 newMediaConf.isActive = true;
                 newMediaConf.ytLink = arg; // Вставляем ютуб
                 changed = true;
             } else {
                 newMediaConf.isActive = true;
                 newMediaConf.libId = arg.toLowerCase();
                 newMediaConf.ytLink = ""; // ОБЯЗАТЕЛЬНО очищаем ютуб, чтобы показалась библиотека
                 changed = true;
             }

             if (changed) {
                 if (!globalConfig.widgets) globalConfig.widgets = {};
                 globalConfig.widgets.media = newMediaConf;
                 if (ws && ws.readyState === WebSocket.OPEN) {
                     ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfig }));
                     AppChat.renderSystemMessage(`Карточка медиа обновлена!`);
                 }
             }
          }
        }
        // =========================================
        
        else if (commandMap[cmd] && value !== '') {
          const { widgetId, key } = commandMap[cmd];
          if (!globalConfig.widgets[widgetId]) globalConfig.widgets[widgetId] = {};
          globalConfig.widgets[widgetId][key] = value;
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'UPDATE_CONFIG', data: globalConfig }));
            AppChat.renderSystemMessage(`Команда ${cmd} применена!`);
          }
        }
      }

      const user = tags['display-name'] || tags.username;
      const userColor = tags.color || '#9146FF';
      const msgId = tags.id || ('chat-' + Date.now());
      const htmlText = parseEmotes(message, tags.emotes);
      
      const hexColor = userColor.replace('#', '');
      const fallbackAvatar = `https://ui-avatars.com/api/?name=${user}&background=${hexColor}&color=fff&size=64&bold=true`;

      AppChat.renderMessage({
        id: msgId,
        user: user,
        color: userColor,
        avatarUrl: fallbackAvatar,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        htmlText: htmlText,
        isFirstTime: tags['first-msg'] === '1',
        isHighlighted: tags['msg-id'] === 'highlighted-message',
        styleName: 'default' 
      });

      AvatarManager.get(user, userColor).then(realAvatar => {
        AppChat.updateAvatar(msgId, realAvatar);
      }).catch(() => {});
    });
    
    await currentClient.connect();
  } catch (error) { 
    AppChat.renderSystemMessage(`Ошибка: ${error.message}`, true); 
  }
}

function setupWS() {
  ws = new WebSocket('ws://localhost:42069');
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === 'CONFIG_UPDATED') {
        globalConfig = msg.data;
        applyChatStyles(msg.data.widgets?.chat);
        
        if (currentChannel !== null && msg.data.twitchChannel !== currentChannel) {
          currentChannel = msg.data.twitchChannel;
          AppChat.renderSystemMessage('Смена канала. Переподключение...');
          setTimeout(() => location.reload(), 1500);
        }
      }
    } catch (e) {}
  };
  ws.onclose = () => setTimeout(setupWS, 3000);
}

setupWS();
setTimeout(init, 300);