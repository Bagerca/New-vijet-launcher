/* ФАЙЛ: data/v2Registry.js — v1 (единый реестр «Оверлеев 2.0»: какие виджеты уже перенесены) */

/**
 * Единственный источник правды о дашбордах 2.0.
 * Его читают: js/views/widgetsV2View.js (навигация и загрузка модулей)
 * и js/views/widgetsView.js + sidebar (очередь на перенос).
 *
 * covers — какие записи widgetsManifest закрывает дашборд.
 * Один дашборд может закрывать несколько виджетов (frame закрывает и лису).
 * Добавил новый дашборд в widgets/<id>/dashboard/Dashboard.js — допиши строку сюда,
 * и старый список сам уберёт виджет из очереди.
 */
const RAW_DASHBOARDS = [
  { id: 'player', ownParams: ['demo'], covers: [{ id: 'player', label: 'Медиаплеер' }] },
  { id: 'media', ownParams: ['cat', 'sort'], covers: [{ id: 'media', label: 'Карточка активности' }] },
  { id: 'socials', ownParams: [], covers: [{ id: 'socials', label: 'Ротатор соцсетей' }] },
  { id: 'deaths', ownParams: [], covers: [{ id: 'deaths', label: 'Счётчик смертей' }] },
  { id: 'chat', ownParams: ['view'], covers: [{ id: 'chat', label: 'Чат Twitch' }] },
  {
    id: 'frame',
    ownParams: [],
    covers: [
      { id: 'frame', label: 'Рамка вебки' },
      { id: 'pet', label: 'Лиса-питомец' }
    ]
  },
  { id: 'alerts', ownParams: [], covers: [{ id: 'alerts', label: 'Оповещения' }] }
];

export const V2_DASHBOARDS = RAW_DASHBOARDS.map((d) => {
  const id = String(d.id || '').toLowerCase();
  const covers = (Array.isArray(d.covers) && d.covers.length ? d.covers : [{ id, label: id }])
    .map(c => ({ id: String(c.id || '').toLowerCase(), label: String(c.label || c.id) }))
    .filter(c => Boolean(c.id));
  return {
    id,
    ownParams: Array.isArray(d.ownParams) ? d.ownParams.slice() : [],
    covers
  };
}).filter(d => Boolean(d.id));

export const V2_IDS = V2_DASHBOARDS.map(d => d.id);
export const V2_DEFAULT_ID = V2_IDS[0] || 'player';

/** manifestId → { dashboard, label } */
export const MIGRATION_MAP = (() => {
  const map = new Map();
  V2_DASHBOARDS.forEach(d => {
    d.covers.forEach(c => {
      if (!map.has(c.id)) map.set(c.id, { dashboard: d.id, label: c.label });
    });
  });
  return map;
})();

function key(id) { return String(id || '').toLowerCase(); }

/** Есть ли у id собственный дашборд (файл widgets/<id>/dashboard/Dashboard.js). */
export function hasDashboard(id) { return V2_IDS.includes(key(id)); }

/** Закрыт ли виджет новым интерфейсом (в том числе чужим дашбордом). */
export function isMigrated(id) { return MIGRATION_MAP.has(key(id)); }

export function migrationOf(id) { return MIGRATION_MAP.get(key(id)) || null; }

export function dashboardEntry(id) { return V2_DASHBOARDS.find(d => d.id === key(id)) || null; }

/** Deep link на нужный дашборд 2.0 (для лисы ведёт на frame). */
export function v2Href(id) {
  const mig = migrationOf(id);
  const target = mig ? mig.dashboard : (hasDashboard(id) ? key(id) : V2_DEFAULT_ID);
  return `#/widgets-v2?id=${encodeURIComponent(target)}`;
}

/**
 * Сводка переноса по манифесту.
 * @param {Array} manifest state.widgetsManifest
 */
export function migrationStats(manifest) {
  const list = Array.isArray(manifest) ? manifest : [];
  const done = [];
  const todo = [];
  list.forEach(w => { (isMigrated(w && w.id) ? done : todo).push(w); });
  const total = list.length;
  const percent = total ? Math.round((done.length / total) * 100) : 0;
  return { total, done, todo, doneCount: done.length, todoCount: todo.length, percent };
}

/** Короткие подписи перенесённых виджетов для чипов. */
export function migratedChips(manifest) {
  const list = Array.isArray(manifest) ? manifest : [];
  return list.filter(w => isMigrated(w && w.id)).map(w => ({
    id: w.id,
    label: (migrationOf(w.id) || {}).label || w.title || w.id,
    href: v2Href(w.id)
  }));
}