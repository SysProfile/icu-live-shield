// ICU.Live Shield — popup.js
// Textos en el idioma elegido en el combo o, si no se eligió, en el del navegador (i18n.js)
const $ = (id) => document.getElementById(id);
const t = (key, subs) => icuT(key, subs);
const fmt = (n) => Number(n).toLocaleString(icuLocale());

function applyTexts() {
  document.documentElement.lang = icuLocale();
  document.documentElement.dir = icuIsRtl() ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

// Combo de idioma: «Auto» (el del navegador) y los idiomas de la extensión, cada uno escrito en su propio idioma
function fillLangs() {
  const sel = $('lang');
  const ui = chrome.i18n.getUILanguage().replace('-', '_');
  const auto = ICU_LANGS[ui] || ICU_LANGS[ui.split('_')[0]] || ui;
  sel.textContent = '';
  sel.append(new Option('🌐 Auto (' + auto + ')', ''));
  Object.keys(ICU_LANGS).sort((a, b) => ICU_LANGS[a].localeCompare(ICU_LANGS[b])).forEach((k) => sel.append(new Option(ICU_LANGS[k], k)));
  sel.value = icuLang;
}
$('lang').addEventListener('change', async () => {
  await chrome.storage.local.set({ lang: $('lang').value });   // lo toman también el ícono y la página de vinculación
  await icuLoadLang();
  applyTexts();
  show();
});

async function show() {
  const s = await chrome.runtime.sendMessage({ type: 'status' });
  if (s.channelYt) {
    const uc = encodeURIComponent(s.channelYt);
    studioUrl = 'https://studio.youtube.com/channel/' + uc + '/analytics/tab-overview/period-default/explore?entity_type=CHANNEL&entity_id=' +
      uc + '&time_period=4_weeks&explore_type=SUBSCRIBERS';
    document.querySelector('a.studio').textContent = t('openSubs');
  } else {
    document.querySelector('a.studio').textContent = t('openStudio');
  }
  $('linked').classList.toggle('hidden', !s.linked);
  $('unlinked').classList.toggle('hidden', !!s.linked);
  if (!s.linked) return;
  // «Vinculada con <canal>.»: el nombre va en negrita, en el lugar que le toca en cada idioma
  $('info').textContent = '';
  if (s.channel) {
    const parts = t('linkedWith', ['\u0001']).split('\u0001');
    const b = document.createElement('b'); b.textContent = s.channel;
    $('info').append(parts[0] || '', b, parts[1] || '');
  } else {
    $('info').append(t('linked'));
  }
  const p = document.createElement('div');
  // Un texto por estado, el mismo que muestra el LED
  const STATUS = { 200: t(s.lastValid ? 'st200valid' : 'st200invalid'), 0: t('st0'), 403: t('st403'), 401: t('st401') };
  if (s.paused) {
    p.textContent = t('pausedMsg');
  } else if (s.lastStatus === 'waiting') {
    p.textContent = t('waitingMsg');
  } else if (s.lastAt) {
    p.textContent = t('lastSend', [new Date(s.lastAt).toLocaleString(icuLocale()), fmt(s.lastSubs),
      STATUS[s.lastStatus] || t('stOther', [String(s.lastStatus)])]);
  } else {
    p.textContent = t('nothingYet');
  }
  $('info').appendChild(p);
  $('pause').textContent = t(s.paused ? 'btnResume' : 'btnPause');
  $('pause').dataset.paused = s.paused ? '1' : '';
  // Enviar / No enviar sólo se puede tocar estando en YouTube Studio
  $('pause').disabled = !s.studio;
  $('pause').title = s.studio ? '' : t('needStudio');
}

// No enviar / Enviar: deja de mandar los suscriptores sin desvincular (el LED queda gris)
$('pause').addEventListener('click', async () => {
  $('pause').disabled = true;   // un solo toque por vez: el botón cambia de texto cuando la acción terminó
  await chrome.runtime.sendMessage({ type: 'pause', paused: !$('pause').dataset.paused });
  show();
});
// El estado cambia solo (llega un envío, vence, se pausa): la ventana abierta se actualiza
chrome.storage.onChanged.addListener(() => show());

$('link').addEventListener('click', async () => {
  $('msg').textContent = t('linking');
  const r = await chrome.runtime.sendMessage({ type: 'link', code: $('code').value });
  $('msg').textContent = t(r && r.ok ? 'linkOk' : 'linkFail');
  show();
});

$('unlink').addEventListener('click', async () => {
  if (!confirm(t('confirmUnlink'))) return;
  await chrome.runtime.sendMessage({ type: 'unlink' });
  $('msg').textContent = t('unlinkedMsg');
  show();
});

// Abrir YouTube Studio siempre en una pestaña nueva, sin tocar la que el usuario está viendo
// Con el canal vinculado: directo al recuento de suscriptores en tiempo real de ese canal (lo que la extensión lee)
let studioUrl = 'https://studio.youtube.com';
document.querySelector('a.studio').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: studioUrl, active: true });
  window.close();
});

icuLoadLang().then(() => { applyTexts(); fillLangs(); show(); });
