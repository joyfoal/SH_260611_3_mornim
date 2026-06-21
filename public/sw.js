// Service Worker for Mornim alarm notifications
const CACHE_NAME = 'mornim-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Multiple alarm timers keyed by alarm id
const alarmTimers = {}

self.addEventListener('message', (event) => {
  const { type } = event.data ?? {}

  if (type === 'SCHEDULE_ALARM') {
    const { id = 'default', delayMs, title, body } = event.data
    if (alarmTimers[id]) clearTimeout(alarmTimers[id])
    if (delayMs <= 0) return
    alarmTimers[id] = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/mornim.png',
        badge: '/mornim.png',
        tag: `mornim-alarm-${id}`,
        renotify: true,
        requireInteraction: true,
      })
      delete alarmTimers[id]
    }, delayMs)
  }

  if (type === 'CANCEL_ALARM') {
    Object.values(alarmTimers).forEach((t) => clearTimeout(t))
    Object.keys(alarmTimers).forEach((k) => delete alarmTimers[k])
  }

  if (type === 'CANCEL_ALARM_BY_ID') {
    const { id } = event.data
    if (alarmTimers[id]) { clearTimeout(alarmTimers[id]); delete alarmTimers[id] }
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
