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
    
    // Define static asset extensions
    const staticAssetExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
      '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp4', '.webm', 
      '.mp3', '.wav', '.pdf', '.zip', '.json', '.xml', '.txt'
    ];
    
    // Check if request is for a static asset
    const isStaticAsset = staticAssetExtensions.some(ext => 
      url.pathname.toLowerCase().endsWith(ext)
    );
    
    // Serve static assets directly
    if (isStaticAsset) {
      try {
        const response = await env.ASSETS.fetch(request);
        
        // Add appropriate cache headers for static assets
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } catch (e) {
        console.error('Static asset not found:', url.pathname);
        return new Response('Asset not found', { status: 404 });
      }
    }
    
    // Handle SPA routing - serve index.html for all non-asset, non-API requests
    try {
      const indexRequest = new Request(new URL('/index.html', url.origin), request);
      const indexResponse = await env.ASSETS.fetch(indexRequest);
      
      if (!indexResponse.ok) {
        throw new Error('index.html not found');
      }
      
      return new Response(indexResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (e) {
      console.error('Failed to serve index.html:', e);
      return new Response('Application not found', { 
        status: 404,
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
  }
};