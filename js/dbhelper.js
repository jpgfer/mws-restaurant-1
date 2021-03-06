/**
 * Javascript functionality to interact with restaurant data indexDB and server backend
 * 
 * Desired workflow:
 * 
 * A) The page request data
 * 1.Y) If the server is online:
 * 1.Y.1) Fetch the data from the network
 * 1.Y.1.Y) If fetch is successfull:
 * 1.Y.1.Y.1) Update database information
 * 1.Y.1.Y.2) Forward data to page
 * 1.Y.1.N) If fetch fails:
 * 1.Y.1.N.1) Load data from database
 * 1.Y.1.N.2) Forward data to page
 * 1.N) If the server is offline:
 * 1.N.1) Load data from database
 * 1.N.2) Forward data to page
 * 
 * B) The page submits data
 * 1) The database is updated
 * 2) The page is updated
 * 3) Check if server online
 * 3.Y) If the server is online:
 * 3.Y.1) Submit data to the backend
 * 3.Y.1.Y) If the submit is successfull:
 * 3.Y.1.Y.1) Notify user
 * 3.Y.1.N) If the submit fails:
 * 3.Y.1.N.1) Notify user
 * 3.Y.1.N.2) Add submission to resubmission queue
 * 3.N) If the server is offline:
 * 3.N.1) Notify user
 * 3.N.2) Add submission to resubmission queue
 * 
 * C) Server is online and becomes offline:
 * 1) Notify user
 * 
 * D) Server is offline and becomes online:
 * 1) Notify user
 * 2) For each data to be submitted...
 * 2.1) Submit data to the backend
 * 2.1.Y) Submission succeeds:
 * 2.1.Y.1) Remove data from queue
 * 2.1.N) Submission fails:
 * 2.1.N.1) Notify user
 * 2.1.N.2) Schedule later for resubmission
 * 
 */
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
 * The restaurant reviews store name
 * @type String
 */
const REVIEWS_STORE = 'reviews';
/**
 * The detached restaurant reviews store name
 * @type String
 */
const DETACHED_REVIEWS_STORE = 'detached_reviews';
/**
 * The restaurants reviews store index by restaurantId
 * @type String
 */
const BY_RESTAURANT_ID = 'byRestaurantId';
/**
 * The restaurants reviews store index by detachedFlag
 * @type String
 */
const BY_SYNC_STATUS = 'bySyncStatus';
/**
 * The synchronization status values (syncStatus)
 */
const SYNCHRONIZED = 0;  // Nothing to sync
const DIRTY = 1;      // Needs to update backend DB
const DETACHED = 2;   // Needs to insert into backend
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
   * @description Get all restaurants, checking first if they are available offline. 
   * If not, data is fetched from server and stored in indexed DB.
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getAllRestaurants(callback) {
    // Check online status
    if (navigator.onLine) {
      // Fetch from network with fallback to database if failed
      DBHelper.fetchAndInsertRestaurants(DBHelper.DATABASE_URL + 'restaurants', (error, restaurants) => {
        if (error) {
          // If, although online, it fails to fetch from network, then: select from database
          DBHelper.selectRestaurants(callback);
        } else {
          // If no error, then forward to callback
          callback(error, restaurants);
        }
      });
    } else {
      // Select from database
      DBHelper.selectRestaurants(callback);
    }
  }

  /**
   * @description Get a restaurant by its ID, checking first if they are available 
   * offline. If not, data is fetched from server and stored in indexed DB.
   * @param {string} id
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getRestaurantById(id, callback) {
    // Check online status
    if (navigator.onLine) {
      // Fetch from network with fallback to database if failed
      DBHelper.fetchAndInsertRestaurants(`${DBHelper.DATABASE_URL}restaurants/${id}`, (error, restaurants) => {
        if (error) {
          // If, although online, it fails to fetch from network, then: select from database
          DBHelper.selectRestaurants(callback, +id);
        } else {
          // If no error, then forward to callback
          callback(error, restaurants);
        }
      });
    } else {
      // Select from database
      DBHelper.selectRestaurants(callback, +id);
    }
  }

  /**
   * @description Get reviews by restaurant ID, checking first if they are available 
   * offline. If not, data is fetched from server and stored in indexed DB.
   * @param {string} restaurantId
   * @param {function(string,json)} callback to handle the error/restaurant data
   */
  static getReviewsByRestaurantId(restaurantId, callback) {
    // Check online status
    if (navigator.onLine) {
      // Fetch from network with fallback to database if failed
      DBHelper.fetchAndInsertRestaurantReviews(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${restaurantId}`, (error, restaurants) => {
        if (error) {
          // If, although online, it fails to fetch from network, then: select from database
          DBHelper.selectRestaurantReviews(callback, +restaurantId);
        } else {
          // If no error, then forward to callback
          callback(error, restaurants);
        }
      });
    } else {
      // Select from database
      DBHelper.selectRestaurantReviews(callback, +restaurantId);
    }
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
        let results = restaurants;
        if (cuisine !== 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type === cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood === neighborhood);
        }
        callback(null, results);
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

  /*********************
   * UTILITY FUNCTIONS *
   *********************/

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
   * @description Do a given operation in the database
   * @param {string} mode transaction mode
   * @param {[string]} storeArray stores used in transaction
   * @param {function(transaction)} doInTransaction
   * @param {function} onSuccessCallback
   * @param {function} onErrorCallback
   */
  static doInDatabase(mode, storeArray, doInTransaction, onSuccessCallback, onErrorCallback) {
    const db = indexedDB.open(RESTAURANT_DB, 5);
    db.onupgradeneeded = (upgradeEvent) => {
      const upgradeDB = upgradeEvent.target.result;
      let reviewsStore = null;
      let restaurantStore = null;
      // Fall through database upgrade pattern
      switch (upgradeEvent.oldVersion) {
        case 0:
          // Create a store to place restaurant information
          restaurantStore = upgradeDB.createObjectStore(RESTAURANT_STORE, {keyPath: 'id'});
        case 1:
          // Create a store to place restaurant reviews and an index to retrieve them by restaurant id
          reviewsStore = upgradeDB.createObjectStore(REVIEWS_STORE, {keyPath: 'id'});
          reviewsStore.createIndex(BY_RESTAURANT_ID, 'restaurant_id');
        case 2:
          // Create a store to store detached (ie, not in the backend database) restaurant reviews
          const detachedReviewsStore = upgradeDB.createObjectStore(DETACHED_REVIEWS_STORE, {keyPath: 'id', autoIncrement: 'true'});
          detachedReviewsStore.createIndex(BY_RESTAURANT_ID, 'restaurant_id');
        case 3:
          // Add an index to retrieve reviews by syncStatus
          if (!reviewsStore) {
            reviewsStore = upgradeDB.transaction.objectStore(REVIEWS_STORE);
          }
          reviewsStore.createIndex(BY_SYNC_STATUS, 'syncStatus');
        case 4:
          // Add an index to retrieve restaurants by syncStatus
          if (!restaurantStore) {
            restaurantStore = upgradeDB.transaction.objectStore(RESTAURANT_STORE);
          }
          restaurantStore.createIndex(BY_SYNC_STATUS, 'syncStatus');
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
   * @param {number} syncStatus
   * @returns {Function}
   */
  static insertRestaurants(restaurants, syncStatus) {
    console.info(`Inserting restaurant data into database.`);
    DBHelper.doInDatabase('readwrite', [RESTAURANT_STORE],
      (transaction) => {
      const store = transaction.objectStore(RESTAURANT_STORE);
      // Function to insert a restaurant
      const insertRestaurant = function (restaurant) {
        restaurant.syncStatus = syncStatus;
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
        if (!RESTAURANTS_CACHE_DISABLED) {
          DBHelper.insertRestaurants(restaurants, SYNCHRONIZED); // When being inserted, the data came from backend so it isn't detacehd
        }
      }
      callback(error, restaurants);
    });
  }

  /**
   * @description Get restaurant's reviews from DB (both normal and detached)
   * @param {function} callback function with 2 parameters: error string and restaurant reviews json 
   * @param {string} restaurantId (optional) restaurant's ID or undefined to fetch all restaurants reviews
   */
  static selectRestaurantReviews(callback, restaurantId) {
    console.info(`Loading restaurant reviews from database.`);
    DBHelper.doInDatabase('readonly', [REVIEWS_STORE, DETACHED_REVIEWS_STORE],
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
        const reviews = successEvent.target.result;
        // Get the detached store index
        const index = transaction.objectStore(DETACHED_REVIEWS_STORE).index(BY_RESTAURANT_ID);
        const withoutId = restaurantId === undefined || restaurantId === null;
        // Do select on detached
        const request = withoutId ? index.getAll() : index.getAll(restaurantId);
        request.onsuccess = (successEvent) => {
          callback(null, reviews.concat(successEvent.target.result));
        };
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
   * @param {number} syncStatus
   * @param {type} callback
   * @returns {Function}
   */
  static insertRestaurantReviews(reviews, syncStatus, callback) {
    console.info(`Inserting restaurant reviews into database.`);
    const storeName = syncStatus === DETACHED ? DETACHED_REVIEWS_STORE : REVIEWS_STORE;
    DBHelper.doInDatabase('readwrite', [storeName],
      (transaction) => {
      const store = transaction.objectStore(storeName);
      // Because reviews can be an array or an object
      if (Array.isArray(reviews)) {
        reviews.forEach((review) => {
          DBHelper.insertRestaurantReview(review, syncStatus, store, callback);
        });
      } else {
        DBHelper.insertRestaurantReview(reviews, syncStatus, store, callback);
      }
    }, (successMessage) => {
      console.info('Restaurant review inserted.');
    }, (errorMessage) => {
      console.info(`Error inserting restaurant review: ${errorMessage}`);
    }
    );
  }

  static insertRestaurantReview(review, syncStatus, store, callback) {
    // Guarantee that mandatory fields exists
    DBHelper.guaranteeDate(review);
    review.syncStatus = syncStatus;
    const request = store.put(review);
    request.onsuccess = function (event) {
      console.info(event); // event.target.result === customer.ssn;
      if (callback) {
        review.id = event.target.result;
        callback(null, review);
      }
    };
  }

  static guaranteeDate(review) {
    if (!review.updatedAt) {
      review.updatedAt = new Date();
    }
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
        if (!REVIEWS_CACHE_DISABLED) {
          DBHelper.insertRestaurantReviews(reviews, SYNCHRONIZED);
        }
      }
      callback(error, reviews);
    });
  }

  /**
   * Set the favorite status of the restaurant
   * @param {number} restaurantId the restaurant id
   * @param {boolean} isFavorite flag indicating if restaurant is to be favorite/unfavorite
   * @param {function} callback invoked after favorite flag is set 
   */
  static setFavorite(restaurantId, isFavorite, callback) {
    // Check online status
    if (navigator.onLine) {
      // Put to backend, then update database
      DBHelper.putFavorite(restaurantId, isFavorite, (error, restaurant) => {
        // Update database and forward to callback
        DBHelper.updateFavorite(restaurantId, isFavorite, error ? DIRTY : SYNCHRONIZED, callback);
      });
    } else {
      // Update database and forward to callback
      DBHelper.updateFavorite(restaurantId, isFavorite, DIRTY, callback);
    }
  }

  /**
   * Update in the database, the favorite status of a restaurant
   * @param {type} restaurantId
   * @param {type} isFavorite
   * @param {type} syncStatus
   * @param {type} callback
   */
  static updateFavorite(restaurantId, isFavorite, syncStatus, callback) {
    console.info(`Updating restaurant ${restaurantId} favorite status to ${isFavorite} in database.`);
    DBHelper.doInDatabase('readwrite', [RESTAURANT_STORE],
      (transaction) => {
      const store = transaction.objectStore(RESTAURANT_STORE);
      // Get restaurant to update...
      const request = store.get(restaurantId);
      request.onsuccess = (event) => {
        const restaurant = event.target.result;
        // ... if new favorite status is different from old one...
        if (restaurant.is_favorite !== isFavorite) {
          // ... set the new favorite status...
          restaurant.is_favorite = isFavorite;
          restaurant.syncStatus = syncStatus;
          // ... and update the restaurant with the new information in the database
          const update = store.put(restaurant);
          update.onsuccess = function (event) {
            // After update, forward to page
            callback(null, restaurant);
          };
        }
      };
    }, (successMessage) => {
      console.info(`Restaurant ${restaurantId} favorite status updated to ${isFavorite}.`);
    }, (errorMessage) => {
      console.info(`Error updating restaurant ${restaurantId} favorite status to ${isFavorite}: ${errorMessage}`);
    }
    );
  }

  /**
   * Put in the backend the favorite status of a restaurant
   * @param {type} restaurantId
   * @param {type} isFavorite
   * @param {type} callback
   * @returns {undefined}
   */
  static putFavorite(restaurantId, isFavorite, callback) {
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
    const newReview = {
      restaurant_id: restaurantId,
      name: name,
      rating: +rating, // the '+' converts rating string to number
      comments: comment
    };
    // Check online status
    if (navigator.onLine) {
      // Post to backend, then update database
      DBHelper.postReview(newReview, (error, review) => {
        // Update database (with review detached from backend if error) and forward to callback
        DBHelper.insertRestaurantReviews(error ? newReview : review, error ? DETACHED : SYNCHRONIZED, callback);
      });
    } else {
      // Update database and forward to callback
      DBHelper.insertRestaurantReviews(newReview, DETACHED, callback);
    }
  }

  /**
   * Post in the backend a new restaurant review
   * @param {restaurant} review
   * @param {function(error, review)} callback
   */
  static postReview(review, callback) {
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
          throw new Error(`Error adding review for restaurant with id=${review.restaurantId}: ${response.status} ${response.statusText}`);
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
   * PS: Doesn't handle the case when it's online and it's editing a detached review
   * @param {number} reviewId
   * @param {string} name
   * @param {number} rating
   * @param {string} comment
   * @param {boolean} syncStatus
   * @param {function(error, review)} callback
   */
  static editReview(reviewId, name, rating, comment, syncStatus, callback) {
    const newReview = {
      name: name,
      rating: +rating, // the '+' converts rating string to number
      comments: comment
    };
    // Which store is the review in?
    const storeName = syncStatus === DETACHED ? DETACHED_REVIEWS_STORE : REVIEWS_STORE;
    // If backend sync fails, what will be the new status?
    const ifFailSyncStatus = syncStatus === DETACHED ? DETACHED : DIRTY;
    // Check online status
    if (navigator.onLine) {
      // Put to backend, then update database
      DBHelper.putReview(reviewId, newReview, (error, review) => {
        // Update database (with review detached from backend on error) and forward to callback
        DBHelper.updateReview(reviewId, error ? newReview : review, storeName, error ? ifFailSyncStatus : SYNCHRONIZED, callback);
      });
    } else {
      // Update database and forward to callback
      DBHelper.updateReview(reviewId, newReview, storeName, ifFailSyncStatus, callback);
    }
  }
  /**
   * Update in the database, an edited restaurant review
   * @param {type} reviewId
   * @param {type} review
   * @param {type} storeName
   * @param {type} syncStatus
   * @param {type} callback
   */
  static updateReview(reviewId, review, storeName, syncStatus, callback) {
    console.info(`Updating restaurant review ${reviewId} in database.`);
    DBHelper.doInDatabase('readwrite', [storeName],
      (transaction) => {
      const store = transaction.objectStore(storeName);
      // Update value...
      const request = store.openCursor(reviewId);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Guarantee that mandatory fields exists
          const editedReview = cursor.value;
          editedReview.name = review.name;
          editedReview.rating = review.rating;
          editedReview.comments = review.comments;
          editedReview.updatedAt = review.updatedAt || new Date();
          editedReview.syncStatus = syncStatus;
          // ... and update the restaurant with the new information in the database
          const update = cursor.update(editedReview);
          update.onsuccess = function (event) {
            // After update, forward to page
            callback(null, editedReview);
          };
        }
      };
    }, (successMessage) => {
      console.info(`Restaurant review ${reviewId} updated.`);
    }, (errorMessage) => {
      console.info(`Error updating restaurant review ${reviewId}: ${errorMessage}`);
    }
    );
  }

  /**
   * Put in the backend an edited restaurant review
   * @param {type} reviewId
   * @param {type} review
   * @param {type} callback
   * @returns {undefined}
   */
  static putReview(reviewId, review, callback) {
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

  static onMainReconnected() {
    DBHelper.deferedEditFavorites();
  }

  static deferedEditFavorites() {
    // A - UPDATE RESTAURANT FAVORITE STATUS
    // 1) Get restaurants (1st transaction)
    // 2) Put favorite to backend
    // 3) Update syncStatus (2nd transaction)
    DBHelper.doInDatabase('readonly', [RESTAURANT_STORE],
      (transaction) => {
      // 1) Get restaurants (1st transaction)
      const restaurantRequest = transaction.objectStore(RESTAURANT_STORE).index(BY_SYNC_STATUS).getAll(DIRTY);
      restaurantRequest.onsuccess = (event) => {
        // By this time the transaction is closed
        const restaurants = event.target.result;
        restaurants.forEach((restaurant) => {
          DBHelper.deferedEditFavorite(restaurant);
        });
      };
    });
  }

  static deferedEditFavorite(restaurant) {
    // 2) Put favorite to backend
    DBHelper.putFavorite(restaurant.id, restaurant.is_favorite, (putError, putRestaurant) => {
      if (putError) {
        console.log(`Error putting restaurant status ${restaurant} to backend: ${putError}`);
      } else {
        // 3) Update syncStatus (2nd transaction)
        DBHelper.deferedUpdateFavorite(putRestaurant);
      }
    });
  }

  static deferedUpdateFavorite(restaurant) {
    console.info(`Updating defered restaurant favorite into database.`);
    DBHelper.doInDatabase('readwrite', [RESTAURANT_STORE],
      (transaction) => {
      // 3) Update post response review in REVIEWS_STORE (2nd transaction)
      const store = transaction.objectStore(RESTAURANT_STORE);
      restaurant.syncStatus = SYNCHRONIZED;
      store.put(restaurant);
    }, (successMessage) => {
      console.info('Defered restaurant favorite updated.');
    }, (errorMessage) => {
      console.info(`Error updating defered restaurant favorite: ${errorMessage}`);
    }
    );
  }

  static onDetailReconnected(callback) {
    DBHelper.deferedAddReviews(callback);
    DBHelper.deferedEditReviews(callback);
  }

  static deferedAddReviews(callback) {
    // A - ADD DETACHED REVIEWS
    // 1) Get reviews (1st transaction)
    // 2) Post new reviews to backend
    // 3) Add post response review to REVIEWS_STORE (2nd transaction)
    // 4) Remove from DETACHED_REVIEWS_STORE (2nd transaction)
    DBHelper.doInDatabase('readonly', [DETACHED_REVIEWS_STORE],
      (transaction) => {
      // 1) Get detached new reviews 
      const detachedReviewsRequest = transaction.objectStore(DETACHED_REVIEWS_STORE).getAll();
      detachedReviewsRequest.onsuccess = (event) => {
        // By this time the transaction is closed
        const detachedReviews = event.target.result;
        // Inform that the given amount of reviews have been submitted for defered update
        callback(detachedReviews.length);
        detachedReviews.forEach((detachedReview) => {
          DBHelper.deferedAddReview(detachedReview, callback);
        });
      };
    });
  }
  static deferedAddReview(detachedReview, callback) {
    // Guarantee that mandatory fields exists
    const review = {
      restaurant_id: detachedReview.restaurant_id,
      name: detachedReview.name,
      rating: detachedReview.rating,
      comments: detachedReview.comments
    };
    // 2) Post new reviews to backend
    DBHelper.postReview(review, (postError, postedReview) => {
      if (postError) {
        console.log(`Error adding detached review ${detachedReview} to backend: ${postError}`);
        callback(-1);
      } else {
        // 3) Add post response review to REVIEWS_STORE & 4) Remove from DETACHED_REVIEWS_STORE 
        DBHelper.deferedInsertRestaurantReview(detachedReview.id, postedReview, callback);
      }
    });
  }

  /**
   * @description Insert restaurant reviews in the indexed DB
   * @param {type} detachedReviewId
   * @param {type} review
   * @returns {Function}
   */
  static deferedInsertRestaurantReview(detachedReviewId, review, callback) {
    console.info(`Inserting defered restaurant reviews into database.`);
    DBHelper.doInDatabase('readwrite', [DETACHED_REVIEWS_STORE, REVIEWS_STORE],
      (transaction) => {
      // 3) Add post response review to REVIEWS_STORE 
      const store = transaction.objectStore(REVIEWS_STORE);
      review.syncStatus = SYNCHRONIZED;
      store.put(review);
      // 4) Remove from DETACHED_REVIEWS_STORE 
      const detachedStore = transaction.objectStore(DETACHED_REVIEWS_STORE);
      detachedStore.delete(detachedReviewId);
    }, (successMessage) => {
      console.info('Defered restaurant review inserted.');
      callback(-1);
    }, (errorMessage) => {
      console.info(`Error inserting defered restaurant review: ${errorMessage}`);
      callback(-1);
    }
    );
  }

  static deferedEditReviews(callback) {
    // B - EDIT ATTACHED REVIEWS
    // 1) Get reviews (1st transaction)
    // 2) Put edited review in backend
    // 3) Update post response review in REVIEWS_STORE (2nd transaction)
    DBHelper.doInDatabase('readonly', [REVIEWS_STORE],
      (transaction) => {
      // 1) Get dirty edited reviews 
      const detachedReviewsRequest = transaction.objectStore(REVIEWS_STORE).index(BY_SYNC_STATUS).getAll(DIRTY);
      detachedReviewsRequest.onsuccess = (event) => {
        // By this time the transaction is closed
        const detachedReviews = event.target.result;
        // Inform that the given amount of reviews have been submitted for defered update
        callback(detachedReviews.length);
        detachedReviews.forEach((detachedReview) => {
          DBHelper.deferedEditReview(detachedReview, callback);
        });
      };
    });
  }
  static deferedEditReview(detachedReview, callback) {
    // Guarantee that mandatory fields exists
    const review = {
      name: detachedReview.name,
      rating: detachedReview.rating,
      comments: detachedReview.comments
    };
    // 2) Post new reviews to backend
    DBHelper.putReview(detachedReview.id, review, (putError, putReview) => {
      if (putError) {
        console.log(`Error puting detached review ${detachedReview} to backend: ${putError}`);
        callback(-1);
      } else {
        // 3) Update post response review in REVIEWS_STORE (2nd transaction)
        DBHelper.deferedUpdateRestaurantReview(putReview, callback);
      }
    });
  }

  static deferedUpdateRestaurantReview(review, callback) {
    console.info(`Updating defered restaurant reviews into database.`);
    DBHelper.doInDatabase('readwrite', [REVIEWS_STORE],
      (transaction) => {
      // 3) Update post response review in REVIEWS_STORE (2nd transaction)
      const store = transaction.objectStore(REVIEWS_STORE);
      review.syncStatus = SYNCHRONIZED;
      store.put(review);
    }, (successMessage) => {
      console.info('Defered restaurant review updated.');
      callback(-1);
    }, (errorMessage) => {
      console.info(`Error updating defered restaurant review: ${errorMessage}`);
      callback(-1);
    }
    );
  }

}
