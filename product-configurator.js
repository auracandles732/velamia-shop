(function () {
  'use strict';

  var CUSTOMIZABLE = {1: true, 3: true, 5: true};
  var COLORS = {
    crema:  { label: 'Crema',  value: '#f1dfbd' },
    rosado: { label: 'Rosado', value: '#efc8c9' },
    celeste:{ label: 'Celeste', value: '#cfe3ef' },
    blanco: { label: 'Blanco', value: '#f8f8f5' }
  };

  var state = {
    id: null,
    qty: 1,
    colors: { bear: 'crema', cloud: 'crema', heart: 'rosado' }
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function initConfigurator() {
    if (typeof PRODUCTS === 'undefined' || typeof IMG_MAP === 'undefined') return;
    var page = document.getElementById('productPage');
    if (!page) return;

    installStyles();
    buildPage(page);

    var originalClose = window.closeProductPage;
    window.closeProductPage = function (fromHistory) {
      if (typeof originalClose === 'function') return originalClose(fromHistory);
      page.style.display = 'none';
      if (typeof showMainContent === 'function') showMainContent();
    };

    window.changePpQty = changeQty;
    window.openProductModal = function (id) { window.openProductPage(id); };
    window.openProductPage = function (id, fromHistory) {
      var product = PRODUCTS.find(function (item) { return item.id === id; });
      if (!product) return;

      state.id = id;
      state.qty = 1;
      state.colors = { bear: 'crema', cloud: 'crema', heart: 'rosado' };

      if (!fromHistory) {
        history.pushState({ page: 'product', id: id }, '', '#producto-' + id);
      }

      trackView(product);
      renderProduct(product);

      if (typeof hideMainContent === 'function') hideMainContent();
      page.style.display = 'block';
      window.scrollTo(0, 0);
    };

    var match = window.location.hash.match(/^#producto-(\d+)$/);
    if (match) {
      window.openProductPage(parseInt(match[1], 10), true);
    }
  });

  function installStyles() {
    if (document.getElementById('velamia-configurator-v2-styles')) return;
    var style = document.createElement('style');
    style.id = 'velamia-configurator-v2-styles';
    style.textContent = `
      #productPage.vc-page{padding:92px 5vw 42px;background:#fff;min-height:100vh;font-family:'Montserrat',sans-serif;color:#29251f}
      .vc-shell{width:min(1400px,100%);margin:0 auto;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(410px,.85fr);gap:3.1rem;align-items:start}
      .vc-gallery{min-width:0}
      .vc-main-frame{height:min(650px,calc(100vh - 130px));min-height:520px;background:#fbf8f3;border:1px solid #eee8df;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .vc-main-image{width:100%;height:100%;object-fit:contain;display:block}
      .vc-thumbs{display:flex;gap:.65rem;margin-top:.7rem;min-height:76px}
      .vc-thumb{width:76px;height:76px;object-fit:cover;background:#f6f1eb;border:1px solid #e4ddd3;cursor:pointer;opacity:.8}
      .vc-thumb.is-active{opacity:1;border-color:#8f7d68;box-shadow:0 0 0 1px #8f7d68 inset}
      .vc-details{position:sticky;top:84px;padding:.55rem 0 0}
      .vc-title{font-size:clamp(1.35rem,2vw,1.78rem);font-weight:400;line-height:1.25;letter-spacing:.02em;text-transform:uppercase;margin:0 0 1rem;color:#292622}
      .vc-description{font-size:.87rem;line-height:1.75;color:#68615a;font-weight:400}
      .vc-description p{margin:0 0 .75rem}
      .vc-price{font-size:.95rem;color:#26221e;margin:1rem 0}
      .vc-personalizer{margin-top:1.15rem}
      .vc-section-heading{display:flex;align-items:center;gap:1rem;margin-bottom:1rem}
      .vc-section-heading span{font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap}
      .vc-section-heading:after{content:'';height:1px;background:#e8e0d6;flex:1}
      .vc-custom-grid{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:1.25rem;align-items:start}
      .vc-options{display:flex;flex-direction:column;gap:.9rem;padding-top:.2rem}
      .vc-option-row{display:grid;grid-template-columns:132px repeat(4,32px);align-items:center;gap:.75rem}
      .vc-option-label{font-size:.78rem;color:#615b54;font-weight:500}
      .vc-color{width:31px;height:31px;border-radius:50%;border:1px solid rgba(55,48,42,.18);padding:0;cursor:pointer;background:var(--swatch);position:relative}
      .vc-color.is-selected{box-shadow:0 0 0 2px #fff,0 0 0 3px #6d6258}
      .vc-color.is-selected:after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.82rem;font-weight:700;color:#5d554d}
      .vc-preview-card{border:1px solid #e4ddd4;border-radius:10px;background:#fdfbf8;padding:.65rem .55rem .55rem;text-align:center;min-height:218px}
      .vc-preview-title{display:block;font-size:.58rem;letter-spacing:.13em;font-weight:600;text-transform:uppercase;color:#605b55;margin-bottom:.3rem}
      .vc-preview{display:block;width:135px;height:160px;margin:0 auto;filter:drop-shadow(0 7px 6px rgba(75,55,36,.12))}
      .vc-preview-note{display:block;font-size:.59rem;color:#918a82;margin-top:0}
      .vc-qty-row{display:flex;align-items:center;gap:1.15rem;margin:1.15rem 0 1rem}
      .vc-qty-label{font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;min-width:92px}
      .vc-qty-btn{border:0;background:transparent;font:inherit;font-size:1.2rem;line-height:1;padding:.2rem .35rem;cursor:pointer}
      .vc-qty-value{font-size:.9rem;min-width:18px;text-align:center}
      .vc-add-btn{display:block;width:276px;max-width:100%;padding:.94rem 1.2rem;background:#fff;border:1px solid #37322d;color:#39342f;font:inherit;font-size:.7rem;font-weight:500;letter-spacing:.2em;text-transform:uppercase;cursor:pointer}
      .vc-add-btn:hover{background:#2b2723;color:#fff}
      .vc-add-btn.is-added{background:#25b861;border-color:#25b861;color:#fff}
      .vc-wa-btn{margin-top:1rem;display:flex;align-items:center;justify-content:center;gap:.6rem;width:352px;max-width:100%;padding:.94rem 1.25rem;background:#23cf66;color:#fff;text-decoration:none;border-radius:5px;font-size:.73rem;font-weight:600}
      .vc-wa-btn:hover{background:#1ebb5b}
      .vc-back{display:inline-block;margin-top:1.65rem;color:#8b837b;text-decoration:none;font-size:.7rem}
      .vc-basic-note{margin-top:1rem;padding:.9rem 1rem;background:#faf7f2;border:1px solid #ece5dc;font-size:.78rem;line-height:1.6;color:#625b54}
      @media(max-width:1000px){.vc-shell{grid-template-columns:1fr 390px;gap:2rem}.vc-main-frame{min-height:460px;height:560px}.vc-option-row{grid-template-columns:116px repeat(4,30px);gap:.58rem}}
      @media(max-width:820px){#productPage.vc-page{padding:80px 1rem 30px}.vc-shell{grid-template-columns:1fr;gap:1.5rem}.vc-main-frame{height:auto;min-height:0;aspect-ratio:1/1}.vc-details{position:static;padding-top:0}.vc-custom-grid{grid-template-columns:1fr 145px;gap:.9rem}.vc-option-row{grid-template-columns:108px repeat(4,29px);gap:.46rem}.vc-add-btn,.vc-wa-btn{width:100%}}
      @media(max-width:520px){.vc-custom-grid{grid-template-columns:1fr}.vc-preview-card{width:170px;justify-self:center}.vc-option-row{grid-template-columns:1fr repeat(4,31px);gap:.62rem}.vc-option-label{grid-column:1/-1;margin-bottom:-.25rem}.vc-main-frame{aspect-ratio:4/5}}
    `;
    document.head.appendChild(style);
  }

  function buildPage(page) {
    page.className = 'product-page vc-page';
    page.innerHTML = `
      <div class="vc-shell">
        <div class="vc-gallery">
          <div class="vc-main-frame"><img class="vc-main-image" id="vcMainImage" src="" alt=""></div>
          <div class="vc-thumbs" id="vcThumbs"></div>
        </div>
        <div class="vc-details">
          <h1 class="vc-title" id="vcTitle"></h1>
          <div class="vc-description" id="vcDescription"></div>
          <div class="vc-price" id="vcPrice"></div>
          <div id="vcCustomizer"></div>
          <div class="vc-qty-row">
            <span class="vc-qty-label" id="vcQtyLabel">DOCENAS</span>
            <button class="vc-qty-btn" type="button" id="vcQtyMinus">−</button>
            <span class="vc-qty-value" id="vcQtyValue">1</span>
            <button class="vc-qty-btn" type="button" id="vcQtyPlus">+</button>
          </div>
          <button class="vc-add-btn" type="button" id="vcAddButton">AÑADIR AL CARRITO</button>
          <a class="vc-wa-btn" id="vcWhatsapp" href="#" target="_blank" rel="noopener">💬 Personalizar / Consultar por WhatsApp</a>
          <a class="vc-back" href="#" id="vcBack">← Volver a la tienda</a>
        </div>
      </div>`;

    document.getElementById('vcQtyMinus').addEventListener('click', function () { changeQty(-1); });
    document.getElementById('vcQtyPlus').addEventListener('click', function () { changeQty(1); });
    document.getElementById('vcAddButton').addEventListener('click', addCurrentToCart);
    document.getElementById('vcBack').addEventListener('click', function (event) {
      event.preventDefault();
      if (typeof window.closeProductPage === 'function') window.closeProductPage();
    });
  }

  function renderProduct(product) {
    document.getElementById('vcTitle').textContent = product.name;
    document.getElementById('vcDescription').innerHTML =
      '<p>' + product.desc + '.</p>' +
      '<p>Vela artesanal hecha a mano con cera de alta calidad. Cada pieza es única e ideal para hacer de tu evento un momento especial.</p>' +
      '<p>Incluye empaque elegante y nombre personalizado sin costo adicional. Pedidos bajo reserva.</p>';
    document.getElementById('vcPrice').textContent = '$' + Number(product.price).toFixed(2);
    document.getElementById('vcQtyLabel').textContent = product.unit === 'unidad' ? 'UNIDADES' : 'DOCENAS';
    document.getElementById('vcQtyValue').textContent = '1';

    var images = product.imgs && product.imgs.length ? product.imgs : [product.img];
    var main = document.getElementById('vcMainImage');
    main.src = IMG_MAP[images[0]];
    main.alt = product.name;

    var thumbs = document.getElementById('vcThumbs');
    thumbs.innerHTML = images.map(function (key, index) {
      return '<img class="vc-thumb' + (index === 0 ? ' is-active' : '') + '" src="' + IMG_MAP[key] + '" alt="Vista ' + (index + 1) + '" data-key="' + key + '">';
    }).join('');
    thumbs.querySelectorAll('.vc-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = IMG_MAP[thumb.getAttribute('data-key')];
        thumbs.querySelectorAll('.vc-thumb').forEach(function (item) { item.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });

    var customizer = document.getElementById('vcCustomizer');
    customizer.innerHTML = CUSTOMIZABLE[product.id] ? customizerMarkup() : '<div class="vc-basic-note">Este diseño se personaliza por WhatsApp con nombre, color y detalles del evento.</div>';
    if (CUSTOMIZABLE[product.id]) bindColorButtons();

    document.getElementById('vcAddButton').classList.remove('is-added');
    document.getElementById('vcAddButton').textContent = 'AÑADIR AL CARRITO';
    updateWhatsapp(product);
  }

  function customizerMarkup() {
    return `
      <div class="vc-personalizer">
        <div class="vc-section-heading"><span>PERSONALIZA TU VELA</span></div>
        <div class="vc-custom-grid">
          <div class="vc-options">
            ${optionRow('Color del osito', 'bear')}
            ${optionRow('Color de la nube', 'cloud')}
            ${optionRow('Color del corazón', 'heart')}
          </div>
          <div class="vc-preview-card">
            <span class="vc-preview-title">VISTA PREVIA</span>
            <svg class="vc-preview" id="vcPreview" viewBox="0 0 160 185" aria-label="Vista previa de la vela">
              <path d="M77 5v18" stroke="#b7aa99" stroke-width="2" stroke-linecap="round"/>
              <path d="M77 5c5 3 4 7 0 10-4-3-4-7 0-10" fill="#d7ad61" opacity=".8"/>
              <g id="vcCloud" fill="#f1dfbd">
                <ellipse cx="80" cy="145" rx="56" ry="24"/><circle cx="47" cy="135" r="24"/><circle cx="77" cy="124" r="31"/><circle cx="112" cy="136" r="25"/>
              </g>
              <g id="vcBear" fill="#f1dfbd">
                <circle cx="60" cy="61" r="13"/><circle cx="99" cy="61" r="13"/><circle cx="80" cy="72" r="30"/>
                <ellipse cx="80" cy="112" rx="30" ry="35"/><ellipse cx="55" cy="117" rx="12" ry="23" transform="rotate(25 55 117)"/><ellipse cx="105" cy="117" rx="12" ry="23" transform="rotate(-25 105 117)"/>
                <ellipse cx="65" cy="137" rx="15" ry="11"/><ellipse cx="95" cy="137" rx="15" ry="11"/>
              </g>
              <ellipse cx="80" cy="78" rx="16" ry="12" fill="#ead4b9" opacity=".75"/>
              <circle cx="70" cy="70" r="2.4" fill="#3b3027"/><circle cx="90" cy="70" r="2.4" fill="#3b3027"/><ellipse cx="80" cy="78" rx="3" ry="2.2" fill="#4a3b30"/>
              <path d="M58 94c17 13 33 13 45 0" fill="none" stroke="#e3b4bd" stroke-width="8" stroke-linecap="round"/>
              <path id="vcHeart" d="M122 105c-10-14-30-2-20 12l20 21 20-21c10-14-10-26-20-12z" fill="#efc8c9"/>
            </svg>
            <span class="vc-preview-note">Así quedará tu vela</span>
          </div>
        </div>
      </div>`;
  }

  function optionRow(label, part) {
    return '<div class="vc-option-row"><span class="vc-option-label">' + label + '</span>' +
      Object.keys(COLORS).map(function (key) {
        var selected = state.colors[part] === key ? ' is-selected' : '';
        return '<button type="button" class="vc-color' + selected + '" data-part="' + part + '" data-color="' + key + '" style="--swatch:' + COLORS[key].value + '" title="' + COLORS[key].label + '"></button>';
      }).join('') + '</div>';
  }

  function bindColorButtons() {
    document.querySelectorAll('.vc-color').forEach(function (button) {
      button.addEventListener('click', function () {
        var part = button.getAttribute('data-part');
        var color = button.getAttribute('data-color');
        state.colors[part] = color;
        document.querySelectorAll('.vc-color[data-part="' + part + '"]').forEach(function (item) { item.classList.remove('is-selected'); });
        button.classList.add('is-selected');
        updatePreview();
        var product = PRODUCTS.find(function (item) { return item.id === state.id; });
        if (product) updateWhatsapp(product);
      });
    });
    updatePreview();
  }

  function updatePreview() {
    var bear = document.getElementById('vcBear');
    var cloud = document.getElementById('vcCloud');
    var heart = document.getElementById('vcHeart');
    if (bear) bear.setAttribute('fill', COLORS[state.colors.bear].value);
    if (cloud) cloud.setAttribute('fill', COLORS[state.colors.cloud].value);
    if (heart) heart.setAttribute('fill', COLORS[state.colors.heart].value);
  }

  function changeQty(delta) {
    state.qty = Math.max(1, Math.min(50, state.qty + delta));
    var value = document.getElementById('vcQtyValue');
    if (value) value.textContent = String(state.qty);
    var product = PRODUCTS.find(function (item) { return item.id === state.id; });
    if (product) updateWhatsapp(product);
  }

  function addCurrentToCart() {
    var product = PRODUCTS.find(function (item) { return item.id === state.id; });
    if (!product) return;
    if (typeof addToCartFromPage === 'function') addToCartFromPage(product.id, state.qty);

    var button = document.getElementById('vcAddButton');
    button.textContent = '✓ AÑADIDO AL CARRITO';
    button.classList.add('is-added');
    setTimeout(function () {
      button.textContent = 'AÑADIR AL CARRITO';
      button.classList.remove('is-added');
    }, 1400);
  }

  function updateWhatsapp(product) {
    var details = CUSTOMIZABLE[product.id]
      ? ' Colores: osito ' + COLORS[state.colors.bear].label + ', nube ' + COLORS[state.colors.cloud].label + ', corazón ' + COLORS[state.colors.heart].label + '.'
      : '';
    var unit = product.unit === 'unidad' ? 'unidades' : 'docenas';
    var message = 'Hola Velamia 👋 Estoy viendo ' + product.name + ' ($' + Number(product.price).toFixed(2) + '). Quiero ' + state.qty + ' ' + unit + '.' + details + ' Quisiera confirmar personalización y fecha de entrega.';
    document.getElementById('vcWhatsapp').href = 'https://wa.me/593995448686?text=' + encodeURIComponent(message);
  }

  function trackView(product) {
    if (typeof fbq !== 'undefined') fbq('track', 'ViewContent', { content_name: product.name, content_category: product.cat, value: product.price, currency: 'USD' });
    if (typeof gtag !== 'undefined') gtag('event', 'view_item', { currency: 'USD', value: product.price, items: [{ item_id: String(product.id), item_name: product.name, item_category: product.cat, price: product.price, quantity: 1 }] });
  }
})();
