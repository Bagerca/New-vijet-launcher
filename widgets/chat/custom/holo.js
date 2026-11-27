/* ФАЙЛ: widgets/chat/custom/holo.js — v1 (референсный персональный бабл «Голограмма»: свой скелет + CSS + эффекты) */
import { registerSkin } from '../skins.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

registerSkin({
	id: 'holo',
	title: 'Голограмма',
	hint: 'Персональный HUD-бабл: проекция со скобками, скан-линией и искрами. Аватар-гексагон справа.',
	tone: 'dark',
	usesBg: false,
	css: new URL('./holo.css', import.meta.url).href,

	template(meta, parts) {
		return `
<div class="holo-frame">
	<span class="holo-corner holo-tl"></span><span class="holo-corner holo-tr"></span>
	<span class="holo-corner holo-bl"></span><span class="holo-corner holo-br"></span>
	<span class="holo-scan"></span>
	${parts.flag}
	<header class="chat-head holo-head">
		<span class="chat-identity"><span class="chat-user"></span><span class="chat-badges">${parts.badges}</span></span>
		<time class="chat-time">${esc(meta.time)}</time>
		<span class="chat-avatar-slot holo-avatar-slot"><span class="chat-avatar"></span><span class="chat-avatar-ring"></span></span>
	</header>
	${parts.reply}
	<div class="chat-text holo-text"><span class="chat-text-inner">${meta.html}</span></div>
	<footer class="holo-foot"><span class="holo-dot"></span><span class="holo-tag">Holo·Link // Personal</span></footer>
</div>`;
	},

	effects: {
		onMount(el) {
			const frame = el.querySelector('.holo-frame');
			if (!frame) return;
			frame.style.setProperty('--holo-delay', `-${(Math.random() * 3).toFixed(2)}s`);
			for (let i = 0; i < 3; i++) {
				const spark = document.createElement('span');
				spark.className = 'holo-spark';
				spark.style.setProperty('--spark-x', `${15 + Math.random() * 70}%`);
				spark.style.setProperty('--spark-delay', `${(Math.random() * 0.3).toFixed(2)}s`);
				frame.appendChild(spark);
			}
		},
		onUnmount(el) {
			el.querySelectorAll('.holo-spark').forEach(s => s.remove());
		}
	}
});