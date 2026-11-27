import { store } from '../store.js';
import { icons } from '../utils/icons.js';
export const GuideView = {
render: (state) => {
// Автоматическая генерация списка команд из манифеста
const commandsListHtml = state.widgetsManifest.map(widget => {
const cmdsHtml = widget.controls
.filter(c => c.cmd)
.map(c => `
<li style="margin-bottom: 8px;">
<code style="background: var(--bg-surface-hover); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${c.cmd}</code>
<span style="color: var(--text-secondary);">— ${c.label}</span>
</li>
`).join('');
if (!cmdsHtml) return '';
return `
<div style="margin-bottom: 24px;">
<h4 style="color: var(--text-primary); margin-bottom: 12px; font-size: 16px;">${widget.title}</h4>
<ul style="list-style-type: none; padding-left: 0; margin: 0;">${cmdsHtml}</ul>
</div>
`;
}).join('');
const sysCmd = (cmd, desc) => `
<li style="margin-bottom: 8px;">
<code style="background: var(--bg-surface-hover); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${cmd}</code>
<span style="color: var(--text-secondary);">— ${desc}</span>
</li>`;
return `
<header class="view-header">
<h1 class="view-title">Документация и Команды</h1>
<p class="view-subtitle">Все функции лаунчера доступны для модераторов прямо из Twitch-чата.</p>
</header>
<div class="card mb-md">
<h3 class="text-lg mb-md text-bold d-flex align-center gap-sm border-bottom pb-sm">
${icons.obs()} Подключение к OBS Studio
</h3>
<ol class="guide-list" style="color: var(--text-secondary); line-height: 1.6; padding-left: 20px;">
<li style="margin-bottom: 8px;"><strong>Версия:</strong> Убедитесь, что у вас установлен OBS Studio 28+ (WebSocket v5 встроен по умолчанию).</li>
<li style="margin-bottom: 8px;"><strong>Настройки:</strong> В верхнем меню OBS выберите <span style="color: var(--text-primary);">Инструменты -> Настройки сервера WebSocket</span>.</li>
<li style="margin-bottom: 8px;"><strong>Параметры:</strong> Включите сервер (порт <code style="background: var(--bg-surface-hover); padding: 2px 6px; border-radius: 4px;">4455</code>). <strong>ОБЯЗАТЕЛЬНО снимите галочку аутентификации</strong>.</li>
<li style="margin-bottom: 8px;"><strong>Инициализация:</strong> Перейдите на вкладку "Дашборд" и нажмите "Авто-настройка OBS". Лаунчер сам создаст 4 базовые сцены и разместит виджеты.</li>
</ol>
</div>
<div class="card mb-md" style="border-color: var(--accent-glow);">
<h3 class="text-lg mb-md text-bold d-flex align-center gap-sm border-bottom pb-sm">
${icons.sync()} Горячее обновление сцен (без перезапуска)
</h3>
<p class="text-secondary mb-md" style="line-height: 1.6;">
Сцены обновляются отдельно от ядра лаунчера: <strong style="color: var(--text-primary);">Дашборд → Пак сцен → Проверить → Обновить сцены</strong>.
После установки OBS-источники перезагружаются автоматически — лаунчер и OBS не перезапускаются, стрим не прерывается.
Плеер пропускается, чтобы не рвать музыку. Откат к предыдущей версии — кнопка «Откат» там же.
</p>
<ul style="list-style-type: none; padding-left: 0; margin: 0;">
${sysCmd('!refresh', 'перезагрузить все виджеты в OBS, кроме плеера')}
${sysCmd('!refresh media chat', 'перезагрузить только перечисленные виджеты')}
${sysCmd('!refresh player', 'явно перезагрузить плеер (музыка продолжится с той же секунды)')}
${sysCmd('!refresh all', 'то же, что !refresh')}
</ul>
<p class="text-muted text-sm mt-md">Кулдаун 8 секунд между перезагрузками. Команды работают только для модераторов и стримера. Кнопки: «Перезагрузить сцены» на Дашборде, в сайдбаре «Оверлеи 2.0» и в мобильной панели.</p>
</div>
<div class="card">
<h3 class="text-lg mb-md text-bold d-flex align-center gap-sm border-bottom pb-sm">
${icons.twitch()} Глобальные чат-команды модераторов
</h3>
<p class="text-secondary mb-lg">Модераторы могут настраивать оверлей прямо во время стрима. После команды пишется значение (например, <code>!vol 40</code> или <code>!blur on</code>).</p>
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
${commandsListHtml}
</div>
</div>
`;
},
mount: () => {},
unmount: () => {}
};