/* Velamia: de dónde llegó la visita (anuncio de Meta, campaña) y qué producto miraba al tocar WhatsApp.
   Si la visita vino de un anuncio, el mensaje de WhatsApp lleva una referencia corta (Ref: K7M2QX): así la vendedora
   sabe de qué anuncio venía y qué producto estaba viendo, y el CRM mide qué anuncio deja ventas.
   No modifica el flujo de pago con Nuvei ni el carrito. Si algo falla, los botones funcionan igual que siempre. */
(function () {
  'use strict';

  var script = document.currentScript;
  var CRM = (script && script.getAttribute('data-crm')) || 'https://whatsapp-assistant-velamia.onrender.com/api/public/web-ref/velamia';
  var KEY = 'velamia_origen';
  var DAYS = 7;
  // Sin letras ni números que se confundan (I, L, O, 0, 1).
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function digits(v) { return /^\d{5,30}$/.test(String(v || '')) ? String(v) : ''; }

  function newCode() {
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    var out = '';
    for (var j = 0; j < 6; j++) out += ALPHABET[bytes[j] % ALPHABET.length];
    return out;
  }

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && v.code && Date.now() - v.at < DAYS * 86400000) return v;
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
    return null;
  }

  function save(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  var origin = read();

  function send(event, product) {
    if (!origin) return;
    var body = JSON.stringify({
      code: origin.code, event: event, adId: origin.adId, campaignId: origin.campaignId, adsetId: origin.adsetId,
      utm: origin.utm, fbclid: origin.fbclid, landing: origin.landing, product: product || ''
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(CRM, new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) { /* se intenta de la otra forma */ }
    try { fetch(CRM, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); } catch (e) { /* sin conexión: no pasa nada */ }
  }

  // ¿Llegó ahora desde un anuncio o una campaña? (los anuncios nuevos traen ad_id en el enlace; los demás, fbclid o utm).
  try {
    var q = new URLSearchParams(location.search);
    var utm = {};
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) {
      var v = q.get('utm_' + k);
      if (v) utm[k] = v.slice(0, 150);
    });
    var adId = digits(q.get('ad_id'));
    var fbclid = q.get('fbclid');
    if (adId || fbclid || Object.keys(utm).length) {
      // Otro anuncio = otra referencia; el mismo anuncio conserva la suya.
      var same = origin && origin.adId === adId && JSON.stringify(origin.utm) === JSON.stringify(utm);
      origin = {
        code: same ? origin.code : newCode(), at: Date.now(), adId: adId, campaignId: digits(q.get('campaign_id')), adsetId: digits(q.get('adset_id')),
        utm: utm, fbclid: fbclid ? '1' : '', landing: (location.pathname + location.hash).slice(0, 200)
      };
      save(origin);
      send('visita', '');
    }
  } catch (e) { /* navegador muy viejo: los botones quedan como siempre */ }

  // El producto que estaba viendo, sacado del mismo mensaje de WhatsApp que arma la página.
  function productIn(text) {
    var m = String(text || '').match(/Estoy viendo:?\s+(.+?)\s*\(\$/) || String(text || '').match(/🕯️\s*\*([^*]+)\*/);
    if (m) return m[1].trim().slice(0, 120);
    var name = document.getElementById('ppName');
    return name && name.offsetParent !== null ? String(name.textContent || '').trim().slice(0, 120) : '';
  }

  // Agrega la referencia al mensaje de WhatsApp (una sola vez) y avisa al CRM qué producto miraba.
  function withRef(url) {
    if (!origin || !/wa\.me\/|api\.whatsapp\.com\//.test(url)) return url;
    try {
      var u = new URL(url, location.href);
      var text = u.searchParams.get('text') || 'Hola Velamia! 👋';
      if (text.indexOf('Ref: ') !== -1) return url;
      text += ' (Ref: ' + origin.code + ')';
      send('whatsapp', productIn(text));
      // Los espacios van como %20 (con "+" WhatsApp podría mostrarlos tal cual).
      u.searchParams.delete('text');
      var rest = u.searchParams.toString();
      return u.origin + u.pathname + '?' + (rest ? rest + '&' : '') + 'text=' + encodeURIComponent(text);
    } catch (e) {
      return url;
    }
  }

  // Enlaces de WhatsApp (botón flotante, ficha del producto, configurador, contacto): se completan al tocarlos.
  document.addEventListener('click', function (event) {
    if (!origin) return;
    var a = event.target && event.target.closest ? event.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]') : null;
    if (a) a.setAttribute('href', withRef(a.getAttribute('href')));
  }, true);

  // Formularios que abren WhatsApp en otra pestaña (pedido personalizado, cotización).
  var open = window.open;
  window.open = function (url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') args[0] = withRef(url);
    return open.apply(window, args);
  };
})();
