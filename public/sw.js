// Service Worker for YouTube Sentiment Analyzer PWA
const CACHE_NAME = 'youtube-sentiment-analyzer-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

// API endpoints that can be cached
const CACHEABLE_APIS = [
  '/api/youtube-comments',
  '/api/sentiment'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
  
  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages
  self.clients.claim();
});

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigation(request));
  }
});

// Handle API requests with cache-first strategy for cacheable APIs
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
  
  if (isCacheable && request.method === 'GET') {
    try {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('Service Worker: Serving API from cache:', request.url);
        return cachedResponse;
      }
    } catch (error) {
      console.error('Service Worker: Cache error:', error);
    }
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses for cacheable APIs
    if (isCacheable && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: API fetch failed:', error);
    
    // Return offline fallback for API requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable. Please check your internet connection.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving static asset from cache:', request.url);
      return cachedResponse;
    }
  } catch (error) {
    console.error('Service Worker: Static cache error:', error);
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Static asset fetch failed:', error);
    
    // Return generic offline response
    return new Response('Asset not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle navigation requests with network-first strategy
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful navigation responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Navigation fetch failed:', error);
    
    // Try to serve from cache
    try {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('Service Worker: Serving navigation from cache:', request.url);
        return cachedResponse;
      }
    } catch (cacheError) {
      console.error('Service Worker: Cache lookup failed:', cacheError);
    }
    
    // Return offline page fallback
    return new Response(generateOfflinePage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Check if a path is a static asset
function isStaticAsset(pathname) {
  return pathname.startsWith('/assets/') || 
         pathname.endsWith('.css') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.png') || 
         pathname.endsWith('.jpg') || 
         pathname.endsWith('.svg') || 
         pathname.endsWith('.ico') ||
         pathname === '/manifest.json';
}

// Generate offline page HTML
function generateOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YouTube Sentiment Analyzer - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 500px;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        p {
          font-size: 1.2em;
          line-height: 1.6;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .icon {
          font-size: 4em;
          margin-bottom: 20px;
          display: block;
        }
        .retry-btn {
          background: #fff;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          font-size: 1.1em;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
        }
        .retry-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        }
        .features {
          margin-top: 30px;
          text-align: left;
        }
        .features ul {
          list-style: none;
          padding: 0;
        }
        .features li {
          padding: 8px 0;
          opacity: 0.8;
        }
        .features li:before {
          content: "✓ ";
          color: #4ade80;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="icon">📱</span>
        <h1>You're Offline</h1>
        <p>YouTube Sentiment Analyzer is now available as a Progressive Web App! You can still access some features even without an internet connection.</p>
        
        <div class="features">
          <h3>Available Offline:</h3>
          <ul>
            <li>Browse previous analysis results</li>
            <li>Access cached data</li>
            <li>View help and FAQ</li>
            <li>Use the app interface</li>
          </ul>
        </div>
        
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

// Background sync for pending requests
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processPendingRequests());
  }
});

// Process pending requests when back online
async function processPendingRequests() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
        } catch (error) {
          console.error('Service Worker: Failed to sync request:', error);
        }
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New analysis results are available!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Results',
        icon: '/logo.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('YouTube Sentiment Analyzer', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle app shortcut actions
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'analyze') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync (future feature)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered:', event.tag);
  
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

// Update cache periodically
async function updateCache() {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    
    for (const asset of STATIC_ASSETS) {
      try {
        const response = await fetch(asset);
        if (response.ok) {
          await cache.put(asset, response);
        }
      } catch (error) {
        console.error('Service Worker: Failed to update cache for:', asset, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Cache update failed:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearCache().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

// Get total cache size
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Service Worker: Failed to calculate cache size:', error);
    return 0;
  }
}

// Clear all caches
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Failed to clear cache:', error);
  }
}