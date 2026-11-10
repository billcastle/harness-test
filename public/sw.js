// Minimal service worker so browsers offer to install the app. It caches nothing:
// the data is private and always fetched live, so the installed app needs a connection.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
