/* ФАЙЛ: js/views/settingsView.js — v3 (тонкий оркестратор: разметка + системные биндинги + компонент внешних источников) */
import { renderTemplate } from './settings/template.js';
import { coreBindings } from './settings/coreBindings.js';
import { externalSources } from '../components/externalSources/controller.js';

export const SettingsView = {
  render: (state) => renderTemplate(state, externalSources.state),

  mount: (params, state) => {
    coreBindings.mount(state);
    externalSources.mount(state);
  },

  unmount: () => {
    coreBindings.unmount();
    externalSources.unmount();
  }
};