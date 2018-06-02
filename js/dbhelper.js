/* global indexedDB */

/**
 * The restaurants Indexed DB name
 * @type String
 */
const RESTAURANT_DB = 'restaurants-db';
/**
 * The restaurants store name
 * @type String
 */
const RESTAURANT_STORE = 'restaurant';

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    return `http://localhost:1337/restaurants`;
  }

  /**
   * @description Fetch restaurant's data for given URL
   * @param {string} restaurantsDataUrl restaurant's data URL
   * @param {function} callback function with 2 parameters: error string and restaurant data json 
   */
  static fetchRestaurantsData(restaurantsDataUrl, callback) {
    fetch(restaurantsDataUrl)
      .then(function (response) {
        // If response is OK...
        if (response.status === 200) {
          // ... return the json promise
          return response.json();
        } else {
          // ... else throw an error to be handled in the catch
          throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }
      })
      .then(function (restaurants) {
        // Signal back the restaurants data
        callback(null, restaurants);
      })
      .catch(function (error) {
        // Signal back a fetch error
        callback(error, null);
      });
  }

  /**
   * @description Get all restaurants, checking first if they are available offline. 
   * If not, data is fetched from server and stored in indexed DB.
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getRestaurants(callback) {
    DBHelper.selectRestaurantsData((error, restaurants) => {
      if (error) {
        // Log that there was an error retrieving data from db
        console.info(error);
      }
      // If data loaded from database...
      if (restaurants && restaurants.length > 0) {
        // ... pass it to the callback
        callback(null, restaurants);
      } else {
        // ... else fetch it and insert into db
        console.info(`No restaurant data in database. Fetching from server...`);
        DBHelper.fetchAndInsertRestaurantData(DBHelper.DATABASE_URL, callback);
      }
    });
  }

  /**
   * @description Get a restaurant by its ID, checking first if they are available 
   * offline. If not, data is fetched from server and stored in indexed DB.
   * @param {string} id
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.selectRestaurantsData((error, restaurant) => {
      if (error) {
        // Log that there was an error retrieving data from db
        console.info(error);
      }
      // If data loaded from database...
      if (restaurant) {
        // ... pass it to the callback
        callback(null, restaurant);
      } else {
        // ... else fetch it and insert into db
        console.info(`No restaurant data in database for id=${id}. Fetching from server...`);
        DBHelper.fetchAndInsertRestaurantData(`${DBHelper.DATABASE_URL}/${id}`, callback);
      }
    }, +id);  // +id --> converts the id string to a number
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.webp`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  /**
   * @description Do a given operation in the database
   * @param {string} mode transaction mode
   * @param {function(transaction)} doInTransaction
   * @param {function} onSuccessCallback
   * @param {function} onErrorCallback
   */
  static doInDatabase(mode, doInTransaction, onSuccessCallback, onErrorCallback) {
    const db = indexedDB.open(RESTAURANT_DB, 1);
    db.onupgradeneeded = (upgradeEvent) => {
      const upgradeDB = upgradeEvent.target.result;
      if (!upgradeDB.objectStoreNames.contains(RESTAURANT_STORE)) {
        upgradeDB.createObjectStore(RESTAURANT_STORE, {keyPath: 'id'});
      }
    };
    if (onErrorCallback) {
      db.onerror = (errorEvent) => {
        onErrorCallback(`Error opening database: ${errorEvent.type}`);
      };
    }
    db.onsuccess = (successEvent) => {
      DBHelper.doInTransaction(successEvent.target.result, [RESTAURANT_STORE], mode, doInTransaction, onSuccessCallback, onErrorCallback);
    };
  }

  /**
   * @description Do a given operation in a transaction
   * @param {IDBDatabase} db
   * @param {[string]} storeArray
   * @param {string} mode
   * @param {function(IDBTransaction)} doInTransaction
   * @param {function(string)} onSuccessCallback
   * @param {function(string)} onErrorCallback
   */
  static doInTransaction(db, storeArray, mode, doInTransaction, onSuccessCallback, onErrorCallback) {
    const transaction = db.transaction(storeArray, mode);
    if (onSuccessCallback) {
      transaction.oncomplete = (completeEvent) => {
        onSuccessCallback('Transaction successfull.');
      };
    }
    if (onErrorCallback) {
      transaction.onerror = (errorEvent) => {
        onErrorCallback(`Error during transaction.`);
      };
      transaction.onabort = (abortEvent) => {
        onErrorCallback(`Transaction aborted.`);
      };
    }
    // Do database operations
    doInTransaction(transaction);
  }

  /**
   * @description Get restaurant's data from DB
   * @param {function} callback function with 2 parameters: error string and restaurant data json 
   * @param {string} id (optional) restaurant's ID or undefined to fetch all restaurants
   */
  static selectRestaurantsData(callback, id) {
    console.info(`Loading restaurant data from database.`);
    DBHelper.doInDatabase('readonly',
      (transaction) => {
      // Get the store
      const store = transaction.objectStore(RESTAURANT_STORE);
      const withoutId = id === undefined || id === null;
      // Do select
      const request = withoutId ? store.getAll() : store.get(id);
      request.onerror = (errorEvent) => {
        callback(withoutId ? `Error selecting all restaurants: ${errorEvent}` : `Error selecting restaurant with id=${id}: ${errorEvent}`, null);
      };
      request.onsuccess = (successEvent) => {
        callback(null, successEvent.target.result);
      };
    }, (successMessage) => {
      console.info('Restaurant data loaded from database.');
    }, (errorMessage) => {
      console.info(`Error loading restaurant data from database: ${errorMessage}`);
    }
    );

  }

  /**
   * @description Intercepts the fetchRestaurantsData callback to update indexed DB content
   * @param {type} callback
   * @returns {Function}
   */
  static insertRestaurantData(restaurantData) {
    console.info(`Inserting restaurant data into database.`);
    DBHelper.doInDatabase('readwrite',
      (transaction) => {
      const store = transaction.objectStore(RESTAURANT_STORE);
      const insertRestaurant = function (restaurant) {
        const request = store.put(restaurant);
        request.onsuccess = function (event) {
          console.info(event);// event.target.result === customer.ssn;
        };
      };
      if (Array.isArray(restaurantData)) {
        restaurantData.forEach(insertRestaurant);
      } else {
        insertRestaurant(restaurantData);
      }
    }, (successMessage) => {
      console.info('Restaurant data inserted.');
    }, (errorMessage) => {
      console.info(`Error inserting restaurant data: ${errorMessage}`);
    }
    );
  }

  static fetchAndInsertRestaurantData(restaurantsDataUrl, callback) {
    DBHelper.fetchRestaurantsData(restaurantsDataUrl, (error, restaurants) => {
      if (error) {
        console.info(`Error fetching restaurant data from ${restaurantsDataUrl}.`);
      } else {
        DBHelper.insertRestaurantData(restaurants);
      }
      callback(error, restaurants);
    });
  }

}
