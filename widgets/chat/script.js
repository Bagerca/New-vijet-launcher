import { widgetsManifest } from '../../data/widgetsManifest.js';
import { AvatarManager } from '../shared/AvatarManager.js';
import { WidgetCore } from '../shared/WidgetCore.js';

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
    
    if (data.isFirstTime) stateClasses += ' is-first-time';
    if (data.isHighlighted) stateClasses += ' is-highlighted';
    if (data.reply) stateClasses += ' has-reply'; 

    const blockDiv = document.createElement('div');
    blockDiv.id = data.id; 
    blockDiv.className = `chat-block${stateClasses}`;
    blockDiv.setAttribute('data-style', 'default');
    blockDiv.setAttribute('data-user', data.user.toLowerCase());
    
    blockDiv.style.setProperty('--user-color', data.color);
    blockDiv.style.setProperty('--avatar-img', `url('${data.avatarUrl}')`);
    blockDiv.style.willChange = 'transform, opacity';

    let replyHtml = '';
    if (data.reply) {
      replyHtml = `
        <div class="chat-reply">
          <div class="chat-reply-user">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
            Отвечает ${data.reply.user}
          </div>
          <div class="chat-reply-text">${data.reply.htmlText}</div>
        </div>
      `;
    }

    blockDiv.innerHTML = `
      <div class="chat-fx-backdrop"></div>
      <div class="chat-bubble">
        <div class="chat-bubble-bg"></div>
        
        <div class="chat-bubble-inner">
          ${replyHtml}
          
          <div class="chat-main-row">
            <div class="chat-avatar-slot">
              <div class="chat-avatar"></div>
            </div>
            <div class="chat-content">
              <div class="chat-header">
                <div class="chat-header-info">
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

const commandMap = {};
widgetsManifest.forEach(w => w.controls.forEach(c => { 
  if (c.cmd) commandMap[c.cmd.toLowerCase()] = { widgetId: w.id, key: c.key, type: c.type }; 
}));

// ==========================================
// ПОДКЛЮЧЕНИЕ ЯДРА WIDGET CORE
// ==========================================
WidgetCore.init({
  onConfigUpdate: (config) => {
    applyChatStyles(config.widgets?.chat);
  },

  onTwitchCommand: (cmd, args) => {
    const rawValue = args.join(' ').trim();
    
    if (cmd === '!media' || cmd === '!медиа') {
      const arg = args[0];
      if (arg) {
         let newMediaConf = { ...(WidgetCore.globalConfig.widgets.media || {}) };
         let changed = false;

         if (arg === 'on' || arg === 'show') {
             newMediaConf.isActive = true; changed = true;
         } else if (arg === 'off' || arg === 'hide') {
             newMediaConf.isActive = false; changed = true;
         } else if (arg.includes('youtu.be') || arg.includes('youtube.com')) {
             newMediaConf.isActive = true; newMediaConf.ytLink = arg; changed = true;
         } else {
             newMediaConf.isActive = true; newMediaConf.libId = arg.toLowerCase(); newMediaConf.ytLink = ""; changed = true;
         }

         if (changed) {
             WidgetCore.updateWidgetConfig('media', newMediaConf);
             AppChat.renderSystemMessage(`✅ Карточка медиа обновлена!`);
         }
      }
    }
    else if (commandMap[cmd] && rawValue !== '') {
      const { widgetId, key, type } = commandMap[cmd];
      let finalValue = rawValue;

      if (type === 'checkbox') {
        const lower = rawValue.toLowerCase();
        finalValue = (lower === 'on' || lower === 'true' || lower === '1');
      } else if (type === 'number' || type === 'range') {
        finalValue = Number(rawValue);
        if (isNaN(finalValue)) {
            AppChat.renderSystemMessage(`❌ Ошибка: ожидалось число для ${cmd}`, true);
            return;
        }
      }

      WidgetCore.updateWidgetConfig(widgetId, { [key]: finalValue });
      AppChat.renderSystemMessage(`✅ Команда ${cmd} применена!`);
    }
  },

  onTwitchMessage: (tags, message) => {
    const user = tags['display-name'] || tags.username;
    const userColor = tags.color || '#9146FF';
    const msgId = tags.id || ('chat-' + Date.now());
    
    let cleanMessage = message.trim();
    let replyData = null;

    if (tags['reply-parent-msg-id']) {
      const replyUser = tags['reply-parent-display-name'] || tags['reply-parent-user-login'];
      let replyBodyRaw = (tags['reply-parent-msg-body'] || '').replace(/\\s/g, ' ');

      const mention1 = `@${replyUser}`;
      const mention2 = `@${tags['reply-parent-user-login']}`;
      
      if (cleanMessage.toLowerCase().startsWith(mention1.toLowerCase())) cleanMessage = cleanMessage.substring(mention1.length).trim();
      else if (cleanMessage.toLowerCase().startsWith(mention2.toLowerCase())) cleanMessage = cleanMessage.substring(mention2.length).trim();

      replyBodyRaw = replyBodyRaw.replace(/^@[a-zA-Z0-9_]+\s+/, '').trim();

      replyData = { user: replyUser, htmlText: WidgetCore.parseMessageToHTML(replyBodyRaw, null) };
    }

    const htmlText = WidgetCore.parseMessageToHTML(cleanMessage, tags.emotes);
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
      reply: replyData
    });

    AvatarManager.get(user, userColor).then(realAvatar => {
      AppChat.updateAvatar(msgId, realAvatar);
    }).catch(() => {});
  }
});