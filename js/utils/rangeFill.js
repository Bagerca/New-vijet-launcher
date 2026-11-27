/* ФАЙЛ: js/utils/rangeFill.js — v1 (неоновая заливка ползунков слева от thumb) */

/**
 * Красит дорожку input[type=range] через CSS-переменную --range-fill.
 * Работает в паре с градиентом в CSS (см. .form-range и .pd-slider-row input).
 * @param {HTMLInputElement} input
 */
export function paintRange(input) {
    try {
        if (!input || input.type !== 'range') return;
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const val = Number(input.value);
        const span = max - min;
        const pct = span > 0 ? ((val - min) / span) * 100 : 0;
        const safe = Math.max(0, Math.min(100, pct));
        input.style.setProperty('--range-fill', `${safe.toFixed(2)}%`);
    } catch (e) {
        console.warn('[rangeFill] Не удалось закрасить ползунок:', e);
    }
}

/**
 * Красит все ползунки внутри контейнера (например, при монтировании экрана).
 * @param {ParentNode} root
 */
export function paintRanges(root = document) {
    try {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        root.querySelectorAll('input[type="range"]').forEach(paintRange);
    } catch (e) {
        console.warn('[rangeFill] paintRanges:', e);
    }
}   