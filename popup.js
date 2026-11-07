// ICU.Live Shield — popup.js
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('es-AR');

async function show() {
  const s = await chrome.runtime.sendMessage({ type: 'status' });
  $('linked').classList.toggle('hidden', !s.linked);
  $('unlinked').classList.toggle('hidden', !!s.linked);
  if (!s.linked) return;
  let t = 'Vinculada' + (s.channel ? ' con <b></b>' : '') + '.<br>';
  $('info').innerHTML = t;
  if (s.channel) $('info').querySelector('b').textContent = s.channel;
  const p = document.createElement('div');
  if (s.lastAt) {
    p.textContent = 'Último envío: ' + new Date(s.lastAt).toLocaleString('es-AR') + ' — ' + fmt(s.lastSubs) + ' suscriptores' +
      (s.lastStatus === 200 ? (s.lastValid ? ' (escudo activo)' : ' (todavía no coincide con el número público)') : ' (ICU.Live no lo aceptó)');
  } else {
    p.textContent = 'Todavía no envió nada: abrí YouTube Studio, Estadísticas, y el recuento de suscriptores en tiempo real.';
  }
  if (s.paused) p.textContent = 'No envía: tocá Enviar para volver a mandar tus suscriptores.';
  $('info').appendChild(p);
  $('pause').textContent = s.paused ? 'Enviar' : 'No enviar';
  $('pause').dataset.paused = s.paused ? '1' : '';
  // Enviar / No enviar sólo se puede tocar estando en YouTube Studio
  $('pause').disabled = !s.studio;
  $('pause').title = s.studio ? '' : 'Abrí YouTube Studio para usarlo';
}

// No enviar / Enviar: deja de mandar los suscriptores sin desvincular (el LED queda gris)
$('pause').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'pause', paused: !$('pause').dataset.paused });
  show();
});

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
document.querySelector('a.studio').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://studio.youtube.com', active: true });
  window.close();
});

show();
