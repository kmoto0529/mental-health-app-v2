/**
 * いっぽ初回オンボーディング画面の検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'ippo-onboarding');
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

const PORT = 7837;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // ippoSessions 空（初回未使用）
  await page.evaluate(() => {
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-3*86400000, daysUsed: 3, direction: null },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [],
      deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // ライト/ダーク両方を撮影
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_onboarding_dark.png'), fullPage: true });

  // 「さっそく始める」をクリック → Step 0 へ
  await page.click('[data-act="ippo-onboarding-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_after_start_step0.png'), fullPage: false });

  // ライトモードでも撮影
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state'));
    s.preferences.themeOverride = 'light';
    s.ippoSessions = [];
    localStorage.setItem('aside_v3_state', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '03_onboarding_light.png'), fullPage: true });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
