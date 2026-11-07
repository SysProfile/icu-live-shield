// ICU.Live Shield — inject.js (corre dentro de la página de YouTube Studio)
// No hace ningún pedido propio: mira las respuestas que YouTube Studio ya recibe. Cuando Studio consulta el recuento de
// suscriptores (youtubei/v1/yta_web/join, tarjeta cumulativeSubscribersCardData), toma el total exacto (lifetimeTotal)
// y el canal de la consulta (screenConfig.entity.channelId) y se lo pasa a la extensión en cada consulta: la extensión
// envía cuando cambia y, si no cambia, una señal de vida cada tanto (así ICU.Live sabe que la pestaña sigue despierta).
// Sin temporizadores: sólo reacciona a lo que la página ya hace.
(() => {
  'use strict';
  const MARK = 'yta_web/join';

  function find(obj, key, depth) {
    if (!obj || typeof obj !== 'object' || depth > 12) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    for (const k in obj) {
      const r = find(obj[k], key, depth + 1);
      if (r !== undefined) return r;
    }
    return undefined;
  }

  function handle(reqBody, resText) {
    try {
      const req = typeof reqBody === 'string' ? JSON.parse(reqBody) : null;
      const res = JSON.parse(resText);
      const card = find(res, 'cumulativeSubscribersCardData', 0);
      const total = card ? Number(card.lifetimeTotal) : NaN;
      const entity = req ? find(req, 'entity', 0) : null;
      const channel = entity && entity.channelId;
      if (!Number.isSafeInteger(total) || total < 0 || typeof channel !== 'string' || !/^UC[\w-]{22}$/.test(channel)) return;
      window.postMessage({ __icuShield: 1, channel, subscribers: total }, location.origin);
    } catch (e) { /* respuesta que no es la esperada: se ignora */ }
  }

  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__icuShield = typeof url === 'string' && url.includes(MARK);
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__icuShield) this.addEventListener('load', () => handle(body, this.responseText));
    return send.apply(this, arguments);
  };

  // Studio cambia de página sin recargar: se avisa cada cambio de dirección (para el LED de la extensión)
  const notify = () => window.postMessage({ __icuShield: 2, href: location.href }, location.origin);
  for (const fn of ['pushState', 'replaceState']) {
    const orig = history[fn];
    history[fn] = function () { const r = orig.apply(this, arguments); notify(); return r; };
  }
  window.addEventListener('popstate', notify);

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const p = origFetch.apply(this, arguments);
    if (url.includes(MARK)) {
      const body = init && typeof init.body === 'string' ? init.body : null;
      p.then(r => r.clone().text()).then(t => handle(body, t)).catch(() => {});
    }
    return p;
  };
})();
