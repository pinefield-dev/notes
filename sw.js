// Offline cache for the app. Bump VERSION whenever index.html changes.
const VERSION = 'v4';
const PREFIX = 'answers-screen-';
const CACHE = PREFIX + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.png'];

// cache: 'reload' bypasses the browser's HTTP cache (GitHub Pages serves with max-age=600),
// so a VERSION bump always precaches the live files.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Only this app's own older versions are removed; other sites on the same origin are left alone.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, revalidate with the server in the background. Navigations fall back to the cached page.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    });
    if (cached) { e.waitUntil(network.catch(() => {})); return cached; }
    try { return await network; }
    catch (err) {
      if (e.request.mode === 'navigate') { const page = await cache.match('./index.html'); if (page) return page; }
      throw err;
    }
  })());
});
