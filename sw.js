/* ============================================================
   TaskMint Pro — Service Worker v1.0
   Features: Offline cache, Push notifications, Background sync
   ============================================================ */

var CACHE_NAME = 'taskmint-v1';
var OFFLINE_URL = '/offline.html';

/* Files to cache for offline use */
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/* ===== INSTALL — cache static assets ===== */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function() {
        /* Some CDN resources might fail — ignore */
      });
    })
  );
  self.skipWaiting();
});

/* ===== ACTIVATE — clean old caches ===== */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* ===== FETCH — offline first strategy ===== */
self.addEventListener('fetch', function(e) {
  var req = e.request;

  /* Skip non-GET and Firebase requests */
  if (req.method !== 'GET') return;
  if (req.url.includes('firebasedatabase') || req.url.includes('googleapis')) return;
  if (req.url.includes('gstatic.com')) return;

  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;

      return fetch(req).then(function(response) {
        /* Cache valid responses */
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return response;
      }).catch(function() {
        /* Offline fallback for HTML pages */
        if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

/* ===== PUSH NOTIFICATION ===== */
self.addEventListener('push', function(e) {
  var data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch(err) {
    data = { title: 'TaskMint Pro', body: e.data ? e.data.text() : 'নতুন notification!' };
  }

  var title   = data.title || 'TaskMint Pro 🌿';
  var options = {
    body:    data.body    || 'তোমার জন্য নতুন update আছে!',
    icon:    data.icon    || 'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',
    badge:   data.badge   || 'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',
    image:   data.image   || '',
    tag:     data.tag     || 'taskmint-notif',
    data:    data.url     || '/',
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'open',    title: '✅ খোলো',    icon: '' },
      { action: 'dismiss', title: '❌ বাদ দাও', icon: '' }
    ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

/* ===== NOTIFICATION CLICK ===== */
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  if (e.action === 'dismiss') return;

  var url = e.notification.data || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      /* Focus existing window if open */
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.includes(self.location.origin) && 'focus' in list[i]) {
          list[i].focus();
          list[i].navigate(url);
          return;
        }
      }
      /* Open new window */
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ===== BACKGROUND SYNC ===== */
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-coins') {
    e.waitUntil(syncCoins());
  }
});

function syncCoins() {
  /* Placeholder — actual sync happens when back online */
  return Promise.resolve();
}

/* ===== MESSAGE from main thread ===== */
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'CACHE_URLS') {
    caches.open(CACHE_NAME).then(function(cache) {
      cache.addAll(e.data.urls || []);
    });
  }
});
