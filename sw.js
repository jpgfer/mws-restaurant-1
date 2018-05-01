const cacheName = 'mws-static-v1';

/**
 * Add listener to the 'install' event
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(cacheName)
    .then(function (cache) {
      return cache.addAll([
        '/',
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
self.addEventListener('fetch', function (event) {
  // console.log(event.request);
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
