// ============================================================
//  Pupils & Peoples Foundation — Service Worker
//  Strategy:
//    • App Shell (HTML, CSS, JS, fonts) → Cache First
//    • External assets (Unsplash images, Google Fonts) → Network First with cache fallback
//    • Apps Script API calls (Google JSONP) → Network Only (always live data)
//    • Offline fallback page shown when network fails on navigation
// ============================================================

const VERSION        = 'pap-v1.0.0';
const CACHE_SHELL    = `pap-shell-${VERSION}`;
const CACHE_DYNAMIC  = `pap-dynamic-${VERSION}`;
const CACHE_FONTS    = `pap-fonts-${VERSION}`;

// Files that form the app shell — cached immediately on install
// Using relative paths so this works on GitHub Pages (subdirectory) and custom domains
const SW_BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '';

const SHELL_ASSETS = [
  SW_BASE + '/',
  SW_BASE + '/index.html',
  SW_BASE + '/admin.html',
  SW_BASE + '/offline.html',
  SW_BASE + '/logo.png',
  SW_BASE + '/manifest.json',
  SW_BASE + '/icons/icon-192.png',
  SW_BASE + '/icons/icon-512.png'
];

// Google Fonts — cached separately with long TTL
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// These origins are NEVER cached — always need live data
const NETWORK_ONLY_ORIGINS = [
  'https://script.google.com',   // Apps Script API
  'https://wa.me',               // WhatsApp
  'mailto:'
];

// Maximum items in the dynamic cache before pruning old entries
const DYNAMIC_CACHE_MAX = 40;

// ============================================================
//  INSTALL — cache the app shell
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => {
        // Add assets one-by-one so one missing file doesn't abort everything
        return Promise.allSettled(
          SHELL_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err.message))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
//  ACTIVATE — clean up old caches
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating', VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('pap-') && ![CACHE_SHELL, CACHE_DYNAMIC, CACHE_FONTS].includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================================
//  FETCH — routing strategy
// ============================================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET, browser-extension, chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // 2. Network-only for live API calls (Apps Script, etc.)
  if (NETWORK_ONLY_ORIGINS.some(origin => event.request.url.startsWith(origin))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Google Fonts — Cache First (fonts don't change)
  if (FONT_ORIGINS.some(origin => event.request.url.startsWith(origin))) {
    event.respondWith(cacheFirst(event.request, CACHE_FONTS));
    return;
  }

  // 4. Unsplash / external images — Network First, cache on success
  if (url.hostname.includes('unsplash.com') || url.hostname.includes('images.unsplash')) {
    event.respondWith(networkFirstWithFallback(event.request, CACHE_DYNAMIC, null));
    return;
  }

  // 5. Navigation requests (HTML pages) — Network First, fallback to cache, then offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_SHELL).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match(SW_BASE + '/offline.html'))
        )
    );
    return;
  }

  // 6. Everything else — Cache First, fall back to network, cache the result
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_DYNAMIC, DYNAMIC_CACHE_MAX);
          });
          return response;
        })
        .catch(() => {
          // Return offline placeholder for images
          if (event.request.destination === 'image') {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
                <rect width="200" height="150" fill="#EAF4F3"/>
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#0E4F4F" font-size="14">Offline</text>
              </svg>`,
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        });
    })
  );
});

// ============================================================
//  HELPER — Cache First strategy
// ============================================================
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        cache.put(request, response.clone());
        return response;
      });
    })
  );
}

// ============================================================
//  HELPER — Network First with cache fallback
// ============================================================
function networkFirstWithFallback(request, cacheName, fallback) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        caches.open(cacheName).then(cache => cache.put(request, response.clone()));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then(cached => cached || (fallback ? caches.match(fallback) : Promise.reject()))
    );
}

// ============================================================
//  HELPER — Trim dynamic cache to max items
// ============================================================
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache =>
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
      }
    })
  );
}

// ============================================================
//  MESSAGE — allow clients to force cache refresh
// ============================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    event.ports[0].postMessage({ done: true });
  }
});