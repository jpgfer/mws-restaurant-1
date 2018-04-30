/**
 * Add listener to the 'fetch' event
 */
self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request)
    .then(function (response) {
      if (response.status === 404) {
        return new Response('Whoops, not found.');
      }
      return response;
    })
    .catch(function (error) {
      return new Response('Error requesting.');
    })
    );
});
