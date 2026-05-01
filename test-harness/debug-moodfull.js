/**
 * 気持ち入力フル画面（v3.6 画像準拠）の検証
 * - ライト/ダーク両モード
 * - もっと見る前後
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'moodfull');
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

const PORT = 7820;
const URL_BASE = `http://127.0.0.1:${PORT}/`;

async function setup(page, theme = 'light') {
  await page.goto(URL_BASE, { waitUntil: 'load' });
  await page.evaluate((theme) => {
    const seed = {
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now() - 14*86400000, daysUsed: 14 },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: theme }
    };
    localStorage.setItem('aside_v3_state', JSON.stringify(seed));
  }, theme);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
  // ホームのCTAから mood-full に遷移
  await page.click('[data-act="open-mood-full"]');
  await page.waitForTimeout(400);
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  // ===== ダークモード - 折りたたみ =====
  await setup(page, 'dark');
  await page.screenshot({ path: path.join(OUT, '01_dark_collapsed.png'), fullPage: true });

  // 気分タップ
  await page.click('[data-act="mood-score"][data-score="2"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02_dark_collapsed_mood_picked.png'), fullPage: true });

  // もっと見るで展開
  await page.click('[data-act="cats-expand"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_dark_expanded.png'), fullPage: true });

  // ===== ライトモード - 折りたたみ =====
  await setup(page, 'light');
  await page.screenshot({ path: path.join(OUT, '04_light_collapsed.png'), fullPage: true });

  await page.click('[data-act="mood-score"][data-score="2"]');
  await page.waitForTimeout(200);
  // カテゴリ複数選択
  await page.click('[data-act="mood-cat"][data-cat="work"]');
  await page.click('[data-act="mood-cat"][data-cat="self"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '05_light_picked.png'), fullPage: true });

  // 展開
  await page.click('[data-act="cats-expand"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06_light_expanded.png'), fullPage: true });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
