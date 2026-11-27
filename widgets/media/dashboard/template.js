/* ФАЙЛ: widgets/media/dashboard/template.js — v2 (без лишних переключателей, свой select) */
import { icons } from '../../../js/utils/icons.js';
import { SORT_OPTIONS } from './library.js';

const ic = (n) => (typeof icons[n] === 'function' ? icons[n]() : '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderTemplate(state, params) {
    const c = state.config.widgets.media || {};
    const active = c.isActive === true || String(c.isActive) === 'true';
    const autoColor = c.autoColor === undefined ? true : (c.autoColor === true || String(c.autoColor) === 'true');
    const accent = c.accentColor || '#ff4d85';
    const badge = c.badgeText || '';
    const yt = c.ytLink || '';

    const cat = params?.cat === 'series' ? 'series' : 'game';
    const sort = SORT_OPTIONS.some(s => s.id === params?.sort) ? params.sort : 'title';
    const sortLabel = (SORT_OPTIONS.find(s => s.id === sort) || SORT_OPTIONS[0]).label;

    const catBtn = (id, label, icon) => `
<button class="md-seg-btn ${cat === id ? 'is-active' : ''}" type="button" data-md-cat="${id}" aria-pressed="${cat === id}">
${ic(icon)} ${label}
</button>`;

    const sortOptions = SORT_OPTIONS.map(s => `
<button class="md-sort-opt ${s.id === sort ? 'is-active' : ''}" type="button" role="option" data-value="${s.id}" aria-selected="${s.id === sort}">${esc(s.label)}</button>`).join('');

    return `
<div class="md-main" id="md-main">
    <section class="md-card card">
        <header class="md-head">
            <div class="md-head-left">
                <h3 class="md-title">${ic('eye')} Карточка активности</h3>
                <span class="md-badge" id="md-badge-server">СЕРВЕР</span>
                <span class="md-badge" id="md-badge-state">НА ЭКРАНЕ</span>
            </div>
            <div class="md-head-right">
                <label class="md-toggle md-toggle-head" title="Мастер-выключатель: показывать карточку на стриме">
                    <span>КАРТОЧКА ВКЛ.</span>
                    <input type="checkbox" data-md-key="isActive" ${active ? 'checked' : ''}>
                    <div class="md-track"></div>
                </label>
                <button class="md-icon-btn" id="md-refresh" type="button" title="Перезапустить превью виджета" aria-label="Перезапустить превью">${ic('sync')}</button>
            </div>
        </header>

        <div class="md-stage" id="md-stage">
            <div class="md-stage-frame" id="md-stage-frame"></div>
            <div class="md-stage-loading" id="md-stage-loading"><div class="md-spinner"></div><span>Загружаю виджет…</span></div>
            <div class="md-stage-hidden is-hidden" id="md-stage-hidden">
                <div class="md-stage-hidden-icon">${ic('noSignal')}</div>
                <div class="md-stage-hidden-title">Карточка скрыта</div>
                <div class="md-stage-hidden-sub">Виджет работает, но не показывается на стриме.</div>
                <button class="md-btn md-btn-primary" id="md-stage-show" type="button">${ic('power')} Показать на экране</button>
            </div>
        </div>

        <div class="md-now" id="md-now">
            <div class="md-now-cover">
                <img id="md-now-cover" alt="">
                <span class="md-now-fallback" id="md-now-fallback">??</span>
            </div>
            <div class="md-now-body">
                <span class="md-now-label">Сейчас на экране</span>
                <span class="md-now-title" id="md-now-title">Ничего не выбрано</span>
                <span class="md-now-meta" id="md-now-meta">Выберите игру или вставьте ссылку</span>
            </div>
            <span class="md-now-source" id="md-now-source">—</span>
        </div>
    </section>

    <div class="md-grid">
        <section class="md-panel">
            <div class="md-block md-yt" id="md-yt-block">
                <label class="md-label" for="md-yt-input">Реакция на видео — ссылка YouTube</label>
                <div class="md-input-row">
                    <input type="text" id="md-yt-input" value="${esc(yt)}" placeholder="https://youtu.be/... или ID видео">
                    <button class="md-btn md-btn-primary" id="md-yt-apply" type="button">${ic('play')} Показать</button>
                </div>
                <div class="md-yt-preview" id="md-yt-preview">
                    <img id="md-yt-thumb" alt="">
                    <div class="md-yt-info">
                        <span class="md-yt-id" id="md-yt-id">—</span>
                        <span class="md-yt-note" id="md-yt-error">Вставьте ссылку — карточка переключится в режим реакции.</span>
                    </div>
                    <button class="md-btn md-btn-ghost" id="md-yt-clear" type="button" title="Убрать ссылку и вернуться к библиотеке">${ic('trash')} Убрать</button>
                </div>
            </div>

            <div class="md-block">
                <span class="md-label">Оформление</span>
                <label class="md-toggle">
                    <span>Авто-цвет из медиа<em class="md-toggle-note">берётся из обложки / YouTube</em></span>
                    <input type="checkbox" data-md-key="autoColor" ${autoColor ? 'checked' : ''}>
                    <div class="md-track"></div>
                </label>
                <div class="md-color-row ${autoColor ? 'is-disabled' : ''}" id="md-color-row">
                    <span>Свой цвет акцента</span>
                    <span class="md-color-hex" id="md-color-hex">${autoColor ? 'АВТО' : esc(accent)}</span>
                    <input type="color" class="md-color-input" data-md-key="accentColor" value="${esc(accent)}" ${autoColor ? 'disabled' : ''} aria-label="Свой цвет акцента">
                </div>
                <div class="md-field">
                    <label class="md-field-label" for="md-badge-input">Своя подпись бейджа</label>
                    <input type="text" id="md-badge-input" data-md-key="badgeText" value="${esc(badge)}" placeholder="Авто: СЕЙЧАС ИГРАЕМ" maxlength="40">
                </div>
            </div>

            <div class="md-actions">
                <button class="md-btn md-btn-ghost" id="md-reset" type="button">${ic('trash')} Сбросить виджет к настройкам по умолчанию</button>
            </div>

            <div class="md-hint">${ic('twitch')} Команда модератора: <code>!media cs2</code> · <code>!media on</code> · <code>!media off</code> · <code>!media &lt;ссылка&gt;</code></div>
        </section>

        <section class="md-lib-panel">
            <header class="md-lib-header">
                <div class="md-lib-top">
                    <span>Библиотека медиа</span>
                    <span class="md-badge" id="md-lib-count">0</span>
                </div>
                <div class="md-lib-tools">
                    <div class="md-search">
                        ${ic('search')}
                        <input type="text" id="md-lib-search" placeholder="Поиск: название, ID, жанр…" aria-label="Поиск по библиотеке">
                    </div>
                    <div class="md-sort" id="md-sort" data-value="${sort}">
                        <button class="md-sort-btn" type="button" id="md-sort-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Сортировка библиотеки">
                            <span class="md-sort-val" id="md-sort-val">${esc(sortLabel)}</span>
                            <span class="md-sort-caret" aria-hidden="true"></span>
                        </button>
                        <div class="md-sort-pop" id="md-sort-pop" role="listbox" aria-label="Порядок сортировки" hidden>${sortOptions}</div>
                    </div>
                </div>
                <div class="md-segment" role="group" aria-label="Категория библиотеки">
                    ${catBtn('game', 'Игры', 'alert_game')}
                    ${catBtn('series', 'Кино', 'alert_movie')}
                </div>
            </header>
            <div class="md-lib-scroll" id="md-lib-scroll">
                <div class="md-lib-grid" id="md-lib-grid"></div>
                <div class="md-lib-empty is-hidden" id="md-lib-empty">
                    ${ic('search')}
                    <div class="md-lib-empty-title">Ничего не найдено</div>
                    <div class="md-lib-empty-sub">Попробуйте другой запрос или сбросьте поиск.</div>
                    <button class="md-btn md-btn-ghost" id="md-lib-reset" type="button">Сбросить поиск</button>
                </div>
            </div>
        </section>
    </div>
    <div class="md-toasts" id="md-toasts"></div>
</div>`;
}