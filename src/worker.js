export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // Handle API requests by proxying to backend
    if (url.pathname.startsWith('/api')) {
      // Remove /api prefix and construct backend URL
      const backendPath = url.pathname.replace('/api', '') || '/';
      const backendUrl = new URL(backendPath, 'https://server.itlookslegit.com');
      backendUrl.search = url.search;
      
      console.log('Proxying API request:', {
        original: url.pathname,
        backend: backendUrl.toString(),
        method: request.method
      });
      
      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      try {
        const response = await fetch(backendRequest);
        const responseHeaders = new Headers(response.headers);
        
        // Add CORS headers
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        console.log('Backend response:', response.status, response.statusText);
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (error) {
        console.error('Backend request failed:', error);
        return new Response(JSON.stringify({ error: 'Backend service unavailable', details: error.message }), {
          status: 503,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
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