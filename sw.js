/* Gansito — Service Worker
   Recibe los push del cron y los muestra aunque la web esté cerrada. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let d = { title: 'Gansito', body: 'Tienes algo pendiente', url: '/gansito/' };
  try { d = { ...d, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'gansito',
      renotify: true,
      data: { url: d.url }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/gansito/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/gansito') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
