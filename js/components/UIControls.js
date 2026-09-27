export const UIControls = {
  LabelWrapper: (label, controlHtml, description = '') => `
    <label class="control-label" style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="text-medium text-primary">${label}</span>
      </div>
      ${description ? `<span class="text-sm text-muted" style="margin-top: -4px; margin-bottom: 4px; line-height: 1.4;">${description}</span>` : ''}
      ${controlHtml}
    </label>
  `,

  TextInput: (widgetId, key, val, placeholder = '') => `
    <input type="text" class="text-input" 
      data-widget="${widgetId}" data-key="${key}" 
      value="${val}" placeholder="${placeholder}"
      style="width: 100%; background: var(--bg-app); border: 1px solid var(--border-hover); padding: 12px 16px; border-radius: var(--radius-sm); color: #fff; outline: none; transition: border-color 0.2s;"
      onfocus="this.style.borderColor='var(--accent-primary)'"
      onblur="this.style.borderColor='var(--border-hover)'"
    >
  `,

  Textarea: (widgetId, key, val, placeholder = '') => `
    <textarea class="text-input" 
      data-widget="${widgetId}" data-key="${key}" placeholder="${placeholder}"
      style="width: 100%; min-height: 80px; background: var(--bg-app); border: 1px solid var(--border-hover); padding: 12px 16px; border-radius: var(--radius-sm); color: #fff; outline: none; transition: border-color 0.2s; resize: vertical; font-family: inherit;"
      onfocus="this.style.borderColor='var(--accent-primary)'"
      onblur="this.style.borderColor='var(--border-hover)'"
    >${val}</textarea>
  `,

  NumberInput: (widgetId, key, val, min = 0, max = 10000, step = 1) => `
    <input type="number" class="text-input" 
      data-widget="${widgetId}" data-key="${key}" 
      value="${val}" min="${min}" max="${max}" step="${step}"
      style="width: 100%; background: var(--bg-app); border: 1px solid var(--border-hover); padding: 12px 16px; border-radius: var(--radius-sm); color: #fff; outline: none; font-variant-numeric: tabular-nums;"
      onfocus="this.style.borderColor='var(--accent-primary)'"
      onblur="this.style.borderColor='var(--border-hover)'"
    >
  `,

  Select: (widgetId, key, val, options) => {
    const optsHtml = options.map(opt => 
      `<option value="${opt.value}" ${val === opt.value ? 'selected' : ''} style="background: var(--bg-surface);">${opt.label}</option>`
    ).join('');
    return `
      <select class="text-input" data-widget="${widgetId}" data-key="${key}" 
        style="width: 100%; background: var(--bg-app); border: 1px solid var(--border-hover); padding: 12px 16px; border-radius: var(--radius-sm); color: #fff; outline: none; cursor: pointer;">
        ${optsHtml}
      </select>
    `;
  },

  ColorInput: (widgetId, key, val) => `
    <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-app); border: 1px solid var(--border-hover); padding: 6px 12px; border-radius: var(--radius-sm);">
      <input type="color" class="color-picker" 
        data-widget="${widgetId}" data-key="${key}" 
        value="${val}"
        style="-webkit-appearance: none; border: none; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; background: transparent; padding: 0;"
      >
      <span class="text-mono text-sm" style="color: var(--text-secondary); text-transform: uppercase;">${val}</span>
    </div>
  `,

  RangeSlider: (widgetId, key, val, min = 0, max = 100) => `
    <div class="range-wrapper" style="display: flex; align-items: center; gap: 16px; width: 100%;">
      <input type="range" class="range-input" 
        data-widget="${widgetId}" data-key="${key}" 
        value="${val}" min="${min}" max="${max}"
        style="flex: 1; -webkit-appearance: none; height: 6px; background: var(--border-hover); border-radius: 4px; outline: none; accent-color: var(--accent-primary); cursor: pointer;"
      >
      <div style="background: var(--bg-app); border: 1px solid var(--border-hover); padding: 6px 12px; border-radius: 8px; min-width: 56px; text-align: center;">
        <span id="val-${widgetId}-${key}" class="text-bold" style="font-variant-numeric: tabular-nums;">${val}</span>
      </div>
    </div>
  `,

  ToggleSwitch: (widgetId, key, val, label) => {
    const isChecked = val === true || String(val) === 'true';
    // Инлайн-стили удалены, теперь работает через чистый CSS (toggle-switch-input)
    return `
      <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 8px 0;">
        <span class="text-medium">${label}</span>
        <div style="position: relative; width: 44px; height: 24px;">
          <input type="checkbox" class="toggle-switch-input" 
            data-widget="${widgetId}" data-key="${key}" 
            ${isChecked ? 'checked' : ''}
          >
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </div>
      </label>
    `;
  },

  Button: (label, action, payloadObj) => `
    <button class="btn btn-secondary btn-test-action" style="width: 100%; margin-top: 8px; border-style: dashed; color: var(--accent-primary); border-color: var(--accent-primary-dim);" 
      data-action="${action}" data-payload='${JSON.stringify(payloadObj)}'>
      ▶ ${label}
    </button>
  `
};