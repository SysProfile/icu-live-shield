// ICU.Live Shield — link-page.js
// En la página de vinculación de ICU.Live (el enlace del QR) toma el código y vincula la extensión sola.
// Textos en el idioma del navegador (_locales).
(async () => {
  await icuLoadLang();   // i18n.js: el idioma elegido en la extensión o el del navegador
  const t = (key, subs) => icuT(key, subs);
  const el = document.getElementById('icu-shield-code');
  const out = document.getElementById('icu-shield');
  const code = el && el.dataset.code;
  if (!code || !out) return;
  out.textContent = t('linking');
  chrome.runtime.sendMessage({ type: 'link', code }).then((r) => {
    if (r && r.ok) {
      out.dataset.state = 'ok';
      out.textContent = '🛡️ ' + (r.channel ? t('pageLinkedWith', [r.channel]) : t('pageLinked'));
    } else {
      out.dataset.state = 'error';
      out.textContent = t('pageLinkFail');
    }
  }).catch(() => {
    out.dataset.state = 'error';
    out.textContent = t('pageLinkError');
  });
})();
