/* ФАЙЛ: widgets/alerts/dashboard/template.js — v3 (+ починка источника, реестр виджетов OBS) */
import {
ic, esc, typeIcon, normalizeAlertConfig, ALERT_LIMITS, ALERT_TYPES, POSITIONS,
LIVE_EVENTS, TARGETS, PRESETS, COMMANDS, alertsOf
} from './constants.js';

function slider(id, key, label, value, unit) {
const [min, max] = ALERT_LIMITS[key];
const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
return `
<div class="ad-slider" id="${id}-row">
<span class="ad-slider-name">${esc(label)}</span>
<input type="range" id="${id}" data-ad-key="${key}" min="${min}" max="${max}" step="1" value="${value}" style="--range-fill:${fill.toFixed(2)}%;" aria-label="${esc(label)}">
<span class="ad-slider-val" id="${id}-val">${value}${unit}</span>
</div>`;
}

export function renderTemplate(state) {
const c = normalizeAlertConfig(alertsOf(state));
const first = ALERT_TYPES[1] || ALERT_TYPES[0];
const types = ALERT_TYPES.map(t => `
<button class="ad-type ${t.id === first.id ? 'is-active' : ''}" type="button" data-ad-act="type" data-arg="${t.id}" style="--type-accent:${t.color}" title="${esc(t.label)} · звук ${esc(t.sound)}${t.live ? ' · приходит из чата автоматически' : ''}">
<span class="ad-type-ic">${typeIcon(t)}</span>
<span class="ad-type-label">${esc(t.label)}</span>
</button>`).join('');
const targets = TARGETS.map(t => `
<button class="ad-seg-btn ${t.id === 'preview' ? 'is-active' : ''}" type="button" data-ad-act="target" data-arg="${t.id}" aria-pressed="${t.id === 'preview'}" title="${esc(t.title)}">${esc(t.label)}</button>`).join('');
const positions = POSITIONS.map(p => `
<button class="ad-seg-btn ${p.id === c.position ? 'is-active' : ''}" type="button" data-ad-act="pos" data-arg="${p.id}" aria-pressed="${p.id === c.position}">${esc(p.label)}</button>`).join('');
const presets = PRESETS.map(p => `<button class="ad-preset" type="button" data-ad-act="preset" data-arg="${p.id}">${esc(p.label)}</button>`).join('');
const chips = COMMANDS.map(i => `
<button class="ad-chip" type="button" data-ad-act="copy" data-arg="${esc(i.copy)}" title="${esc(i.title)}">
<span class="ad-chip-ic">${ic('copy')}</span><code>${esc(i.cmd)}</code>
</button>`).join('');
const liveRows = LIVE_EVENTS.map(e => `<li><b>${esc(e.label)}</b> — ${esc(e.note)}</li>`).join('');

return `
<div class="ad-main" id="ad-main">
<section class="ad-card card">
<header class="ad-head">
<div class="ad-head-left">
<h3 class="ad-title">${ic('target')} Оповещения</h3>
<span class="ad-badge" id="ad-badge-server">СЕРВЕР</span>
<span class="ad-badge" id="ad-badge-state">НА ЭКРАНЕ</span>
<span class="ad-badge" id="ad-badge-source">СИГНАЛ</span>
<span class="ad-badge" id="ad-badge-queue">ОЧЕРЕДЬ 0</span>
</div>
<div class="ad-head-right">
<label class="ad-toggle ad-toggle-head" title="Мастер-выключатель: выключенные оповещения не показываются и не копятся">
<span>АЛЕРТЫ ВКЛ.</span>
<input type="checkbox" id="ad-master" data-ad-key="enabled" ${c.enabled ? 'checked' : ''}>
<div class="ad-track"></div>
</label>
<button class="ad-btn ad-btn-primary ad-btn-sm" type="button" data-ad-act="obs-fix" id="ad-obs-fix" title="Создать источник в OBS, добавить на все сцены, поднять наверх, включить видимость и сбросить кэш">${ic('plus')} Починить источник</button>
<button class="ad-btn ad-btn-ghost ad-btn-sm" type="button" data-ad-act="obs-refresh" id="ad-obs-refresh" title="Только перезагрузить кэш источника в OBS">${ic('sync')} Перезагрузить</button>
<button class="ad-icon-btn" type="button" data-ad-act="refresh" title="Перезапустить превью виджета" aria-label="Перезапустить превью">${ic('sync')}</button>
</div>
</header>
<div class="ad-diag" id="ad-diag">Проверяю связь…</div>
<div class="ad-roster" id="ad-roster"></div>
<div class="ad-stage" id="ad-stage">
<div class="ad-stage-inner" id="ad-stage-inner">
<div class="ad-mock">
<span class="ad-mock-grid"></span>
<span class="ad-mock-cam"><em>CAM</em></span>
<span class="ad-mock-game"><em>ИГРОВОЙ ЗАХВАТ</em></span>
<span class="ad-mock-bar"></span>
</div>
<div class="ad-slot" id="ad-slot" data-pos="${c.position}"><span>ALERTS · 1920 × 1080</span></div>
<div class="ad-frame-host" id="ad-frame-host"></div>
</div>
<div class="ad-stage-loading" id="ad-stage-loading"><div class="ad-spinner"></div><span>Загружаю виджет…</span></div>
<div class="ad-stage-off is-hidden" id="ad-stage-off">
<div class="ad-stage-off-icon">${ic('noSignal')}</div>
<div class="ad-stage-off-title">Оповещения выключены</div>
<div class="ad-stage-off-sub">События не показываются и не копятся в очередь. Настройки сохраняются.</div>
<button class="ad-btn ad-btn-primary" type="button" data-ad-act="show">${ic('power')} Показать на экране</button>
</div>
<div class="ad-stage-hud"><span class="ad-hud-chip" id="ad-hud-queue">ОЧЕРЕДЬ: 0</span></div>
</div>
<div class="ad-now" id="ad-now">
<span class="ad-now-ic" id="ad-now-ic">${typeIcon(first)}</span>
<span class="ad-now-body">
<span class="ad-now-label">Сейчас на экране</span>
<span class="ad-now-title" id="ad-now-title">Ничего не показывается</span>
<span class="ad-now-meta" id="ad-now-meta">Отправьте тест из лаборатории ниже</span>
</span>
<span class="ad-now-side">
<span class="ad-now-source" id="ad-now-source">НЕТ СИГНАЛА</span>
<span class="ad-now-btns">
<button class="ad-btn ad-btn-ghost ad-btn-sm" type="button" data-ad-act="skip" id="ad-skip">${ic('skip')} Пропустить</button>
<button class="ad-btn ad-btn-danger ad-btn-sm" type="button" data-ad-act="clear-queue" id="ad-clear-queue">${ic('trash')} Очистить очередь</button>
</span>
</span>
</div>
</section>

<div class="ad-grid">
<div class="ad-col">
<section class="ad-panel" id="ad-lab">
<div class="ad-panel-head">
<span class="ad-label">Лаборатория оповещений</span>
<span class="ad-note">«Отправить» — по выбранному адресату. «Тест в OBS» — сразу на стрим.</span>
</div>
<div class="ad-types" id="ad-types">${types}</div>
<div class="ad-presets">${presets}</div>
<div class="ad-row2">
<label class="ad-field">
<span class="ad-field-label">Автор</span>
<input type="text" class="ad-input" id="ad-lab-user" value="${esc(first.sample.user)}" maxlength="40" placeholder="Ник зрителя">
</label>
<label class="ad-field is-hidden" id="ad-lab-value-field">
<span class="ad-field-label" id="ad-lab-value-label">Значение</span>
<input type="number" class="ad-input" id="ad-lab-value" min="0" max="99999" step="1" value="${first.defaultValue}">
</label>
</div>
<label class="ad-field">
<span class="ad-field-label">Сообщение</span>
<input type="text" class="ad-input" id="ad-lab-message" value="${esc(first.sample.message)}" maxlength="160" placeholder="Текст под заголовком (можно пусто)">
</label>
<div class="ad-target">
<span class="ad-slider-name">Куда слать «Отправить»</span>
<div class="ad-seg" role="group" aria-label="Адресат теста">${targets}</div>
</div>
<div class="ad-lab-actions">
<button class="ad-btn ad-btn-primary ad-grow" type="button" data-ad-act="send">${ic('play')} Отправить</button>
<button class="ad-btn ad-btn-ghost" type="button" data-ad-act="send-obs" title="Отправить выбранный алерт прямо в OBS">${ic('obs')} Тест в OBS</button>
<button class="ad-btn ad-btn-ghost" type="button" data-ad-act="storm" title="Пять разных событий подряд">${ic('queue')} Шторм ×5</button>
</div>
<div class="ad-note" id="ad-lab-note">Звук: data/sounds/${esc(first.sound)} · Enter — быстрая отправка.</div>
</section>

<section class="ad-panel" id="ad-settings">
<div class="ad-panel-head">
<span class="ad-label">Оформление и поведение</span>
<span class="ad-note">Применяется на лету — в превью и в OBS.</span>
</div>
<label class="ad-toggle">
<span>Звук оповещений<em class="ad-toggle-note">файлы data/sounds/&lt;тип&gt;.mp3</em></span>
<input type="checkbox" id="ad-sound" data-ad-key="soundEnabled" ${c.soundEnabled ? 'checked' : ''}>
<div class="ad-track"></div>
</label>
${slider('ad-volume', 'volume', 'Громкость', c.volume, '%')}
${slider('ad-duration', 'duration', 'Длительность', c.duration, ' с')}
${slider('ad-scale', 'scale', 'Масштаб', c.scale, '%')}
<div class="ad-block">
<span class="ad-label">Позиция на экране</span>
<div class="ad-seg" role="group" aria-label="Позиция оповещений">${positions}</div>
</div>
<div class="ad-actions">
<button class="ad-btn ad-btn-danger" type="button" data-ad-act="reset">${ic('trash')} Сбросить виджет</button>
</div>
<div class="ad-cmds">
<div class="ad-cmds-head">${ic('twitch')} <span>Команды модераторов — клик копирует</span></div>
<div class="ad-chips">${chips}</div>
</div>
</section>
</div>

<div class="ad-col">
<section class="ad-log-panel" id="ad-log-panel">
<header class="ad-log-head">
<div class="ad-log-top">
<span>Живой журнал</span>
<span class="ad-badge" id="ad-log-count">0</span>
</div>
<div class="ad-log-stats">
<div class="ad-stat"><span class="ad-stat-val" id="ad-stat-total">0</span><span class="ad-stat-name">всего</span></div>
<div class="ad-stat"><span class="ad-stat-val" id="ad-stat-subs">0</span><span class="ad-stat-name">подписок</span></div>
<div class="ad-stat"><span class="ad-stat-val" id="ad-stat-rewards">0</span><span class="ad-stat-name">наград</span></div>
<div class="ad-stat"><span class="ad-stat-val" id="ad-stat-follows">0</span><span class="ad-stat-name">фолловеров</span></div>
</div>
</header>
<div class="ad-log-scroll" id="ad-log-scroll">
<div class="ad-log" id="ad-log"></div>
<div class="ad-log-empty" id="ad-log-empty">
${ic('target')}
<div class="ad-log-empty-title">Журнал пуст</div>
<div class="ad-log-empty-sub">Отправьте тест или дождитесь событий канала — здесь появятся тип, автор и сообщение.</div>
</div>
</div>
<footer class="ad-log-foot">
<span class="ad-log-note">Локально, последние 80 записей.</span>
<div class="ad-log-btns">
<button class="ad-mini-btn" type="button" data-ad-act="log-pause" id="ad-log-pause" title="Приостановить запись">${ic('pause')}</button>
<button class="ad-mini-btn is-danger" type="button" data-ad-act="log-clear" id="ad-log-clear" title="Очистить журнал">${ic('trash')}</button>
</div>
</footer>
</section>

<section class="ad-panel ad-info">
<div class="ad-panel-head"><span class="ad-label">Что приходит само</span></div>
<ul class="ad-info-list">${liveRows}</ul>
<div class="ad-note">Событие канала рассылается всем виджетам по шине — алерты сработают, даже если мастером стал другой виджет. Звук живых событий играет только OBS, чтобы не было двойного звука с превью.</div>
<div class="ad-note">Если алертов не видно: нажмите «Починить источник», затем «Тест в OBS». Для проверки самого виджета откройте <code>http://localhost:42069/alerts/index.html?debug=1</code> — там будет индикатор жизни и тестовый алерт.</div>
</section>
</div>
</div>
<div class="ad-toasts" id="ad-toasts"></div>
</div>`;
}