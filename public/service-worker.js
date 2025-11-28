/* eslint-disable no-restricted-globals */
// Lightweight service worker placeholder to avoid 404s during development.
// Extend this file with offline caching logic as needed.

const VERSION = "ctibi-placeholder-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No custom caching; allow requests to pass through to the network.
});
