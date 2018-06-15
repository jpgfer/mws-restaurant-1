/* 
 * Javascript functionality related to the Service Worker
 */
/* global self, caches, clients, fetch */

/*================================ CONSTANTS ================================*/
/**
 * Static cache name
 * @type String
 */
const STATIC_CACHE_NAME = 'mws-static-v1';
/**
 * Dynamic cache name
 * @type String
 */
const DYNAMIC_CACHE_NAME = 'mws-dynamic-v1';
/**
 * Array of request paths that shall not be cached or are already cached on setup
 * @type Array
 */
const DO_NOT_CACHE = ['/restaurants.*', '/reviews.*'];
/**
 * Array of request paths that belong to the static cache
 * @type Array
 */
const STATIC_CACHE = [
  'index.html',
  'restaurant.html',
  'favicon.ico',
  'css/styles.css',
  'js/main.js',
  'js/restaurant_info.js',
  'js/dbhelper.js'
];

/*================================== MAIN ==================================*/
/**
 * Add listener to the 'install' event
 * TODO: handle error in catch
 */
self.addEventListener('install', function (event) {
  console.log('Install Event');
  console.log(event);
  // Take over older versions that might still be active
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
    .then(function (cache) {
      return cache.addAll(STATIC_CACHE);
    })
    );
});

/**
 * Add listener to the 'activate' event
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
  // If not to be cached...
  if (shallNotCache(event.request.url)) {
    // Just fetch and forward
    return fetch(event.request).then((response) => {
      return response;
    });
  } else {
    // Check for cache
    event.respondWith(
      // 1) Is it in static cache?
      getCache(STATIC_CACHE_NAME, event.request,
        (response) => {
        // YES: there's a response cached so return it
        if (response) {
          return response;
        }
        // NO: get dynamic resource
        return getDynamicResource(event.request);
      })
      );
  }
});

function getCache(cacheName, request, cachedResponseHandler) {
  // Open the cache
  return caches.open(cacheName)
    .then((cache) => {
      // Get response for given request
      return cache.match(request)
        .then(cachedResponseHandler);
    });
}

function getDynamicResource(request) {
  if (navigator.onLine) {
    // ONLINE: fetch from network
    return fetchAndCacheDynamicResource(request);
  } else {
    // OFFLINE: get from dynamic cache
    return getCache(DYNAMIC_CACHE_NAME, request,
      (response) => {
      // YES: there's a response cached so return it
      if (response) {
        return response;
      }
      // NO: get from offline network
      return fetchAndCacheDynamicResource(request);
    });
  }
}

function fetchAndCacheDynamicResource(request) {
  // NO: fetch a response
  return fetch(request)
    .then((response) => {
      // Cache response only if status OK
      if (response.status === 200) {
        cacheResponse(request, response.clone());
      }
      return response;
    });
}

function cacheResponse(request, response) {
  // Open the cache
  caches.open(DYNAMIC_CACHE_NAME)
    .then((cache) => {
      // Cache the given request/response pair
      cache.put(request, response);
    })
    .catch((error) => {
      console.log(`Error caching request/response pair: ${error}`);
      console.log(request);
    });
}

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