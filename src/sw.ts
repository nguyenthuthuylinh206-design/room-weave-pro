/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Workbox precaching - inject manifest from vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching for Supabase API
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache images
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// =============================================
// Push Notification Handling
// =============================================

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received:', event);

  let notificationData: PushPayload = {
    title: 'Room Weave Pro',
    body: 'Bạn có thông báo mới',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'default',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json() as PushPayload;
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || notificationData.data,
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
      { action: 'close', title: 'Đóng' },
    ],
  } as NotificationOptions & { vibrate?: number[] };

  event.waitUntil(
    self.registration.showNotification(notificationData.title!, options)
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              (client as WindowClient).navigate(urlToOpen);
            }
            return;
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[SW] Notification closed:', event);
});

// Handle push subscription change
interface ExtendedPushSubscriptionChangeEvent extends Event {
  oldSubscription?: PushSubscription;
  newSubscription?: PushSubscription;
  waitUntil(promise: Promise<unknown>): void;
}

self.addEventListener('pushsubscriptionchange', (event: Event) => {
  console.log('[SW] Push subscription changed:', event);

  const pushEvent = event as ExtendedPushSubscriptionChangeEvent;
  
  pushEvent.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: pushEvent.oldSubscription?.options?.applicationServerKey,
      })
      .then((subscription) => {
        console.log('[SW] New subscription:', subscription);
        // The main app will handle re-registration on next load
      })
      .catch((error) => {
        console.error('[SW] Failed to resubscribe:', error);
      })
  );
});

// Skip waiting and claim clients immediately
self.skipWaiting();
self.clients.claim();
