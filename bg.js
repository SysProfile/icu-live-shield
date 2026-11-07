// ICU.Live Shield — bg.js (service worker)
// Guarda los tokens del vínculo y envía a ICU.Live cada cambio de suscriptores. Si ICU.Live no responde, el dato se
// descarta: no se guarda para reenviar. No contiene ninguna clave: el vínculo se hace con un código de un solo uso.
const API = 'https://cdn.icu.live/shield/';

// LED del ícono: rojo si está vinculada y el último envío fue aceptado; gris si no está vinculada o el envío falló
function icons(state) {
  const p = {};
  for (const n of [16, 32, 48, 128]) p[n] = 'icons/' + n + '-' + state + '.png';
  return p;
}
async function updateIcon() {
  const s = await chrome.storage.local.get(['refresh', 'lastStatus']);
  const on = !!s.refresh && s.lastStatus === 200;
  await chrome.action.setIcon({ path: icons(on ? 'on' : 'off') });
  await chrome.action.setTitle({ title: 'ICU.Live Shield — ' + (!s.refresh ? 'sin vincular' : (on ? 'enviando suscriptores' : 'vinculada, sin envíos aceptados')) });
}
chrome.runtime.onStartup.addListener(updateIcon);
chrome.runtime.onInstalled.addListener(updateIcon);
chrome.storage.onChanged.addListener(() => { updateIcon().catch(() => {}); });

async function post(path, body, access) {
  const headers = { 'Content-Type': 'application/json' };
  if (access) headers.Authorization = 'Bearer ' + access;
  const r = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body || {}), credentials: 'omit', cache: 'no-store' });
  let j = {};
  try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
  return { status: r.status, body: j };
}

async function saveTokens(b) {
  await chrome.storage.local.set({ access: b.access, accessExp: Date.now() + (b.expires_in - 30) * 1000, refresh: b.refresh, channel: b.channel || null });
}

async function accessToken(force) {
  const s = await chrome.storage.local.get(['access', 'accessExp', 'refresh']);
  if (!s.refresh) return null;
  if (!force && s.access && s.accessExp > Date.now()) return s.access;
  const r = await post('refresh.php', { refresh: s.refresh });
  if (r.status === 401) { await chrome.storage.local.clear(); return null; }   // desvinculada desde el panel
  if (r.status !== 200 || !r.body.ok) return null;
  await saveTokens(r.body);
  return r.body.access;
}

async function sendSubs(channel, subscribers) {
  let r;
  try {
    let access = await accessToken(false);
    if (!access) return;
    r = await post('youtube.php', { channel, subscribers }, access);
    if (r.status === 401) {
      access = await accessToken(true);
      if (!access) return;
      r = await post('youtube.php', { channel, subscribers }, access);
    }
  } catch (e) {
    r = { status: 0, body: {} };   // ICU.Live no respondió: el dato se descarta y el LED pasa a gris
  }
  if (r.status === 429) return;      // envío demasiado seguido: se descarta sin cambiar el estado
  await chrome.storage.local.set({ lastAt: Date.now(), lastSubs: subscribers, lastStatus: r.status, lastValid: !!r.body.valid });
}

async function link(code) {
  const r = await post('link.php', { code });
  if (r.status !== 200 || !r.body.ok) return { ok: false };
  await chrome.storage.local.clear();
  await saveTokens(r.body);
  return { ok: true, channel: r.body.channel };
}

async function unlink() {
  const access = await accessToken(false);
  if (access) { try { await post('unlink.php', {}, access); } catch (e) { /* igual se borra acá */ } }
  await chrome.storage.local.clear();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const run = async () => {
    if (msg.type === 'subs') { await sendSubs(msg.channel, msg.subscribers); return { ok: true }; }
    if (msg.type === 'link') return link(String(msg.code || ''));
    if (msg.type === 'unlink') return unlink();
    if (msg.type === 'status') return chrome.storage.local.get(['refresh', 'channel', 'lastAt', 'lastSubs', 'lastStatus', 'lastValid'])
      .then(s => ({ linked: !!s.refresh, channel: s.channel, lastAt: s.lastAt, lastSubs: s.lastSubs, lastStatus: s.lastStatus, lastValid: s.lastValid }));
    return { ok: false };
  };
  run().then(reply, () => reply({ ok: false }));   // ICU.Live caído: se descarta
  return true;
});
