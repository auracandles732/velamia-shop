// Cálculo del total de un pedido en el servidor. Replica la lógica de la tienda (public/index.html y
// public/velamia-cms.js) para que el monto que se envía a Nuvei no dependa de lo que diga el navegador.

export const SITIO_URL = 'https://iokkxrwiqmsfsayztmdx.supabase.co/storage/v1/object/public/sitio/sitio.json';
const RESPALDO_KEY = 'https://velamia.shop/__sitio-respaldo.json';

// Ecuador continental es UTC-5 todo el año (sin horario de verano).
export function fechaEcuador(ahora = new Date()) {
  const f = new Date(ahora.getTime() - 5 * 3600 * 1000);
  return { anio: f.getUTCFullYear(), mes: f.getUTCMonth(), dia: f.getUTCDate() };
}

// Mismos productos que la tienda termina usando (velamia-cms.js descarta los que no tienen foto o precio).
function productosValidos(sitio) {
  return (sitio.productos || [])
    .filter(it => it && it.producto && typeof it.producto.id === 'number' && it.producto.price > 0 &&
      it.producto.img && Array.isArray(it.imagenes) && it.imagenes.length > 0)
    .map(it => ({ ...it.producto }));
}

// Replica la oferta mensual de la tienda: 10 productos al azar (semilla por mes) con 15% los días 15 y 30.
export function preciosDelDia(productos, fecha) {
  const lista = productos.map(p => ({ ...p }));
  lista.forEach(p => {
    if (!p.fixedSale) { delete p.onSale; delete p.oferta; delete p.salePrice; delete p.originalPrice; }
  });
  let semilla = (fecha.anio * 12 + fecha.mes) * 7919;
  const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) & 0xffffffff;
    return (semilla >>> 0) / 0xffffffff;
  };
  const candidatos = lista.filter(p => p.id !== 1 && p.id !== 3 && p.id !== 5 && !p.oculto);
  for (let k = candidatos.length - 1; k > 0; k--) {
    const ki = Math.floor(azar() * (k + 1));
    const t = candidatos[k]; candidatos[k] = candidatos[ki]; candidatos[ki] = t;
  }
  candidatos.slice(0, 10).forEach(p => {
    p.onSale = true;
    p.oferta = true;
    p.originalPrice = p.price;
    p.salePrice = Math.round(p.price * 0.85 * 100) / 100;
  });

  const ofertaDelDia = fecha.dia === 15 || fecha.dia === 30;
  const precios = new Map();
  lista.forEach(p => {
    const activa = p.onSale && (p.alwaysSale || ofertaDelDia);
    precios.set(p.id, { producto: p, precio: activa ? Number(p.salePrice || p.price) : Number(p.price) });
  });
  return precios;
}

function numero(v, porDefecto, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : porDefecto;
}

// Devuelve { total, descripcion }. Lanza Error('carrito_invalido') si el carrito no es válido.
export function calcularPedido(sitio, items, zona, ahora = new Date()) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new Error('carrito_invalido');
  const precios = preciosDelDia(productosValidos(sitio), fechaEcuador(ahora));
  if (precios.size === 0) throw new Error('catalogo_vacio');

  const e = (sitio.secciones && sitio.secciones.envios) || {};
  const gyeCosto = numero(e.gye_costo, 3, 0, 50);
  const gyeGratis = numero(e.gye_gratis_desde, 2, 1, 50);
  const provCosto = numero(e.prov_costo, 5, 0, 50);
  const provGratis = numero(e.prov_gratis_desde, 3, 1, 50);
  const pct = numero(e.descuento_tarjeta, 10, 0, 50) / 100;

  let subtotal = 0, elegible = 0, cantidad = 0, envioGratis = false;
  const lineas = [];
  for (const it of items) {
    const reg = precios.get(Number(it && it.id));
    const qty = Number(it && it.qty);
    if (!reg || !Number.isInteger(qty) || qty < 1 || qty > 1000) throw new Error('carrito_invalido');
    const linea = reg.precio * qty;
    subtotal += linea;
    cantidad += qty;
    if (!reg.producto.sinDescuento) elegible += linea;
    if (reg.producto.envioGratis) envioGratis = true;
    lineas.push(reg.producto.name + ' x' + qty);
  }

  const descuento = Math.round(elegible * pct * 100) / 100;
  const envio = envioGratis ? 0
    : zona === 'guayaquil' ? (cantidad >= gyeGratis ? 0 : gyeCosto)
    : (cantidad >= provGratis ? 0 : provCosto);
  return {
    total: Math.round((subtotal - descuento + envio) * 100) / 100,
    descripcion: lineas.join(', ').substring(0, 250)
  };
}

// Lee el catálogo publicado desde el panel. Guarda una copia de respaldo en la caché de Cloudflare
// por si Supabase no responde; sin catálogo no se puede verificar el monto y el pago se rechaza.
export async function cargarSitio() {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  try {
    const r = await fetch(SITIO_URL + '?v=' + Math.floor(Date.now() / 30000), { cf: { cacheTtl: 30, cacheEverything: true } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const texto = await r.text();
    const sitio = JSON.parse(texto);
    if (cache) {
      await cache.put(RESPALDO_KEY, new Response(texto, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2592000' }
      })).catch(() => {});
    }
    return sitio;
  } catch (err) {
    const copia = cache && await cache.match(RESPALDO_KEY);
    if (copia) return copia.json();
    throw err;
  }
}
