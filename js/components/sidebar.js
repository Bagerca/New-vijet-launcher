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
          <span class="d-flex align-center gap-sm">${icons.home()} <span class="nav-text">Дашборд</span></span>
          ${updateBadge}
        </a>
        <a href="#/widgets" class="nav-link ${isActive('#/widgets')}">
          <span class="d-flex align-center gap-sm">${icons.palette()} <span class="nav-text">Оверлеи</span></span>
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