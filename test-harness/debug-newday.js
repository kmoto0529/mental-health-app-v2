/**
 * 新しい1日画面の検証 — 前日にセッションがあり今日まだ未記録
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'newday');
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

const PORT = 7839;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // 前日に複数セッション完了 + 今日まだ未記録
  await page.evaluate(() => {
    const day = 86400000;
    const now = Date.now();
    // 昨日の最後のセッション
    const yesterday = new Date(now - 1.5 * day).toISOString();
    const sessions = [
      { id: 's1', moodLabel: 'しんどい', moodIntensity: 6, directionId: 'lighter', actionId: 'A002', score: 78, reasons:[], beforeIntensity: 6, afterIntensity: 4, changeValue: 2, startedAt: new Date(now - 3*day).toISOString(), completedAt: new Date(now - 3*day).toISOString() },
      { id: 's2', moodLabel: '不安',     moodIntensity: 5, directionId: 'lighter', actionId: 'A014', score: 76, reasons:[], beforeIntensity: 5, afterIntensity: 3, changeValue: 2, startedAt: new Date(now - 2*day).toISOString(), completedAt: new Date(now - 2*day).toISOString() },
      // 昨日のセッション (last)
      { id: 's3', moodLabel: '不安',     moodIntensity: 5, directionId: 'lighter', actionId: 'A014', score: 80, reasons:[], beforeIntensity: 5, afterIntensity: 3, changeValue: 2, startedAt: yesterday, completedAt: yesterday },
    ];
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: now-30*day, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: sessions,
      deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // いっぽタブへ → 新しい1日画面
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_newday.png'), fullPage: true });

  // 「気分を記録する」ボタンで Step 1 へ
  await page.click('[data-act="ippo-newday-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_after_start_step1.png'), fullPage: false });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
