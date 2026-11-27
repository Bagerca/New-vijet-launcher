/* ФАЙЛ: widgets/frame/dashboard/template.js — v1 (разметка дашборда рамки и лисы) */
import {
ic, esc, PRESETS, EMOTIONS, FRAME_COMMANDS, PET_COMMANDS,
BRAND_1, BRAND_2, SLEEP_MIN, SLEEP_MAX, SLEEP_RANGE_MAX, DUR_MIN, DUR_MAX,
normalizeHex, clampInt, splitList, frameOf, petOf, frameVisible, petEnabled
} from './constants.js';

function chip(item) {
return `
<button class="fd-chip" type="button" data-copy="${esc(item.copy)}" title="${esc(item.title)}">
<span class="fd-chip-ic">${ic('copy')}</span><code>${esc(item.cmd)}</code>
</button>`;
}

export function renderTemplate(state) {
const f = frameOf(state);
const p = petOf(state);
const visible = frameVisible(f);
const petOn = petEnabled(p);
const c1 = normalizeHex(f.color1, BRAND_1);
const c2 = normalizeHex(f.color2, BRAND_2);
const sleep = clampInt(p.sleepTimeout, SLEEP_MIN, SLEEP_MAX, 120);
const sleepRange = Math.min(SLEEP_RANGE_MAX, sleep);
const sleepFill = ((sleepRange - SLEEP_MIN) / (SLEEP_RANGE_MAX - SLEEP_MIN)) * 100;
const feed = String(p.feedRewardName ?? 'Покормить лису');
const vip = String(p.vipUsers ?? '');
const ban = String(p.forbiddenWords ?? '');
const vipCount = splitList(vip).length;
const banCount = splitList(ban).length;

const presets = PRESETS.map(pr => `
<button class="fd-preset" type="button" data-fd-act="preset" data-arg="${pr.id}" title="${esc(pr.title)}: ${pr.c1} → ${pr.c2}">
<span class="fd-preset-swatch" style="background:linear-gradient(135deg, ${pr.c1}, ${pr.c2});"></span>
<span class="fd-preset-title">${esc(pr.title)}</span>
</button>`).join('');

const emotions = EMOTIONS.map(e => `
<button class="fd-emotion" type="button" data-fd-act="emotion" data-arg="${e.id}" ${petOn ? '' : 'disabled'} title="Показать эмоцию «${esc(e.label)}»">
<span class="fd-emotion-emoji">${e.emoji}</span>
<span class="fd-emotion-label">${esc(e.label)}</span>
</button>`).join('');

const frameChips = FRAME_COMMANDS.map(chip).join('');
const petChips = PET_COMMANDS.map(chip).join('');

return `
<div class="fd-main" id="fd-main">
<section class="fd-card card">
<header class="fd-head">
<div class="fd-head-left">
<h3 class="fd-title">${ic('monitor')} Неоновая рамка веб-камеры</h3>
<span class="fd-badge" id="fd-badge-server">СЕРВЕР</span>
<span class="fd-badge" id="fd-badge-state">НА ЭКРАНЕ</span>
<span class="fd-badge" id="fd-badge-source">СИГНАЛ</span>
<span class="fd-badge" id="fd-badge-pet">ЛИСА</span>
</div>
<div class="fd-head-right">
<label class="fd-toggle fd-toggle-head" data-fd-scope="frame" title="Мастер-выключатель: рамка и лиса живут в одном источнике">
<span>РАМКА ВКЛ.</span>
<input type="checkbox" id="fd-master" data-fd-key="isVisible" ${visible ? 'checked' : ''}>
<div class="fd-track"></div>
</label>
<button class="fd-icon-btn" id="fd-refresh" type="button" title="Перезапустить превью виджета" aria-label="Перезапустить превью">${ic('sync')}</button>
</div>
</header>
<div class="fd-stage" id="fd-stage">
<div class="fd-stage-inner" id="fd-stage-inner">
<div class="fd-cam-mock">
<span class="fd-cam-grid"></span>
<span class="fd-cam-label">CAM</span>
<span class="fd-cam-sub">1280 × 720</span>
</div>
<div class="fd-frame-host" id="fd-frame-host"></div>
</div>
<div class="fd-stage-loading" id="fd-stage-loading"><div class="fd-spinner"></div><span>Загружаю виджет…</span></div>
<div class="fd-stage-off is-hidden" id="fd-stage-off">
<div class="fd-stage-off-icon">${ic('noSignal')}</div>
<div class="fd-stage-off-title">Рамка скрыта</div>
<div class="fd-stage-off-sub">Лиса живёт внутри того же источника, поэтому она тоже скрыта. Настройки продолжают работать.</div>
<button class="fd-btn fd-btn-primary" id="fd-off-show" type="button">${ic('power')} Показать на экране</button>
</div>
<div class="fd-stage-hud"><span class="fd-hud-chip" id="fd-hud-pet">ЛИСА: —</span></div>
</div>
<div class="fd-now" id="fd-now" style="--now-1:${esc(c1)}; --now-2:${esc(c2)};">
<span class="fd-now-swatch" id="fd-now-swatch"></span>
<span class="fd-now-body">
<span class="fd-now-label">Сейчас на экране</span>
<span class="fd-now-title" id="fd-now-title">Рамка видна</span>
<span class="fd-now-hex" id="fd-now-hex">${esc(c1)} → ${esc(c2)}</span>
</span>
<span class="fd-now-side">
<span class="fd-now-pet" id="fd-now-pet">ЛИСА: —</span>
<span class="fd-now-source" id="fd-now-source">НЕТ СИГНАЛА</span>
</span>
</div>
</section>

<div class="fd-grid">
<div class="fd-col">
<section class="fd-panel" data-fd-scope="frame" id="fd-frame-panel">
<div class="fd-panel-head">
<span class="fd-label">Градиент рамки</span>
<span class="fd-note">Цвета уезжают в OBS мгновенно — перезапуск сцены не нужен.</span>
</div>
<div class="fd-gradient" id="fd-gradient" style="--g1:${esc(c1)}; --g2:${esc(c2)};"></div>
<div class="fd-color-row">
<span class="fd-color-name">Цвет 1</span>
<span class="fd-hex" id="fd-hex-1">${esc(c1)}</span>
<input type="color" class="fd-color" id="fd-color-1" data-fd-key="color1" value="${esc(c1)}" aria-label="Первый цвет градиента">
<button class="fd-mini-btn" type="button" data-fd-act="brand1" title="Вернуть фирменный зелёный">${ic('sync')}</button>
</div>
<div class="fd-color-row">
<span class="fd-color-name">Цвет 2</span>
<span class="fd-hex" id="fd-hex-2">${esc(c2)}</span>
<input type="color" class="fd-color" id="fd-color-2" data-fd-key="color2" value="${esc(c2)}" aria-label="Второй цвет градиента">
<button class="fd-mini-btn" type="button" data-fd-act="brand2" title="Вернуть фирменный розовый">${ic('sync')}</button>
</div>
<div class="fd-block">
<span class="fd-label">Пресеты</span>
<div class="fd-presets" id="fd-presets">${presets}</div>
</div>
<div class="fd-actions">
<button class="fd-btn fd-btn-ghost" type="button" data-fd-act="swap">${ic('shuffle')} Поменять местами</button>
<button class="fd-btn fd-btn-ghost" type="button" data-fd-act="random">${ic('flask')} Случайный градиент</button>
<button class="fd-btn fd-btn-danger" type="button" data-fd-act="reset-frame">${ic('trash')} Сбросить рамку</button>
</div>
<div class="fd-cmds">
<div class="fd-cmds-head">${ic('twitch')} <span>Команды модераторов — клик копирует</span></div>
<div class="fd-chips">${frameChips}</div>
</div>
</section>

<section class="fd-panel" data-fd-scope="pet" id="fd-pet-settings">
<div class="fd-panel-head">
<span class="fd-label">Лиса — поведение</span>
<span class="fd-note">Реакции на чат, награды и музыку. Применяется на лету.</span>
</div>
<div class="fd-slider">
<span class="fd-slider-name">Засыпает через</span>
<input type="range" id="fd-sleep" min="${SLEEP_MIN}" max="${SLEEP_RANGE_MAX}" step="1" value="${sleepRange}" style="--range-fill:${sleepFill.toFixed(2)}%;" aria-label="Через сколько секунд тишины лиса засыпает">
<input type="number" id="fd-sleep-num" class="fd-num" min="${SLEEP_MIN}" max="${SLEEP_MAX}" step="1" value="${sleep}" aria-label="Таймаут сна числом">
<span class="fd-unit">сек</span>
</div>
<label class="fd-field">
<span class="fd-field-label">Награда за баллы, которая кормит лису</span>
<input type="text" class="fd-input" id="fd-feed" data-fd-key="feedRewardName" value="${esc(feed)}" maxlength="60" placeholder="Покормить лису">
</label>
<label class="fd-field">
<span class="fd-field-label">VIP-зрители через запятую <em class="fd-count" id="fd-vip-count">${vipCount}</em></span>
<textarea class="fd-textarea" id="fd-vip" data-fd-key="vipUsers" rows="2" placeholder="bagercaa, to_be_ang">${esc(vip)}</textarea>
</label>
<label class="fd-field">
<span class="fd-field-label">Бан-слова через запятую <em class="fd-count is-danger" id="fd-ban-count">${banCount}</em></span>
<textarea class="fd-textarea" id="fd-ban" data-fd-key="forbiddenWords" rows="2" placeholder="слово1, слово2">${esc(ban)}</textarea>
</label>
<div class="fd-note">Лиса злится на бан-слова, радуется VIP и модераторам, ловит хайп со смайлов и танцует под музыку плеера.</div>
<div class="fd-actions">
<button class="fd-btn fd-btn-danger" type="button" data-fd-act="reset-pet">${ic('trash')} Сбросить лису</button>
</div>
</section>
</div>

<div class="fd-col">
<section class="fd-panel" data-fd-scope="pet" id="fd-pet-emotions">
<div class="fd-panel-head">
<span class="fd-label">Лиса — эмоции</span>
<label class="fd-toggle fd-toggle-inline" title="Показывать лису на рамке">
<span>ЛИСА ВКЛ.</span>
<input type="checkbox" id="fd-pet-enabled" data-fd-key="enabled" ${petOn ? 'checked' : ''}>
<div class="fd-track"></div>
</label>
</div>
<div class="fd-stepper">
<span class="fd-slider-name">Длительность</span>
<div class="fd-stepper-box">
<button class="fd-mini-btn" type="button" data-fd-act="dur-minus" id="fd-dur-minus" aria-label="Уменьшить длительность">${ic('minus')}</button>
<span class="fd-stepper-val" id="fd-dur-val">5</span>
<button class="fd-mini-btn" type="button" data-fd-act="dur-plus" id="fd-dur-plus" aria-label="Увеличить длительность">${ic('plus')}</button>
</div>
<span class="fd-unit">сек</span>
</div>
<div class="fd-emotions" id="fd-emotions">${emotions}</div>
<div class="fd-note" id="fd-emotion-note">Тестовая эмоция уходит и в превью, и в OBS. Конфиг она не меняет.</div>
<div class="fd-cmds">
<div class="fd-cmds-head">${ic('twitch')} <span>Команды лисы — клик копирует</span></div>
<div class="fd-chips">${petChips}</div>
</div>
</section>

<section class="fd-panel fd-info">
<div class="fd-panel-head">
<span class="fd-label">Как это работает</span>
</div>
<ul class="fd-info-list">
<li><b>Один источник.</b> Рамка и лиса — это «Виджет: Рамка вебки» 1400 × 850. Выключая рамку, вы скрываете и лису.</li>
<li><b>Живой градиент.</b> Цвета меняются без перезагрузки сцены: превью и OBS получают их из общего конфига.</li>
<li><b>Приоритеты эмоций.</b> Испуг и злость перебивают любовь и хайп, а обратный порядок — нет. Если кнопка «не сработала», подождите пару секунд.</li>
<li><b>Сигнал.</b> Бейдж показывает, откуда пришли данные: из OBS или из превью лаунчера.</li>
</ul>
</section>
</div>
</div>
<div class="fd-toasts" id="fd-toasts"></div>
</div>`;
}