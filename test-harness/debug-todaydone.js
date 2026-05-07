/**
 * いっぽ完了後 → 再訪時の表示が新デザインになっているか検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'todaydone');
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

const PORT = 7838;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // 既に今日完了したセッションを仕込む
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-3*86400000, daysUsed: 3, direction: 'lighter' },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [{
        id: 'sess1',
        moodLabel: 'しんどい',
        moodIntensity: 6,
        directionId: 'lighter',
        actionId: 'A002',  // 深呼吸4-7-8
        score: 76,
        reasons: [],
        beforeIntensity: 6,
        afterIntensity: 4,
        changeValue: 2,
        startedAt: now,
        completedAt: now,
      }],
      deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // いっぽタブへ → 完了済表示が新デザインで表示されるか
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_todaydone_new_design.png'), fullPage: true });

  // 「もう一歩やる」をクリック → Step 4 に直接ジャンプ
  await page.click('[data-act="ippo-do-another"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_after_more_step4.png'), fullPage: false });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
