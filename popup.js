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
  $('info').appendChild(p);
}

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

show();
