/**
 * もやもや整理 v3.7 検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'moyamoya');
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

const PORT = 7830;
const URL_BASE = `http://127.0.0.1:${PORT}/`;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(URL_BASE, { waitUntil: 'load' });
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

  // もやもやスタート
  await page.click('[data-act="moyamoya-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '01_step1.png'), fullPage: true });

  // step1: テキスト入力
  await page.fill('#moyaInput', '上司に強く注意された');
  await page.click('[data-act="moya-step1-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_step2_emotions.png'), fullPage: true });

  // step2: 感情選択
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '03_step2_picked.png'), fullPage: true });
  await page.click('[data-act="moya-step2-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_step3_intensity.png'), fullPage: true });

  // step3: 強さ選択 (8)
  await page.click('[data-act="moya-set-score"][data-score="8"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '05_step3_picked.png'), fullPage: true });
  await page.click('[data-act="moya-step3-next"]');
  // step4 への遷移時にAI生成（フォールバック）が走る。ローディング後にカード描画
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 5000 });
  await page.screenshot({ path: path.join(OUT, '06_step4_views_3.png'), fullPage: true });

  // step4: 「他の見方も見てみる」
  await page.click('[data-act="moya-step4-more"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07_step4_views_6.png'), fullPage: true });

  // step4: 1つ選択
  await page.click('[data-act="moya-step4-pick"][data-index="1"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '07b_step4_picked.png'), fullPage: true });

  await page.click('[data-act="moya-step4-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '08_step5_after.png'), fullPage: true });

  // step5: 再評価 (3)
  await page.click('[data-act="moya-set-score-after"][data-score="3"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="moya-step5-next"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '09_letter_mobile.png'), fullPage: true });

  // タブレット幅でのレイアウトも確認
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '10_letter_tablet.png'), fullPage: true });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
