// ICU.Live Shield — bg.js (service worker)
// Guarda los tokens del vínculo y envía a ICU.Live cada cambio de suscriptores. Si ICU.Live no responde, el dato se
// descarta: no se guarda para reenviar. No contiene ninguna clave: el vínculo se hace con un código de un solo uso.
const API = 'https://cdn.icu.live/shield/';

// LED del ícono:
//   rojo        vinculada, enviando y el último envío fue aceptado
//   gris        sin vincular, el último envío falló, o «No enviar»
//   ámbar/gris  titila mientras se está viendo YouTube Studio fuera del recuento de suscriptores en tiempo real (y
//               ninguna pestaña está en esa página): así no se envía nada. Sólo en studio.youtube.com
const BLINK_MS = 600;
function icons(state) {
  const p = {};
  for (const n of [16, 32, 48, 128]) p[n] = 'icons/' + n + '-' + state + '.png';
  return p;
}

// Pestañas de Studio: tabId → { subs: está en el recuento de suscriptores, visible: se está viendo }
// En storage.session para que no se pierdan si el service worker se reinicia
async function getPages() { return (await chrome.storage.session.get('pages')).pages || {}; }
async function setPage(tabId, info) {
  const pages = await getPages();
  if (info) pages[tabId] = info; else delete pages[tabId];
  await chrome.storage.session.set({ pages });
}

let blinkTimer = null, blinkOn = false;
async function updateIcon() {
  const s = await chrome.storage.local.get(['refresh', 'lastStatus', 'paused']);
  const pages = Object.values(await getPages());
  const linked = !!s.refresh;
  const warn = linked && !s.paused && pages.some(p => p.visible && !p.subs) && !pages.some(p => p.subs);
  const on = linked && !s.paused && s.lastStatus === 200;
  if (warn) {
    if (!blinkTimer) {
      blinkTimer = setInterval(() => { blinkOn = !blinkOn; chrome.action.setIcon({ path: icons(blinkOn ? 'amber' : 'off') }).catch(() => {}); }, BLINK_MS);
      chrome.alarms.create('blink', { periodInMinutes: 0.5 });   // si el service worker se duerme, vuelve a titilar
    }
  } else {
    if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; chrome.alarms.clear('blink'); }
    await chrome.action.setIcon({ path: icons(on ? 'on' : 'off') });
  }
  await chrome.action.setTitle({ title: 'ICU.Live Shield — ' + (!linked ? 'sin vincular' : s.paused ? 'no envía (pausada)'
    : warn ? 'abrí Estadísticas → Recuento de suscriptores en tiempo real' : on ? 'enviando suscriptores' : 'vinculada, sin envíos aceptados') });
}
const refresh = () => { updateIcon().catch(() => {}); };
chrome.runtime.onStartup.addListener(refresh);
chrome.runtime.onInstalled.addListener(refresh);
chrome.storage.onChanged.addListener(refresh);
chrome.alarms.onAlarm.addListener(refresh);
chrome.tabs.onRemoved.addListener((tabId) => { setPage(tabId, null).then(refresh); });

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
  if ((await chrome.storage.local.get('paused')).paused) return;   // «No enviar»: no sale nada
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
    if (msg.type === 'page') {
      if (sender.tab) await setPage(sender.tab.id, msg.gone ? null : { subs: !!msg.subs, visible: !!msg.visible });
      await updateIcon();
      return { ok: true };
    }
    if (msg.type === 'link') return link(String(msg.code || ''));
    if (msg.type === 'unlink') return unlink();
    if (msg.type === 'pause') { await chrome.storage.local.set({ paused: !!msg.paused }); return { ok: true }; }
    if (msg.type === 'status') return chrome.storage.local.get(['refresh', 'channel', 'lastAt', 'lastSubs', 'lastStatus', 'lastValid', 'paused'])
      .then(s => ({ linked: !!s.refresh, channel: s.channel, lastAt: s.lastAt, lastSubs: s.lastSubs, lastStatus: s.lastStatus, lastValid: s.lastValid, paused: !!s.paused }));
    return { ok: false };
  };
  run().then(reply, () => reply({ ok: false }));   // ICU.Live caído: se descarta
  return true;
});
