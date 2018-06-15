/* 
 * Javascript functionality related to the Service Worker
 */
/* global self, caches, clients, fetch */

/*================================ CONSTANTS ================================*/
/**
 * Flag that signals the debug mode operation
 * @type Boolean
 */
const DEBUG = true;
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
  'js/dbhelper.js',
  'js/common.js'
];

/*================================== MAIN ==================================*/
/**
 * Add listener to the 'install' event
 * TODO: handle error in catch
 */
self.addEventListener('install', function (event) {
  Util.log('Install Event');
  Util.log(event);
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
  Util.log('Activate Event');
  Util.log(event);
  // Don't wait for a page reload to take control of clients
  event.waitUntil(clients.claim());
});

/**
 * Add listener to the 'fetch' event
 * TODO: handle errors with 'catch'
 */
self.addEventListener('fetch', function (event) {
  Util.log(event.request);
  // If not to be cached...
  if (shallNotCache(event.request.url)) {
    Util.log(`Fetch do not cache resource: ${event.request.url}`);
    // Just fetch and forward
    event.respondWith(
      fetch(event.request)
      .then((response) => {
        Util.log(`Do not cache resource fetched: ${event.request.url}`);
        return response;
      })
      .catch((error) => {
        Util.log(`Error fetching non cached resource: ${request.url}`);
        return Response.error();//
      })
      );
  } else {
    // Check for cache
    Util.log(`Get possible cached resource: ${event.request.url}`);
    event.respondWith(
      // 1) Is it in static cache?
      getCache(STATIC_CACHE_NAME, event.request,
        (response) => {
        // YES: there's a response cached so return it
        if (response) {
          Util.log(`Returning static cached resource: ${event.request.url}`);
          return response;
        }
        // NO: get dynamic resource
        Util.log(`Getting dynamic cached resource: ${event.request.url}`);
        return getDynamicResource(event.request);
      })
      );
  }
});

function getCache(cacheName, request, cachedResponseHandler) {
  Util.log(`Opening ${cacheName} for: ${request.url}`);
  // Open the cache
  return caches.open(cacheName)
    .then((cache) => {
      Util.log(`Getting cache from ${cacheName} for: ${request.url}`);
      // Get response for given request
      return cache.match(request)
        .then(cachedResponseHandler);
    });
}

function getDynamicResource(request) {
  if (navigator.onLine) {
    Util.log(`ONLINE: Fetching dynamic resource for: ${request.url}`);
    // ONLINE: fetch from network
    return fetchAndCacheDynamicResource(request);
  } else {
    // OFFLINE: get from dynamic cache
    Util.log(`OFFLINE: Getting dynamic resource for: ${request.url}`);
    return getCache(DYNAMIC_CACHE_NAME, request,
      (response) => {
      // YES: there's a response cached so return it
      if (response) {
        Util.log(`Returning dynamic cached resource: ${request.url}`);
        return response;
      }
      // NO: get from offline network
      Util.log(`Fetching OFFLINE dynamic resource: ${request.url}`);
      return fetchAndCacheDynamicResource(request);
    });
  }
}

function fetchAndCacheDynamicResource(request) {
  // NO: fetch a response
  return fetch(request)
    .then((response) => {
      // Cache response only if status OK
      Util.log(`Dynamic resource fetched ${response.status}: ${request.url}`);
      if (response.status === 200) {
        Util.log(`Caching dynamic resource: ${request.url}`);
        cacheResponse(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      Util.log(`Error fetching dynamic resource: ${request.url}`);
      return Response.error();//
    });
}

function cacheResponse(request, response) {
  // Open the cache
  caches.open(DYNAMIC_CACHE_NAME)
    .then((cache) => {
      Util.log(`Caching dynamic resource: ${request.url}`);
      // Cache the given request/response pair
      cache.put(request, response);
    })
    .catch((error) => {
      Util.log(`Error caching request/response pair: ${error}`);
      Util.log(request);
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

/**
 * Utility methods
 */
class Util {

  /**
   * Logs a message to the console
   * @param {string} message to be logged
   */
  static log(message) {
    if (DEBUG) {
      console.log(message);
    }
  }
}
