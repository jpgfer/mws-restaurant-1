/* 
 * Javascript functionality common to "index.html" and "restaurant.html" pages
 */

/*================================ CONSTANTS ================================*/
/**
 * Flag that signals the debug mode operation
 * @type Boolean
 */
const DEBUG = true;
/**
 * Flag that signals the Service Worker and resources caching disabled mode
 * @type Boolean
 */
const SW_AND_CACHE_DISABLED = false;
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
 * Show the map
 */
showMap = () => {
  // Toggle visibility
  const showMap = document.getElementById('show-map');
  showMap.style.display = 'none';
  const mapElement = document.getElementById('map');
  mapElement.removeAttribute('hidden');
  // Load map
  loadMap();
};

/**
 * Programatically load the Google Maps API as if it was loaded from the html
 * Reference: https://stackoverflow.com/a/16839744
 * @returns {undefined}
 */
loadMap = () => {
  // create a script tag
  const scriptTag = document.createElement('script');
  // find the first script tag in the document
  const firstScriptTag = document.getElementsByTagName('script')[0];
  // set the async, defer and source of the script to your script
  scriptTag.async = 1;
  scriptTag.defer = 1;
  // Google Maps: real API Key is set during "dist-js" gulp task using 'gulp-token-replace' module
  scriptTag.src = 'https://maps.googleapis.com/maps/api/js?key={{GOOGLE_API_KEY}}&libraries=places&callback=initMap';
  firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag); // append the script to the DOM
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
