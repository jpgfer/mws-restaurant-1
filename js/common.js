/* 
 * Javascript functionality common to "index.html" and "restaurant.html" pages
 */

/*================================ CONSTANTS ================================*/
/**
 * Flag that signals the debug mode operation
 * @type Boolean
 */
const DEBUG = false;
/**
 * Flag that signals the Service Worker and resources caching disabled mode
 * @type Boolean
 */
const SW_AND_CACHE_DISABLED = true;
/**
 * Flag that signals the Indexed DB restaurant caching disabled mode
 * @type Boolean
 */
const RESTAURANTS_CACHE_DISABLED = false;
/**
 * Flag that signals the Indexed DB reviews caching disabled mode
 * @type Boolean
 */
const REVIEWS_CACHE_DISABLED = false;

/*================================== MAIN ==================================*/
/**
 * Listen to online/offline events
 */
window.addEventListener('online', (event) => {
  Util.log('Online ' + navigator.onLine);
});
window.addEventListener('offline', (event) => {
  Util.log('Offline ' + navigator.onLine);
});

/**
 * Execute operations after DOM content loaded
 */
document.addEventListener('DOMContentLoaded', (event) => {
  if (!SW_AND_CACHE_DISABLED) {
    registerServiceWorker();
  }
});

/**
 * Register service worker
 */
registerServiceWorker = () => {
  // Check if service worker is available
  if (!navigator.serviceWorker) {
    Util.log('Service worker not supported.');
    return;
  }
  // Register service worker
  navigator.serviceWorker.register('./sw.js')
    .then(() => Util.log('Service Worker registered.'))
    .catch((error) => Util.log('Service Worker registration failed.', error));
};

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
