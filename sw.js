// sw.js
const CACHE_NAME = 'my-aac-cache-v1';
const MODEL_CACHE_NAME = 'my-aac-model-cache-v1'; // 🌟 New separate partition for large AI weights

// Core application shell files to pre-cache immediately upon installation
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico'
];

// The 'install' event kicks off the moment the browser recognizes the PWA.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('Pre-caching critical application shell assets...');
            return cache.addAll(PRECACHE_ASSETS);
        })
        .then(() => self.skipWaiting()) // Forces the new service worker to activate immediately
    );
});

// The 'activate' event cleans up older cache versions if you update cache names.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== MODEL_CACHE_NAME) {
                        console.log('Clearing deprecated legacy cache assets:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Takes control of all open browser tabs immediately
    );
});

// The Upgraded Fetch Interceptor (The Cross-Origin Network Shield)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // 🌟 Identify if the target request is local or pointing to HuggingFace neural layers
    const isSameOrigin = url.origin === self.location.origin;
    const isModelWeight = url.hostname.includes('huggingface.co') || url.hostname.includes('onnxruntime');

    // Bypass and ignore analytics, extension schemes, or auxiliary external traffic
    if (!isSameOrigin && !isModelWeight) return;

    // Direct data streams into their appropriate specialized storage vaults
    const activeCacheName = isModelWeight ? MODEL_CACHE_NAME : CACHE_NAME;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // 🌟 CACHE-FIRST STRATEGY FOR NEURAL WEIGHTS:
                // Since ONNX models are immutable and static, serve them instantly from device hardware 
                // to eliminate internet dependency and network load entirely.
                if (isModelWeight) return cachedResponse;
                
                // STALE-WHILE-REVALIDATE FOR LOCAL ASSETS:
                // Serve HTML/JS/CSS instantly from cache, but quietly check network for updates in the background.
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        const cacheCopy = networkResponse.clone();
                        caches.open(activeCacheName).then((cache) => {
                            cache.put(event.request, cacheCopy);
                        });
                    }
                    return networkResponse;
                }).catch(() => {});
                
                return cachedResponse;
            }

            // CACHE MISS: Fetch file over the network, capture it, and commit to memory before returning
            return fetch(event.request).then((networkResponse) => {
                // Status 200 is standard. Status 0 handles opaque cross-origin CDN pings safely.
                if (networkResponse.status === 200 || networkResponse.status === 0) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(activeCacheName).then((cache) => {
                        cache.put(event.request, cacheCopy);
                    });
                }
                return networkResponse;
            });
        })
    );
});