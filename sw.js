/**
 * Add listener to the 'install' event
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open('mws-static-v1')
    .then(function (cache) {
      return cache.addAll([
        '/',
        'css/styles.css',
        'js/main.js',
        'js/dbhelper.js',
        'data/restaurants.json'
      ]);
    })
    );
});
/**
 * Add listener to the 'fetch' event
 */
self.addEventListener('fetch', function (event) {
  event.respondWith(
    // Get the response from cache...
    caches.match(event.request)
    .then(function (response) {
      // If there's a cached response...
      if (response) {
        // ... return it
        return response;
      }
      // ...else fetch it
      return fetch(event.request)
        .then(function (response) {
          if (response.status === 404) {
            return new Response('Whoops, not found.');
          }
          return response;
        })
        .catch(function (error) {
          return new Response('Error requesting.');
        });
    })
    );
});
