/* ФАЙЛ: widgets/socials/dashboard/template.js — v1 */
import { icons } from '../../../js/utils/icons.js';
import { normalizeNetworks, intervalFrom } from '../networks.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CHAT_COMMANDS = [
    { cmd: '!socials on', copy: '!socials on', title: 'Включить ротатор' },
    { cmd: '!socials off', copy: '!socials off', title: 'Выключить ротатор' },
    { cmd: '!socialsint', copy: '!socialsint 30', title: 'Интервал смены в секундах (3–600)' },
    { cmd: '!stg', copy: '!stg t.me/channel', title: 'Telegram: ссылка или @канал' },
    { cmd: '!stt', copy: '!stt @nickname', title: 'TikTok: @ник профиля' },
    { cmd: '!svk', copy: '!svk vk.com/club', title: 'ВКонтакте: ссылка на группу' }
];

export function renderTemplate(state) {
    const c = state.config.widgets.socials || {};
    const active = c.isActive === true || String(c.isActive) === 'true';
    const interval = intervalFrom(c);
    const list = normalizeNetworks(c);
    const sliderVal = Math.max(3, Math.min(120, interval));
    const fill = ((sliderVal - 3) / 117) * 100;

    const chips = CHAT_COMMANDS.map(item => `
<button class="sd-chip" type="button" data-copy="${esc(item.copy)}" title="${esc(item.title)}">
<span class="sd-chip-ic">${ic('copy')}</span><code>${esc(item.cmd)}</code>
</button>`).join('');

    return `
<div class="sd-main" id="sd-main">
    <section class="sd-card card">
        <header class="sd-head">
            <div class="sd-head-left">
                <h3 class="sd-title">${ic('sync')} Ротатор соцсетей</h3>
                <span class="sd-badge" id="sd-badge-server">СЕРВЕР</span>
                <span class="sd-badge" id="sd-badge-state">НА ЭКРАНЕ</span>
                <span class="sd-badge" id="sd-badge-source">СИГНАЛ</span>
            </div>
            <div class="sd-head-right">
                <label class="sd-toggle sd-toggle-head" title="Мастер-выключатель: показывать ротатор на стриме">
                    <span>РОТАТОР ВКЛ.</span>
                    <input type="checkbox" data-sd-key="isActive" ${active ? 'checked' : ''}>
                    <div class="sd-track"></div>
                </label>
                <button class="sd-icon-btn" id="sd-refresh" type="button" title="Перезапустить превью виджета" aria-label="Перезапустить превью">${ic('sync')}</button>
            </div>
        </header>

        <div class="sd-stage" id="sd-stage">
            <div class="sd-stage-frame" id="sd-stage-frame"></div>
            <div class="sd-stage-loading" id="sd-stage-loading"><div class="sd-spinner"></div><span>Загружаю виджет…</span></div>
            <div class="sd-stage-off is-hidden" id="sd-stage-off">
                <div class="sd-stage-off-icon">${ic('noSignal')}</div>
                <div class="sd-stage-off-title" id="sd-off-title">Ротатор скрыт</div>
                <div class="sd-stage-off-sub" id="sd-off-sub">Виджет работает, но не показывается на стриме.</div>
                <button class="sd-btn sd-btn-primary" id="sd-off-show" type="button">${ic('power')} Показать на экране</button>
            </div>
        </div>

        <div class="sd-now" id="sd-now">
            <div class="sd-now-icon" id="sd-now-icon">${ic('noSignal')}</div>
            <div class="sd-now-body">
                <span class="sd-now-label">Сейчас на экране</span>
                <span class="sd-now-title" id="sd-now-title">Ожидание виджета</span>
                <span class="sd-now-handle" id="sd-now-handle">—</span>
            </div>
            <span class="sd-now-pos" id="sd-now-pos">${list.length} в списке</span>
        </div>
    </section>

    <div class="sd-grid">
        <section class="sd-net-panel">
            <header class="sd-panel-head">
                <div class="sd-panel-top">
                    <span>Платформы</span>
                    <span class="sd-badge" id="sd-net-count">0</span>
                </div>
                <div class="sd-panel-note">Порядок сверху вниз = порядок показа на стриме.</div>
            </header>
            <div class="sd-net-scroll" id="sd-net-scroll">
                <div class="sd-net-list" id="sd-net-list"></div>
                <div class="sd-net-empty is-hidden" id="sd-net-empty">
                    ${ic('globe')}
                    <div class="sd-net-empty-title">Список пуст</div>
                    <div class="sd-net-empty-sub">Добавьте первую платформу ниже — она сразу появится на стенде.</div>
                </div>
            </div>
            <footer class="sd-add-row">
                <div class="sd-select" id="sd-add-select">
                    <button class="sd-select-btn" type="button" id="sd-add-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Выбор платформы">
                        <span class="sd-select-val" id="sd-add-val">Платформа</span>
                        <span class="sd-caret" aria-hidden="true"></span>
                    </button>
                    <div class="sd-select-pop" id="sd-add-pop" role="listbox" aria-label="Доступные платформы" hidden></div>
                </div>
                <button class="sd-btn sd-btn-primary" id="sd-add-confirm" type="button">${ic('plus')} Добавить</button>
            </footer>
        </section>

        <section class="sd-panel">
            <div class="sd-block">
                <span class="sd-label">Интервал смены</span>
                <div class="sd-interval">
                    <input type="range" id="sd-interval" min="3" max="120" step="1" value="${sliderVal}" style="--range-fill:${fill.toFixed(2)}%;" aria-label="Интервал смены, секунды">
                    <input type="number" id="sd-interval-num" class="sd-num" min="3" max="600" step="1" value="${interval}" aria-label="Интервал смены числом">
                    <span class="sd-unit">сек</span>
                </div>
                <div class="sd-cycle" id="sd-cycle">
                    <div class="sd-cycle-track"><div class="sd-cycle-fill" id="sd-cycle-fill"></div></div>
                    <span class="sd-cycle-left" id="sd-cycle-left">—</span>
                </div>
            </div>

            <div class="sd-block">
                <div class="sd-block-head">
                    <span class="sd-label">Порядок показа</span>
                    <button class="sd-btn sd-btn-ghost sd-btn-sm" id="sd-next" type="button">${ic('skip')} Следующая</button>
                </div>
                <div class="sd-order-scroll" id="sd-order-scroll">
                    <div class="sd-order" id="sd-order"></div>
                    <div class="sd-order-empty is-hidden" id="sd-order-empty">Активных соцсетей нет — включите платформу и заполните ссылку.</div>
                </div>
            </div>

            <div class="sd-actions">
                <button class="sd-btn sd-btn-ghost" id="sd-reset" type="button">${ic('trash')} Сбросить виджет к настройкам по умолчанию</button>
            </div>

            <div class="sd-cmds">
                <div class="sd-cmds-head">${ic('twitch')} <span>Команды чата для модераторов — клик копирует</span></div>
                <div class="sd-chips">${chips}</div>
            </div>
        </section>
    </div>
    <div class="sd-toasts" id="sd-toasts"></div>
</div>`;
}