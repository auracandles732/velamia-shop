// Credenciales Nuvei (PRODUCCIÓN)
const APP_CODE   = 'VELAMIAEC-EC-SERVER';
const APP_KEY    = 'HlSy0zSyOs19EQvfjb7WctYtELxXc1';
const PAY_URL    = 'https://ccapi.paymentez.com/v2/transaction/init_reference/';
const REFUND_URL = 'https://ccapi.paymentez.com/v2/transaction/refund/';

// Genera el Auth-Token que pide Paymentez
async function generateAuthToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const data = new TextEncoder().encode(APP_KEY + timestamp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${APP_CODE};${timestamp};${hashHex}`);
}

function getFraudReason(statusDetail) {
  const reasons = {
    1:  'Rechazado - No autorizado por el banco',
    2:  'Rechazado - Fondos insuficientes',
    4:  'Rechazado - Tarjeta inválida',
    5:  'Rechazado - Tarjeta vencida',
    6:  'Rechazado - Límite de retiro excedido',
    7:  'Cancelado / Reversado',
    8:  'Fraude detectado por Nuvei',
    9:  'Rechazado por motor de riesgo',
    10: 'Rechazado - Tarjeta robada o perdida',
    11: 'Rechazado - Tarjeta bloqueada',
  };
  return reasons[statusDetail] || ('Rechazado - Código ' + statusDetail);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── RUTA 1: Crear referencia de pago ─────────────────────────────
    if (url.pathname === '/api/create-payment' && request.method === 'POST') {
      try {
        const { amount, description, devReference, userId, userEmail } = await request.json();
        const authToken = await generateAuthToken();

        const resp = await fetch(PAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Auth-Token': authToken },
          body: JSON.stringify({
            locale: 'es',
            order: {
              amount: parseFloat(amount),
              description: description,
              vat: 0,
              dev_reference: devReference,
              installments_type: 0,
              taxable_amount: 0,
              tax_percentage: 0,
            },
            conf: {
              style_version: 2,
              theme: {
                logo: 'https://cdn.paymentez.com/img/nv/nuvei_logo.png',
                primary_color: '#C800A1',
              },
            },
            user: { id: userId, email: userEmail },
          }),
        });

        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // ── RUTA 2: Refund (reembolso) ───────────────────────────────────
    if (url.pathname === '/api/refund' && request.method === 'POST') {
      try {
        const { transactionId, amount } = await request.json();
        if (!transactionId) {
          return new Response(JSON.stringify({ error: 'transactionId requerido' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const authToken = await generateAuthToken();
        const body = { transaction: { id: transactionId }, more_info: true };
        if (amount) body.order = { amount: parseFloat(amount) };

        const resp = await fetch(REFUND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Auth-Token': authToken },
          body: JSON.stringify(body),
        });

        const data = await resp.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // ── RUTA 3: Webhook — Paymentez notifica el resultado del pago ───
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        const tx = body.transaction;
        const user = body.user || {};

        if (tx && tx.status === 'success' && tx.status_detail === 3) {
          // Pago APROBADO
          console.log('PAGO APROBADO | ID:', tx.id, '| Auth:', tx.authorization_code, '| Ref:', tx.dev_reference, '| Monto:', tx.amount);
        } else {
          // Pago RECHAZADO o FRAUDULENTO — guardar en bitácora
          const motivo = getFraudReason(tx ? tx.status_detail : null);
          console.log('PAGO NO APROBADO | status:', tx && tx.status, '| detail:', tx && tx.status_detail, '| motivo:', motivo);

          const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyU-N7ktYUe6l1jQFXFuwEHE6Cld2-krdGMtDI-5iFkfMOIMU_lvicQU97YTskfc23hPw/exec';
          const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

          const fraudUrl = SHEETS_URL +
            '?sheet=fraudes' +
            '&fecha='       + encodeURIComponent(fecha) +
            '&transaccion=' + encodeURIComponent(tx ? tx.id : '-') +
            '&referencia='  + encodeURIComponent(tx ? tx.dev_reference : '-') +
            '&monto='       + encodeURIComponent(tx ? tx.amount : '-') +
            '&email='       + encodeURIComponent(user.email || '-') +
            '&telefono='    + encodeURIComponent(user.id || '-') +
            '&motivo='      + encodeURIComponent(motivo) +
            '&status='      + encodeURIComponent(tx ? tx.status : '-') +
            '&detalle='     + encodeURIComponent(tx ? tx.status_detail : '-');

          await fetch(fraudUrl, { method: 'GET' }).catch(() => {});
        }

        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response('Error', { status: 500 });
      }
    }

    // ── Todo lo demás → archivos estáticos del sitio ─────────────────
    return env.ASSETS.fetch(request);
  },
};
