// Service Worker for Mornim alarm notifications
const CACHE_NAME = 'mornim-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Alarm timer handle
let alarmTimer = null

self.addEventListener('message', (event) => {
  const { type } = event.data ?? {}

  if (type === 'SCHEDULE_ALARM') {
    const { delayMs, title, body } = event.data
    if (alarmTimer) clearTimeout(alarmTimer)
    if (delayMs <= 0) return
    alarmTimer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/mornim.png',
        badge: '/mornim.png',
        tag: 'mornim-alarm',
        renotify: true,
        requireInteraction: true,
      })
      alarmTimer = null
    }, delayMs)
  }

  if (type === 'CANCEL_ALARM') {
    if (alarmTimer) { clearTimeout(alarmTimer); alarmTimer = null }
  }
})

// When user taps notification, open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    })
  )
})
