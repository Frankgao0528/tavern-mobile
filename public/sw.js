// 念念酒馆 PWA Service Worker：离线缓存
const CACHE = 'tavern-v1'
const ASSETS = ['./', './manifest.json', './index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // 只缓存同源资源；API 请求不缓存
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit
      return fetch(e.request)
        .then((res) => {
          if (res.ok && url.pathname.includes('/assets/')) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => (url.pathname.includes('/assets/') ? caches.match('./index.html') : new Response('offline')))
    })
  )
})
