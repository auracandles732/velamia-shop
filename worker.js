// Credenciales Paymentez (ambiente de pruebas)
const APP_CODE   = 'TESTNUVEISTG-EC-SERVER';
const APP_KEY    = 'JSQFl89yPhJrUPhPN03yolvCbI3FRR';
const PAY_URL    = 'https://ccapi-stg.paymentez.com/v2/transaction/init_reference/';
const REFUND_URL = 'https://noccapi-stg.paymentez.com/order/refund/';

// Genera el Auth-Token que pide Paymentez
async function generateAuthToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const data = new TextEncoder().encode(APP_KEY + timestamp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(`${APP_CODE};${timestamp};${hashHex}`);
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
        const body = { transaction: { id: transactionId } };
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

        if (tx && tx.status === 'success' && tx.status_detail === 3) {
          // Pago APROBADO — registrar en log
          console.log('PAGO APROBADO | ID:', tx.id, '| Auth:', tx.authorization_code, '| Ref:', tx.dev_reference, '| Monto:', tx.amount);
        } else {
          console.log('PAGO NO APROBADO | status:', tx && tx.status, '| detail:', tx && tx.status_detail);
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
