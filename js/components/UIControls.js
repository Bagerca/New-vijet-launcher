export const UIControls = {
  LabelWrapper: (label, controlHtml, description = '') => `
    <label class="control-group">
      <div class="control-header">
        <span class="control-title">${label}</span>
      </div>
      ${description ? `<span class="control-desc">${description}</span>` : ''}
      ${controlHtml}
    </label>
  `,

  TextInput: (widgetId, key, val, placeholder = '') => `
    <input type="text" class="form-input" 
      data-widget="${widgetId}" data-key="${key}" 
      value="${val}" placeholder="${placeholder}">
  `,

  Textarea: (widgetId, key, val, placeholder = '') => `
    <textarea class="form-textarea" 
      data-widget="${widgetId}" data-key="${key}" placeholder="${placeholder}">${val}</textarea>
  `,

  NumberInput: (widgetId, key, val, min = 0, max = 10000, step = 1) => `
    <input type="number" class="form-input numeric" 
      data-widget="${widgetId}" data-key="${key}" 
      value="${val}" min="${min}" max="${max}" step="${step}">
  `,

  Select: (widgetId, key, val, options) => {
    const optsHtml = options.map(opt => 
      `<option value="${opt.value}" ${val === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    return `
      <select class="form-input form-select" data-widget="${widgetId}" data-key="${key}">
        ${optsHtml}
      </select>
    `;
  },

  ColorInput: (widgetId, key, val) => `
    <div class="color-input-wrapper">
      <input type="color" class="form-color-picker" 
        data-widget="${widgetId}" data-key="${key}" value="${val}">
      <span class="color-hex-label">${val}</span>
    </div>
  `,

  RangeSlider: (widgetId, key, val, min = 0, max = 100) => `
    <div class="range-wrapper">
      <input type="range" class="form-range" 
        data-widget="${widgetId}" data-key="${key}" 
        value="${val}" min="${min}" max="${max}">
      <div class="range-value">
        <span id="val-${widgetId}-${key}">${val}</span>
      </div>
    </div>
  `,

  ToggleSwitch: (widgetId, key, val, label) => {
    const isChecked = val === true || String(val) === 'true';
    return `
      <label class="toggle-wrapper control-group">
        <span class="toggle-label">${label}</span>
        <div class="toggle-switch-container">
          <input type="checkbox" class="toggle-switch-input" 
            data-widget="${widgetId}" data-key="${key}" ${isChecked ? 'checked' : ''}>
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </div>
      </label>
    `;
  },

  Button: (label, action, payloadObj) => `
    <button class="btn btn-secondary btn-test-action" 
      data-action="${action}" data-payload='${JSON.stringify(payloadObj)}'>
      ▶ ${label}
    </button>
  `
};