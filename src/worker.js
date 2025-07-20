export default {
  async fetch(request, env) {
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
      const backendUrl = new URL(url.pathname, 'https://server.itlookslegit.com');
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
        return new Response(JSON.stringify({ 
          error: 'Backend service unavailable', 
          details: error.message 
        }), {
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
    
    // For all other requests, attempt to serve static assets. If the requested
    // asset isn't found, fall back to `index.html` so that client-side routing
    // in the SPA works correctly.
    try {
      const assetResponse = await env.ASSETS.fetch(request);

      if (assetResponse.status === 404) {
        const indexRequest = new Request('/index.html', request);
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        return new Response(indexResponse.body, indexResponse);
      }

      return assetResponse;
    } catch (e) {
      console.error('Failed to serve asset:', url.pathname, e);
      return new Response('Application not found', { status: 404 });
    }
  }
};