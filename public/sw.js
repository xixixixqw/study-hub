/* eslint-disable no-restricted-globals */
/**
 * 学习资料库 Service Worker
 * 策略：
 *  - App Shell / 静态资源：Stale-While-Revalidate
 *  - Supabase API（rest/storage/functions）：Network-Only，绝不缓存写操作
 *  - Navigation 请求：Network-First，失败回退缓存首页
 */

const VERSION = 'v1'
const SHELL_CACHE = `study-hub-shell-${VERSION}`
const RUNTIME_CACHE = `study-hub-runtime-${VERSION}`

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isSupabase(url) {
  return (
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/storage/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/auth/v1/')
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request

  if (req.method !== 'GET') return // POST/PUT/DELETE 直接走网络

  const url = new URL(req.url)

  // 跨域且非 Supabase → 不接管
  if (url.origin !== self.location.origin) return

  // Supabase 数据请求：Network-Only
  if (isSupabase(url)) return

  // 导航请求：Network-First，离线回退首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/offline.html'))
        )
    )
    return
  }

  // 静态资源：Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// Web Push：点击通知跳转到对应链接
self.addEventListener('push', (event) => {
  let payload = { title: '学习资料库', body: '有新的提醒', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (e) {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'study-hub-ddl',
      renotify: true,
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          // eslint-disable-next-line no-undef
          c.navigate(target)
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})