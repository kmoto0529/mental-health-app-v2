/**
 * 同意画面の装飾領域だけをクロップしてスクショ
 * 使い方: node test-harness/snap-consent-decor.js [tag]
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'consent-decor-iter');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.md':'text/markdown' };
const server = http.createServer((req, res) => {
  let p = url.parse(req.url).pathname;
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!fs.existsSync(file)) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

const PORT = 7849;
const TAG = process.argv[2] || 'now';

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.click('[data-act="welcome-next"]');
  await page.waitForTimeout(400);
  const decor = await page.locator('.ob-consent-decor').boundingBox();
  if (!decor) { console.error('decor not found'); process.exit(1); }
  const margin = 30;
  await page.screenshot({
    path: path.join(OUT, `${TAG}.png`),
    clip: { x: 0, y: Math.max(0, decor.y - margin), width: 430, height: decor.height + margin * 2 }
  });
  console.log(`Saved: ${TAG}.png`);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
