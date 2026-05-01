/* Aside β版 Service Worker
 *
 * 方針（β段階）:
 *   - ネットワークファースト（開発イテレーション中は常に最新を取りたい）
 *   - 基本的なオフラインフォールバック（ネット断時に index.html を返す）
 *   - アイコン・manifest のみ軽くキャッシュ
 *
 * バージョンを上げる度にキャッシュ破棄して新しい資産に切り替わる。
 */

const CACHE_VERSION = 'aside-v0.4.2-beta.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // POST 等はキャッシュしない
  if (req.method !== 'GET') return;
  // Supabase / 外部APIはSWでハンドリングしない（直接通す）
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // 静的資産は取得ついでにキャッシュ更新
        if (res.ok && (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') ||
                       url.pathname.endsWith('.css')  || url.pathname.endsWith('.json') ||
                       url.pathname.endsWith('.png')  || url.pathname.endsWith('.svg'))) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
  );
});
