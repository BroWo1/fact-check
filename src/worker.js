export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle API requests by proxying to backend
    if (url.pathname.startsWith('/api')) {
      const backendUrl = new URL(url.pathname.replace('/api', ''), 'https://server.itlookslegit.com');
      backendUrl.search = url.search;
      
      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      try {
        const response = await fetch(backendRequest);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...response.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Backend service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
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