/* ФАЙЛ: widgets/chat/dashboard/template.js — v3 (+ режим ширины бабла: по тексту / фиксированная) */
import {
normalizeChatConfig, CHAT_LIMITS, CHAT_FONTS, CHAT_ANIMATIONS, CHAT_REPLY_STYLES,
CHAT_BADGE_STYLES, CHAT_AVATAR_SHAPES, CHAT_ALLOW_MODES, CHAT_DIRECTIONS, CHAT_ACCENT_MODES,
CHAT_IMAGE_FITS, CHAT_WIDTH_MODES
} from '../config.js';
import { listSkins, getSkin } from '../skins.js';
import { ic, esc, unitFor, COMMANDS, PRESETS, EMOTE_CHIPS } from './constants.js';
function slider(key, label, value) {
const [min, max] = CHAT_LIMITS[key];
const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
return `
<div class="cd-slider">
<span class="cd-slider-name">${esc(label)}</span>
<input type="range" data-cd-key="${key}" data-cd-type="number" min="${min}" max="${max}" step="1" value="${value}" style="--range-fill:${fill.toFixed(2)}%;" aria-label="${esc(label)}">
<span class="cd-slider-val" data-cd-val="${key}">${value}${unitFor(key)}</span>
</div>`;
}
function toggle(key, label, on) {
return `
<label class="cd-toggle">
<span>${esc(label)}</span>
<input type="checkbox" data-cd-key="${key}" data-cd-type="bool" ${on ? 'checked' : ''}>
<div class="cd-track"></div>
</label>`;
}
function seg(key, options, current, label) {
return `
<div class="cd-seg" role="group" aria-label="${esc(label)}">
${options.map(o => `<button class="cd-seg-btn ${o.id === current ? 'is-active' : ''}" type="button" data-cd-set="${key}" data-cd-value="${o.id}" aria-pressed="${o.id === current}">${esc(o.label)}</button>`).join('')}
</div>`;
}
function selectRow(key, label, options, current) {
return `
<label class="cd-field-inline">
<span>${esc(label)}</span>
<select class="cd-select" data-cd-key="${key}" data-cd-type="string">
${options.map(o => `<option value="${o.id}" ${o.id === current ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
</select>
</label>`;
}
export function renderTemplate(state, params) {
const c = normalizeChatConfig(state.config.widgets.chat);
const skin = getSkin(c.skin);
const view = params?.view === 'scene' ? 'scene' : 'focus';
const chips = COMMANDS.map(i => `
<button class="cd-chip" type="button" data-cd-act="copy" data-arg="${esc(i.copy)}" title="${esc(i.title)}">
<span class="cd-chip-ic">${ic('copy')}</span><code>${esc(i.cmd)}</code>
</button>`).join('');
const presets = PRESETS.map(p => `<button class="cd-preset" type="button" data-cd-act="preset" data-arg="${p.id}">${esc(p.label)}</button>`).join('');
const emotes = EMOTE_CHIPS.map(e => `<button class="cd-emote-chip" type="button" data-cd-act="emote" data-arg="${e}">${e}</button>`).join('');
const skinOpts = listSkins().map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('');
return `
<div class="cd-main" id="cd-main">
<section class="cd-card card">
<header class="cd-head">
<div class="cd-head-left">
<h3 class="cd-title">${ic('twitch')} Чат Twitch</h3>
<span class="cd-badge" id="cd-badge-server">СЕРВЕР</span>
<span class="cd-badge" id="cd-badge-state">НА ЭКРАНЕ</span>
<span class="cd-badge" id="cd-badge-source">СИГНАЛ</span>
<span class="cd-badge" id="cd-badge-count">0 В КАДРЕ</span>
</div>
<div class="cd-head-right">
<div class="cd-seg cd-seg-sm" role="group" aria-label="Режим стенда">
<button class="cd-seg-btn ${view === 'focus' ? 'is-active' : ''}" type="button" data-cd-act="view" data-arg="focus">${ic('search')} Крупно</button>
<button class="cd-seg-btn ${view === 'scene' ? 'is-active' : ''}" type="button" data-cd-act="view" data-arg="scene">${ic('monitor')} Сцена</button>
</div>
<label class="cd-toggle cd-toggle-head" title="Мастер-выключатель чата">
<span>ЧАТ ВКЛ.</span>
<input type="checkbox" data-cd-key="isActive" data-cd-type="bool" ${c.isActive ? 'checked' : ''}>
<div class="cd-track"></div>
</label>
<button class="cd-icon-btn" type="button" data-cd-act="refresh" title="Перезапустить превью" aria-label="Перезапустить превью">${ic('sync')}</button>
</div>
</header>
<div class="cd-stage" id="cd-stage" data-view="${view}">
<div class="cd-stage-inner" id="cd-stage-inner">
<div class="cd-mock">
<div class="cd-mock-grid"></div>
<div class="cd-mock-cam"><span>CAM</span></div>
<div class="cd-mock-game"><span>ИГРОВОЙ ЗАХВАТ</span></div>
<div class="cd-mock-bar"></div>
<div class="cd-mock-slot"><span>ЧАТ · 540 × 1040</span></div>
</div>
<div class="cd-frame-host" id="cd-frame-host"></div>
</div>
<div class="cd-stage-loading" id="cd-stage-loading"><div class="cd-spinner"></div><span>Загружаю виджет…</span></div>
<div class="cd-stage-off is-hidden" id="cd-stage-off">
<div class="cd-stage-off-icon">${ic('noSignal')}</div>
<div class="cd-stage-off-title">Чат скрыт</div>
<div class="cd-stage-off-sub">Сообщения обрабатываются и попадают в журнал, но на стриме чат не показывается.</div>
<button class="cd-btn cd-btn-primary" type="button" data-cd-act="show">${ic('power')} Показать на экране</button>
</div>
<div class="cd-stage-hud">
<span class="cd-hud-chip" id="cd-hud-skin">${esc(skin.title)}</span>
<span class="cd-hud-chip is-warn is-hidden" id="cd-hud-pause">ПАУЗА</span>
</div>
</div>
<div class="cd-now" id="cd-now">
<div class="cd-now-skin">
<span class="cd-now-skin-ic">${ic('palette')}</span>
<span class="cd-now-skin-body">
<span class="cd-now-label">Активный скин</span>
<span class="cd-now-title" id="cd-now-skin-title">${esc(skin.title)}</span>
</span>
</div>
<div class="cd-now-last">
<span class="cd-now-label">Последнее сообщение</span>
<span class="cd-now-text"><b id="cd-now-user">—</b><span id="cd-now-text">ждём сигнал из виджета</span></span>
</div>
<div class="cd-now-stats">
<div class="cd-stat"><span class="cd-stat-val" id="cd-stat-msg">0</span><span class="cd-stat-name">в кадре</span></div>
<div class="cd-stat"><span class="cd-stat-val" id="cd-stat-uniq">0</span><span class="cd-stat-name">зрителей</span></div>
<div class="cd-stat"><span class="cd-stat-val" id="cd-stat-emote">0</span><span class="cd-stat-name">смайлов</span></div>
</div>
</div>
</section>
<div class="cd-grid">
<div class="cd-col">
<section class="cd-panel">
<div class="cd-panel-head">
<span class="cd-label">Скин бабла</span>
<span class="cd-note">Скелет один, скин меняется целиком. Персональные баблы из реестра — в списке ниже.</span>
</div>
<div class="cd-skin-grid" id="cd-skin-grid"></div>
<div class="cd-block">
<span class="cd-label">Акцент</span>
${seg('accentMode', CHAT_ACCENT_MODES, c.accentMode, 'Источник акцента')}
<div class="cd-color-row" id="cd-accent-row">
<span>Свой акцент</span>
<span class="cd-hex" id="cd-accent-hex">${esc(c.accentColor)}</span>
<input type="color" class="cd-color" data-cd-key="accentColor" data-cd-type="string" value="${esc(c.accentColor)}" aria-label="Свой акцент">
</div>
</div>
<div class="cd-block">
<div class="cd-block-head">
<span class="cd-label">Персональные баблы</span>
<span class="cd-note">Скин + личный акцент для конкретного зрителя.</span>
</div>
<div class="cd-us-list" id="cd-us-list"></div>
<div class="cd-us-empty" id="cd-us-empty">Пока никому не назначен личный бабл.</div>
<div class="cd-us-add">
<input type="text" class="cd-input" id="cd-us-nick" placeholder="Ник зрителя" maxlength="28" aria-label="Ник зрителя">
<select class="cd-select" id="cd-us-skin" aria-label="Скин для зрителя">${skinOpts}</select>
<button class="cd-btn cd-btn-primary" type="button" data-cd-act="us-add">${ic('plus')} Назначить</button>
</div>
<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
<label class="cd-check" title="Личный акцент поверх скина"><input type="checkbox" id="cd-us-accent-on"><span>Акцент</span></label>
<input type="color" class="cd-color" id="cd-us-accent" value="#ff4d85" aria-label="Личный акцент зрителя">
<span class="cd-note">Выключено = цвет ника / общий акцент.</span>
</div>
</div>
</section>
<section class="cd-panel">
<div class="cd-panel-head">
<span class="cd-label">Фото из чата</span>
<span class="cd-note">Расширения вроде img.hishi.icu отправляют ссылку — виджет сам покажет картинку в бабле.</span>
</div>
${toggle('showImages', 'Показывать фото в баблах', c.showImages)}
${slider('imageMaxHeight', 'Высота фото', c.imageMaxHeight)}
${selectRow('imageFit', 'Кадрирование', CHAT_IMAGE_FITS, c.imageFit)}
${toggle('imageAllHosts', 'Прямые ссылки (.png/.jpg/.gif) с любых хостов', c.imageAllHosts)}
<label class="cd-field">
<span class="cd-field-label">Доверенные хосты фото (через запятую)</span>
<textarea class="cd-textarea" data-cd-key="imageHosts" data-cd-type="string" rows="3" placeholder="img.hishi.icu, i.imgur.com">${esc(c.imageHosts)}</textarea>
</label>
<div class="cd-note">Если ссылка не загрузилась, бабл покажет аккуратную заглушку с именем хоста — чат не ломается. Пресеты «Фото» и «Фото+текст» справа проверяют сценарий.</div>
</section>
<section class="cd-panel">
<div class="cd-panel-head">
<span class="cd-label">Геометрия и типографика</span>
<span class="cd-note">Аватар масштабируется от ника — соотношение держится само.</span>
</div>
${slider('avatarScale', 'Аватар (% от ника)', c.avatarScale)}
${slider('nickSize', 'Ник', c.nickSize)}
${slider('fontSize', 'Текст', c.fontSize)}
${slider('lineHeight', 'Интерлиньяж', c.lineHeight)}
${slider('padding', 'Отступ внутри', c.padding)}
${slider('radius', 'Скругление', c.radius)}
${slider('gap', 'Зазор сообщений', c.gap)}
<div class="cd-block">
<span class="cd-label">Режим ширины</span>
${seg('widthMode', CHAT_WIDTH_MODES, c.widthMode, 'Режим ширины бабла')}
<div class="cd-note">«По тексту» — короткий бабл для короткого сообщения, ползунок ниже задаёт потолок. «Фиксированная» — все баблы одной ширины. Фото и скин «Минимал» всегда на полную ширину.</div>
</div>
${slider('width', 'Ширина бабла', c.width)}
${slider('borderWidth', 'Толщина рамки', c.borderWidth)}
${slider('blur', 'Размытие фона', c.blur)}
${slider('shadow', 'Сила тени', c.shadow)}
${slider('emoteScale', 'Размер смайлов', c.emoteScale)}
<div class="cd-row2">
${selectRow('avatarShape', 'Форма аватара', CHAT_AVATAR_SHAPES, c.avatarShape)}
${selectRow('font', 'Шрифт', CHAT_FONTS, c.font)}
</div>
<div class="cd-row2">
${toggle('showAvatars', 'Аватарки', c.showAvatars)}
${toggle('uppercaseNick', 'Ник капсом', c.uppercaseNick)}
</div>
<div class="cd-block">
<span class="cd-label">Палитра бабла</span>
<div class="cd-color-row" data-cd-bg-row>
<span>Цвет фона</span>
<span class="cd-hex" id="cd-bg-hex">${esc(c.bgColor)}</span>
<input type="color" class="cd-color" data-cd-key="bgColor" data-cd-type="string" value="${esc(c.bgColor)}" aria-label="Цвет фона">
</div>
${slider('bgOpacity', 'Плотность фона', c.bgOpacity)}
<div class="cd-color-row" data-cd-bg-row>
<span>Цвет текста</span>
<span class="cd-hex" id="cd-text-hex">${esc(c.textColor)}</span>
<input type="color" class="cd-color" data-cd-key="textColor" data-cd-type="string" value="${esc(c.textColor)}" aria-label="Цвет текста">
</div>
<div class="cd-note" id="cd-palette-note"></div>
</div>
<div class="cd-actions">
<button class="cd-btn cd-btn-ghost" type="button" data-cd-act="random">${ic('shuffle')} Случайный стиль</button>
<button class="cd-btn cd-btn-ghost" type="button" data-cd-act="export">${ic('copy')} Скопировать JSON</button>
<button class="cd-btn cd-btn-danger" type="button" data-cd-act="reset">${ic('trash')} Сбросить виджет</button>
</div>
</section>
<section class="cd-panel">
<div class="cd-panel-head">
<span class="cd-label">Поведение и фильтры</span>
<span class="cd-note">Применяется на лету — в превью и в OBS.</span>
</div>
${slider('messageLife', 'Время жизни (0 — всегда)', c.messageLife)}
${slider('maxMessages', 'Сообщений в кадре', c.maxMessages)}
<div class="cd-block"><span class="cd-label">Анимация появления</span>${seg('animation', CHAT_ANIMATIONS, c.animation, 'Анимация')}</div>
<div class="cd-block"><span class="cd-label">Направление ленты</span>${seg('direction', CHAT_DIRECTIONS, c.direction, 'Направление')}</div>
<div class="cd-block"><span class="cd-label">Оформление ответа</span>${seg('replyStyle', CHAT_REPLY_STYLES, c.replyStyle, 'Ответ')}</div>
<div class="cd-block"><span class="cd-label">Бейджи</span>${seg('badgeStyle', CHAT_BADGE_STYLES, c.badgeStyle, 'Бейджи')}</div>
<div class="cd-row2">
${toggle('showBadges', 'Бейджи', c.showBadges)}
${toggle('showTimestamps', 'Время', c.showTimestamps)}
</div>
<div class="cd-row2">
${toggle('showReplies', 'Ответы', c.showReplies)}
${toggle('fadeMask', 'Растворение сверху', c.fadeMask)}
</div>
${toggle('hideCommands', 'Прятать команды (!play, !sr…)', c.hideCommands)}
${selectRow('allowMode', 'Кто попадает в чат', CHAT_ALLOW_MODES, c.allowMode)}
<label class="cd-field">
<span class="cd-field-label">Игнор-лист ников (через запятую)</span>
<textarea class="cd-textarea" data-cd-key="blockedUsers" data-cd-type="string" rows="2" placeholder="moobot, nightbot">${esc(c.blockedUsers)}</textarea>
</label>
<label class="cd-field">
<span class="cd-field-label">Бан-слова (через запятую)</span>
<textarea class="cd-textarea" data-cd-key="blockedWords" data-cd-type="string" rows="2" placeholder="спам, реклама">${esc(c.blockedWords)}</textarea>
</label>
<div class="cd-cmds">
<div class="cd-cmds-head">${ic('twitch')} <span>Команды чата для модераторов — клик копирует</span></div>
<div class="cd-chips">${chips}</div>
</div>
</section>
</div>
<div class="cd-col cd-col-side">
<section class="cd-panel cd-composer">
<div class="cd-panel-head">
<span class="cd-label">Лаборатория сообщений</span>
<span class="cd-note">Уходит в настоящий виджет — и в превью, и в OBS.</span>
</div>
<div class="cd-presets">${presets}</div>
<div class="cd-row2">
<input type="text" class="cd-input" id="cd-c-nick" value="zloy_kot" maxlength="28" placeholder="Ник" aria-label="Ник автора">
<div class="cd-color-mini">
<input type="color" class="cd-color" id="cd-c-color" value="#00e5ff" aria-label="Цвет ника">
<button class="cd-mini-btn" type="button" data-cd-act="randcolor" title="Случайный цвет">${ic('shuffle')}</button>
</div>
</div>
<textarea class="cd-textarea" id="cd-c-text" rows="3" placeholder="Текст сообщения. Смайлы: Kappa, LUL… Фото: ссылка img.hishi.icu / .png / .jpg" aria-label="Текст сообщения">привет, го катку Kappa</textarea>
<div class="cd-emote-chips">${emotes}</div>
<div class="cd-checks">
<label class="cd-check"><input type="checkbox" id="cd-c-mod"><span>MOD</span></label>
<label class="cd-check"><input type="checkbox" id="cd-c-sub"><span>SUB</span></label>
<label class="cd-check"><input type="checkbox" id="cd-c-vip"><span>VIP</span></label>
<label class="cd-check"><input type="checkbox" id="cd-c-first"><span>Первое</span></label>
<label class="cd-check"><input type="checkbox" id="cd-c-highlight"><span>Хайлайт</span></label>
<label class="cd-check"><input type="checkbox" id="cd-c-reply"><span>Ответ</span></label>
</div>
<div class="cd-reply-fields is-hidden" id="cd-reply-fields">
<input type="text" class="cd-input" id="cd-c-reply-user" value="ksusha__sher" maxlength="28" placeholder="Кому отвечаем" aria-label="Автор исходного">
<input type="text" class="cd-input" id="cd-c-reply-text" value="го катку сегодня?" maxlength="120" placeholder="Текст исходного" aria-label="Текст исходного">
</div>
<div class="cd-composer-actions">
<button class="cd-btn cd-btn-primary cd-grow" type="button" data-cd-act="send">${ic('play')} Отправить</button>
<button class="cd-btn cd-btn-ghost" type="button" data-cd-act="burst" title="Восемь сообщений подряд">${ic('queue')} Шторм ×8</button>
</div>
<div class="cd-row2">
<button class="cd-btn cd-btn-ghost" type="button" data-cd-act="pause" id="cd-c-pause">${ic('pause')} Пауза потока</button>
<button class="cd-btn cd-btn-danger" type="button" data-cd-act="clear">${ic('trash')} Очистить чат</button>
</div>
<div class="cd-note">Ctrl + Enter в поле текста — быстрая отправка.</div>
</section>
<section class="cd-log-panel">
<header class="cd-log-head">
<div class="cd-log-top">
<span>Живой журнал</span>
<span class="cd-badge" id="cd-log-count">0</span>
</div>
<div class="cd-log-stats">
<div class="cd-stat"><span class="cd-stat-val" id="cd-lstat-total">0</span><span class="cd-stat-name">всего</span></div>
<div class="cd-stat"><span class="cd-stat-val" id="cd-lstat-uniq">0</span><span class="cd-stat-name">ников</span></div>
<div class="cd-stat"><span class="cd-stat-val" id="cd-lstat-emote">0</span><span class="cd-stat-name">смайлов</span></div>
<div class="cd-stat"><span class="cd-stat-val" id="cd-lstat-drop">0</span><span class="cd-stat-name">отсев</span></div>
</div>
</header>
<div class="cd-log-scroll" id="cd-log-scroll">
<div class="cd-log" id="cd-log"></div>
<div class="cd-log-empty" id="cd-log-empty">
${ic('twitch')}
<div class="cd-log-empty-title">Журнал пуст</div>
<div class="cd-log-empty-sub">Отправьте тестовое сообщение или дождитесь чата — здесь появятся авторы, скины и причины отсева.</div>
</div>
</div>
<footer class="cd-log-foot">
<span class="cd-log-note">Локально, последние 80 записей.</span>
<div class="cd-log-btns">
<button class="cd-mini-btn" type="button" data-cd-act="log-pause" id="cd-log-pause" title="Приостановить запись">${ic('pause')}</button>
<button class="cd-mini-btn is-danger" type="button" data-cd-act="log-clear" id="cd-log-clear" title="Очистить журнал">${ic('trash')}</button>
</div>
</footer>
</section>
</div>
</div>
<div class="cd-toasts" id="cd-toasts"></div>
</div>`;
}