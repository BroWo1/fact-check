export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle SPA routing - serve index.html for non-asset requests
    if (!url.pathname.includes('.') && !url.pathname.startsWith('/api')) {
      try {
        const indexAsset = await env.ASSETS.fetch(new URL(url.origin + '/index.html'));
        return new Response(indexAsset.body, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
          }
        });
      } catch (e) {
        return new Response('Not found', { status: 404 });
      }
    }
    
    // Serve static assets
    try {
      const response = await env.ASSETS.fetch(request);
      
      // Add appropriate headers for static assets
      const newHeaders = new Headers(response.headers);
      
      // Set cache headers for static assets
      if (url.pathname.includes('.')) {
        if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/)) {
          newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (e) {
      return new Response('Asset not found', { status: 404 });
    }
  }
};