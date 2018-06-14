let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
};

/**
 * Toggle add button state between "Add review" and "Cancel" mode
 */
function toggleAddButtonState() {
  const addButton = document.getElementById('add-button');
  const addForm = document.getElementById('add-form');

  if (addButton.innerText === 'Cancel') {
    addButton.innerText = 'Add review';
    addForm.setAttribute('hidden', '');
    resetFields();
  } else {
    addButton.innerText = 'Cancel';
    addForm.removeAttribute('hidden');
  }

  // Clear error placeholder
  setError();

}

/**
 * Add a review to restaurant
 * @returns {Boolean} always false to prevent default form submission (https://forums.asp.net/post/4547842.aspx)
 */
function addReview() {
  console.log('submitted');
  // Submit to backend
  DBHelper.addReview(
    self.restaurant.id,
    document.getElementById('add-name').value,
    document.getElementById('add-rating').value,
    document.getElementById('add-comment').value,
    (error, review) => {
      if (error) {
        setError(error);
      } else {
        // Insert as first child (reference: https://www.w3schools.com/jsref/met_node_insertbefore.asp)
        const reviews = document.getElementById('reviews-list');
        reviews.insertBefore(createReviewHTML(review), reviews.childNodes[0]);

        // Update form
        toggleAddButtonState();
      }
    }
  );
  return false;
}

/**
 * Set/Clear the add form error message
 * @param {type} errorMessage the error message to be displayed or 'undefined' to clear error message
 */
function setError(errorMessage) {
  // Reset error placeholder
  const addError = document.getElementById('add-error');
  if (errorMessage) {
    addError.innerHTML = errorMessage;
    addError.removeAttribute('hidden');
  } else {
    addError.innerHTML = '';
    addError.setAttribute('hidden', '');
  }
}

/**
 * Reset all the add form fields
 */
function resetFields() {
  document.getElementById('add-name').value = '';
  document.getElementById('add-rating').value = '';
  document.getElementById('add-comment').value = '';
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.getRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', `Address: ${restaurant.address}`);
  /* Fill in the srcset for each picture source element */
  const less400 = document.getElementById('less400');
  less400.srcset = `/img/${restaurant.id}-400.webp 1x, /img/${restaurant.id}-600.webp 1.5x, /img/${restaurant.id}-800.webp 2x`;
  const less600 = document.getElementById('less600');
  less600.srcset = `/img/${restaurant.id}-600.webp 1x, /img/${restaurant.id}-800.webp 1.5x`;
  const less640 = document.getElementById('less640');
  less640.srcset = `/img/${restaurant.id}-800.webp 1x`;
  const less800 = document.getElementById('less800');
  less800.srcset = `/img/${restaurant.id}-400.webp 1x, /img/${restaurant.id}-600.webp 1.5x, /img/${restaurant.id}-800.webp 2x`;
  const less960 = document.getElementById('less960');
  less960.srcset = `/img/${restaurant.id}-600.webp 1x, /img/${restaurant.id}-800.webp 1.5x`;
  const more960 = document.getElementById('more960');
  more960.srcset = `/img/${restaurant.id}-400.webp 1x, /img/${restaurant.id}-600.webp 1.5x, /img/${restaurant.id}-800.webp 2x`;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', `${restaurant.cuisine_type} cuisine`);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.getReviewsByRestaurantId(restaurant.id, (error, reviews) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillReviewsHTML(reviews);
    }
  });

};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
}
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const article = document.createElement('article');
  article.setAttribute('tabindex', '0');

  const name = document.createElement('h3');
  name.innerHTML = review.name;
  article.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toLocaleString();
  article.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  article.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  article.appendChild(comments);

  li.appendChild(article);
  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.innerHTML = restaurant.name;
  a.href = DBHelper.urlForRestaurant(restaurant);
  a.setAttribute('aria-current', 'page');
  li.appendChild(a);
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
