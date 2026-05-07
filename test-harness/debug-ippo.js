/**
 * きょうのいっぽ 日次ループ 6ステップ通し検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'ippo');
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

const PORT = 7833;

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
      ippoSessions: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // いっぽタブへ
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '01_step0_direction.png'), fullPage: true });

  // Step 0: 方向選択
  await page.click('[data-act="ippo-step0-pick"][data-direction="lighter"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, '01b_step0_picked.png'), fullPage: true });
  await page.click('[data-act="ippo-step0-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_step1_mood.png'), fullPage: true });

  // Step 1: 気分選択（10択）
  await page.click('[data-act="ippo-step1-mood"][data-mood="不安"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="ippo-step1-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_step2_intensity.png'), fullPage: true });

  // Step 2: 強さ
  await page.click('[data-act="ippo-step2-int"][data-score="7"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="ippo-step2-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_step3_recommendations.png'), fullPage: true });

  // Step 3: duration filter テスト
  await page.click('[data-act="ippo-step3-dur"][data-dur="3min"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '04b_step3_dur_3min.png'), fullPage: true });
  await page.click('[data-act="ippo-step3-dur"][data-dur="1min"]');
  await page.waitForTimeout(200);

  // Step 3: 1つ選ぶ
  const firstRec = await page.$('[data-act="ippo-step3-pick"]');
  await firstRec.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '05_step3_picked.png'), fullPage: true });

  await page.click('[data-act="ippo-step3-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06_step4_doing.png'), fullPage: true });

  await page.click('[data-act="ippo-step4-done"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07_step5_eval.png'), fullPage: true });

  // Step 5: after = 3
  await page.click('[data-act="ippo-step5-after"][data-score="3"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="ippo-step5-next"]');
  await page.waitForTimeout(400);
  // Step 6 = 行動後サマリー（自動保存済）
  await page.screenshot({ path: path.join(OUT, '08_step6_summary.png'), fullPage: true });

  // 「もう一歩やる」をクリック → 即 Step 4 で次の行動
  await page.click('[data-act="ippo-step6-do-next-quick"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '09_next_step4.png'), fullPage: true });

  // ホームに戻る
  await page.click('[data-tab="home"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '10_home.png'), fullPage: true });

  // いっぽタブを再訪
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '11_action_revisit.png'), fullPage: true });

  // 状態確認
  const result = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state') || '{}');
    return {
      sessionsCount: (s.ippoSessions || []).length,
      latest: (s.ippoSessions || [])[0],
    };
  });
  console.log('[final state]', JSON.stringify(result, null, 2));

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
