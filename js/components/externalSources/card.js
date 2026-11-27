/* ФАЙЛ: js/components/externalSources/card.js — v1 (чистая разметка карточки внешних источников) */
import { icons } from '../../utils/icons.js';

export const EXT_DEFAULTS = {
  loading: false,
  importing: false,
  supported: true,
  exists: false,
  ok: false,
  enabled: false,
  path: '',
  fileName: 'external-sources.json',
  exampleExists: false,
  count: 0,
  activeCount: 0,
  scenes: [],
  sources: [],
  errors: [],
  warnings: [],
  applying: false,
  lastResult: null
};

export const MAX_KEY_BYTES = 1024 * 1024;

const MONITOR_FALLBACK = {
  both: 'МОНИТОР+ЭФИР',
  monitor: 'ТОЛЬКО СТРИМЕР',
  stream: 'ТОЛЬКО ЭФИР'
};

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(cls, text) {
  return `<span class="st-badge ${cls}"><span class="st-badge-dot"></span>${escapeHtml(text)}</span>`;
}

function renderSourceRow(src) {
  const t = src.transform || {};
  const sx = Number(t.scaleX ?? 1);
  const sy = Number(t.scaleY ?? 1);
  const onScreenW = Math.round((src.width || 0) * Math.abs(sx));
  const onScreenH = Math.round((src.height || 0) * Math.abs(sy));
  const scenesCount = Array.isArray(src.scenes) ? src.scenes.length : 0;
  const monitor = src.monitor || 'both';
  const monitorLabel = src.monitorLabel || MONITOR_FALLBACK[monitor] || monitor;
  const monitorCls = monitor === 'both' ? 'is-ok' : (monitor === 'monitor' ? 'is-info' : '');
  const needsReroute = src.rerouteAudio === false && monitor !== 'stream';

  return `
<article class="st-src ${src.enabled ? '' : 'is-off'}">
  <span class="st-src-ic">${icons.globe()}</span>
  <div class="st-src-body">
    <div class="st-src-name">${escapeHtml(src.name)}</div>
    <div class="st-src-url">${escapeHtml(src.url)}</div>
    <div class="st-src-meta">
      <span class="st-tag">${src.width}×${src.height}</span>
      <span class="st-tag">X ${t.positionX ?? 0} · Y ${t.positionY ?? 0}</span>
      <span class="st-tag">SCALE ${sx}</span>
      <span class="st-tag">НА ЭКРАНЕ ${onScreenW}×${onScreenH}</span>
      <span class="st-tag">СЦЕН: ${scenesCount}</span>
      <span class="st-tag ${monitorCls}">ЗВУК: ${escapeHtml(monitorLabel)}</span>
      ${needsReroute ? '<span class="st-tag is-warn">НУЖЕН REROUTE_AUDIO</span>' : ''}
      <span class="st-tag ${src.enabled ? 'is-ok' : 'is-off'}">${src.enabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
    </div>
    ${src.note ? `<div class="st-src-note">${escapeHtml(src.note)}</div>` : ''}
  </div>
</article>`;
}

function renderDropzone(e, supported) {
  const title = e.importing
    ? 'Читаю и проверяю файл…'
    : (e.exists ? 'Перетащите новый файл-ключ, чтобы заменить текущий' : 'Перетащите файл-ключ сюда');
  const sub = e.importing
    ? 'JSON проверяется до записи — рабочий ключ не будет затёрт битым файлом.'
    : (e.exists
      ? 'или нажмите, чтобы выбрать .json (≤ 1 МБ). Старый ключ уйдёт в external-sources.backup.json.'
      : 'или нажмите, чтобы выбрать .json (≤ 1 МБ). Файл ляжет в data/external-sources.json и останется только на этом ПК.');

  return `
<div id="ext-dropzone" class="st-drop ${!supported ? 'is-disabled' : ''} ${e.importing ? 'is-busy' : ''}" role="button" tabindex="${supported ? '0' : '-1'}" aria-label="Импорт файла-ключа внешних источников">
  <span class="st-drop-ic">${e.importing ? icons.sync() : icons.box()}</span>
  <span class="st-drop-body">
    <span class="st-drop-title">${escapeHtml(title)}</span>
    <span class="st-drop-sub">${escapeHtml(sub)}</span>
  </span>
  <input type="file" id="ext-file-input" accept=".json,application/json" hidden>
</div>`;
}

export function renderCard(extRaw, isEnvOK) {
  const e = { ...EXT_DEFAULTS, ...(extRaw || {}) };
  const busy = Boolean(e.applying || e.loading || e.importing);
  const supported = Boolean(isEnvOK) && e.supported;
  const canApply = supported && e.exists && e.ok && e.enabled && e.count > 0 && !busy;

  const badges = [];
  if (!supported) badges.push(badge('is-off', 'ТОЛЬКО В ЛАУНЧЕРЕ'));
  else if (e.loading) badges.push(badge('is-info', 'ЧТЕНИЕ ФАЙЛА…'));
  else {
    badges.push(badge(e.exists ? 'is-ok' : 'is-off', e.exists ? 'ФАЙЛ НАЙДЕН' : 'ФАЙЛА НЕТ'));
    if (e.exists) badges.push(badge(e.ok ? 'is-ok' : 'is-error', e.ok ? 'КОНФИГ ВАЛИДЕН' : 'ОШИБКИ В JSON'));
    if (e.exists && e.ok) badges.push(badge(e.enabled ? 'is-ok' : 'is-warn', e.enabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'));
    if (e.count > 0) badges.push(badge('is-info', `${e.activeCount} / ${e.count} ИСТОЧНИКОВ`));
  }

  const errorsHtml = (e.errors || []).length
    ? `<div class="st-msg is-error"><b>Ошибки конфигурации:</b><ul class="st-list">${e.errors.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
    : '';
  const warningsHtml = (e.warnings || []).length
    ? `<div class="st-msg is-warn"><b>Предупреждения:</b><ul class="st-list">${e.warnings.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`
    : '';

  let bodyHtml = '';
  if (!supported) {
    bodyHtml = `<div class="st-empty">Управление внешними источниками доступно только в лаунчере (Electron). В браузере файл прочитать и записать нельзя.</div>`;
  } else if (e.loading) {
    bodyHtml = `<div class="st-empty">Читаю локальный ключ…</div>`;
  } else if (!e.exists) {
    bodyHtml = `
<div class="st-empty">
  <div class="st-empty-title">Локальный ключ не создан</div>
  <div>Перетащите готовый файл-ключ в зону выше, нажмите «Создать из шаблона» или выберите .json кликом. Ссылки DonationAlerts, Twitch и MemeAlerts берутся только из этого файла.</div>
</div>`;
  } else if (e.ok && e.sources.length === 0) {
    bodyHtml = `<div class="st-empty">Файл прочитан, но массив <code class="st-code">sources</code> пуст.</div>`;
  } else if (e.sources.length > 0) {
    bodyHtml = `<div class="st-ext-list">${e.sources.map(renderSourceRow).join('')}</div>`;
  }

  const resultHtml = e.lastResult
    ? `<div class="st-msg ${e.lastResult.ok ? 'is-ok' : (e.lastResult.level === 'error' ? 'is-error' : 'is-warn')}">${escapeHtml(e.lastResult.text)}</div>`
    : '';

  return `
<section class="card mb-md">
  <header class="st-ext-head">
    <div>
      <h3 class="text-lg mb-xs d-flex align-center gap-sm">${icons.globe()} Внешние источники</h3>
      <p class="text-secondary text-sm st-lede">
        DonationAlerts, Twitch AlertBox, MemeAlerts и любые другие браузер-виджеты.
        Ссылки и координаты берутся из локального файла стримера — он <b class="st-strong">не сохраняется в проекте</b> и не попадает в GitHub.
        Токены ниже скрыты специально. Звук по умолчанию слышат и стример, и зрители.
      </p>
    </div>
  </header>
  <div class="st-badges">${badges.join('')}</div>
  ${renderDropzone(e, supported)}
  ${errorsHtml}
  ${warningsHtml}
  ${bodyHtml}
  ${resultHtml}
  <div class="st-actions">
    <button id="btn-external-apply" class="btn btn-primary" ${canApply ? '' : 'disabled'}>
      ${e.applying ? 'Применяю…' : 'Применить в OBS'}
    </button>
    <button id="btn-external-refresh" class="btn btn-secondary" ${!supported || busy ? 'disabled' : ''}>Обновить</button>
    ${supported && !e.exists && e.exampleExists ? `<button id="btn-external-create" class="btn btn-secondary" ${busy ? 'disabled' : ''}>Создать из шаблона</button>` : ''}
    <button id="btn-external-reveal" class="btn btn-secondary" ${!supported || busy ? 'disabled' : ''}>Показать файл</button>
  </div>
  <div class="st-path mt-md">
    ${icons.lock()} <span>${escapeHtml(e.path || 'data/external-sources.json')}</span>
  </div>
  <p class="text-muted text-sm mt-sm st-lede">
    Порядок источников в файле = порядок слоёв: последний лежит выше всех.
    Координаты правятся прямо в JSON, затем «Применить в OBS» — перезапуск лаунчера не нужен.
  </p>
  <p class="text-muted text-sm mt-sm st-lede">
    Самопрослушивание: <code class="st-code">monitor: "both"</code> — слышат стример и зрители, <code class="st-code">"stream"</code> — только зрители, <code class="st-code">"monitor"</code> — только стример.
    Устройство прослушивания задаётся в OBS → Настройки → Звук → Дополнительно; выберите наушники, чтобы мониторинг не попал в захват рабочего стола.
  </p>
</section>`;
}