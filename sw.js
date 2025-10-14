// Service Worker for Epilepsy Management System
// Handles push notifications and offline capabilities

// Bump this value when you deploy a new version so clients update their cache
const CACHE_NAME = 'epicare-v3';
const OFFLINE_URL = 'offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style1.css',
  '/script.min.js',
  '/js/notifications.js',
  '/images/notification-icon.png',
  '/images/badge.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all: app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Activate the service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('Error parsing push payload:', e);
    return;
  }
  
  const title = payload.title || 'New Notification';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/images/notification-icon.png',
    badge: payload.badge || '/images/badge.png',
    data: payload.data || {},
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // This looks to see if the current tab is already open and focuses it
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle fetch events
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  // For navigation requests (HTML pages like index.html) we prefer network-first
  // so new deployments are picked up immediately. Fall back to cache or offline page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        // Update the cache with the latest index/HTML response
        try {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        } catch (e) {
          // ignore caching errors
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  // For other requests use a cache-first strategy with network fallback and background cache update
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Update the cache in the background
        fetch(event.request.clone()).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
        }).catch(() => {});
        return response;
      }

      // No cache - try network
      return fetch(event.request.clone()).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If request was for navigation it would have been handled earlier; here we return a generic offline response
        return new Response('You are offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});

// Allow the page to tell the service worker to skip waiting and activate immediately
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});