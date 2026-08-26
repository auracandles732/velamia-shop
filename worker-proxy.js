import originalWorker from './worker.js';

// Keep the catalog render fix bundled with the active Worker deployment.

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    const assetRequest = requestUrl.pathname === '/'
      ? new Request(new URL('/index.html?catalog-version=20260826', requestUrl), request)
      : request;
    const response = await originalWorker.fetch(assetRequest, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return response;
    }

    let html = await response.text();
    // Normalize the catalog response in case an edge still serves an older asset.
    html = html.replace(
      "$'+((p.alwaysSale ? p.salePrice : ((p.onSale && isSaleActive() ? p.salePrice : p.price) * 0.9)).toFixed(2))",
      "$'+Number((p.alwaysSale ? p.salePrice : ((p.onSale && isSaleActive() ? p.salePrice : p.price) * 0.9))).toFixed(2)"
    );
    html = html.replace('return day === 15 || day === 30;', 'return true;');
    html = html.replace(
      'p.alwaysSale ? p.salePrice',
      'p.alwaysSale ? Number(p.salePrice || p.price)'
    );
    if (!html.includes('/product-configurator.js')) {
      html = html.replace(
        '</body>',
        '<script src="/product-configurator.js?v=20260714-1820"></script></body>'
      );
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
