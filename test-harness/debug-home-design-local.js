/**
 * ホーム画面検証 — ローカルファイル直読み（Vercelのbot対策回避）
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'home-design');
fs.mkdirSync(OUT, { recursive: true });

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
  let p = url.parse(req.url).pathname;
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!fs.existsSync(file)) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(7777, r));
  console.log('local @ http://127.0.0.1:7777');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();

  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto('http://127.0.0.1:7777/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const now = Date.now();
    const day = 86400000;
    const seed = {
      consent: { given: true, version: 'v1', at: now },
      user: { nickname: 'もと', createdAt: now - 14 * day, daysUsed: 14 },
      initialDone: true,
      moodLogs: [
        { id: 'm3', moodScore: 4, moodLabel: '少しよい', categories: ['self'], comment: '朝散歩して、少しリフレッシュできた', createdAt: new Date(now - 3 * day - 12 * 3600 * 1000).toISOString() },
        { id: 'm2', moodScore: 2, moodLabel: '少しつらい', categories: ['family'], comment: 'なんとなく気持ちが落ち着かない', createdAt: new Date(now - 2 * day - 4 * 3600 * 1000).toISOString() },
        { id: 'm1', moodScore: 3, moodLabel: 'ふつう', categories: ['work', 'self'], comment: '上司に言われたことがずっと残っている', createdAt: new Date(now - 1 * day + 2 * 3600 * 1000).toISOString() },
      ],
      moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'light' }
    };
    localStorage.setItem('aside_v3_state', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(OUT, 'local_full.png'), fullPage: true });
  await page.screenshot({ path: path.join(OUT, 'local_viewport.png') });

  // 設定モーダルも開いてスクショ
  await page.click('.navbtn[data-tab="record"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="open-settings"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'local_settings_modal.png') });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
