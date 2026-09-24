/* Velamia CMS: aplica el contenido publicado desde el panel (velamia-admin-cms).
   Si el archivo publicado no llega a tiempo o falla, la página se queda con su contenido original.
   No modifica el flujo de pago con Nuvei. */
(function () {
  'use strict';

  var URL_SITIO = 'https://iokkxrwiqmsfsayztmdx.supabase.co/storage/v1/object/public/sitio/sitio.json';
  var ESPERA_TRAS_DOM = 1200;
  var ESPERA_MAXIMA = 4000;
  var raiz = document.documentElement;

  var resolver;
  var terminado = false;
  var listo = new Promise(function (r) { resolver = r; });
  window.velamiaCMS = { listo: listo, aplicado: false };

  function terminar() {
    if (terminado) return;
    terminado = true;
    raiz.classList.remove('cms-espera');
    resolver();
  }

  function domListo() {
    return new Promise(function (r) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { r(); }, { once: true });
      else r();
    });
  }

  if (!window.fetch || !window.Promise) return terminar();
  raiz.classList.add('cms-espera');
  setTimeout(terminar, ESPERA_MAXIMA);
  domListo().then(function () { setTimeout(terminar, ESPERA_TRAS_DOM); });

  var carga = fetch(URL_SITIO + '?v=' + Math.floor(Date.now() / 30000), { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });

  Promise.all([carga, domListo()]).then(function (res) {
    if (terminado) return;
    aplicar(res[0]);
    window.velamiaCMS.aplicado = true;
    terminar();
  }).catch(function (e) {
    console.warn('[velamia-cms] se usa el contenido original:', e && e.message);
    domListo().then(terminar);
  });

  // ==================== utilidades ====================
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rico(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
  function lineas(s) { return esc(s).replace(/\n/g, '<br>'); }
  function url(s) { return /^(#[\w-]*|https:\/\/|mailto:|tel:)/i.test(String(s || '')) ? esc(s) : '#'; }
  function q(sel, base) { return (base || document).querySelector(sel); }
  function qa(sel, base) { return Array.prototype.slice.call((base || document).querySelectorAll(sel)); }
  function texto(sel, v, base) { var el = q(sel, base); if (el && v != null && v !== '') el.textContent = v; }
  function titulo(el, t, d) { if (el) el.innerHTML = esc(t) + (d ? ' <span>' + esc(d) + '</span>' : ''); }
  function encabezado(base, s) {
    if (!base || !s) return;
    texto('.section-label', s.etiqueta, base);
    titulo(q('.section-title', base), s.titulo, s.destacado);
  }
  function numOk(v, min, max) { return typeof v === 'number' && isFinite(v) && v >= min && v <= max; }

  // ==================== aplicar ====================
  function aplicar(d) {
    var s = (d && d.secciones) || {};
    var pasos = [
      ['productos', function () { aplicarProductos(d.productos); }],
      ['marca', function () { marca(s.marca); }],
      ['menu', function () { menu(s.menu); }],
      ['portada', function () { portada(s.portada, s.envios); }],
      ['beneficios', function () { beneficios(s.beneficios); }],
      ['cinta', function () { cinta(s.cinta); }],
      ['temporada', function () { temporada(s.temporada); }],
      ['coleccion', function () { coleccion(s.coleccion); }],
      ['por_que', function () { porQue(s.por_que); }],
      ['resenas', function () { resenas(s.resenas); }],
      ['pagos', function () { pagos(s.pagos, s.envios); }],
      ['cifras', function () { cifras(s.cifras); }],
      ['proceso', function () { proceso(s.proceso); }],
      ['contacto', function () { contacto(s.contacto, s.marca); }],
      ['politicas', function () { politicas(s.politicas); }],
      ['footer', function () { footer(s.footer); }],
      ['chat', function () { chat(s.chat); }],
      ['envios', function () { envios(s.envios); }]
    ];
    pasos.forEach(function (p) {
      try { p[1](); } catch (e) { console.error('[velamia-cms] sección ' + p[0] + ':', e); }
    });
  }

  function aplicarProductos(lista) {
    if (!Array.isArray(lista) || typeof PRODUCTS === 'undefined' || typeof IMG_MAP === 'undefined') return;
    var nuevos = [];
    lista.forEach(function (item) {
      var p = item && item.producto;
      if (!p || typeof p.id !== 'number' || !(p.price > 0)) return;
      (item.imagenes || []).forEach(function (u, i) { IMG_MAP['cms_' + p.id + '_' + i] = u; });
      if (!p.img || !IMG_MAP[p.img]) return;
      nuevos.push(p);
    });
    if (!nuevos.some(function (p) { return !p.oculto; })) return;
    PRODUCTS.length = 0;
    nuevos.forEach(function (p) { PRODUCTS.push(p); });
  }

  function marca(m) {
    if (!m) return;
    qa('.nav-logo-img, .footer-logo-img').forEach(function (img) { if (m.logo) img.src = m.logo; if (m.nombre) img.alt = m.nombre; });
    qa('.nav-logo-text, .footer-logo-text').forEach(function (el) { if (m.nombre) el.textContent = m.nombre; });
    if (/^\d{8,15}$/.test(m.whatsapp || '')) {
      window.VELAMIA_WA = m.whatsapp;
      qa('a[href*="wa.me/"]').forEach(function (a) { a.setAttribute('href', a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + m.whatsapp)); });
      var chatWa = q('.chat-wa-btn');
      if (chatWa && m.whatsapp_mensaje) chatWa.href = 'https://wa.me/' + m.whatsapp + '?text=' + encodeURIComponent(m.whatsapp_mensaje);
    }
    var redes = { Facebook: m.facebook_url, Instagram: m.instagram_url, TikTok: m.tiktok_url };
    Object.keys(redes).forEach(function (t) {
      var a = q('.footer-social-icons a[title="' + t + '"]');
      if (!a) return;
      if (redes[t]) a.href = redes[t]; else a.style.display = 'none';
    });
  }

  function menu(m) {
    if (!m) return;
    var ul = q('.nav-links');
    if (ul && m.enlaces && m.enlaces.length) {
      ul.innerHTML = m.enlaces.map(function (e) { return '<li><a href="' + url(e.destino) + '">' + esc(e.texto) + '</a></li>'; }).join('');
    }
    texto('.nav-cta', m.boton_texto);
  }

  function portada(p, env) {
    var car = document.getElementById('heroCarousel');
    if (!car || !p || !p.slides || !p.slides.length) return;
    var pct = env && numOk(env.descuento_tarjeta, 0, 50) ? env.descuento_tarjeta : 10;
    var antes = q('.carousel-prev', car);
    qa('.hero-slide', car).forEach(function (el) { el.remove(); });
    p.slides.forEach(function (sl, i) {
      var div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' active' : '');
      var h = i === 0 ? 'h1' : 'h2';
      var html = '<img src="' + esc(sl.imagen) + '" alt="' + esc(sl.titulo + ' ' + sl.destacado) + '"/>' +
        '<div class="hero-banner-overlay"></div><div class="hero-banner-text">' +
        (sl.etiqueta ? '<span class="hero-eyebrow">' + esc(sl.etiqueta) + '</span>' : '') +
        '<' + h + ' class="hero-title">' + esc(sl.titulo) + (sl.destacado ? ' <span>' + esc(sl.destacado) + '</span>' : '') + '</' + h + '>' +
        (sl.subtitulo ? '<p class="hero-subtitle">' + esc(sl.subtitulo) + '</p>' : '');
      if (sl.boton1_texto || sl.boton2_texto) {
        html += '<div class="hero-actions">' +
          (sl.boton1_texto ? '<a href="' + url(sl.boton1_enlace || '#productos') + '" class="btn-primary">' + esc(sl.boton1_texto) + '</a>' : '') +
          (sl.boton2_texto ? '<a href="#" onclick="crearMiPedido();return false;" class="btn-secondary">' + esc(sl.boton2_texto) + '</a>' : '') +
          '</div>';
      }
      if (sl.mostrar_pagos) {
        html += '<div class="hero-pay-badge" style="margin-top:1.1rem;display:inline-flex;align-items:center;gap:9px;background:rgba(255,255,255,0.96);padding:8px 14px;border-radius:50px;box-shadow:0 4px 14px rgba(0,0,0,0.2);flex-wrap:wrap;max-width:100%;">' +
          '<span style="font-size:11px;font-weight:700;color:#2A2318;letter-spacing:0.02em;">' + esc(sl.texto_pagos || '💳 Aceptamos tarjetas') + '</span>' +
          '<span style="background:#1A1F71;color:#fff;font-size:9px;font-weight:700;font-style:italic;padding:3px 6px;border-radius:3px;">VISA</span>' +
          '<span style="display:inline-flex;align-items:center;"><span style="width:13px;height:13px;border-radius:50%;background:#EB001B;display:inline-block;"></span><span style="width:13px;height:13px;border-radius:50%;background:#F79E1B;display:inline-block;margin-left:-5px;"></span></span>' +
          '<span style="background:#00679F;color:#fff;font-size:8px;font-weight:700;padding:3px 5px;border-radius:3px;">DINERS</span>' +
          '<span style="background:#016FD0;color:#fff;font-size:8px;font-weight:700;padding:3px 5px;border-radius:3px;">AMEX</span>' +
          (pct > 0 ? '<span style="font-size:10.5px;color:#fff;background:#1B7A43;padding:3px 8px;border-radius:50px;font-weight:700;">🎉 ' + pct + '% dcto pagando en línea</span>' : '') +
          '</div>';
      }
      div.innerHTML = html + '</div>';
      car.insertBefore(div, antes);
    });
    var n = p.slides.length;
    window.totalSlides = n;
    window.currentSlide = 0;
    var dots = q('.carousel-dots', car);
    if (dots) {
      dots.innerHTML = p.slides.map(function (_, i) { return '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" onclick="goToSlide(' + i + ')"></button>'; }).join('');
      dots.style.display = n > 1 ? '' : 'none';
    }
  }

  function beneficios(b) {
    var cont = q('.landing-features');
    if (!cont || !b || !b.items || !b.items.length) return;
    cont.innerHTML = b.items.map(function (it) {
      return '<div class="lf-item"><div class="lf-icon">' + esc(it.icono) + '</div><div class="lf-text">' + lineas(it.texto) + '</div></div>';
    }).join('');
  }

  function cinta(c) {
    var cont = q('.strip-inner');
    if (!cont || !c || !c.items || !c.items.length) return;
    var una = c.items.map(function (it) { return '<span class="strip-item">' + esc(it.texto) + '</span><span class="strip-dot">·</span>'; }).join('');
    cont.innerHTML = una + una;
  }

  function temporada(t) {
    var el = q('.julianas-banner');
    if (!el || !t) return;
    if (!t.activo) { el.style.display = 'none'; return; }
    el.style.display = '';
    texto('.jul-date', t.fecha, el);
    texto('.jul-title', t.titulo, el);
    texto('.jul-sub', t.subtitulo, el);
  }

  function coleccion(c) {
    if (!c) return;
    var head = q('#productos > .section-header');
    if (head) {
      var lab = q('.section-label', head);
      if (lab && c.etiqueta) lab.innerHTML = '<span style="color:var(--gye-celeste);">★</span> ' + esc(c.etiqueta) + ' <span style="color:var(--gye-celeste);">★</span>';
      titulo(q('.section-title', head), c.titulo, c.destacado);
      texto('p', c.descripcion, head);
    }
    var ev = document.getElementById('eventCards');
    if (ev && c.eventos && c.eventos.length) {
      ev.innerHTML = c.eventos.map(function (e) {
        return '<button class="event-card" onclick="filterProducts(\'' + esc(e.categoria) + '\')"><div class="ec-name">' + esc(e.nombre) + '</div><div class="ec-line"></div></button>';
      }).join('');
    }
    var np = document.getElementById('noProducts');
    if (np) { texto('p', c.sin_productos, np); texto('small', c.sin_productos_sub, np); }
  }

  function porQue(w) {
    if (!w) return;
    encabezado(q('.why-header'), w);
    var g = q('.why-grid');
    if (!g || !w.tarjetas || !w.tarjetas.length) return;
    g.innerHTML = w.tarjetas.map(function (t, i) {
      return '<div class="why-card reveal" style="transition-delay:' + ((i + 1) / 10) + 's"><div class="why-icon">' + esc(t.icono) + '</div>' +
        '<h3 class="why-title">' + esc(t.titulo) + '</h3><p class="why-desc">' + lineas(t.descripcion) + '</p></div>';
    }).join('');
  }

  function resenas(r) {
    if (!r) return;
    encabezado(q('.reviews-header'), r);
    var g = q('.reviews-grid');
    if (!g || !r.items || !r.items.length) return;
    g.innerHTML = r.items.map(function (it, i) {
      var n = numOk(it.estrellas, 1, 5) ? it.estrellas : 5;
      return '<div class="review-card reveal" style="transition-delay:' + ((i + 1) / 10) + 's"><div class="review-stars">' + new Array(n + 1).join('⭐') + '</div>' +
        '<p class="review-text">"' + lineas(it.texto) + '"</p><div class="review-author"><div class="review-avatar">' + esc((it.nombre || '?').charAt(0).toUpperCase()) + '</div>' +
        '<div><div class="review-name">' + esc(it.nombre) + '</div><div class="review-event">' + esc(it.evento) + '</div></div></div></div>';
    }).join('');
  }

  function filaEnvio(zona, gratis, costo) {
    var fila = function (l, v, verde) {
      return '<div class="payment-row"><span class="payment-label">' + l + '</span><span class="payment-value"' + (verde ? ' style="color:#2ecc71"' : '') + '>' + v + '</span></div>';
    };
    if (costo === 0) return fila(zona + ' · cualquier cantidad', '¡Gratis!', true);
    return fila(zona + ' · ' + gratis + '+ docenas', '¡Gratis!', true) + fila(zona + ' · menos de ' + gratis + ' docenas', '$' + costo.toFixed(2));
  }

  function pagos(p, env) {
    if (!p) return;
    encabezado(q('#pagos > .section-header'), p);
    var g = q('.payment-grid');
    if (!g) return;
    var e = env && numOk(env.gye_costo, 0, 50) && numOk(env.prov_costo, 0, 50) && numOk(env.gye_gratis_desde, 1, 50) && numOk(env.prov_gratis_desde, 1, 50)
      ? env : { gye_costo: 3, gye_gratis_desde: 2, prov_costo: 5, prov_gratis_desde: 3 };
    g.innerHTML =
      '<div class="payment-card reveal"><h3><span>💳</span> ' + esc(p.tarjeta_titulo) + '</h3>' +
      (p.tarjetas || []).map(function (t) { return '<div class="payment-row"><span class="payment-label">' + esc(t.nombre) + '</span><span class="payment-value">✓ Aceptada</span></div>'; }).join('') +
      (p.nota_pago ? '<div class="payment-note">' + lineas(p.nota_pago) + '</div>' : '') + '</div>' +
      '<div class="payment-card reveal" style="transition-delay:0.15s"><h3><span>🚚</span> ' + esc(p.envio_titulo) + '</h3>' +
      filaEnvio('Guayaquil', e.gye_gratis_desde, e.gye_costo) + filaEnvio('Otras provincias', e.prov_gratis_desde, e.prov_costo) +
      (p.nota_envio ? '<div class="payment-note">' + lineas(p.nota_envio) + '</div>' : '') + '</div>';
  }

  function cifras(c) {
    var g = q('.features');
    if (!g || !c || !c.items || !c.items.length) return;
    g.innerHTML = c.items.map(function (it, i) {
      return '<div class="reveal"' + (i ? ' style="transition-delay:' + (i / 10) + 's"' : '') + '><div class="feat-num">' + esc(it.numero) + '</div><div class="feat-label">' + esc(it.texto) + '</div></div>';
    }).join('');
  }

  function proceso(p) {
    if (!p) return;
    encabezado(q('#proceso > .section-header'), p);
    var g = q('.how-grid');
    if (!g || !p.pasos || !p.pasos.length) return;
    g.innerHTML = p.pasos.map(function (st, i) {
      return '<div class="how-step reveal" style="transition-delay:' + ((i + 1) / 10) + 's"><div class="how-num">' + (i < 9 ? '0' : '') + (i + 1) + '</div>' +
        '<h3 class="how-title">' + esc(st.titulo) + '</h3><p class="how-desc">' + lineas(st.descripcion) + '</p></div>';
    }).join('');
  }

  function contacto(c, m) {
    if (c) {
      texto('.canales-label', c.etiqueta);
      titulo(q('.canales-title'), c.titulo, c.destacado);
    }
    var g = q('.canales-grid');
    if (!g || !m) return;
    var iconos = {};
    qa('.canal-item', g).forEach(function (a) {
      var h = a.getAttribute('href') || '';
      var k = /maps/.test(h) ? 'mapa' : /instagram/.test(h) ? 'instagram' : /facebook/.test(h) ? 'facebook' : /tiktok/.test(h) ? 'tiktok' : /wa\.me/.test(h) ? 'whatsapp' : /mailto/.test(h) ? 'correo' : '';
      var ic = q('.canal-icon', a);
      if (k && ic) iconos[k] = ic.innerHTML;
    });
    var canales = [
      ['mapa', m.maps_url || 'https://maps.google.com/?q=' + encodeURIComponent(m.ciudad || ''), m.ciudad, m.pais, !!m.ciudad],
      ['instagram', m.instagram_url, 'INSTAGRAM', m.instagram_usuario, !!m.instagram_url],
      ['facebook', m.facebook_url, 'FACEBOOK', m.facebook_nombre, !!m.facebook_url],
      ['tiktok', m.tiktok_url, 'TIKTOK', m.tiktok_usuario, !!m.tiktok_url],
      ['whatsapp', 'https://wa.me/' + m.whatsapp, 'WHATSAPP', m.whatsapp_visible || m.whatsapp, !!m.whatsapp],
      ['correo', 'mailto:' + m.correo, 'CORREO', m.correo, !!m.correo]
    ];
    g.innerHTML = canales.filter(function (c) { return c[4]; }).map(function (c) {
      return '<a href="' + url(c[1]) + '"' + (c[0] === 'correo' ? '' : ' target="_blank"') + ' class="canal-item"><div class="canal-icon">' + (iconos[c[0]] || '') + '</div>' +
        '<span class="canal-name">' + esc(String(c[2] || '').toUpperCase()) + '</span><span class="canal-detail">' + esc(c[3]) + '</span></a>';
    }).join('');
  }

  function politicas(p) {
    var sec = document.getElementById('politicas');
    if (!sec || !p) return;
    var head = q('.politicas-header', sec);
    if (head) {
      encabezado(head, p);
      var intro = q('.politicas-intro', head);
      if (intro && p.intro) intro.innerHTML = rico(p.intro);
    }
    var pm = q('.politicas-payment-methods', sec);
    if (pm) {
      texto('.politicas-section-title', p.pago_seccion, pm);
      texto('.pm-name', p.pago_nombre, pm);
      texto('.pm-tag', p.pago_tag, pm);
      var body = q('.pm-body', pm);
      if (body) {
        body.innerHTML = '<p>' + rico(p.pago_resumen) + '</p><ul class="pm-list">' +
          (p.pago_puntos || []).map(function (x) { return '<li>' + esc(x.texto) + '</li>'; }).join('') + '</ul>' +
          (p.pago_nota ? '<p class="pm-note">' + rico(p.pago_nota) + '</p>' : '');
      }
    }
    var tituloGen = qa('.politicas-section-title', sec).filter(function (el) { return el.parentElement === sec; })[0];
    if (tituloGen && p.generales_titulo) tituloGen.textContent = p.generales_titulo;
    var lista = q('.politicas-list', sec);
    if (lista && p.politicas && p.politicas.length) {
      lista.innerHTML = p.politicas.map(function (x, i) {
        return '<div class="politica-card' + (x.resaltada ? ' highlight-card' : '') + '"><div class="politica-num">' + (i + 1) + '</div>' +
          '<div class="politica-content"><h3>' + esc(x.titulo) + '</h3><p>' + rico(x.texto) + '</p></div></div>';
      }).join('');
    }
    var gar = q('.politicas-garantia', sec);
    if (gar && p.garantias && p.garantias.length) {
      gar.innerHTML = p.garantias.map(function (x) {
        return '<div class="politica-item"><span class="politica-icon">' + esc(x.icono) + '</span><span class="politica-title">' + esc(x.titulo) + '</span><p class="politica-text">' + lineas(x.texto) + '</p></div>';
      }).join('');
    }
  }

  function footer(f) {
    if (!f) return;
    texto('.footer-tagline', f.descripcion);
    var col = q('footer .footer-col ul');
    if (col && f.eventos && f.eventos.length) {
      col.innerHTML = f.eventos.map(function (e) {
        return '<li><a href="#productos" onclick="filterProducts(\'' + esc(e.categoria) + '\')">' + esc(e.texto) + '</a></li>';
      }).join('');
    }
    texto('.footer-newsletter-label', f.newsletter_texto);
    texto('.footer-copy', f.copyright);
    texto('.cookie-text', f.cookies_texto);
  }

  function chat(c) {
    if (!c) return;
    texto('.chat-header-name', c.nombre);
    var sug = document.getElementById('chatSuggestions');
    if (sug && c.sugerencias && c.sugerencias.length) {
      sug.innerHTML = c.sugerencias.map(function (x) { return '<button class="chat-suggestion chat-suggestion-btn">' + esc(x.texto) + '</button>'; }).join('');
    }
  }

  // Montos de envío y % de descuento con tarjeta. Solo reemplaza las funciones si los valores cambiaron.
  function envios(e) {
    if (!e) return;
    if (!(numOk(e.gye_costo, 0, 50) && numOk(e.prov_costo, 0, 50) && numOk(e.gye_gratis_desde, 1, 50) &&
          numOk(e.prov_gratis_desde, 1, 50) && numOk(e.descuento_tarjeta, 0, 50))) return;

    var mismosEnvios = e.gye_costo === 3 && e.gye_gratis_desde === 2 && e.prov_costo === 5 && e.prov_gratis_desde === 3;
    if (!mismosEnvios) {
      var zonaYCantidad = function () {
        var z = document.getElementById('shippingZone');
        return {
          gye: (z ? z.value : 'guayaquil') === 'guayaquil',
          qty: Object.values(cart).reduce(function (s, i) { return s + i.qty; }, 0)
        };
      };
      window.getShippingCost = function () {
        var gratis = Object.values(cart).some(function (i) {
          var p = PRODUCTS.find(function (x) { return x.id === i.id; });
          return p && p.envioGratis;
        });
        if (gratis) return 0;
        var zq = zonaYCantidad();
        return zq.gye ? (zq.qty >= e.gye_gratis_desde ? 0 : e.gye_costo) : (zq.qty >= e.prov_gratis_desde ? 0 : e.prov_costo);
      };
      window.getShippingNote = function () {
        var zq = zonaYCantidad();
        var meta = zq.gye ? e.gye_gratis_desde : e.prov_gratis_desde;
        var lugar = zq.gye ? 'en Guayaquil' : 'a provincia';
        return zq.qty >= meta ? 'Envio gratis ' + lugar + '!' : 'Agrega ' + (meta - zq.qty) + ' docena(s) mas para envio gratis ' + lugar + '.';
      };
      window.updateShippingBar = function () {
        var zq = zonaYCantidad();
        var meta = zq.gye ? e.gye_gratis_desde : e.prov_gratis_desde;
        var fill = document.getElementById('shippingProgressFill');
        var label = document.getElementById('shippingProgressLabel');
        if (!fill || !label) return;
        fill.style.width = Math.min(100, Math.round((zq.qty / meta) * 100)) + '%';
        if (zq.qty >= meta) {
          label.innerHTML = '🎉 <strong>Envio gratis!</strong> Ya calificaste';
          fill.style.background = '#1ebe5d';
        } else {
          label.textContent = 'Agrega ' + (meta - zq.qty) + ' docena(s) mas para envio gratis';
        }
      };
    }

    var pct = e.descuento_tarjeta;
    if (pct !== 10) {
      window.ONLINE_PAY_DISCOUNT = pct / 100;
      window.getCardPrice = function (p) {
        if (typeof p.cardPrice === 'number') return Number(p.cardPrice).toFixed(2);
        var base = (p.onSale && (p.alwaysSale || isSaleActive())) ? Number(p.salePrice || p.price) : p.price;
        return Number(p.alwaysSale ? base : base * (1 - pct / 100)).toFixed(2);
      };
      var abrir = window.openCheckout;
      if (typeof abrir === 'function') {
        window.openCheckout = function () {
          var r = abrir.apply(this, arguments);
          var res = document.getElementById('orderSummary');
          if (res) res.innerHTML = res.innerHTML.replace('Descuento 10% pago en línea', 'Descuento ' + pct + '% pago en línea');
          return r;
        };
      }
      if (pct === 0) {
        var st = document.createElement('style');
        st.textContent = '.price-card-box{display:none!important}';
        document.head.appendChild(st);
      }
    }
  }
})();
