navigator.serviceWorker.register('listeners.js')
    .then(registration => console.log('Registered the service worker', registration))
    .catch(exception => console.log('Failed to register the service worker', exception))
