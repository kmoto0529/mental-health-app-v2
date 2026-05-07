/**
 * v0.9.13 5ステップ再設計検証
 *  - Step 0→1（mood+intensity）→2→3（いまやる/あとでやる）→4→summary
 *  - 「あとでやる」でippoPendingに追加
 *  - サマリで保留があれば優先表示
 *  - 「もう一歩やる」→ Step 1 から再開
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'v0913');
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

const PORT = 7840;

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
      user: { nickname: 'もと', createdAt: Date.now()-5*86400000, daysUsed: 5, direction: 'lighter' },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [{ id: 's1', moodLabel: 'しんどい', moodIntensity: 6, directionId: 'lighter', actionId: 'A002', score: 70, beforeIntensity: 6, afterIntensity: 4, changeValue: 2, startedAt: new Date(Date.now()-86400000).toISOString(), completedAt: new Date(Date.now()-86400000).toISOString() }],
      ippoPending: [],
      deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // いっぽタブへ → 新しい1日画面
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(300);
  // 「気分を記録する」 → Step 1
  await page.click('[data-act="ippo-newday-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '01_step1_mood_intensity.png'), fullPage: true });

  // Step 1: 気分 + 強さ
  await page.click('[data-act="ippo-step1-mood"][data-mood="不安"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="ippo-step1-int"][data-score="7"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, '02_step1_filled.png'), fullPage: true });
  await page.click('[data-act="ippo-step1-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_step2_recs.png'), fullPage: true });

  // Step 2: 推薦から選ぶ
  const firstRec = await page.$('[data-act="ippo-step2-pick"]');
  await firstRec.click();
  await page.waitForTimeout(150);
  await page.click('[data-act="ippo-step2-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_step3_now_or_later.png'), fullPage: true });

  // Step 3: 「あとでやる」をテスト
  await page.click('[data-act="ippo-step3-later"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '05_after_later_todaydone.png'), fullPage: true });

  // 状態確認
  const r1 = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state') || '{}');
    return { pending: s.ippoPending || [], sessions: (s.ippoSessions || []).length };
  });
  console.log('[after later]', JSON.stringify(r1, null, 2));

  // 「あとでやる」後はホームに戻ってる。いっぽタブへ → newDay画面
  await page.click('[data-tab="action"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '05b_back_to_newday.png'), fullPage: true });
  // 気分を記録する → Step 1
  await page.click('[data-act="ippo-newday-start"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06_step1_again.png'), fullPage: false });

  // Step 1 → Step 2 → Step 3 で「いまやる」をテスト
  await page.click('[data-act="ippo-step1-mood"][data-mood="しんどい"]');
  await page.click('[data-act="ippo-step1-int"][data-score="6"]');
  await page.click('[data-act="ippo-step1-next"]');
  await page.waitForTimeout(300);
  const firstRec2 = await page.$('[data-act="ippo-step2-pick"]');
  await firstRec2.click();
  await page.click('[data-act="ippo-step2-next"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="ippo-step3-now"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07_step4_change.png'), fullPage: true });

  // Step 4: 変化記録
  await page.click('[data-act="ippo-step4-after"][data-score="3"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="ippo-step4-next"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '08_step5_summary_with_pending.png'), fullPage: true });

  // 状態確認
  const r2 = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state') || '{}');
    return {
      pending: (s.ippoPending || []).length,
      sessions: (s.ippoSessions || []).length,
    };
  });
  console.log('[after now]', JSON.stringify(r2));

  // 保留からの再開
  const resumeBtn = await page.$('[data-act="ippo-resume-pending"]');
  if (resumeBtn) {
    await resumeBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '09_resume_pending_step3.png'), fullPage: false });
  }

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
