/**
 * 深掘りループ + 精度カード 検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'deepdive');
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

const PORT = 7834;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // ippoSessions をいくつか持った state を仕込む（精度カード用）
  await page.evaluate(() => {
    const today = new Date();
    const sessions = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      sessions.push({
        id: 'sess' + i,
        moodLabel: '不安',
        moodIntensity: 7,
        actionId: 'A002',
        score: 65 + (4 - i) * 5,  // 65, 70, 75, 80, 85
        reasons: ['1分でできて取り組みやすい行動です'],
        beforeIntensity: 7,
        afterIntensity: 4 - Math.min(2, (4 - i) * 0.4),
        changeValue: 3 + (4 - i) * 0.4,
        startedAt: d.toISOString(),
        completedAt: d.toISOString(),
      });
    }
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-14*86400000, daysUsed: 14 },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: sessions,
      deepDiveSessions: [],
      coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // きろくタブへ → 精度カード + 深掘りエントリ確認
  await page.click('[data-tab="record"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_record_with_accuracy.png'), fullPage: true });

  // 深掘り開始
  await page.click('[data-act="dd-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_dd_step1_theme.png'), fullPage: true });

  await page.click('[data-act="dd-step1-pick"][data-theme="self"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="dd-step1-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_dd_step2_event.png'), fullPage: true });

  await page.fill('#ddEventInput', '上司に強く注意された');
  await page.click('[data-act="dd-step2-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_dd_step3_thought.png'), fullPage: true });

  await page.fill('#ddFirstThoughtInput', '自分はダメだと思った');
  await page.click('[data-act="dd-step3-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '05_dd_step4_deep1.png'), fullPage: true });

  await page.fill('#ddDeeperInput', '失敗するから、嫌われる');
  await page.click('[data-act="dd-step4-deeper"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06_dd_step4_deep2.png'), fullPage: true });

  await page.fill('#ddDeeperInput', '人として価値がない');
  await page.click('[data-act="dd-step4-stop"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07_dd_step5_belief.png'), fullPage: true });

  await page.fill('#ddSinceInput', '小さい頃から');
  await page.click('[data-act="dd-step5-conf"][data-score="7"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="dd-step5-next"]');
  await page.waitForTimeout(800);  // AI抽出は実行されない（API key 無し）→ ルールベース
  await page.screenshot({ path: path.join(OUT, '08_dd_step6_outcome.png'), fullPage: true });

  await page.click('[data-act="dd-save"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '09_back_to_record.png'), fullPage: true });

  // 状態確認
  const r = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state') || '{}');
    return {
      ddCount: (s.deepDiveSessions || []).length,
      latest: (s.deepDiveSessions || [])[0],
      tags: s.coreBeliefTags || [],
    };
  });
  console.log('[deepdive state]', JSON.stringify(r, null, 2));

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
