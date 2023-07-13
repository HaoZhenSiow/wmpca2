const version = 'v1'

const cacheFirstFiles = [
  '/favicon_package/apple-touch-icon.png',
  '/favicon_package/favicon-32x32.png',
  '/favicon_package/favicon-16x16.png',
  '/favicon_package/safari-pinned-tab.svg',
  '/favicon_package/android-chrome-192x192.png',
  // '/assignment/images/cambodia.jpg',
  // '/assignment/images/korea.jpg',
  // '/assignment/images/exotic.jpg',
]

const networkFirstFiles = [
  '/index.html',
  '/marker.html',
  '/package.html',
  '/style.css',
  '/manifest.json',
  '/loadSW.js'
]

const cacheFiles = cacheFirstFiles.concat(networkFirstFiles)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(version).then((cache) => {
      return cache.addAll(cacheFiles)
    })
    .then(self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== version) {
          return caches.delete(key)
        }
      }))
    })
    .then(self.clients.claim())
  )
})

// self.addEventListener('fetch', (event) => {
//   event.respondWith(
//     caches.match(event.request).then((response) => {
//       return response || fetch(event.request)
//     })
//   )
// })

self.addEventListener('fetch', event => {
  const pathname = new URL(event.request.url).pathname
  if (event.request.method !== 'GET') { return }
  if (networkFirstFiles.indexOf(pathname) !== -1) {
    event.respondWith(networkElseCache(event))
  } else if (cacheFirstFiles.indexOf(pathname) !== -1) {
    event.respondWith(cacheElseNetwork(event))
  } else {
    event.respondWith(fetch(event.request))
  }
});


self.addEventListener('push', (event) => {
  const title = 'Travel Packages',
        notificationText = event.data ? event.data.text() : 'notification text'
        options = {
          body: notificationText,
          icon: '/favicon_package/android-chrome-512x512.png'
        }
  send_message_to_all_clients(notificationText)
  self.registration.showNotification(title, options)
})

// when click on the notification, close the notification and open the page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    // clients.openWindow(event.notification.data.url)
    clients.openWindow("http://localhost:5500/")
  )
})

async function cacheElseNetwork(event) {
  return await caches.match(event.request).then(cachedFile => {
    fetchAndCache(event)
    return cachedFile
  }).catch(async () => {
    return await fetchAndCache(event)
  })
}

function networkElseCache(event) {
  const pathname = new URL(event.request.url).pathname
  // send_message_to_all_clients(pathname)
  const response = fetchAndCache(event).then(res => {
    // send_message_to_all_clients(res.ok)
  })
  const result = response.ok ? response : caches.match(event.request)
  
  return result
}

async function fetchAndCache(event) {
  const pathname = new URL(event.request.url).pathname
  send_message_to_all_clients(pathname)
  return await fetch(event.request).then(response => {
    if (response.ok) {
      send_message_to_all_clients('caching: ' + pathname)
      caches.open(version).then(cache => {
        cache.put(event.request, response.clone())
      })
    }
    return response
  })
}

// function getCleanRequest(request) {
//   const url = new URL(request.url);
//   url.search = ''
//   url.fragment = ''

//   let cleanRequest = new Request(url, {
//     method: request.method,
//     headers: request.headers,
//     mode: request.mode,
//     credentials: request.credentials,
//     cache: request.cache,
//     redirect: request.redirect,
//     referrer: request.referrer,
//     integrity: request.integrity,
//   });
// }

function send_message_to_client(client, msg) {
  return new Promise((resolve, reject) => {
    const msg_chan = new MessageChannel()

    msg_chan.port1.onmessage = event => {
      if (event.data.error) {
        reject(event.data.error)
      } else {
        resolve(event.data)
      }
    }
    
    client.postMessage(msg, [msg_chan.port2])
  })
}

async function send_message_to_all_clients(msg) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    send_message_to_client(client, msg)
  })
}