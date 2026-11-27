/* ФАЙЛ: js/utils/clipboard.js — v1 (надёжное копирование: Clipboard API + fallback для file://) */

/**
 * Копирует текст в буфер обмена. Возвращает true/false, никогда не бросает.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (e) {
        console.warn('[clipboard] Clipboard API недоступен, использую fallback:', e);
    }

    let ta = null;
    try {
        ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, value.length);
        const ok = document.execCommand('copy');
        if (!ok) console.warn('[clipboard] execCommand(copy) вернул false');
        return ok;
    } catch (e) {
        console.error('[clipboard] Копирование не удалось:', e);
        return false;
    } finally {
        if (ta && ta.parentNode) ta.remove();
    }
}