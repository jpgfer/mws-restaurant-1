const cacheName = 'mws-static-v1';
/**
 * Array of request paths that shall not be cached or are already cached on setup
 * @type Array
 */
const DO_NOT_CACHE = ['/restaurants.*', '/reviews.*', '/restaurant.html']
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
  if (shallNotCache(event.request.url)) {
    // Just forward it
    return fetch(event.request).then((response) => {
      return response;
    });
  } else {
    // Check for cache
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
  }
});

/**
 * Check if the given URL shall not be cached
 * @param {type} url
 * @returns {Boolean}
 */
function shallNotCache(url) {
  const path = new URL(url).pathname;
  return DO_NOT_CACHE.some(
    (noCachePath) => {
    return  path.match(noCachePath);
  });
}