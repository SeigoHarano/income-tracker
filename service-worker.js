// Name the cache so we can update it later (change the version to force refresh)
const CACHE_NAME = 'income-tracker-v1';

// Files we want to cache so the app can load offline.
// Include the main files your app needs to run: index, CSS, JS, manifest, icons.
const FILES_TO_CACHE = [
  '/',               // root — many hosts map this to index.html
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon.png',
  '/icon-512.png'
];

// Install event: fired when the service worker is first installed.
// We open the named cache and add all files in FILES_TO_CACHE.
self.addEventListener('install', (event) => {
  // Use waitUntil to ensure the install step completes before finishing
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Add all static files to cache. If any fail, install will fail.
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        // Immediately activate this SW so it can control pages (optional)
        return self.skipWaiting();
      })
  );
});

// Activate event: fired after install. Good place to clean old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Get all cache keys and delete old caches not matching CACHE_NAME
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            // Remove old cache to free space and ensure new files are used
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Claim clients so the service worker starts controlling pages ASAP
      return self.clients.claim();
    })
  );
});

/*
 Fetch event: intercepts network requests.
 Strategy used here: "Cache falling back to network"
 - Try to serve the response from cache first (fast & offline),
 - If not in cache, fetch from network and (optionally) return it.
*/
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (ignore POST/PUT/etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Try to find the request in cache
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response immediately
        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Optionally: you can cache the new response for future requests.
          // Here we clone the response stream because it can be read only once.
          return caches.open(CACHE_NAME).then((cache) => {
            // Put a copy in cache if the response is OK (status 200)
            // and the request is for same-origin resources (optional check).
            if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
              cache.put(event.request, networkResponse.clone());
            }
            // Return the network response to the page
            return networkResponse;
          });
        })
        .catch(() => {
          // If both cache and network fail (offline & not cached), you can
          // return a fallback page or image if desired. For simple apps, we
          // just let the promise reject (browser shows failure).
          // Example fallback (uncomment if you add '/offline.html' to cache):
          // return caches.match('/offline.html');
        });
    })
  );
});