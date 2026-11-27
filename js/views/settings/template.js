/* ФАЙЛ: js/views/settings/template.js — v1 (разметка страницы настроек; стили в css/views/settings.css) */
import { icons } from '../../utils/icons.js';
import { renderCard, escapeHtml } from '../../components/externalSources/card.js';

export function renderTemplate(state, extState) {
  const twitchChannel = state.config.twitchChannel || '';
  const obsPath = state.config.obsPath || '';
  const githubRepo = state.config.githubRepo || 'Bagerca/New-vijet-launcher';
  const isEnvOK = Boolean(state.isElectronEnv);

  return `
<header class="view-header">
  <h1 class="view-title">Настройки ядра</h1>
  <p class="view-subtitle">Системные параметры, интеграции и внешние источники.</p>
</header>

<section class="card mb-md">
  <header class="set-card-head">
    <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.twitch()} Интеграция Twitch</h3>
    <p class="text-secondary text-sm">Имя канала для парсинга чата, алертов и команд модераторов.</p>
  </header>
  <form class="input-row" onsubmit="return false;">
    <input type="text" id="twitch-input" class="text-input" value="${escapeHtml(twitchChannel)}" placeholder="Например: ksusha__sher" aria-label="Имя канала Twitch" />
    <button id="btn-save-twitch" class="btn btn-primary" type="button">Сохранить</button>
  </form>
</section>

<section class="card mb-md">
  <header class="set-card-head">
    <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.sync()} Сервер обновлений</h3>
    <p class="text-secondary text-sm">Репозиторий, откуда лаунчер скачивает новые виджеты. Сама проверка и установка находится на вкладке Дашборда.</p>
  </header>
  <div class="input-row">
    <input type="text" id="repo-input" class="text-input" value="${escapeHtml(githubRepo)}" placeholder="Bagerca/New-vijet-launcher" aria-label="Репозиторий обновлений" />
    <button id="btn-save-repo" class="btn btn-secondary" type="button">Изменить</button>
  </div>
</section>

<section class="card mb-md">
  <header class="set-card-head">
    <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.settings()} Путь к OBS Studio (obs64.exe)</h3>
    <p class="text-secondary text-sm">Если автопоиск при инициализации не сработал, укажите путь вручную.</p>
  </header>
  <div class="input-row">
    <input type="text" id="obs-path-input" class="text-input" readonly value="${escapeHtml(obsPath || 'Автопоиск активен')}" aria-label="Путь к obs64.exe" />
    <button id="btn-browse" class="btn btn-secondary" type="button" ${!isEnvOK ? 'disabled' : ''}>Обзор...</button>
  </div>
</section>

<div id="external-card-slot">${renderCard(extState, isEnvOK)}</div>

<section class="card mb-md">
  <header class="set-card-head">
    <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.box()} Инструменты разработчика</h3>
    <p class="text-secondary text-sm">Создание бэкапов и кастомных лейаутов.</p>
  </header>
  <div class="input-row">
    <button id="btn-export-layout" class="btn btn-secondary" type="button" ${!isEnvOK ? 'disabled' : ''}>
      ${icons.copy()} Экспорт текущей раскладки сцен OBS (JSON)
    </button>
  </div>
</section>
`;
}