export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      return response;
    }

    let html = await response.text();
    const scriptTag = '<script src="/product-configurator.js?v=20260714"></script>';

    if (!html.includes('product-configurator.js') && html.includes('</body>')) {
      html = html.replace('</body>', scriptTag + '\n</body>');
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
