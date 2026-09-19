// SILVA Service Worker
// ⚠ リリースのたびに CACHE_NAME を上げること。上げないと古いHTMLが端末に残り続ける
const CACHE_NAME = 'silva-v17';

/* index.html の <script src="...?v=N"> と必ず同じ値にする（テストが同期を検査する）。
   ズレると、オフライン初回にコアJSがキャッシュに無くてAI戦が起動できない */
const ASSET_VER = '22';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/rules.html',
  '/manifest.json',
  '/experience.css?v=22',
  '/experience.js?v=22',
  '/card-effects.js?v=22',
  `/game-core.js?v=${ASSET_VER}`,
  `/i18n.js?v=${ASSET_VER}`,
  `/local-game.js?v=${ASSET_VER}`,
  '/back.webp',
  ...Array.from({ length: 11 }, (_, i) => `/${i + 1}.webp`),
];

// Install — カード画像まで先読みしておくと2回目以降の起動が速い
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  // 外部オリジン（フォント以外）とWebSocketには触らない
  if (req.url.includes('fonts.googleapis.com') || req.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }))
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/ping' || url.pathname.startsWith('/api/')) return;

  // JS はネットワーク優先。古いロジックが残ると盤面がサーバーと食い違う
  if (/\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 画像・アイコン — 内容が変わらないのでキャッシュファーストで即返す
  if (/\.(webp|png|jpg|svg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, clone)); }
        return res;
      }))
    );
    return;
  }

  // メインHTML — ネットワークファースト、失敗したらキャッシュ
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(url.pathname === '/rules.html' ? '/rules.html' : '/index.html', clone)); }
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
