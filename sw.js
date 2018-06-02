const cacheName = 'mws-static-v1';

/**
 * Add listener to the 'install' event
 */
self.addEventListener('install', function (event) {
  console.log('Install Event');
  console.log(event);
  // Take over older versions that might still be active
  self.skipWaiting();
  event.waitUntil(
    caches.open(cacheName)
    .then(function (cache) {
      return cache.addAll([
        'index.html',
        'restaurant.html',
        'favicon.ico',
        'css/styles.css',
        'js/main.js',
        'js/restaurant_info.js',
        'js/dbhelper.js'
      ]);
    })
    );
});

/**
 * Add listener to the 'fetch' event
 * TODO: handle errors with 'catch'
 */
self.addEventListener('activate', function (event) {
  console.log('Activate Event');
  console.log(event);
  // Don't wait for a page reload to take control of clients
  event.waitUntil(clients.claim());
});

/**
 * Add listener to the 'fetch' event
 * TODO: handle errors with 'catch'
 */
self.addEventListener('fetch', function (event) {
  console.log(event.request);
  event.respondWith(
    // Open the cache
    caches.open(cacheName)
    .then((cache) => {
      // Get response for given request
      return cache.match(event.request)
        .then((response) => {
          // YES: there's a response cached so return it
          if (response) {
            return response;
          }
          // NO: fetch a response
          return fetch(event.request)
            .then((response) => {
              // Cache response only if status OK
              if (response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            });
        });
    })
    );
});
