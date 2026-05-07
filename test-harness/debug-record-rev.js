/**
 * きろくタブ刷新（カレンダー月切替 + AI分析レポート）検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'record-rev');
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

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });

  // 過去2週間 + 1ヶ月前のサンプルデータを仕込む
  await page.evaluate(() => {
    const today = new Date();
    const t = today.getTime();
    const moods = [];
    // 過去14日 (intensity 1-5 にバラ撒き)
    for (let i = 0; i < 14; i++) {
      const d = new Date(t - i * 86400000);
      d.setHours(8 + (i % 12));
      // 7日前あたりは下がる、最近は上がる、を意図
      const score = i < 3 ? 4 : i < 6 ? 3 : i < 10 ? 2 : 4;
      moods.push({
        id: 'm' + i,
        moodScore: score,
        comment: i % 3 === 0 ? 'よく眠れた' : i % 3 === 1 ? '仕事が忙しい' : '',
        categories: i % 2 === 0 ? ['work'] : ['self'],
        createdAt: d.toISOString(),
      });
    }
    // 35日前にも記録 (先月遡り検証用)
    const past = new Date(t - 35 * 86400000);
    moods.push({ id: 'mp', moodScore: 3, comment: '', categories: [], createdAt: past.toISOString() });

    const ippoSessions = [
      { id: 'ip1', moodLabel: '不安', moodIntensity: 7, beforeIntensity: 7, afterIntensity: 4,
        changeValue: 3, actionId: 'A002', directionId: 'lighter',
        startedAt: new Date(t - 2*86400000).toISOString(),
        completedAt: new Date(t - 2*86400000).toISOString() },
      { id: 'ip2', moodLabel: 'モヤモヤ', moodIntensity: 6, beforeIntensity: 6, afterIntensity: 5,
        changeValue: 1, actionId: 'A014', directionId: 'lighter',
        startedAt: new Date(t - 5*86400000).toISOString(),
        completedAt: new Date(t - 5*86400000).toISOString() },
    ];

    const moyamoyaRecords = [
      { id: 'r1', eventText: '上司に強く注意された', emotion: '不安',
        emotionScoreBefore: 8, emotionScoreAfter: 4,
        letterTitle: '上司に強く注意された の整理',
        letterBody: 'いつも私はダメ。',
        createdAt: new Date(t - 1*86400000).toISOString() },
    ];

    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-30*86400000, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: moods,
      moyamoyaRecords,
      goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions,
      ippoPending: [],
      deepDiveSessions: [],
      coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar', calendarMonthOffset: 0, reportGraphTab: 'date' },
      preferences: {}
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);

  // きろくタブ
  await page.click('[data-tab="record"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '01_calendar_current.png'), fullPage: true });

  // 前の月へ
  await page.click('[data-act="cal-prev-month"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02_calendar_prev.png'), fullPage: true });

  // 戻る (next)
  await page.click('[data-act="cal-next-month"]');
  await page.waitForTimeout(200);

  // いっぽフィルタ
  await page.click('[data-act="record-filter"][data-filter="ippo"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '03_filter_ippo.png'), fullPage: true });

  // AI分析レポートタブ
  await page.click('[data-act="record-sub"][data-sub="report"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '04_report_date.png'), fullPage: true });

  // 時間帯別
  await page.click('[data-act="report-graph-tab"][data-graph-tab="hour"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '05_report_hour.png'), fullPage: true });

  // 曜日別
  await page.click('[data-act="report-graph-tab"][data-graph-tab="weekday"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '06_report_weekday.png'), fullPage: true });

  // 思考のクセに遷移
  await page.click('[data-act="open-distortions"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '07_distortions.png'), fullPage: true });

  if (errs.length) {
    console.log('---ERRORS---');
    errs.forEach(e => console.log(e));
  } else {
    console.log('no errors');
  }
  console.log('done. screenshots in', OUT);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
