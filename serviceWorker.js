const version = 'v2'

const cacheFirstFiles = [
  '/favicon_package/apple-touch-icon.png',
  '/favicon_package/favicon-32x32.png',
  '/favicon_package/favicon-16x16.png',
  '/favicon_package/safari-pinned-tab.svg',
  '/favicon_package/android-chrome-192x192.png',
]

const networkFirstFiles = [
  '/',
  '/index.html',
  '/marker.html',
  '/package.html',
  '/style.css',
  '/manifest.json',
  '/loadSW.js'
]

const cacheFiles = cacheFirstFiles.concat(networkFirstFiles)

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(version)
      cache.addAll(cacheFiles)
      return self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      keys.forEach(async (key) => await deleteKey(key))
      return self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', event => {
  const { pathname } = new URL(event.request.url)
  
  if (event.request.method !== 'GET') {
    return
  } else if (networkFirstFiles.includes(pathname)) {
    event.respondWith(networkElseCache(event))
  } else if (cacheFirstFiles.includes(pathname)) {
    event.respondWith(cacheElseNetwork(event))
  } else {
    event.respondWith(fetch(event.request).catch(() => {return}))
  }
})

self.addEventListener('push', event => {
  const title = 'Travel Packages',
        notificationText = event.data ? event.data.text() : 'notification text'
        options = {
          body: notificationText,
          icon: '/favicon_package/android-chrome-512x512.png',
          data: {
            url: self.location.origin
          }
        }
  send_message_to_all_clients(notificationText)
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})

async function deleteKey(key) {
  if (key !== version) {
    await caches.delete(key)
  }
}

async function cacheElseNetwork(event) {
  const cachedFile = await caches.match(event.request, { ignoreSearch: true })
  
  if (!cachedFile) return fetchAndCache(event)

  fetchAndCache(event).catch(() => {return})
  return cachedFile
}

async function networkElseCache(event) {
  try {
    return await fetchAndCache(event)
  } catch (error) {
    return caches.match(event.request, { ignoreSearch: true });
  }
}

async function fetchAndCache(event) {
  const {pathname } = new URL(event.request.url),
        response = await fetch(event.request)
  
  if (response.ok) {
    const cache = await caches.open(version)
    cache.put(pathname, response.clone())
  }
  
  return response
}

async function send_message_to_all_clients(msg) {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    const msg_chan = new MessageChannel()
    client.postMessage(msg, [msg_chan.port2])
  })
}