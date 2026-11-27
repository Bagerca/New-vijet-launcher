/* ФАЙЛ: widgets/player/dashboard/template.js — v7 (мастер-тумблер в шапке, shuffle-кнопка, чипы команд) */
import { icons } from '../../../js/utils/icons.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CHAT_COMMANDS = [
    { cmd: '!play', copy: '!play ', title: 'Заказать трек: !play <ссылка YouTube>' },
    { cmd: '!sr', copy: '!sr ', title: 'Алиас команды !play' },
    { cmd: '!skip', copy: '!skip', title: 'Следующий трек (он же ручной старт)' },
    { cmd: '!prev', copy: '!prev', title: 'Предыдущий трек из истории' },
    { cmd: '!pause', copy: '!pause', title: 'Пауза / продолжить' },
    { cmd: '!vol', copy: '!vol 40', title: 'Громкость заказов: !vol 0–100' },
    { cmd: '!clear', copy: '!clear', title: 'Очистить очередь заказов' },
    { cmd: '!bgplay', copy: '!bgplay on', title: 'Фоновый плейлист: on / off' },
    { cmd: '!playerc', copy: '!playerc #ff4d85', title: 'Цвет акцентов виджета: !playerc #hex' }
];

export function renderTemplate(state, params) {
    const c = state.config.widgets.player || {};
    const vol = c.volume ?? 30;
    const bgVol = c.bgVolume ?? 15;
    const color = c.accentColor ?? '#ff4d85';
    const bgOn = c.playlistEnabled === true || String(c.playlistEnabled) === 'true';
    const enabled = c.enabled !== false && String(c.enabled) !== 'false';

    const chipsHtml = CHAT_COMMANDS.map(item => `
        <button class="pd-chip" type="button" data-copy="${esc(item.copy)}" title="${esc(item.title)}">
            <span class="pd-chip-ic">${ic('copy')}</span><code>${esc(item.cmd)}</code>
        </button>`).join('');

    return `
<div class="pd-main" id="pd-main">
    <section class="pd-card card">
        <header class="pd-head">
            <div class="pd-head-left">
                <h3 class="pd-title">${ic('eye')} Стенд плеера</h3>
                <span class="pd-badge" id="pd-server">СЕРВЕР</span>
                <span class="pd-badge" id="pd-obs">OBS</span>
            </div>
            <div class="pd-head-right">
                <label class="pd-toggle pd-toggle-head" title="Мастер-выключатель: принимать заказы и музыку">
                    <span>ПЛЕЕР ВКЛ.</span>
                    <input type="checkbox" data-pd-key="enabled" ${enabled ? 'checked' : ''}>
                    <div class="pd-track"></div>
                </label>
                <button class="pd-icon-btn" id="pd-reconnect" title="Переподключить и обновить данные" aria-label="Переподключить и обновить данные">${ic('sync')}</button>
            </div>
        </header>

        <div class="pd-source-bar">
            <span class="pd-source-label" id="pd-source-label">Где играет музыка</span>
            <div class="pd-segment" role="group" aria-labelledby="pd-source-label">
                <button class="pd-seg-btn" data-source="obs" id="pd-seg-obs" aria-pressed="false">
                    <span class="pd-seg-dot" id="pd-seg-dot-obs"></span>${ic('obs')} OBS Studio
                </button>
                <button class="pd-seg-btn" data-source="demo" id="pd-seg-demo" aria-pressed="false">
                    <span class="pd-seg-dot" id="pd-seg-dot-demo"></span>${ic('monitor')} Лаунчер
                </button>
            </div>
            <span class="pd-source-hint" id="pd-source-hint">Определяю доступные плееры...</span>
        </div>

        <div class="pd-stage" id="pd-stage" style="border-color:${esc(color)};">
            <div class="pd-layer pd-mirror is-hidden" id="pd-mirror">
                <img class="pd-mirror-cover" id="pd-mirror-cover" src="" alt="">
                <div class="pd-mirror-overlay">
                    <div class="pd-mirror-title" id="pd-mirror-title"></div>
                    <div class="pd-mirror-user" id="pd-mirror-user"></div>
                </div>
            </div>
            <div class="pd-layer pd-iframe-layer is-hidden" id="pd-iframe-layer"></div>
            <div class="pd-layer pd-idle" id="pd-idle">
                <div class="pd-idle-icon">${ic('noSignal')}</div>
                <div class="pd-idle-title" id="pd-idle-title">Плеер не найден</div>
                <div class="pd-idle-sub" id="pd-idle-sub">Откройте OBS с виджетом плеера — или слушайте прямо в лаунчере.</div>
                <button class="pd-btn-demo" id="pd-idle-demo">${ic('monitor')} Слушать в лаунчере</button>
            </div>
            <div class="pd-stage-loading is-hidden" id="pd-stage-loading"><div class="pd-spinner"></div><span>Запуск плеера в лаунчере...</span></div>
            <div class="pd-stage-note" id="pd-stage-note"></div>
        </div>

        <div class="pd-transport">
            <div class="pd-transport-btns">
                <button class="pd-ctrl-btn is-main" data-pd-cmd="PLAYER_PAUSE" id="pd-pause" title="Запустить плеер">${ic('play')}</button>
                <button class="pd-ctrl-btn" data-pd-cmd="PLAYER_SKIP" title="Следующий трек">${ic('skip')}</button>
                <button class="pd-ctrl-btn danger" data-pd-cmd="PLAYER_STOP" title="Остановить">${ic('stop')}</button>
                <button class="pd-ctrl-btn danger" data-pd-cmd="PLAYER_CLEAR" id="pd-clear" title="Очистить заказы">${ic('trash')}</button>
                <button class="pd-ctrl-btn" id="pd-mute" title="Заглушить всё (громкость сохранится)">${ic('volume')}</button>
            </div>
            <div class="pd-now">
                <div class="pd-now-top">
                    <span class="pd-now-title" id="pd-now-title">Ничего не играет</span>
                    <span class="pd-now-meta" id="pd-now-meta">—</span>
                </div>
                <div class="pd-seek is-disabled" id="pd-seek">
                    <div class="pd-seek-track"><div class="pd-seek-fill" id="pd-seek-fill"></div></div>
                    <div class="pd-seek-knob" id="pd-seek-knob"></div>
                </div>
                <div class="pd-now-times"><span id="pd-time-cur">0:00</span><span id="pd-time-dur">0:00</span></div>
            </div>
        </div>
    </section>

    <div class="pd-grid">
        <section class="pd-panel">
            <div>
                <label class="pd-label" for="pd-input">Добавить трек в очередь</label>
                <div class="pd-input-group">
                    <input type="text" id="pd-input" placeholder="Ссылка на YouTube или ID видео">
                    <button class="pd-input-btn" id="pd-add">${ic('plus')} Отправить</button>
                </div>
            </div>
            <div class="pd-sliders">
                <div class="pd-slider-row">
                    <span>Громкость заказов</span>
                    <input type="range" data-pd-key="volume" value="${vol}" min="0" max="100" aria-label="Громкость заказов">
                    <div class="pd-slider-val" id="val-player-volume">${vol}%</div>
                </div>
                <div class="pd-slider-row">
                    <span>Громкость фона</span>
                    <input type="range" data-pd-key="bgVolume" value="${bgVol}" min="0" max="100" aria-label="Громкость фоновой музыки">
                    <div class="pd-slider-val" id="val-player-bgVolume">${bgVol}%</div>
                </div>
            </div>
            <div class="pd-row-2col">
                <label class="pd-toggle">
                    <span>Фоновый плейлист</span>
                    <input type="checkbox" data-pd-key="playlistEnabled" ${bgOn ? 'checked' : ''}>
                    <div class="pd-track"></div>
                </label>
                <button class="pd-action-btn" id="pd-shuffle" type="button" title="Перемешать порядок фонового плейлиста">
                    ${ic('shuffle')} <span>Перемешать</span>
                </button>
            </div>
            <div class="pd-color-row">
                <span>Цвет акцентов виджета</span>
                <span class="pd-color-hex" id="pd-color-hex">${esc(color)}</span>
                <input type="color" class="pd-color-input" data-pd-key="accentColor" value="${esc(color)}" aria-label="Цвет акцентов виджета">
            </div>
            <div class="pd-cmds">
                <div class="pd-cmds-head">${ic('twitch')} <span>Команды чата для модераторов — клик копирует</span></div>
                <div class="pd-chips">${chipsHtml}</div>
            </div>
        </section>

        <section class="pd-queue-panel">
            <header class="pd-queue-header">
                <div class="pd-queue-header-top">
                    <span>Очередь и плейлист</span>
                    <span class="pd-badge" id="pd-q-count">0</span>
                </div>
                <div class="pd-queue-tools">
                    <input type="text" class="pd-queue-search" id="pd-search" placeholder="Поиск по названию или нику...">
                    <button class="pd-mini-btn" id="pd-restart" title="Плейлист с начала">${ic('sync')}</button>
                </div>
            </header>
            <div class="pd-queue-list" id="pd-queue"></div>
        </section>
    </div>
    <div class="pd-toasts" id="pd-toasts"></div>
</div>`;
}