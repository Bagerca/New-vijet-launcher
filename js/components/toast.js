/* ФАЙЛ: js/components/toast.js — v5 */
export class Toast {
constructor(container, { duration = 3200, className = 'pd-toast' } = {}) {
this.container = container;
this.duration = duration;
this.className = className;
}

show(text, type = 'info') {
if (!this.container) return;
const el = document.createElement('div');
el.className = `${this.className} ${type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : ''}`;
el.textContent = text;
this.container.appendChild(el);
setTimeout(() => {
el.classList.add('is-out');
setTimeout(() => el.remove(), 350);
}, this.duration);
}

success(text) { this.show(text, 'success'); }
error(text) { this.show(text, 'error'); }
info(text) { this.show(text, 'info'); }
}