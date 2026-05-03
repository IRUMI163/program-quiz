const CACHE_NAME = 'quiz-cache-v20';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/lang.js',
    './js/model.js',
    './js/view.js',
    './js/components.js',
    './js/utils.js',
    './js/api.js',
    './js/config.js',
    './js/confetti.js',
    './js/data/javascript.json',
    './js/data/css.json',
    './js/data/html.json',
    './js/data/python.json',
    './js/data/typescript.json',
    './js/data/react.json',
    './js/data/git.json',
    './js/data/linux.json',
    './js/data/network.json',
    './js/data/sql.json',
    './js/data/security.json',
    './js/data/algorithm.json'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // GET以外（POST等）、またはAPIへのリクエストはキャッシュ処理から除外する
    if (event.request.method !== 'GET' || url.pathname.includes('/api/')) {
        return;
    }

    // HTML / JSON / Manifest: Network First (ensures fresh version)
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets (CSS, JS, Images): Cache First
    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request).then(response => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            });
        })
    );
});