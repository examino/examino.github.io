const CACHE_NAME = 'macau-eat-well-v2';
const APP_URL = '/macau-eat-well.html';
const PRECACHE = [
  APP_URL,
  '/macau-eat-well.webmanifest',
  '/apple-touch-icon.png',
  '/macau-eat-well-icon-192.png',
  '/macau-eat-well-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('macau-eat-well-') && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.mode !== 'navigate' || requestUrl.pathname !== APP_URL) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(APP_URL, copy));
    }
    return response;
  }).catch(async () => (await caches.match(APP_URL)) || Response.error()));
});
