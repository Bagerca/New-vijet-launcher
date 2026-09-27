import { icons } from '../utils/icons.js';
import { store } from '../store.js';

export function Sidebar(currentPath) {
  const isActive = (path) => currentPath === path ? 'active' : '';
  const updateInfo = store.getState().updateInfo;
  const updateBadge = updateInfo.hasUpdate ? `<span class="badge badge-update">NEW</span>` : '';
  
  return `
    <aside class="sidebar">
      <div class="brand">${icons.logo()} Stream Pack</div>
      <nav class="nav-menu">
        <a href="#/home" class="nav-link ${isActive('#/home')}">
          <span class="d-flex align-center gap-sm">${icons.home()} Дашборд</span>
          ${updateBadge}
        </a>
        <a href="#/widgets" class="nav-link ${isActive('#/widgets')}">
          <span class="d-flex align-center gap-sm">${icons.palette()} Оверлеи</span>
        </a>
        <a href="#/remote" class="nav-link ${isActive('#/remote')}">
          <span class="d-flex align-center gap-sm">${icons.remote()} Управление</span>
        </a>
        <a href="#/settings" class="nav-link ${isActive('#/settings')}">
          <span class="d-flex align-center gap-sm">${icons.settings()} Настройки</span>
        </a>
        <a href="#/guide" class="nav-link ${isActive('#/guide')}">
          <span class="d-flex align-center gap-sm">${icons.guide()} Инструкция</span>
        </a>
      </nav>
    </aside>
  `;
}