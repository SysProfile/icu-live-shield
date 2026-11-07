// ICU.Live Shield — popup.js
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('es-AR');

async function show() {
  const s = await chrome.runtime.sendMessage({ type: 'status' });
  if (s.channelYt) {
    const uc = encodeURIComponent(s.channelYt);
    studioUrl = 'https://studio.youtube.com/channel/' + uc + '/analytics/tab-overview/period-default/explore?entity_type=CHANNEL&entity_id=' +
      uc + '&time_period=4_weeks&explore_type=SUBSCRIBERS';
    document.querySelector('a.studio').textContent = 'Abrir el recuento de suscriptores en YouTube Studio';
  }
  $('linked').classList.toggle('hidden', !s.linked);
  $('unlinked').classList.toggle('hidden', !!s.linked);
  if (!s.linked) return;
  $('info').textContent = '';
  $('info').append('Vinculada' + (s.channel ? ' con ' : ''));
  if (s.channel) { const b = document.createElement('b'); b.textContent = s.channel; $('info').append(b); }
  $('info').append('.');
  const p = document.createElement('div');
  // Un texto por estado, el mismo que muestra el LED
  const STATUS = {
    200: s.lastValid ? 'enviado, escudo activo' : 'enviado, pero todavía no coincide con el número público',
    0: 'sin conexión con ICU.Live: se descartó',
    403: 'el canal abierto en YouTube Studio no es el vinculado',
    401: 'el vínculo venció: vinculá de nuevo'
  };
  if (s.paused) {
    p.textContent = 'No envía. Tocá Enviar para volver a mandar tus suscriptores.';
  } else if (s.lastStatus === 'waiting') {
    p.textContent = 'Enviando de nuevo: esperando el próximo dato de YouTube Studio (unos 10 segundos).';
  } else if (s.lastAt) {
    p.textContent = 'Último envío: ' + new Date(s.lastAt).toLocaleString('es-AR') + ' — ' + fmt(s.lastSubs) + ' suscriptores (' +
      (STATUS[s.lastStatus] || ('ICU.Live no lo aceptó, código ' + s.lastStatus)) + ').';
  } else {
    p.textContent = 'Todavía no envió nada: abrí el recuento de suscriptores en tiempo real de YouTube Studio.';
  }
  $('info').appendChild(p);
  $('pause').textContent = s.paused ? 'Enviar' : 'No enviar';
  $('pause').dataset.paused = s.paused ? '1' : '';
  // Enviar / No enviar sólo se puede tocar estando en YouTube Studio
  $('pause').disabled = !s.studio;
  $('pause').title = s.studio ? '' : 'Abrí YouTube Studio para usarlo';
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
  $('msg').textContent = 'Vinculando…';
  const r = await chrome.runtime.sendMessage({ type: 'link', code: $('code').value });
  $('msg').textContent = r && r.ok ? 'Listo, extensión vinculada.' : 'No se pudo vincular: el código venció o ya se usó.';
  show();
});

$('unlink').addEventListener('click', async () => {
  if (!confirm('¿Desvincular la extensión? Tu canal deja de mostrar el escudo.')) return;
  await chrome.runtime.sendMessage({ type: 'unlink' });
  $('msg').textContent = 'Extensión desvinculada.';
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

show();
