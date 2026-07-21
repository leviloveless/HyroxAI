/* Duravel service worker — web push notifications.
 *
 * Registered by components/settings/push-toggle.tsx. Handles two events:
 *   - push:               render the notification the server sent
 *   - notificationclick:  focus an existing app tab (or open one) at the
 *                         notification's target url (defaults to /dashboard).
 *
 * The payload shape is set by lib/push/send.ts:
 *   { title, body, url?, tag? }
 */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "Duravel", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Duravel";
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Focus an already-open Duravel tab and route it to the target.
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              try {
                client.navigate(targetUrl);
              } catch (_e) {
                /* cross-origin or unsupported — ignore, tab still focused */
              }
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
