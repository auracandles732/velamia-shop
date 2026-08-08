(function () {
  'use strict';

  // ── Paletas por pieza ──────────────────────────────────────────────
  // Los hex son el TINTE que se multiplica sobre la base fotografica.
  // El multiply oscurece ~20%, por eso los tonos van claros.
  var PALETTE = {
    osito: [
      { k: 'beige',   n: 'Beige',          v: '#eed6b8' },
      { k: 'cafe',    n: 'Café',           v: '#c69a72' },
      { k: 'rosado',  n: 'Rosado pastel',  v: '#f8d5d8' },
      { k: 'celeste', n: 'Celeste pastel', v: '#d6e6f4' }
    ],
    nube: [
      { k: 'beige',   n: 'Beige',   v: '#ecdcc4' },
      { k: 'blanco',  n: 'Blanco',  v: '#fbfaf7' },
      { k: 'crema',   n: 'Crema',   v: '#f7ebd4' },
      { k: 'celeste', n: 'Celeste', v: '#d6e6f4' }
    ],
    clasica: [
      { k: 'crema',   n: 'Crema',   v: '#f1dfbd' },
      { k: 'rosado',  n: 'Rosado',  v: '#efc8c9' },
      { k: 'celeste', n: 'Celeste', v: '#cfe3ef' },
      { k: 'blanco',  n: 'Blanco',  v: '#f8f8f5' }
    ]
  };

  // ── Configuracion por producto ─────────────────────────────────────
  // Para dar vista previa fotografica a otro producto basta con agregar
  // su entrada aqui con la base y las mascaras correspondientes.
  var CONFIG = {
    1: {
      parts: [
        { id: 'bear',  short: 'osito', label: 'Color del osito',  palette: 'osito', def: 'beige'  },
        { id: 'cloud', short: 'nube',  label: 'Color de la nube', palette: 'nube',  def: 'blanco' }
      ],
      // Sin vista previa: el producto muestra solo los selectores de color.
      // Para reactivar el modelo 3D basta con restaurar este bloque:
      //   type: 'model3d', src: 'models/osito-nube.glb', ratio: '1 / 1',
      //   materials: { bear: 'MatOsito', cloud: 'MatNube' }
      preview: null
    },
    3: {
      parts: [
        { id: 'bear',  short: 'osito',   label: 'Color del osito',    palette: 'clasica', def: 'crema'  },
        { id: 'cloud', short: 'nube',    label: 'Color de la nube',   palette: 'clasica', def: 'crema'  },
        { id: 'heart', short: 'corazón', label: 'Color del corazón',  palette: 'clasica', def: 'rosado' }
      ],
      preview: null
    },
    5: {
      parts: [
        { id: 'bear',  short: 'osito',   label: 'Color del osito',   palette: 'clasica', def: 'crema'  },
        { id: 'cloud', short: 'nube',    label: 'Color de la nube',  palette: 'clasica', def: 'crema'  },
        { id: 'heart', short: 'corazón', label: 'Color del corazón', palette: 'clasica', def: 'rosado' }
      ],
      preview: null
    }
  };

  var state = {
    id: null,
    qty: 1,
    name: '',
    date: '',
    images: [],
    imageIndex: 0,
    colors: {}
  };

  function cfg(id) { return CONFIG[id] || null; }
  function optionsFor(part) { return PALETTE[part.palette] || PALETTE.clasica; }
  function colorOf(part, key) {
    var list = optionsFor(part);
    for (var i = 0; i < list.length; i++) if (list[i].k === key) return list[i];
    return list[0];
  }

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
    hookCart();

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
      state.name = '';
      state.date = '';
      state.imageIndex = 0;
      state.colors = {};
      var conf = cfg(id);
      if (conf) conf.parts.forEach(function (p) { state.colors[p.id] = p.def; });

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
    if (match) window.openProductPage(parseInt(match[1], 10), true);
  });

  function installStyles() {
    if (document.getElementById('velamia-configurator-v3-styles')) return;
    var style = document.createElement('style');
    style.id = 'velamia-configurator-v3-styles';
    style.textContent = `
      #productPage.vc-page{
        --vc-ink:#4a423a;--vc-soft:#8c8279;--vc-line:#ece2d6;--vc-cream:#f9f3ea;
        --vc-blush:#f4dcdc;--vc-blush-deep:#d9a9ab;--vc-sand:#e9dccb;--vc-gold:#c3a175;
        padding:92px 5vw 60px;background:linear-gradient(180deg,#fffdfb 0%,#fdf8f2 100%);
        min-height:100vh;font-family:'Montserrat',sans-serif;color:var(--vc-ink)
      }
      #productPage.vc-page *,#productPage.vc-page *::before,#productPage.vc-page *::after{box-sizing:border-box}
      .vc-shell{width:min(1280px,100%);margin:0 auto;display:grid;
        grid-template-columns:minmax(0,1fr) minmax(400px,460px);gap:3rem;align-items:start}

      /* ── Galeria ── */
      .vc-gallery{min-width:0}
      .vc-main-frame{position:relative;aspect-ratio:1/1;max-height:600px;
        background:linear-gradient(150deg,#fdf9f4,#f8f0e6);border:1px solid var(--vc-line);border-radius:24px;
        box-shadow:0 18px 46px -24px rgba(120,95,70,.30);display:flex;align-items:center;justify-content:center;overflow:hidden}
      .vc-main-image{width:100%;height:100%;object-fit:contain;padding:1.4rem;transition:opacity .28s ease}
      .vc-main-image.is-swapping{opacity:0}
      .vc-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;
        border:1px solid var(--vc-line);background:rgba(255,255,255,.88);color:var(--vc-ink);
        font-size:1.3rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;
        box-shadow:0 6px 18px -8px rgba(120,95,70,.45);transition:all .22s ease;opacity:0;pointer-events:none}
      .vc-main-frame:hover .vc-nav,.vc-nav:focus-visible{opacity:1;pointer-events:auto}
      .vc-nav:hover{background:#fff;border-color:var(--vc-blush-deep)}
      .vc-nav-prev{left:12px} .vc-nav-next{right:12px}
      .vc-counter{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
        background:rgba(255,255,255,.9);border:1px solid var(--vc-line);border-radius:50px;
        padding:.26rem .78rem;font-size:.65rem;letter-spacing:.08em;color:var(--vc-soft)}
      .vc-thumbs{display:flex;gap:.65rem;margin-top:.9rem;flex-wrap:wrap}
      .vc-thumb{width:74px;height:74px;object-fit:cover;background:var(--vc-cream);border:1px solid var(--vc-line);
        border-radius:14px;cursor:pointer;opacity:.72;transition:all .25s ease;padding:4px}
      .vc-thumb:hover{opacity:1;transform:translateY(-2px)}
      .vc-thumb.is-active{opacity:1;border-color:var(--vc-blush-deep);
        box-shadow:0 0 0 2px rgba(217,169,171,.32)}
      .vc-benefits{margin-top:1.3rem;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;
        background:linear-gradient(135deg,#fffaf5,#fdf1ea);border:1px solid var(--vc-line);
        border-radius:18px;padding:1.05rem 1.15rem}
      .vc-benefit{display:flex;align-items:center;gap:.55rem;font-size:.73rem;line-height:1.4;color:#6d645b}
      .vc-benefit-icon{flex:0 0 32px;width:32px;height:32px;border-radius:50%;background:#fff;
        display:flex;align-items:center;justify-content:center;font-size:.92rem;
        box-shadow:0 3px 10px -4px rgba(120,95,70,.35)}

      /* ── Panel derecho: UNA sola tarjeta, sin anidar ── */
      .vc-details{min-width:0}
      .vc-card{background:rgba(255,255,255,.78);border:1px solid var(--vc-line);border-radius:24px;
        padding:1.9rem 1.75rem;box-shadow:0 20px 52px -32px rgba(120,95,70,.40)}
      .vc-eyebrow{font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;color:var(--vc-gold);
        margin:0 0 .5rem;font-weight:600}
      .vc-title{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.6rem,2.4vw,2.15rem);
        font-weight:400;line-height:1.15;margin:0;color:#3f3830}
      .vc-subtitle{font-size:.79rem;color:var(--vc-soft);margin:.45rem 0 0;font-style:italic}
      .vc-rule{height:1px;background:linear-gradient(90deg,var(--vc-sand),rgba(233,220,203,0));margin:1.2rem 0}
      .vc-price-row{display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap}
      .vc-price{font-family:Georgia,serif;font-size:1.8rem;color:#3f3830}
      .vc-price-unit{font-size:.77rem;color:var(--vc-soft)}
      .vc-price-note{display:inline-flex;align-items:center;gap:.4rem;margin:.65rem 0 0;background:var(--vc-blush);
        border-radius:50px;padding:.38rem .82rem;font-size:.67rem;color:#7d5d5e;font-weight:500}
      .vc-description{font-size:.81rem;line-height:1.78;color:#6d645b}
      .vc-description p{margin:0 0 .65rem}
      .vc-description p:last-child{margin-bottom:0}
      .vc-heading{display:flex;align-items:center;gap:.85rem;margin:0 0 1.1rem}
      .vc-heading span{font-size:.65rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
        white-space:nowrap;color:#7a7067}
      .vc-heading:after{content:'';height:1px;background:var(--vc-line);flex:1}

      /* ── Vista previa: centrada y proporcionada ── */
      .vc-preview{text-align:center;margin:0 auto 1.5rem;max-width:300px}
      .vc-preview-title{display:block;font-size:.56rem;letter-spacing:.18em;font-weight:700;
        text-transform:uppercase;color:var(--vc-gold);margin-bottom:.5rem}
      .vc-render{position:relative;isolation:isolate;width:100%;margin:0 auto;
        aspect-ratio:var(--ratio,720/875);filter:drop-shadow(0 14px 12px rgba(120,95,70,.20))}
      .vc-lay{position:absolute;inset:0;width:100%;height:100%}
      .vc-base{object-fit:contain}
      .vc-tint{mix-blend-mode:multiply}
      @supports not ((-webkit-mask-image:none) or (mask-image:none)){ .vc-tint{display:none} }

      /* ── Vista 3D giratoria ── */
      .vc-preview--3d{max-width:340px}
      .vc-render-3d{position:relative;width:100%;margin:0 auto;aspect-ratio:var(--ratio,1/1);
        border:1px solid var(--vc-line);border-radius:20px;overflow:hidden;
        background:radial-gradient(120% 100% at 50% 8%,#fffdfb 0%,#f7efe4 100%);
        box-shadow:inset 0 -14px 26px -20px rgba(120,95,70,.45)}
      .vc-mv{width:100%;height:100%;display:block;background:transparent;
        --poster-color:transparent;--progress-bar-color:var(--vc-blush-deep);
        --progress-mask:transparent;outline:none;touch-action:pan-y}
      .vc-3d-hint{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);
        display:inline-flex;align-items:center;gap:.32rem;padding:.2rem .6rem;border-radius:50px;
        background:rgba(255,255,255,.82);font-size:.58rem;letter-spacing:.04em;color:#8c8279;
        pointer-events:none;transition:opacity .3s ease;white-space:nowrap}
      .vc-render-3d.is-touched .vc-3d-hint{opacity:0}
      .vc-3d-badge{position:absolute;top:9px;right:10px;padding:.16rem .5rem;border-radius:50px;
        background:rgba(255,255,255,.85);font-size:.53rem;font-weight:700;letter-spacing:.1em;
        color:var(--vc-gold);pointer-events:none}
      .vc-3d-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        padding:1rem;text-align:center;font-size:.68rem;line-height:1.55;color:#6d645b}

      .vc-preview-note{display:block;font-size:.62rem;color:var(--vc-soft);margin-top:.5rem;font-style:italic}

      /* ── Selector de colores ── */
      .vc-group{margin-bottom:1.35rem}
      .vc-group:last-child{margin-bottom:0}
      .vc-group-label{display:block;font-size:.73rem;font-weight:600;color:#6d645b;margin-bottom:.7rem}
      .vc-swatches{display:flex;gap:1.05rem;flex-wrap:wrap}
      .vc-opt{background:none;border:0;padding:0;cursor:pointer;text-align:center;width:58px;font:inherit}
      .vc-dot{display:block;width:40px;height:40px;border-radius:50%;margin:0 auto;border:2px solid #fff;
        background:var(--c);position:relative;transition:transform .2s ease,box-shadow .2s ease;
        box-shadow:0 0 0 1px #e5dbcd,0 4px 11px -5px rgba(120,95,70,.55)}
      .vc-opt:hover .vc-dot{transform:translateY(-3px) scale(1.07)}
      .vc-opt.is-on .vc-dot{box-shadow:0 0 0 2px #fff,0 0 0 3.5px var(--vc-blush-deep),0 6px 15px -6px rgba(120,95,70,.55)}
      .vc-opt.is-on .vc-dot:after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;
        justify-content:center;font-size:.88rem;font-weight:700;color:#6b5f55}
      .vc-optname{display:block;font-size:.6rem;color:var(--vc-soft);margin-top:.42rem;line-height:1.25}
      .vc-opt.is-on .vc-optname{color:var(--vc-ink);font-weight:600}
      .vc-note{padding:.95rem 1.1rem;background:linear-gradient(135deg,#fffaf5,#fdf2ec);border:1px solid var(--vc-line);
        border-radius:16px;font-size:.75rem;line-height:1.65;color:#6d645b}

      /* ── Campos ── */
      .vc-fields{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
      .vc-field{display:flex;flex-direction:column;gap:.38rem}
      .vc-field--full{grid-column:1/-1}
      .vc-field label{font-size:.67rem;font-weight:600;letter-spacing:.05em;color:#6d645b}
      .vc-field input{width:100%;padding:.75rem .88rem;border:1px solid var(--vc-line);border-radius:13px;
        background:#fffdfb;font-family:'Montserrat',sans-serif;font-size:.79rem;color:var(--vc-ink);
        outline:none;transition:all .22s ease}
      .vc-field input::placeholder{color:#bdb4aa}
      .vc-field input:focus{border-color:var(--vc-blush-deep);box-shadow:0 0 0 3px rgba(244,220,220,.55);background:#fff}
      .vc-stepper{display:flex;align-items:center;justify-content:space-between;gap:.3rem;
        border:1px solid var(--vc-line);border-radius:13px;background:#fffdfb;padding:.28rem .32rem}
      .vc-qty-btn{border:0;background:var(--vc-cream);border-radius:9px;width:33px;height:33px;
        font:inherit;font-size:1.05rem;line-height:1;color:#6d645b;cursor:pointer;transition:all .2s ease}
      .vc-qty-btn:hover{background:var(--vc-blush);color:#7d5d5e}
      .vc-qty-value{font-size:.86rem;font-weight:600;min-width:26px;text-align:center}

      /* ── Resumen y acciones ── */
      .vc-summary{margin-top:1.3rem;border:1px solid var(--vc-line);border-radius:18px;
        background:linear-gradient(140deg,#fffaf5,#fdf2ec);padding:1.05rem 1.15rem}
      .vc-sum-row{display:flex;align-items:center;justify-content:space-between;font-size:.75rem;color:#6d645b;padding:.26rem 0}
      .vc-sum-row.is-total{margin-top:.45rem;padding-top:.65rem;border-top:1px dashed var(--vc-sand);
        font-size:.93rem;font-weight:700;color:#3f3830}
      .vc-sum-row.is-total .vc-sum-val{font-family:Georgia,serif;font-size:1.22rem;font-weight:400}
      .vc-actions{display:flex;flex-direction:column;gap:.65rem;margin-top:1.25rem}
      .vc-add-btn{width:100%;padding:1.02rem 1.2rem;border:0;border-radius:50px;cursor:pointer;
        background:linear-gradient(135deg,#6d6055,#544a41);color:#fff;font:inherit;font-size:.71rem;
        font-weight:600;letter-spacing:.18em;text-transform:uppercase;
        box-shadow:0 12px 26px -14px rgba(84,74,65,.85);transition:all .25s ease}
      .vc-add-btn:hover{transform:translateY(-2px)}
      .vc-add-btn.is-added{background:linear-gradient(135deg,#59b98a,#3f9d70)}
      .vc-wa-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;
        padding:1rem 1.2rem;border:1.5px solid #cfe6d5;border-radius:50px;background:#fff;color:#3d7c5a;
        text-decoration:none;font-size:.71rem;font-weight:600;letter-spacing:.05em;transition:all .25s ease}
      .vc-wa-btn:hover{background:#f2fbf5;border-color:#a9d8bb;transform:translateY(-2px)}
      .vc-back{display:inline-block;margin-top:1.3rem;color:var(--vc-soft);text-decoration:none;font-size:.69rem}
      .vc-back:hover{color:var(--vc-gold)}

      /* ── Responsive ── */
      @media(max-width:1040px){
        .vc-shell{grid-template-columns:minmax(0,1fr) 390px;gap:2rem}
        .vc-card{padding:1.6rem 1.35rem}
      }
      @media(max-width:880px){
        #productPage.vc-page{padding:78px 1.1rem 40px}
        .vc-shell{grid-template-columns:minmax(0,1fr);gap:1.5rem}
        .vc-main-frame{border-radius:20px;max-height:none}
        .vc-nav{opacity:1;pointer-events:auto}
        .vc-card{padding:1.5rem 1.2rem;border-radius:20px}
      }
      @media(max-width:560px){
        .vc-benefits{grid-template-columns:1fr;padding:.95rem}
        .vc-fields{grid-template-columns:1fr}
        .vc-thumb{width:62px;height:62px;border-radius:12px}
        .vc-swatches{gap:.7rem;justify-content:flex-start}
        .vc-opt{width:52px}
        .vc-dot{width:36px;height:36px}
        .vc-preview{max-width:230px}
      }
    `;
    document.head.appendChild(style);
  }

  var BENEFITS = [
    { icon: '🎁', text: 'Incluye empaque y nombre personalizado' },
    { icon: '🕯️', text: 'Cera de alta calidad' },
    { icon: '🤍', text: 'Hechas a mano con amor' },
    { icon: '🚚', text: 'Envíos a todo el país' }
  ];

  function buildPage(page) {
    page.className = 'product-page vc-page';
    page.innerHTML = `
      <div class="vc-shell">
        <div class="vc-gallery">
          <div class="vc-main-frame">
            <button class="vc-nav vc-nav-prev" type="button" id="vcPrev" aria-label="Imagen anterior">‹</button>
            <img class="vc-main-image" id="vcMainImage" src="" alt="">
            <button class="vc-nav vc-nav-next" type="button" id="vcNext" aria-label="Imagen siguiente">›</button>
            <span class="vc-counter" id="vcCounter">1 / 1</span>
          </div>
          <div class="vc-thumbs" id="vcThumbs"></div>
          <div class="vc-benefits">
            ${BENEFITS.map(function (b) {
              return '<div class="vc-benefit"><span class="vc-benefit-icon">' + b.icon + '</span><span>' + b.text + '</span></div>';
            }).join('')}
          </div>
        </div>

        <div class="vc-details">
          <div class="vc-card">
            <p class="vc-eyebrow">Velamia · Hecho a mano</p>
            <h1 class="vc-title" id="vcTitle"></h1>
            <p class="vc-subtitle">Personaliza tu vela</p>

            <div class="vc-rule"></div>
            <div class="vc-price-row">
              <span class="vc-price" id="vcPrice"></span>
              <span class="vc-price-unit" id="vcPriceUnit"></span>
            </div>
            <p class="vc-price-note">🎀 Incluye empaque y nombre personalizado</p>

            <div class="vc-rule"></div>
            <div class="vc-description" id="vcDescription"></div>

            <div class="vc-rule"></div>
            <div id="vcCustomizer"></div>

            <div class="vc-rule"></div>
            <div class="vc-heading"><span>Detalles de tu pedido</span></div>
            <div class="vc-fields">
              <div class="vc-field vc-field--full">
                <label for="vcName">Nombre para el empaque</label>
                <input type="text" id="vcName" maxlength="40" placeholder="Ej. Emilia · Bautizo de Martín" autocomplete="off">
              </div>
              <div class="vc-field">
                <label for="vcDate">Fecha del evento</label>
                <input type="date" id="vcDate">
              </div>
              <div class="vc-field">
                <label for="vcQtyValue" id="vcQtyLabel">Cantidad</label>
                <div class="vc-stepper">
                  <button class="vc-qty-btn" type="button" id="vcQtyMinus" aria-label="Disminuir">−</button>
                  <span class="vc-qty-value" id="vcQtyValue">1</span>
                  <button class="vc-qty-btn" type="button" id="vcQtyPlus" aria-label="Aumentar">+</button>
                </div>
              </div>
            </div>

            <div class="vc-summary">
              <div class="vc-sum-row"><span>Cantidad</span><span class="vc-sum-val" id="vcSumQty">1 docena</span></div>
              <div class="vc-sum-row"><span>Precio</span><span class="vc-sum-val" id="vcSumPrice">$0.00</span></div>
              <div class="vc-sum-row is-total"><span>Total</span><span class="vc-sum-val" id="vcSumTotal">$0.00</span></div>
            </div>

            <div class="vc-actions">
              <button class="vc-add-btn" type="button" id="vcAddButton">Añadir al carrito</button>
              <a class="vc-wa-btn" id="vcWhatsapp" href="#" target="_blank" rel="noopener">💬 Personalizar / Consultar por WhatsApp</a>
            </div>

            <a class="vc-back" href="#" id="vcBack">← Volver a la tienda</a>
          </div>
        </div>
      </div>`;

    document.getElementById('vcQtyMinus').addEventListener('click', function () { changeQty(-1); });
    document.getElementById('vcQtyPlus').addEventListener('click', function () { changeQty(1); });
    document.getElementById('vcAddButton').addEventListener('click', addCurrentToCart);
    document.getElementById('vcPrev').addEventListener('click', function () { stepImage(-1); });
    document.getElementById('vcNext').addEventListener('click', function () { stepImage(1); });
    document.getElementById('vcName').addEventListener('input', function (e) { state.name = e.target.value; refreshWhatsapp(); });
    document.getElementById('vcDate').addEventListener('change', function (e) { state.date = e.target.value; refreshWhatsapp(); });
    document.getElementById('vcBack').addEventListener('click', function (e) {
      e.preventDefault();
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
    document.getElementById('vcPriceUnit').textContent = product.unit === 'unidad' ? 'por unidad' : 'por docena';
    document.getElementById('vcQtyLabel').textContent = product.unit === 'unidad' ? 'Cantidad (unidades)' : 'Cantidad (docenas)';
    document.getElementById('vcQtyValue').textContent = '1';
    document.getElementById('vcName').value = '';
    document.getElementById('vcDate').value = '';

    state.images = product.imgs && product.imgs.length ? product.imgs : [product.img];
    state.imageIndex = 0;
    renderGallery(product);
    renderCustomizer(product);

    var button = document.getElementById('vcAddButton');
    button.classList.remove('is-added');
    button.textContent = 'Añadir al carrito';

    updateSummary(product);
    updateWhatsapp(product);
  }

  function renderGallery(product) {
    var thumbs = document.getElementById('vcThumbs');
    thumbs.innerHTML = state.images.map(function (key, index) {
      return '<img class="vc-thumb' + (index === 0 ? ' is-active' : '') + '" src="' + IMG_MAP[key] +
             '" alt="Vista ' + (index + 1) + '" data-index="' + index + '">';
    }).join('');
    thumbs.querySelectorAll('.vc-thumb').forEach(function (t) {
      t.addEventListener('click', function () { showImage(parseInt(t.getAttribute('data-index'), 10)); });
    });

    var many = state.images.length > 1;
    document.getElementById('vcPrev').style.display = many ? '' : 'none';
    document.getElementById('vcNext').style.display = many ? '' : 'none';
    document.getElementById('vcCounter').style.display = many ? '' : 'none';
    showImage(0, product);
  }

  function showImage(index, product) {
    if (!state.images.length) return;
    var total = state.images.length;
    state.imageIndex = ((index % total) + total) % total;

    var main = document.getElementById('vcMainImage');
    main.classList.add('is-swapping');
    setTimeout(function () {
      main.src = IMG_MAP[state.images[state.imageIndex]];
      main.alt = (product && product.name) || main.alt;
      main.classList.remove('is-swapping');
    }, 130);

    document.getElementById('vcCounter').textContent = (state.imageIndex + 1) + ' / ' + total;
    document.querySelectorAll('.vc-thumb').forEach(function (item, i) {
      item.classList.toggle('is-active', i === state.imageIndex);
    });
  }

  function stepImage(delta) { showImage(state.imageIndex + delta); }

  // ── Personalizador ─────────────────────────────────────────────────
  function renderCustomizer(product) {
    var host = document.getElementById('vcCustomizer');
    var conf = cfg(product.id);

    if (!conf) {
      host.innerHTML = '<div class="vc-note">Este diseño se personaliza por WhatsApp con nombre, color y detalles del evento.</div>';
      return;
    }

    var preview = '';
    if (conf.preview && conf.preview.type === 'model3d') {
      preview =
        '<div class="vc-preview vc-preview--3d">' +
          '<span class="vc-preview-title">Vista previa 3D</span>' +
          '<div class="vc-render-3d" id="vcRender3d" style="--ratio:' + conf.preview.ratio + '">' +
            '<model-viewer class="vc-mv" id="vcModel" src="' + conf.preview.src + '" ' +
              'alt="Modelo 3D de ' + product.name + '" camera-controls touch-action="pan-y" ' +
              'loading="eager" reveal="auto" interaction-prompt="none" ' +
              'shadow-intensity="1" shadow-softness="0.9" ' +
              'exposure="1.05" environment-image="neutral" ' +
              'camera-orbit="0deg 74deg 105%" min-camera-orbit="auto 25deg auto" ' +
              'max-camera-orbit="auto 100deg auto" disable-zoom disable-pan></model-viewer>' +
            '<span class="vc-3d-badge">360°</span>' +
            '<span class="vc-3d-hint">Arrastra o desliza para girar</span>' +
          '</div>' +
          '<span class="vc-preview-note">Gíralo para verlo desde todos los ángulos</span>' +
        '</div>';
    } else if (conf.preview) {
      preview =
        '<div class="vc-preview">' +
          '<span class="vc-preview-title">Vista previa</span>' +
          '<div class="vc-render" id="vcRender" style="--ratio:' + conf.preview.ratio + '">' +
            '<img class="vc-lay vc-base" src="' + conf.preview.base + '" alt="' + product.name + '">' +
            conf.parts.map(function (p) {
              var m = conf.preview.masks[p.id];
              if (!m) return '';
              return '<div class="vc-lay vc-tint" data-tint="' + p.id + '" style="' +
                     '-webkit-mask:url(' + m + ') center/contain no-repeat;' +
                     'mask:url(' + m + ') center/contain no-repeat"></div>';
            }).join('') +
          '</div>' +
          '<span class="vc-preview-note">Así quedará tu vela</span>' +
        '</div>';
    }

    var groups = conf.parts.map(function (part) {
      var opts = optionsFor(part).map(function (c) {
        var on = state.colors[part.id] === c.k ? ' is-on' : '';
        return '<button type="button" class="vc-opt' + on + '" data-part="' + part.id + '" data-k="' + c.k + '" ' +
               'aria-label="' + part.label + ': ' + c.n + '">' +
               '<span class="vc-dot" style="--c:' + c.v + '"></span>' +
               '<span class="vc-optname">' + c.n + '</span></button>';
      }).join('');
      return '<div class="vc-group"><span class="vc-group-label">' + part.label + '</span>' +
             '<div class="vc-swatches">' + opts + '</div></div>';
    }).join('');

    host.innerHTML =
      '<div class="vc-heading"><span>Personaliza tu vela</span></div>' + preview + groups;

    host.querySelectorAll('.vc-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var partId = btn.getAttribute('data-part');
        state.colors[partId] = btn.getAttribute('data-k');
        host.querySelectorAll('.vc-opt[data-part="' + partId + '"]').forEach(function (o) { o.classList.remove('is-on'); });
        btn.classList.add('is-on');
        applyTints(product);
        refreshWhatsapp();
      });
    });

    if (conf.preview && conf.preview.type === 'model3d') setupModel(product, conf);
    applyTints(product);
  }

  // ── Vista 3D ───────────────────────────────────────────────────────
  // model-viewer se sirve desde el propio dominio y se carga una sola vez,
  // solo cuando se abre un producto que tiene modelo.
  var mvState = null; // null = sin pedir, 'loading' | 'ready' | 'failed'

  function loadModelViewer(onReady) {
    if (mvState === 'ready')  { onReady(true);  return; }
    if (mvState === 'failed') { onReady(false); return; }

    var waiting = loadModelViewer._q || (loadModelViewer._q = []);
    waiting.push(onReady);
    if (mvState === 'loading') return;

    mvState = 'loading';
    var s = document.createElement('script');
    s.type = 'module';
    s.src = 'vendor/model-viewer.min.js';
    s.onload = function () {
      mvState = 'ready';
      waiting.splice(0).forEach(function (cb) { cb(true); });
    };
    s.onerror = function () {
      mvState = 'failed';
      waiting.splice(0).forEach(function (cb) { cb(false); });
    };
    document.head.appendChild(s);
  }

  function setupModel(product, conf) {
    var box = document.getElementById('vcRender3d');
    var mv  = document.getElementById('vcModel');
    if (!box || !mv) return;

    // El hint se oculta en cuanto el cliente gira la pieza.
    var hide = function () { box.classList.add('is-touched'); };
    mv.addEventListener('pointerdown', hide, { once: true });
    mv.addEventListener('touchstart', hide, { once: true, passive: true });

    mv.addEventListener('load', function () { paintModel(product); });

    loadModelViewer(function (ok) {
      if (ok) return;
      // Sin WebGL o sin la libreria: el pedido debe seguir siendo posible.
      box.innerHTML = '<div class="vc-3d-fallback">No pudimos cargar la vista 3D en este ' +
        'dispositivo. Los colores que elijas abajo se registran igual en tu pedido.</div>';
    });
  }

  function paintModel(product) {
    var conf = cfg(product.id);
    var mv = document.getElementById('vcModel');
    if (!conf || !mv || !mv.model || !conf.preview.materials) return;

    conf.parts.forEach(function (part) {
      var target = conf.preview.materials[part.id];
      if (!target) return;
      var mat = mv.model.materials.find(function (m) { return m.name === target; });
      if (!mat) return;
      // Se pasa el hex tal cual: model-viewer lo interpreta en sRGB.
      mat.pbrMetallicRoughness.setBaseColorFactor(colorOf(part, state.colors[part.id]).v);
    });
  }

  function applyTints(product) {
    var conf = cfg(product.id);
    if (!conf || !conf.preview) return;

    if (conf.preview.type === 'model3d') { paintModel(product); return; }

    conf.parts.forEach(function (part) {
      var layer = document.querySelector('.vc-tint[data-tint="' + part.id + '"]');
      if (layer) layer.style.background = colorOf(part, state.colors[part.id]).v;
    });
  }

  function changeQty(delta) {
    state.qty = Math.max(1, Math.min(50, state.qty + delta));
    var el = document.getElementById('vcQtyValue');
    if (el) el.textContent = String(state.qty);
    var product = PRODUCTS.find(function (p) { return p.id === state.id; });
    if (product) { updateSummary(product); updateWhatsapp(product); }
  }

  function unitLabel(product, qty) {
    if (product.unit === 'unidad') return qty === 1 ? 'unidad' : 'unidades';
    return qty === 1 ? 'docena' : 'docenas';
  }

  function updateSummary(product) {
    var price = Number(product.price);
    document.getElementById('vcSumQty').textContent = state.qty + ' ' + unitLabel(product, state.qty);
    document.getElementById('vcSumPrice').textContent = '$' + price.toFixed(2) + ' / ' + unitLabel(product, 1);
    document.getElementById('vcSumTotal').textContent = '$' + (price * state.qty).toFixed(2);
  }

  // ── Carrito con datos de personalizacion ───────────────────────────
  // No se toca el checkout: sigue leyendo Object.values(cart) igual que antes
  // y el total sigue siendo precio x cantidad.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function buildCustom(product) {
    var conf = cfg(product.id);
    var colores = [];
    if (conf) conf.parts.forEach(function (p) {
      colores.push({ label: p.label, valor: colorOf(p, state.colors[p.id]).n });
    });
    return { colores: colores, nombre: state.name || '', fecha: state.date || '' };
  }

  // Clave de variante. Empieza por "v" a proposito: si fuera numerica, JS la
  // reordenaria antes que las demas y se desincronizaria con el render.
  function variantKey(product, custom) {
    var parts = ['v' + product.id];
    custom.colores.forEach(function (c) { parts.push(c.label + '=' + c.valor); });
    if (custom.nombre) parts.push('n=' + custom.nombre);
    if (custom.fecha) parts.push('f=' + custom.fecha);
    return parts.join('|');
  }

  function fechaLegible(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : iso;
  }

  function addCurrentToCart() {
    var product = PRODUCTS.find(function (p) { return p.id === state.id; });
    if (!product) return;

    var custom = buildCustom(product);
    var key = variantKey(product, custom);
    var price = product.price;

    if (!window.cart[key]) {
      window.cart[key] = {
        id: product.id, name: product.name, desc: product.desc, price: price,
        tag: product.tag, img: product.img, unit: product.unit, qty: state.qty,
        custom: custom
      };
    } else {
      window.cart[key].qty += state.qty;
    }

    // Mismos eventos que addToCartFromPage del sitio
    if (typeof fbq !== 'undefined') {
      fbq('track', 'AddToCart', { content_name: product.name, content_category: product.cat, value: price * state.qty, currency: 'USD' });
    }
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'USD', value: price * state.qty,
        items: [{ item_id: String(product.id), item_name: product.name, item_category: product.cat, price: price, quantity: state.qty }]
      });
    }

    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof openCart === 'function') openCart();

    var button = document.getElementById('vcAddButton');
    button.textContent = '✓ Añadido al carrito';
    button.classList.add('is-added');
    setTimeout(function () {
      button.textContent = 'Añadir al carrito';
      button.classList.remove('is-added');
    }, 1400);
  }

  // Envuelve updateCartUI: reescribe los manejadores para que usen la clave de
  // variante (los originales pasan i.id) y pinta los datos de personalizacion.
  function hookCart() {
    if (typeof window.updateCartUI !== 'function' || window.__vcCartHooked) return;
    window.__vcCartHooked = true;

    var style = document.createElement('style');
    style.textContent = `
      .vc-cart-custom{margin:.4rem 0 .1rem;padding:.45rem .6rem;background:#fbf6ef;
        border:1px solid #ece2d6;border-radius:9px;font-size:.66rem;line-height:1.5;color:#6d645b}
      .vc-cart-custom b{font-weight:600;color:#4a423a}
      .vc-cart-custom span{display:block}
    `;
    document.head.appendChild(style);

    var original = window.updateCartUI;
    window.updateCartUI = function () {
      var result = original.apply(this, arguments);
      try { decorateCart(); } catch (e) { /* nunca romper el carrito */ }
      return result;
    };
  }

  function decorateCart() {
    var host = document.getElementById('cartItems');
    if (!host) return;
    var keys = Object.keys(window.cart);
    var rows = host.querySelectorAll('.cart-item');
    if (rows.length !== keys.length) return;   // orden no fiable: no tocar

    rows.forEach(function (row, i) {
      var key = keys[i];
      var item = window.cart[key];
      if (!item) return;

      // Reemplazar onclick inline por listeners con la clave correcta.
      // Evita problemas de comillas con nombres escritos por el cliente.
      var qtyBtns = row.querySelectorAll('.qty-btn');
      if (qtyBtns.length === 2) {
        [-1, 1].forEach(function (delta, n) {
          var b = qtyBtns[n];
          b.removeAttribute('onclick');
          var clone = b.cloneNode(true);
          b.parentNode.replaceChild(clone, b);
          clone.addEventListener('click', function () { window.changeQty(key, delta); });
        });
      }
      var rm = row.querySelector('.cart-item-remove');
      if (rm) {
        rm.removeAttribute('onclick');
        var rmClone = rm.cloneNode(true);
        rm.parentNode.replaceChild(rmClone, rm);
        rmClone.addEventListener('click', function () { window.removeItem(key); });
      }

      // Pintar personalizacion
      if (!item.custom) return;
      if (row.querySelector('.vc-cart-custom')) return;
      var c = item.custom;
      var lines = c.colores.map(function (x) {
        return '<span><b>' + esc(x.label) + ':</b> ' + esc(x.valor) + '</span>';
      });
      if (c.nombre) lines.push('<span><b>Nombre:</b> ' + esc(c.nombre) + '</span>');
      if (c.fecha)  lines.push('<span><b>Fecha del evento:</b> ' + esc(fechaLegible(c.fecha)) + '</span>');
      if (!lines.length) return;

      var box = document.createElement('div');
      box.className = 'vc-cart-custom';
      box.innerHTML = lines.join('');
      var anchor = row.querySelector('.cart-item-price') || row.querySelector('.cart-item-sub');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    });
  }

  function refreshWhatsapp() {
    var product = PRODUCTS.find(function (p) { return p.id === state.id; });
    if (product) updateWhatsapp(product);
  }

  function updateWhatsapp(product) {
    var conf = cfg(product.id);
    var details = '';
    if (conf) {
      details = ' Colores: ' + conf.parts.map(function (part) {
        return part.short + ' ' + colorOf(part, state.colors[part.id]).n;
      }).join(', ') + '.';
    }
    var extra = '';
    if (state.name) extra += ' Nombre para el empaque: ' + state.name + '.';
    if (state.date) extra += ' Fecha del evento: ' + state.date + '.';

    var message = 'Hola Velamia 👋 Estoy viendo ' + product.name + ' ($' + Number(product.price).toFixed(2) +
      '). Quiero ' + state.qty + ' ' + unitLabel(product, state.qty) + '.' + details + extra +
      ' Quisiera confirmar personalización y fecha de entrega.';
    document.getElementById('vcWhatsapp').href = 'https://wa.me/593995448686?text=' + encodeURIComponent(message);
  }

  function trackView(product) {
    if (typeof fbq !== 'undefined') fbq('track', 'ViewContent', { content_name: product.name, content_category: product.cat, value: product.price, currency: 'USD' });
    if (typeof gtag !== 'undefined') gtag('event', 'view_item', { currency: 'USD', value: product.price, items: [{ item_id: String(product.id), item_name: product.name, item_category: product.cat, price: product.price, quantity: 1 }] });
  }
})();
