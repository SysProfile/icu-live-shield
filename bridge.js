// ICU.Live Shield — bridge.js
// Pasa a la extensión el número que encontró inject.js en la página de YouTube Studio, y en qué página de Studio está
// esta pestaña y si se está viendo: si se mira Studio fuera del recuento de suscriptores en tiempo real, el LED titila
// en ámbar para avisar que así no se envía nada. Sin temporizadores: sólo eventos de la página.
const isSubsPage = (href) => /[?&]explore_type=SUBSCRIBERS\b/.test(href);

// Que el navegador no duerma (congele) esta pestaña mientras está en el recuento y la extensión envía: Chrome no congela
// una página que tiene un Web Lock tomado (Sergio, 07/11/2026: «no permitir que se apague la ventana que está enviando»).
// Se suelta al salir del recuento o con «No enviar». El descarte de la pestaña lo evita la extensión (autoDiscardable).
let releaseLock = null;
function keepAwake(on) {
  if (on && !releaseLock && navigator.locks) {
    navigator.locks.request('icu-shield-' + Math.random().toString(36).slice(2), () => new Promise((resolve) => { releaseLock = resolve; })).catch(() => {});
  } else if (!on && releaseLock) { releaseLock(); releaseLock = null; }
}

function page(href) {
  const subs = isSubsPage(href || location.href);
  chrome.runtime.sendMessage({ type: 'page', subs, visible: document.visibilityState === 'visible' })
    .then((r) => keepAwake(subs && r && r.sending)).catch(() => {});
}
// La extensión avisa cuando se toca «Enviar» / «No enviar» o se vincula o desvincula
chrome.runtime.onMessage.addListener((m) => { if (m && m.type === 'recheck') page(); });

window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d) return;
  if (d.__icuShield === 2 && typeof d.href === 'string') { page(d.href); return; }   // navegación dentro de Studio
  if (d.__icuShield !== 1 || typeof d.channel !== 'string' || !Number.isSafeInteger(d.subscribers)) return;
  chrome.runtime.sendMessage({ type: 'subs', channel: d.channel, subscribers: d.subscribers }).catch(() => {});
});
document.addEventListener('visibilitychange', () => page());
window.addEventListener('pagehide', () => { chrome.runtime.sendMessage({ type: 'page', gone: true }).catch(() => {}); });
// Pestaña dormida por el navegador (Page Lifecycle): congelada no envía; al despertar vuelve a avisar
document.addEventListener('freeze', () => { chrome.runtime.sendMessage({ type: 'page', gone: true }).catch(() => {}); });
document.addEventListener('resume', () => page());
page();
