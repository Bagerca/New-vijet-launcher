/* ФАЙЛ: widgets/deaths/dashboard/template.js — v1 */
import { icons } from '../../../js/utils/icons.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const int = (v, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : n; };
const fill = (v, min, max) => (max > min ? ((v - min) / (max - min)) * 100 : 0).toFixed(2);

const CHAT_COMMANDS = [
    { cmd: '!death', copy: '!death', title: 'Плюс одна смерть и показать счётчик' },
    { cmd: '!death -', copy: '!death -', title: 'Минус одна смерть' },
    { cmd: '!death reset', copy: '!death reset', title: 'Обнулить счётчик' },
    { cmd: '!death set', copy: '!death set 10', title: 'Задать точное значение' },
    { cmd: '!deathshow', copy: '!deathshow on', title: 'Показать / скрыть: on, off' },
    { cmd: '!deathset', copy: '!deathset 10', title: 'Задать значение и показать' },
    { cmd: '!deathc', copy: '!deathc ff0050', title: 'Цвет счётчика: hex' }
];

export function renderTemplate(state) {
    const c = state.config.widgets.deaths || {};
    const enabled = c.enabled === true || String(c.enabled) === 'true';
    const count = Math.max(0, int(c.deathsCount, 0));
    const color = c.color || '#ff0050';
    const comboColor = c.comboColor || '#ff8c00';
    const label = c.label ?? 'DEATHS';
    const fontSize = Math.max(24, Math.min(140, int(c.fontSize, 64)));
    const shake = Math.max(0, Math.min(100, int(c.shakeIntensity, 100)));
    const win = Math.max(1, Math.min(60, int(c.comboWindow, 8)));
    const threshold = Math.max(2, Math.min(20, int(c.comboThreshold, 2)));
    const soundOn = c.soundEnabled === undefined ? true : (c.soundEnabled === true || String(c.soundEnabled) === 'true');
    const volume = Math.max(0, Math.min(100, int(c.soundVolume, 60)));

    const chips = CHAT_COMMANDS.map(item => `
<button class="dd-chip" type="button" data-copy="${esc(item.copy)}" title="${esc(item.title)}">
<span class="dd-chip-ic">${ic('copy')}</span><code>${esc(item.cmd)}</code>
</button>`).join('');

    return `
<div class="dd-main" id="dd-main">
    <section class="dd-card card">
        <header class="dd-head">
            <div class="dd-head-left">
                <h3 class="dd-title">${ic('skull')} Счетчик смертей</h3>
                <span class="dd-badge" id="dd-badge-server">СЕРВЕР</span>
                <span class="dd-badge" id="dd-badge-state">НА ЭКРАНЕ</span>
                <span class="dd-badge" id="dd-badge-source">СИГНАЛ</span>
            </div>
            <div class="dd-head-right">
                <label class="dd-toggle dd-toggle-head" title="Мастер-выключатель: скрытый счётчик не показывается сам при смерти">
                    <span>СЧЁТЧИК ВКЛ.</span>
                    <input type="checkbox" data-dd-key="enabled" ${enabled ? 'checked' : ''}>
                    <div class="dd-track"></div>
                </label>
                <button class="dd-icon-btn" id="dd-refresh" type="button" title="Перезапустить превью виджета" aria-label="Перезапустить превью">${ic('sync')}</button>
            </div>
        </header>

        <div class="dd-stage" id="dd-stage" style="--stage-accent:${esc(color)};">
            <div class="dd-stage-frame" id="dd-stage-frame"></div>
            <div class="dd-stage-loading" id="dd-stage-loading"><div class="dd-spinner"></div><span>Загружаю виджет…</span></div>
            <div class="dd-stage-off is-hidden" id="dd-stage-off">
                <div class="dd-stage-off-icon">${ic('noSignal')}</div>
                <div class="dd-stage-off-title">Счётчик скрыт</div>
                <div class="dd-stage-off-sub">Смерти продолжают считаться, но на стриме ничего не появляется.</div>
                <button class="dd-btn dd-btn-primary" id="dd-off-show" type="button">${ic('power')} Показать на экране</button>
            </div>
        </div>

        <div class="dd-now" id="dd-now" style="--now-accent:${esc(color)}; --now-combo:${esc(comboColor)};">
            <div class="dd-now-figure">
                <span class="dd-now-count" id="dd-now-count">${count}</span>
                <span class="dd-now-label" id="dd-now-label">${esc(label)}</span>
            </div>
            <div class="dd-now-side">
                <span class="dd-now-combo" id="dd-now-combo">КОМБО НЕТ</span>
                <span class="dd-now-source" id="dd-now-source">НЕТ СИГНАЛА</span>
            </div>
        </div>
    </section>

    <div class="dd-grid">
        <div class="dd-col">
            <section class="dd-panel dd-counter">
                <span class="dd-label">Отметить смерть</span>
                <div class="dd-counter-main">
                    <button class="dd-hit" id="dd-plus" type="button" title="Плюс одна смерть">
                        ${ic('skull')} <span>+1 СМЕРТЬ</span>
                    </button>
                    <button class="dd-step-btn" id="dd-minus" type="button" title="Минус одна смерть" aria-label="Минус одна смерть">${ic('minus')}</button>
                </div>
                <div class="dd-counter-row">
                    <label class="dd-field-inline" for="dd-count-input">
                        <span>Точное значение</span>
                        <input type="number" id="dd-count-input" class="dd-num" min="0" max="99999" step="1" value="${count}">
                    </label>
                    <button class="dd-btn dd-btn-ghost" id="dd-test" type="button" title="Тряска и звук без изменения счёта">${ic('flask')} Тест удара</button>
                </div>
                <div class="dd-counter-row">
                    <button class="dd-btn dd-btn-danger dd-grow" id="dd-reset" type="button">${ic('trash')} Обнулить счётчик</button>
                    <button class="dd-btn dd-btn-undo is-hidden" id="dd-undo" type="button">${ic('sync')} <span id="dd-undo-label">Вернуть</span></button>
                </div>
                <div class="dd-note">Мастер-тумблер главный: при выключенном счётчике цифра растёт, но виджет остаётся скрытым.</div>
            </section>

            <section class="dd-panel">
                <span class="dd-label">Оформление</span>
                <div class="dd-color-row">
                    <span>Цвет счётчика</span>
                    <span class="dd-hex" id="dd-color-hex">${esc(color)}</span>
                    <input type="color" class="dd-color" id="dd-color" data-dd-key="color" value="${esc(color)}" aria-label="Цвет счётчика">
                    <button class="dd-mini-btn" id="dd-color-brand" type="button" title="Вернуть фирменный цвет">${ic('sync')}</button>
                </div>
                <div class="dd-color-row">
                    <span>Цвет комбо</span>
                    <span class="dd-hex" id="dd-combo-hex">${esc(comboColor)}</span>
                    <input type="color" class="dd-color" id="dd-combo-color" data-dd-key="comboColor" value="${esc(comboColor)}" aria-label="Цвет комбо">
                    <button class="dd-mini-btn" id="dd-combo-brand" type="button" title="Вернуть фирменный цвет комбо">${ic('sync')}</button>
                </div>
                <div class="dd-field">
                    <label class="dd-field-label" for="dd-label">Подпись над цифрой</label>
                    <input type="text" id="dd-label" data-dd-key="label" value="${esc(label)}" maxlength="24" placeholder="DEATHS">
                </div>
                <div class="dd-slider">
                    <span class="dd-slider-name">Размер цифры</span>
                    <input type="range" id="dd-font" min="24" max="140" step="1" value="${fontSize}" style="--range-fill:${fill(fontSize, 24, 140)}%;" aria-label="Размер цифры">
                    <input type="number" id="dd-font-num" class="dd-num dd-num-sm" min="24" max="140" step="1" value="${fontSize}" aria-label="Размер цифры числом">
                </div>
                <div class="dd-slider">
                    <span class="dd-slider-name">Сила тряски</span>
                    <input type="range" id="dd-shake" min="0" max="100" step="1" value="${shake}" style="--range-fill:${fill(shake, 0, 100)}%;" aria-label="Сила тряски">
                    <span class="dd-slider-val" id="dd-shake-val">${shake}%</span>
                </div>

                <span class="dd-label dd-label-gap">Комбо</span>
                <div class="dd-slider">
                    <span class="dd-slider-name">Окно комбо</span>
                    <input type="range" id="dd-window" min="1" max="30" step="1" value="${Math.min(30, win)}" style="--range-fill:${fill(Math.min(30, win), 1, 30)}%;" aria-label="Окно комбо">
                    <input type="number" id="dd-window-num" class="dd-num dd-num-sm" min="1" max="60" step="1" value="${win}" aria-label="Окно комбо числом">
                </div>
                <div class="dd-stepper">
                    <span class="dd-slider-name">Порог комбо</span>
                    <div class="dd-stepper-box">
                        <button class="dd-mini-btn" id="dd-th-minus" type="button" aria-label="Уменьшить порог">${ic('minus')}</button>
                        <span class="dd-stepper-val" id="dd-th-val">${threshold}</span>
                        <button class="dd-mini-btn" id="dd-th-plus" type="button" aria-label="Увеличить порог">${ic('plus')}</button>
                    </div>
                    <span class="dd-stepper-hint">смертей подряд</span>
                </div>

                <span class="dd-label dd-label-gap">Звук</span>
                <label class="dd-toggle">
                    <span>Звук смерти<em class="dd-toggle-note">файл data/sounds/death.mp3</em></span>
                    <input type="checkbox" id="dd-sound" data-dd-key="soundEnabled" ${soundOn ? 'checked' : ''}>
                    <div class="dd-track"></div>
                </label>
                <div class="dd-slider ${soundOn ? '' : 'is-muted'}" id="dd-volume-row">
                    <span class="dd-slider-name">Громкость</span>
                    <input type="range" id="dd-volume" min="0" max="100" step="1" value="${volume}" style="--range-fill:${fill(volume, 0, 100)}%;" aria-label="Громкость звука смерти">
                    <span class="dd-slider-val" id="dd-volume-val">${volume}%</span>
                </div>

                <div class="dd-actions">
                    <button class="dd-btn dd-btn-ghost" id="dd-widget-reset" type="button">${ic('trash')} Сбросить виджет к настройкам по умолчанию</button>
                </div>

                <div class="dd-cmds">
                    <div class="dd-cmds-head">${ic('twitch')} <span>Команды чата для модераторов — клик копирует</span></div>
                    <div class="dd-chips">${chips}</div>
                </div>
            </section>
        </div>

        <section class="dd-log-panel">
            <header class="dd-log-head">
                <div class="dd-log-top">
                    <span>Журнал и статистика</span>
                    <span class="dd-badge" id="dd-log-count">0</span>
                </div>
                <div class="dd-stats">
                    <div class="dd-stat">
                        <span class="dd-stat-val" id="dd-stat-deaths">0</span>
                        <span class="dd-stat-name">смертей отмечено</span>
                    </div>
                    <div class="dd-stat">
                        <span class="dd-stat-val" id="dd-stat-combo">0</span>
                        <span class="dd-stat-name">макс. комбо</span>
                    </div>
                    <div class="dd-stat">
                        <span class="dd-stat-val" id="dd-stat-gap">—</span>
                        <span class="dd-stat-name">средний интервал</span>
                    </div>
                </div>
            </header>
            <div class="dd-log-scroll" id="dd-log-scroll">
                <div class="dd-log" id="dd-log"></div>
                <div class="dd-log-empty" id="dd-log-empty">
                    ${ic('skull')}
                    <div class="dd-log-empty-title">Журнал пуст</div>
                    <div class="dd-log-empty-sub">Отметьте смерть кнопкой +1 или командой !death — записи появятся здесь и сохранятся между заходами.</div>
                </div>
            </div>
            <footer class="dd-log-foot">
                <span class="dd-log-note">Хранится локально, последние 80 записей.</span>
                <button class="dd-btn dd-btn-ghost dd-btn-sm" id="dd-log-clear" type="button">${ic('trash')} Очистить</button>
            </footer>
        </section>
    </div>
    <div class="dd-toasts" id="dd-toasts"></div>
</div>`;
}