const CACHE_NAME = 'tf-cotizador-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data/products.js',
  './data/pricing.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});