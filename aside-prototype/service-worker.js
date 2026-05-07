/* もやの森 β版 Service Worker
 *
 * 方針（β段階）:
 *   - ネットワークファースト（開発イテレーション中は常に最新を取りたい）
 *   - 基本的なオフラインフォールバック（ネット断時に index.html を返す）
 *   - アイコン・manifest のみ軽くキャッシュ
 *
 * バージョンを上げる度にキャッシュ破棄して新しい資産に切り替わる。
 */

const CACHE_VERSION = 'moyanomori-v0.9.44-beta.1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/suplan/growth/stage1-tane.png'
];

// 1x1 透明PNG（画像フェッチ失敗時のフォールバック - 壊れた画像アイコンを防ぐ）
const TRANSPARENT_PNG = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII='
), c => c.charCodeAt(0));
const IMAGE_RE = /\.(png|jpe?g|gif|svg|webp|ico)$/i;

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
      .catch(() => caches.match(req).then(cached => {
        if (cached) return cached;
        // 画像リクエストには HTML を返さない（壊れた画像アイコンを防ぐため
        // 透明1x1 PNG を返却。img の onerror 等を確実にトリガしない）
        if (IMAGE_RE.test(url.pathname)) {
          return new Response(TRANSPARENT_PNG, {
            status: 200,
            headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }
          });
        }
        // ナビゲーション等のみ index.html フォールバック
        return caches.match('./index.html');
      }))
  );
});
