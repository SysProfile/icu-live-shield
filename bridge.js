// ICU.Live Shield — bridge.js
// Pasa a la extensión el número que encontró inject.js en la página de YouTube Studio, y en qué página de Studio está
// esta pestaña y si se está viendo: si se mira Studio fuera del recuento de suscriptores en tiempo real, el LED titila
// en ámbar para avisar que así no se envía nada. Sin temporizadores: sólo eventos de la página.
const isSubsPage = (href) => /[?&]explore_type=SUBSCRIBERS\b/.test(href);

// Web Lock que mantiene despierta la pestaña: Chrome no congela una página que tiene uno tomado (Sergio, 07/11/2026:
// «no permitir que se apague la ventana que está enviando»). Se toma sólo en el recuento y mientras la extensión envía;
// se suelta al salir del recuento o con «No enviar». El descarte de la pestaña lo evita la extensión (autoDiscardable).
let releaseLock = null;
function keepAwake(on) {
  if (on && !releaseLock && navigator.locks) {
    navigator.locks.request('icu-shield-' + Math.random().toString(36).slice(2), () => new Promise((resolve) => { releaseLock = resolve; })).catch(() => {});
  } else if (!on && releaseLock) { releaseLock(); releaseLock = null; }
}

// Envío seguro a la extensión: si la extensión se recargó o actualizó con esta pestaña abierta, este script queda
// huérfano y chrome.runtime falla al instante (no con la promesa). Entonces deja de intentar y suelta el Web Lock; al
// recargar la pestaña vuelve a funcionar con la extensión nueva.
let orphan = false;
function send(msg) {
  if (orphan) return Promise.resolve(null);
  try {
    if (!chrome.runtime || !chrome.runtime.id) throw new Error('extensión recargada');
    return chrome.runtime.sendMessage(msg).catch(() => null);
  } catch (e) {
    orphan = true;
    keepAwake(false);
    return Promise.resolve(null);
  }
}

function page(href) {
  const subs = isSubsPage(href || location.href);
  send({ type: 'page', subs, visible: document.visibilityState === 'visible' }).then((r) => keepAwake(!!(subs && r && r.sending)));
}
// La extensión avisa cuando se toca «Enviar» / «No enviar» o se vincula o desvincula
try { chrome.runtime.onMessage.addListener((m) => { if (m && m.type === 'recheck') page(); }); } catch (e) { orphan = true; }

window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d) return;
  if (d.__icuShield === 2 && typeof d.href === 'string') { page(d.href); return; }   // navegación dentro de Studio
  if (d.__icuShield !== 1 || typeof d.channel !== 'string' || !Number.isSafeInteger(d.subscribers)) return;
  send({ type: 'subs', channel: d.channel, subscribers: d.subscribers });
});
document.addEventListener('visibilitychange', () => page());
window.addEventListener('pagehide', () => { send({ type: 'page', gone: true }); });
// Pestaña dormida por el navegador (Page Lifecycle): congelada no envía; al despertar vuelve a avisar
document.addEventListener('freeze', () => { send({ type: 'page', gone: true }); });
document.addEventListener('resume', () => page());
page();
