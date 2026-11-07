// ICU.Live Shield — bridge.js
// Pasa a la extensión el número que encontró inject.js en la página de YouTube Studio.
window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || d.__icuShield !== 1 || typeof d.channel !== 'string' || !Number.isSafeInteger(d.subscribers)) return;
  chrome.runtime.sendMessage({ type: 'subs', channel: d.channel, subscribers: d.subscribers }).catch(() => {});
});
