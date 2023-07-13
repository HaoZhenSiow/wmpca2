const version = 'v4'

const cacheFirstFiles = [
  '/favicon_package/apple-touch-icon.png',
  '/favicon_package/favicon-32x32.png',
  '/favicon_package/favicon-16x16.png',
  '/favicon_package/safari-pinned-tab.svg'
]

const networkFirstFiles = [
  'index.html',
  'marker.html',
  'package.html',
  'style.css',
  'manifest.json',
  'loadSW.js'
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

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') { return }
  if (networkFirstFiles.indexOf(event.request.url) !== -1) {
    event.respondWith(networkElseCache(event));
  } else if (cacheFirstFiles.indexOf(event.request.url) !== -1) {
    event.respondWith(cacheElseNetwork(event));
  } else {
    event.respondWith(fetch(event.request));
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
  const cachedFile = await caches.match(event.request)
  
  if (!cachedFile) { return await fetchAndCache(event) }

  fetchAndCache(event)
  return cachedFile
}

async function networkElseCache(event) {
  const response = await fetchAndCache(event)
  return response.ok ? response : await caches.match(event.request)
}

async function fetchAndCache(event) {
  const response = await fetch(event.request)
  if (response.ok) {
    const cache = await caches.open(version)
    cache.put(event.request, response.clone())
  }
  return response
}

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