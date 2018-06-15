let restaurants, neighborhoods, cuisines;
var map;
var markers = [];

/**
 * Setup restaurants information
 */
restaurantsSetup = (restaurants) => {
  fillNeighborhoodsHTML(DBHelper.filterNeighborhoods(restaurants));
  fillCuisinesHTML(DBHelper.filterCuisines(restaurants));
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Lazily load images using IntersectionObserver
 * Source: https://developers.google.com/web/fundamentals/performance/lazy-loading-guidance/images-and-video/
 */
lazyLoadImages = () => {
  var lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

  // If image IntersectionObserver is available...
  if ("IntersectionObserver" in window) {
    // Create a new IntersectionObserver (io) that...
    let lazyImageObserver = new IntersectionObserver(function (entries, observer) {
      // ... for each observed entry...
      entries.forEach(function (entry) {
        // ... checks if it's intersecting the viewport...
        if (entry.isIntersecting) {
          // ... and if so, update the src and srcset information with the ones stored in dataset
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove("lazy");
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(function (lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Possibly fall back to a more compatible method here
    console.log('Lazy image loading not available.');
  }
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants(restaurantsSetup);
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = (restaurantsSetupHandler) => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.getRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      lazyLoadImages();
      // If there's a restaurant's setup handler
      if (restaurantsSetupHandler) {
        restaurantsSetupHandler(restaurants);
      }
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const article = document.createElement('article');
  article.setAttribute('tabindex', '0');

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  article.append(name);

  const picture = document.createElement('picture');
  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 transparent png pixel (provided by: http://png-pixel.com/)
  image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `${restaurant.name} photograph`;
  picture.append(image);
  article.append(picture);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute('aria-label', `${restaurant.neighborhood} neighborhood`);
  article.append(neighborhood);

  const address = document.createElement('address');
  address.innerHTML = restaurant.address;
  article.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View ${restaurant.name} details`);
  article.append(more);

  const favorite = document.createElement('button');
  favorite.innerHTML = '★';
  favorite.className = 'favorite';
  favorite.type = 'button';
  favorite.title = 'Toggle favorite';
  favorite.onclick = toggleFavorite(restaurant.id);
  favorite.setAttribute('aria-pressed', restaurant.is_favorite);
  article.append(favorite);

  li.append(article);
  return li;
};

/**
 * Return a function to toggle the restaurant favorite status
 * @param {type} restaurantId the restaurantId
 * @returns {undefined}
 */
toggleFavorite = (restaurantId) => {
  return (event) => {
    const newState = !(event.target.getAttribute('aria-pressed') === 'true');
    DBHelper.setFavorite(restaurantId, newState, (error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        event.target.setAttribute('aria-pressed', newState);
      }
    }
    );
  };
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
