/**
 * もやもや整理レター 詳細スクリーンショット
 * 各セクションを viewport サイズで個別キャプチャ
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'letter-detail');
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

const PORT = 7831;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-14*86400000, daysUsed: 14 },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // フローを進めてレターまで
  await page.click('[data-act="moyamoya-start"]');
  await page.fill('#moyaInput', '上司に強く注意された');
  await page.click('[data-act="moya-step1-next"]');
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.click('[data-act="moya-step2-next"]');
  await page.click('[data-act="moya-set-score"][data-score="8"]');
  await page.click('[data-act="moya-step3-next"]');
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 5000 });
  await page.click('[data-act="moya-step4-pick"][data-index="1"]');
  await page.click('[data-act="moya-step4-next"]');
  await page.click('[data-act="moya-set-score-after"][data-score="3"]');
  await page.click('[data-act="moya-step5-next"]');
  await page.waitForTimeout(500);

  // viewport に合わせてセクションごとに画面に表示してキャプチャ
  const sections = [
    { name: 'top', selector: '.letter-pageheader' },
    { name: 'header_postmark', selector: '.letter-h1' },
    { name: 'score', selector: '.letter-score' },
    { name: 'points', selector: '.letter-section-h' },
    { name: 'point_event', selector: '.letter-point:nth-child(1)' },
    { name: 'point_emotion', selector: '.letter-point:nth-child(2)' },
    { name: 'point_view', selector: '.letter-point:nth-child(3)' },
    { name: 'point_message', selector: '.letter-point:nth-child(4)' },
    { name: 'mameko', selector: '.letter-mameko' },
    { name: 'summary', selector: '.letter-summary-h' },
    { name: 'summary_foot', selector: '.letter-summary-foot' },
    { name: 'actions', selector: '.letter-actions' },
  ];

  for (const sec of sections) {
    try {
      await page.locator(sec.selector).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `${sec.name}.png`), fullPage: false });
    } catch (e) {
      console.warn('skip', sec.name, e.message);
    }
  }

  // フルページも保存（小さいけどレイアウト全体把握用）
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '_full.png'), fullPage: true });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
