// ICU.Live Shield — link-page.js
// En la página de vinculación de ICU.Live (el enlace del QR) toma el código y vincula la extensión sola.
(() => {
  const el = document.getElementById('icu-shield-code');
  const out = document.getElementById('icu-shield');
  const code = el && el.dataset.code;
  if (!code || !out) return;
  out.textContent = 'Vinculando…';
  chrome.runtime.sendMessage({ type: 'link', code }).then((r) => {
    if (r && r.ok) {
      out.dataset.state = 'ok';
      out.textContent = '🛡️ Extensión vinculada' + (r.channel ? ' con ' + r.channel : '') + '. Abrí YouTube Studio para que envíe tus suscriptores.';
    } else {
      out.dataset.state = 'error';
      out.textContent = 'No se pudo vincular: el código venció o ya se usó. Generá uno nuevo en el panel de ICU.Live.';
    }
  }).catch(() => {
    out.dataset.state = 'error';
    out.textContent = 'No se pudo vincular. Probá de nuevo en unos minutos.';
  });
})();
