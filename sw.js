// 念念酒馆 PWA Service Worker：网络优先（离线兜底）
const CACHE = 'tavern-v3'
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
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return

  // 导航请求（打开页面）：网络优先，失败用缓存兜底 → 永远拿到最新版
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', clone))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
    return
  }

  // 静态资源：缓存优先，离线可用
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
