/* ФАЙЛ: js/components/sidebar.js — v2 (счётчик очереди на перенос у «Оверлеев (Старые)») */
import { icons } from '../utils/icons.js';
import { store } from '../store.js';
import { migrationStats } from '../../data/v2Registry.js';

export function Sidebar(currentPath) {
  const isActive = (path) => currentPath === path ? 'active' : '';
  const state = store.getState();
  const updateInfo = state.updateInfo;
  const updateBadge = updateInfo.hasUpdate ? `<span class="badge badge-update">NEW</span>` : '';

  let queueBadge = '';
  try {
    const stats = migrationStats(state.widgetsManifest);
    if (stats.todoCount > 0) {
      queueBadge = `<span class="nav-count" title="Виджетов без дашборда 2.0: ${stats.todoCount}">${stats.todoCount}</span>`;
    }
  } catch (e) {
    console.warn('[Sidebar] Не удалось посчитать очередь переноса:', e);
  }

  return `
<aside class="sidebar">
<div class="brand">${icons.logo()} Stream Pack</div>
<nav class="nav-menu">
<a href="#/home" class="nav-link ${isActive('#/home')}">
<span class="d-flex align-center gap-sm">${icons.home()} <span class="nav-text">Дашборд</span></span>
${updateBadge}
</a>
<a href="#/widgets" class="nav-link ${isActive('#/widgets')}">
<span class="d-flex align-center gap-sm">${icons.palette()} <span class="nav-text">Оверлеи (Старые)</span></span>
${queueBadge}
</a>
<a href="#/widgets-v2" class="nav-link ${isActive('#/widgets-v2')}" style="color: var(--accent-primary);">
<span class="d-flex align-center gap-sm">${icons.layers()} <span class="nav-text">Оверлеи 2.0 (Бета)</span></span>
</a>
<a href="#/remote" class="nav-link ${isActive('#/remote')}">
<span class="d-flex align-center gap-sm">${icons.remote()} <span class="nav-text">Управление</span></span>
</a>
<a href="#/settings" class="nav-link ${isActive('#/settings')}">
<span class="d-flex align-center gap-sm">${icons.settings()} <span class="nav-text">Настройки</span></span>
</a>
<a href="#/guide" class="nav-link ${isActive('#/guide')}">
<span class="d-flex align-center gap-sm">${icons.guide()} <span class="nav-text">Инструкция</span></span>
</a>
</nav>
</aside>
`;
}