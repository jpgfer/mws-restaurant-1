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
 * The restaurants reviews store name
 * @type String
 */
const REVIEWS_STORE = 'reviews';
/**
 * The restaurants reviews store index by restaurantId
 * @type String
 */
const BY_RESTAURANT_ID = 'byRestaurantId';

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    return `http://localhost:1337/`;
  }

  /**
   * @description Fetch application's data for given URL
   * @param {string} dataUrl restaurant's data URL
   * @param {function} callback function with 2 parameters: error string and restaurant data json 
   */
  static fetchDataFromUrl(dataUrl, callback) {
    fetch(dataUrl)
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
      .then(function (applicationData) {
        // Signal back the restaurants data
        callback(null, applicationData);
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
  static getAllRestaurants(callback) {
    DBHelper.selectRestaurants((error, restaurants) => {
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
        DBHelper.fetchAndInsertRestaurants(DBHelper.DATABASE_URL + 'restaurants', callback);
      }
    });
  }

  /**
   * @description Get a restaurant by its ID, checking first if they are available 
   * offline. If not, data is fetched from server and stored in indexed DB.
   * @param {string} id
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getRestaurantById(id, callback) {
    DBHelper.selectRestaurants((error, restaurant) => {
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
        DBHelper.fetchAndInsertRestaurants(`${DBHelper.DATABASE_URL}restaurants/${id}`, callback);
      }
    }, +id);  // +id --> converts the id string to a number
  }

  /**
   * @description Get reviews by restaurant ID, checking first if they are available 
   * offline. If not, data is fetched from server and stored in indexed DB.
   * @param {string} restaurantId
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getReviewsByRestaurantId(restaurantId, callback) {
    DBHelper.selectRestaurantReviews((error, reviews) => {
      if (error) {
        // Log that there was an error retrieving data from db
        console.info(error);
      }
      // If data loaded from database...
      if (reviews && reviews.length > 0) {
        // ... pass it to the callback
        callback(null, reviews);
      } else {
        // ... else fetch it and insert into db
        console.info(`No restaurant reviews in database for id=${restaurantId}. Fetching from server...`);
        DBHelper.fetchAndInsertRestaurantReviews(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${restaurantId}`, callback);
      }
    }, +restaurantId);  // +id --> converts the id string to a number
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   * TODO: Create cuisine index and use it
   * @deprecated not used
   */
  static getRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.getAllRestaurants((error, restaurants) => {
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
   * TODO: Create neighborhood index and use it
   * @deprecated not used
   */
  static getRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getAllRestaurants((error, restaurants) => {
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
   * TODO: Try to query in index DB
   */
  static getRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.getAllRestaurants((error, restaurants) => {
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
   * @deprecated only used by a deprecated function
   */
  static getNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.getAllRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        callback(null, DBHelper.filterNeighborhoods(restaurants));
      }
    });
  }

  /**
   * Filter all neighborhoods to return a unique neighborhood array
   */
  static filterNeighborhoods(restaurants) {
    // Get all neighborhoods from all restaurants
    const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
    // Remove duplicates from neighborhoods
    const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
    return uniqueNeighborhoods;
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @deprecated only used by a deprecated function
   */
  static getCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getAllRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        callback(null, DBHelper.filterCuisines(restaurants));
      }
    });
  }

  /**
   * Filter all cuisines to return a unique cuisines array
   */
  static filterCuisines(restaurants) {
    // Get all cuisines from all restaurants
    const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
    // Remove duplicates from cuisines
    const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
    return uniqueCuisines;
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
   * @param {[string]} storeArray stores used in transaction
   * @param {function(transaction)} doInTransaction
   * @param {function} onSuccessCallback
   * @param {function} onErrorCallback
   */
  static doInDatabase(mode, storeArray, doInTransaction, onSuccessCallback, onErrorCallback) {
    const db = indexedDB.open(RESTAURANT_DB, 2);
    db.onupgradeneeded = (upgradeEvent) => {
      const upgradeDB = upgradeEvent.target.result;
      // Fall through database upgrade pattern
      switch (upgradeEvent.oldVersion) {
        case 0:
          upgradeDB.createObjectStore(RESTAURANT_STORE, {keyPath: 'id'});
        case 1:
          const reviewsStore = upgradeDB.createObjectStore(REVIEWS_STORE, {keyPath: 'id'});
          reviewsStore.createIndex(BY_RESTAURANT_ID, 'restaurant_id');
      }
    };
    if (onErrorCallback) {
      db.onerror = (errorEvent) => {
        onErrorCallback(`Error opening database: ${errorEvent.type}`);
      };
    }
    db.onsuccess = (successEvent) => {
      DBHelper.doInTransaction(successEvent.target.result, storeArray, mode, doInTransaction, onSuccessCallback, onErrorCallback);
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
  static selectRestaurants(callback, id) {
    console.info(`Loading restaurant data from database.`);
    DBHelper.doInDatabase('readonly', [RESTAURANT_STORE],
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
      console.info('Restaurant data query successfull.');
    }, (errorMessage) => {
      console.info(`Error querying restaurant data from database: ${errorMessage}`);
    }
    );
  }

  /**
   * @description Insert restaurant in the indexed DB
   * @param {type} restaurants
   * @returns {Function}
   */
  static insertRestaurants(restaurants) {
    console.info(`Inserting restaurant data into database.`);
    DBHelper.doInDatabase('readwrite', [RESTAURANT_STORE],
      (transaction) => {
      const store = transaction.objectStore(RESTAURANT_STORE);
      // Function to insert a restaurant
      const insertRestaurant = function (restaurant) {
        const request = store.put(restaurant);
        request.onsuccess = function (event) {
          console.info(event);
        };
      };
      // Because reviews can be an array or an object
      if (Array.isArray(restaurants)) {
        restaurants.forEach(insertRestaurant);
      } else {
        insertRestaurant(restaurants);
      }
    }, (successMessage) => {
      console.info('Restaurant data inserted.');
    }, (errorMessage) => {
      console.info(`Error inserting restaurant data: ${errorMessage}`);
    }
    );
  }

  /**
   * Fetch restaurants from network and insert them into index db
   * @param {type} restaurantsUrl
   * @param {type} callback
   * @returns {undefined}
   */
  static fetchAndInsertRestaurants(restaurantsUrl, callback) {
    DBHelper.fetchDataFromUrl(restaurantsUrl, (error, restaurants) => {
      if (error) {
        console.info(`Error fetching restaurant from ${restaurantsUrl}.`);
      } else {
        DBHelper.insertRestaurants(restaurants);
      }
      callback(error, restaurants);
    });
  }

  /**
   * @description Get restaurant's reviews from DB
   * @param {function} callback function with 2 parameters: error string and restaurant reviews json 
   * @param {string} restaurantId (optional) restaurant's ID or undefined to fetch all restaurants reviews
   */
  static selectRestaurantReviews(callback, restaurantId) {
    console.info(`Loading restaurant reviews from database.`);
    DBHelper.doInDatabase('readonly', [REVIEWS_STORE],
      (transaction) => {
      // Get the store index
      const index = transaction.objectStore(REVIEWS_STORE).index(BY_RESTAURANT_ID);
      const withoutId = restaurantId === undefined || restaurantId === null;
      // Do select
      const request = withoutId ? index.getAll() : index.getAll(restaurantId);
      request.onerror = (errorEvent) => {
        callback(withoutId ? `Error selecting all restaurants reviews: ${errorEvent}` : `Error selecting reviews for restaurant with id=${restaurantId}: ${errorEvent}`, null);
      };
      request.onsuccess = (successEvent) => {
        callback(null, successEvent.target.result);
      };
    }, (successMessage) => {
      console.info('Restaurant reviews query successfull.');
    }, (errorMessage) => {
      console.info(`Error querying restaurant reviews from database: ${errorMessage}`);
    }
    );
  }

  /**
   * @description Insert restaurant reviews in the indexed DB
   * @param {type} reviews
   * @returns {Function}
   */
  static insertRestaurantReviews(reviews) {
    console.info(`Inserting restaurant reviews into database.`);
    DBHelper.doInDatabase('readwrite', [REVIEWS_STORE],
      (transaction) => {
      const store = transaction.objectStore(REVIEWS_STORE);
      // Function to insert a restaurant review
      const insertRestaurantReview = function (review) {
        const request = store.put(review);
        request.onsuccess = function (event) {
          console.info(event);// event.target.result === customer.ssn;
        };
      };
      // Because reviews can be an array or an object
      if (Array.isArray(reviews)) {
        reviews.forEach(insertRestaurantReview);
      } else {
        insertRestaurantReview(reviews);
      }
    }, (successMessage) => {
      console.info('Restaurant review inserted.');
    }, (errorMessage) => {
      console.info(`Error inserting restaurant review: ${errorMessage}`);
    }
    );
  }

  /**
   * Fetch restaurant reviews from network and insert them into index db
   * @param {type} restaurantsReviewsUrl
   * @param {type} callback
   * @returns {undefined}
   */
  static fetchAndInsertRestaurantReviews(restaurantsReviewsUrl, callback) {
    DBHelper.fetchDataFromUrl(restaurantsReviewsUrl, (error, reviews) => {
      if (error) {
        console.info(`Error fetching restaurant reviews from ${restaurantsReviewsUrl}.`);
      } else {
        DBHelper.insertRestaurantReviews(reviews);
      }
      callback(error, reviews);
    });
  }

  /**
   * Set the favorite flag of the restaurant
   * TODO: update also the index DB
   * @param {number} restaurantId the restaurant id
   * @param {boolean} isFavorite flag indicating if restaurant is to be favorite/unfavorite
   * @param {function} callback invoked after favorite flag is set 
   */
  static setFavorite(restaurantId, isFavorite, callback) {
    fetch(`${DBHelper.DATABASE_URL}restaurants/${restaurantId}/?is_favorite=${isFavorite}`, {method: 'PUT'})
      .then(function (response) {
        // If response is OK...
        if (response.status === 200) {
          // ... return the json promise
          return response.json();
        } else {
          // ... else throw an error to be handled in the catch
          throw new Error(`Error setting favorite for restaurant with id=${restaurantId}: ${response.status} ${response.statusText}`);
        }
      })
      .then(function (restaurant) {
        // Signal back the restaurants data
        callback(null, restaurant);
      })
      .catch(function (error) {
        // Signal back a fetch error
        callback(error, null);
      });
  }

  /**
   * Add restaurant review
   * @param {number} restaurantId
   * @param {string} name
   * @param {number} rating
   * @param {string} comment
   * @param {function(error, review)} callback
   */
  static addReview(restaurantId, name, rating, comment, callback) {
    const review = {
      restaurant_id: restaurantId,
      name: name,
      rating: +rating, // the '+' converts rating string to number
      comments: comment
    };
    fetch(`${DBHelper.DATABASE_URL}reviews/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(review)
    })
      .then(function (response) {
        // If response is CREATED...
        if (response.status === 201) {
          // ... return the json promise
          return response.json();
        } else {
          // ... else throw an error to be handled in the catch
          throw new Error(`Error adding review for restaurant with id=${restaurantId}: ${response.status} ${response.statusText}`);
        }
      })
      .then(function (review) {
        // Signal back the restaurants data
        callback(null, review);
      })
      .catch(function (error) {
        // Signal back a fetch error
        callback(error, null);
      });
  }
  
  /**
   * Edit restaurant review
   * @param {number} reviewId
   * @param {string} name
   * @param {number} rating
   * @param {string} comment
   * @param {function(error, review)} callback
   */
  static editReview(reviewId, name, rating, comment, callback) {
    const review = {
      name: name,
      rating: +rating, // the '+' converts rating string to number
      comments: comment
    };
    fetch(`${DBHelper.DATABASE_URL}reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(review)
    })
      .then(function (response) {
        // If response is OK...
        if (response.status === 200) {
          // ... return the json promise
          return response.json();
        } else {
          // ... else throw an error to be handled in the catch
          throw new Error(`Error editing review with id=${reviewId}: ${response.status} ${response.statusText}`);
        }
      })
      .then(function (review) {
        // Signal back the restaurants data
        callback(null, review);
      })
      .catch(function (error) {
        // Signal back a fetch error
        callback(error, null);
      });
  }

}
