// ICU.Live Shield — bg.js (service worker)
// Guarda los tokens del vínculo y envía a ICU.Live cada cambio de suscriptores. Si ICU.Live no responde, el dato se
// descarta: no se guarda para reenviar. No contiene ninguna clave: el vínculo se hace con un código de un solo uso.
const API = 'https://cdn.icu.live/shield/';

// LED del ícono, sólo mientras se está viendo studio.youtube.com (en cualquier otro sitio, el ícono va sin LED):
//   rojo        vinculada, enviando y el último envío fue aceptado
//   gris        sin vincular, el último envío falló, o «No enviar»
//   ámbar       fijo mientras conecta, después de tocar «Enviar» (pasa a rojo cuando ICU.Live acepta el dato)
//   ámbar/gris  titila si la página de Studio no es el recuento de suscriptores en tiempo real (y ninguna pestaña
//               está en esa página): así no se envía nada
const BLINK_MS = 600;
const HEARTBEAT_MS = 60000;   // sin cambios, una señal de vida por minuto: ICU.Live apaga el escudo si deja de llegar
function icons(state) {
  const p = {};
  for (const n of [16, 32, 48, 128]) p[n] = 'icons/' + n + (state ? '-' + state : '') + '.png';   // sin estado: sin LED
  return p;
}

// Pestañas de Studio: tabId → { subs: está en el recuento de suscriptores, visible: se está viendo }
// En storage.session para que no se pierdan si el service worker se reinicia
async function getPages() { return (await chrome.storage.session.get('pages')).pages || {}; }
// De a uno: varias pestañas avisan casi juntas (al tocar Enviar se les pide a todas) y, leyendo y guardando la lista a la
// vez, una pisaba a la otra; la del recuento quedaba afuera un instante y el LED pasaba a ámbar sin motivo
let pagesQueue = Promise.resolve();
function setPage(tabId, info) {
  pagesQueue = pagesQueue.then(async () => {
    const pages = await getPages();
    if (info) pages[tabId] = info; else delete pages[tabId];
    await chrome.storage.session.set({ pages });
  }).catch(() => {});
  return pagesQueue;
}

let blinkTimer = null, blinkOn = false;
async function updateIcon() {
  const s = await chrome.storage.local.get(['refresh', 'lastStatus', 'paused']);
  const pages = Object.values(await getPages());
  const linked = !!s.refresh;
  const studio = pages.some(p => p.visible);   // se está viendo studio.youtube.com
  const warn = studio && linked && !s.paused && pages.some(p => p.visible && !p.subs) && !pages.some(p => p.subs);
  const on = studio && linked && !s.paused && s.lastStatus === 200;
  if (warn) {
    if (!blinkTimer) {
      blinkTimer = setInterval(() => { blinkOn = !blinkOn; chrome.action.setIcon({ path: icons(blinkOn ? 'amber' : 'off') }).catch(() => {}); }, BLINK_MS);
      chrome.alarms.create('blink', { periodInMinutes: 0.5 });   // si el service worker se duerme, vuelve a titilar
    }
  } else {
    if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; chrome.alarms.clear('blink'); }
    // Ámbar fijo: se tocó «Enviar» y está conectando (hasta que ICU.Live acepta el próximo dato de Studio)
    const connecting = studio && linked && !s.paused && s.lastStatus === 'waiting';
    await chrome.action.setIcon({ path: icons(!studio ? '' : on ? 'on' : connecting ? 'amber' : 'off') });
  }
  await chrome.action.setTitle({ title: 'ICU.Live Shield — ' + (!linked ? 'sin vincular' : !studio ? 'funciona en YouTube Studio' : s.paused ? 'no envía (pausada)'
    : warn ? 'abrí Estadísticas → Recuento de suscriptores en tiempo real' : on ? 'enviando suscriptores'
    : s.lastStatus === 'waiting' ? 'esperando el próximo dato de YouTube Studio' : 'el último envío no se aceptó') });
}
const refresh = () => { updateIcon().catch(() => {}); };
chrome.runtime.onStartup.addListener(refresh);
chrome.runtime.onInstalled.addListener(refresh);
chrome.storage.onChanged.addListener(refresh);
chrome.alarms.onAlarm.addListener(refresh);
chrome.tabs.onRemoved.addListener((tabId) => { setPage(tabId, null).then(refresh); });

// Pide a las pestañas de Studio que vuelvan a avisar su estado (para tomar o soltar el Web Lock que las mantiene despiertas)
async function recheckTabs() {
  for (const id of Object.keys(await getPages())) chrome.tabs.sendMessage(Number(id), { type: 'recheck' }).catch(() => {});
}

async function post(path, body, access) {
  const headers = { 'Content-Type': 'application/json' };
  if (access) headers.Authorization = 'Bearer ' + access;
  const r = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body || {}), credentials: 'omit', cache: 'no-store' });
  let j = {};
  try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
  return { status: r.status, body: j };
}

async function saveTokens(b) {
  await chrome.storage.local.set({ access: b.access, accessExp: Date.now() + (b.expires_in - 30) * 1000, refresh: b.refresh, channel: b.channel || null,
    channelYt: /^UC[\w-]{22}$/.test(b.channel_yt || '') ? b.channel_yt : null });
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
  const st = await chrome.storage.local.get(['paused', 'lastSubs', 'lastAt', 'lastStatus']);
  if (st.paused) return;   // «No enviar»: no sale nada
  // Mismo número: sólo como señal de vida cada HEARTBEAT_MS (Studio consulta cada 10 s)
  if (st.lastSubs === subscribers && st.lastStatus === 200 && Date.now() - (st.lastAt || 0) < HEARTBEAT_MS) return;
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
  await recheckTabs();
  return { ok: true, channel: r.body.channel };
}

async function unlink() {
  const access = await accessToken(false);
  if (access) { try { await post('unlink.php', {}, access); } catch (e) { /* igual se borra acá */ } }
  await chrome.storage.local.clear();
  await recheckTabs();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const run = async () => {
    if (msg.type === 'subs') { await sendSubs(msg.channel, msg.subscribers); return { ok: true }; }
    if (msg.type === 'page') {
      if (sender.tab) {
        await setPage(sender.tab.id, msg.gone ? null : { subs: !!msg.subs, visible: !!msg.visible });
        // Que el navegador no duerma (descarte) la pestaña del recuento de suscriptores mientras está en esa página
        if (!msg.gone) chrome.tabs.update(sender.tab.id, { autoDiscardable: !msg.subs }).catch(() => {});
      }
      await updateIcon();
      // sending: vinculada y sin «No enviar» (la pestaña del recuento se mantiene despierta)
      const st = await chrome.storage.local.get(['refresh', 'paused']);
      return { ok: true, sending: !!st.refresh && !st.paused };
    }
    if (msg.type === 'link') return link(String(msg.code || ''));
    if (msg.type === 'unlink') return unlink();
    if (msg.type === 'pause') {
      // Sólo desde YouTube Studio (Sergio, 07/11/2026)
      if (!Object.values(await getPages()).some(p => p.visible)) return { ok: false };
      // Al pausar: gris. Al reanudar: «esperando» hasta que llegue el próximo dato de Studio (cada 10 s) y se acepte
      await chrome.storage.local.set({ paused: !!msg.paused, lastStatus: msg.paused ? 'paused' : 'waiting' });
      // Se avisa a ICU.Live para que el escudo se apague (o vuelva) en el monitor en el momento
      try { const access = await accessToken(false); if (access) await post('pause.php', { paused: !!msg.paused }, access); } catch (e) { /* sin conexión */ }
      await recheckTabs();
      return { ok: true };
    }
    if (msg.type === 'status') {
      // Vinculada antes de que el servidor mandara el ID del canal: se renueva el token una vez para tenerlo
      const pre = await chrome.storage.local.get(['refresh', 'channelYt']);
      if (pre.refresh && !pre.channelYt) { try { await accessToken(true); } catch (e) { /* sin conexión: queda el portal */ } }
      const s = await chrome.storage.local.get(['refresh', 'channel', 'channelYt', 'lastAt', 'lastSubs', 'lastStatus', 'lastValid', 'paused']);
      const studio = Object.values(await getPages()).some(p => p.visible);
      return { linked: !!s.refresh, channel: s.channel, lastAt: s.lastAt, lastSubs: s.lastSubs, lastStatus: s.lastStatus, lastValid: s.lastValid,
        paused: !!s.paused, studio, channelYt: s.channelYt || null };
    }
    return { ok: false };
  };
  run().then(reply, () => reply({ ok: false }));   // ICU.Live caído: se descarta
  return true;
});
