import originalWorker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const response = await originalWorker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return response;
    }

    let html = await response.text();
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
