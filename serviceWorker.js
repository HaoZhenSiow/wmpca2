const VERSION = 'v2',
      ALLOW_ORIGIN = ['https://inec.sg']

const CACHE_FIRST_RESOURCE = [
  '/favicon_package/apple-touch-icon.png',
  '/favicon_package/favicon-32x32.png',
  '/favicon_package/favicon-16x16.png',
  '/favicon_package/safari-pinned-tab.svg',
  '/favicon_package/android-chrome-192x192.png',
]

const CROSS_ORIGIN_RESOURCES = [
  '/assignment/images/cambodia.jpg',
  '/assignment/images/korea.jpg',
  '/assignment/images/exotic.jpg'
]

const NETWORK_FIRST_RESOURCES = [
  '/',
  '/index.html',
  '/marker.html',
  '/package.html',
  '/style.css',
  '/manifest.json',
  '/loadSW.js'
]

const RESOURCES = [...CACHE_FIRST_RESOURCE, ...NETWORK_FIRST_RESOURCES]

self.addEventListener('install', cacheFiles)

self.addEventListener('activate', deleteOldKeys)

self.addEventListener('fetch', fetchResources)

self.addEventListener('push', pushNotification)

self.addEventListener('notificationclick', handleNotificationClick)

function cacheFiles(event) {
  event.waitUntil(
    (async () => {
      const CACHE = await caches.open(VERSION)
      await CACHE.addAll(RESOURCES)
      return self.skipWaiting()
    })()
  )
}

function deleteOldKeys(event) {
  event.waitUntil(
    (async () => {
      const KEYS = await caches.keys()
      KEYS.forEach(async (key) => await deleteKey(key))
      return self.clients.claim()
    })()
  )
}

async function deleteKey(key) {
  if (key !== VERSION) {
    await caches.delete(key)
  }
}

function fetchResources(event) {
  const PATHNAME = new URL(event.request.url).pathname,
        NETWORK_FIRST = NETWORK_FIRST_RESOURCES.includes(PATHNAME),
        CACHE_FIRST = [...CACHE_FIRST_RESOURCE, ...CROSS_ORIGIN_RESOURCES].includes(PATHNAME)
 
  if (NETWORK_FIRST) return event.respondWith(networkElseCache(event))
  
  if (CACHE_FIRST) return event.respondWith(cacheElseNetwork(event))

  return event.respondWith(fetch(event.request))
  
}

async function cacheElseNetwork(event) {
  const PATHNAME = new URL(event.request.url).pathname,
        NEW_REQUEST_URL = self.location.origin + PATHNAME
        IS_CROSS_ORIGIN = CROSS_ORIGIN_RESOURCES.includes(PATHNAME),
        REQUEST = IS_CROSS_ORIGIN ? new Request(NEW_REQUEST_URL) : event.request
  
  const CACHED_FILE = await caches.match(REQUEST, { ignoreSearch: true })
  
  if (!CACHED_FILE) return await fetchAndCache(event)
  
  fetchAndCache(event).catch(() => { return })
  return CACHED_FILE
}

async function networkElseCache(event) {
  try {
    return await fetchAndCache(event)
  } catch (error) {
    return await caches.match(event.request, { ignoreSearch: true });
  }
}

async function fetchAndCache(event) {
  const { origin: ORIGIN, pathname: PATHNAME } = new URL(event.request.url),
        IS_ALLOWED = ALLOW_ORIGIN.includes(ORIGIN),
        IS_CROSS_ORIGIN = CROSS_ORIGIN_RESOURCES.includes(PATHNAME),
        CONFIG = IS_CROSS_ORIGIN ? { mode: 'no-cors' } : {}

  const RESPONSE = await fetch(event.request, CONFIG)
  
  if (RESPONSE.ok || (IS_CROSS_ORIGIN && RESPONSE && IS_ALLOWED)) {
    const CACHE = await caches.open(VERSION)
    CACHE.put(PATHNAME, RESPONSE.clone())
  }
  
  return RESPONSE
}

function pushNotification(event) {
  const TITLE = 'Travel Packages',
        TEXT = event.data ? event.data.text() : 'notification text'
        
  send_message_to_all_clients(TEXT)
  self.registration.showNotification(TITLE, {
    body: TEXT,
    icon: '/favicon_package/android-chrome-512x512.png',
    data: {
      url: self.location.origin
    }
  })
}

function handleNotificationClick(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
}

async function send_message_to_all_clients(msg) {
  const CLIENTS = await self.clients.matchAll()
  CLIENTS.forEach(client => {
    client.postMessage(msg, [new MessageChannel().port2])
  })
}
