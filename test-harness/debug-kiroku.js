/**
 * きろくタブ v0.9.3 全面刷新検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'kiroku');
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

const PORT = 7835;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // 認知の歪み検出のために、いくつかのもやもや記録 + ippo 記録を仕込む
  await page.evaluate(() => {
    const today = new Date();
    const moyamoyaRecords = [
      {
        id: 'r1',
        eventText: '上司に強く注意された',
        emotion: '不安',
        emotionScoreBefore: 8,
        emotionScoreAfter: 4,
        alternativeView: '今回はうまくいかなかったけれど、あなたの全部が否定されたわけではない',
        letterTitle: '上司に強く注意された の整理',
        letterBody: 'いつも私はダメ。どうせ嫌われている。絶対に上手くいかない。全部私のせい。',
        createdAt: new Date(today.getTime() - 1*86400000).toISOString(),
      },
      {
        id: 'r2',
        eventText: '友達に返信が遅れた',
        emotion: '罪悪感',
        emotionScoreBefore: 7,
        emotionScoreAfter: 3,
        alternativeView: '相手が怒っているとは限らない',
        letterTitle: '友達に返信が遅れた の整理',
        letterBody: 'もう嫌われた。冷たかった。私のせい。完璧にしなきゃ。',
        createdAt: new Date(today.getTime() - 4*86400000).toISOString(),
      },
      {
        id: 'r3',
        eventText: '会議で発言できなかった',
        emotion: 'がっかり',
        emotionScoreBefore: 6,
        emotionScoreAfter: 4,
        alternativeView: '次に活かせるように小さく試してみよう',
        letterTitle: '会議で発言できなかった の整理',
        letterBody: 'いつも私は無能。どうせ価値ない。完璧じゃないと意味ない。',
        createdAt: new Date(today.getTime() - 8*86400000).toISOString(),
      },
      {
        id: 'r4',
        eventText: '家族と喧嘩した',
        emotion: '怒り',
        emotionScoreBefore: 9,
        emotionScoreAfter: 5,
        alternativeView: '一時的な感情のすれ違いかも',
        letterTitle: '家族と喧嘩した の整理',
        letterBody: 'いつも怒鳴られる。どうせ理解してくれない。',
        createdAt: new Date(today.getTime() - 45*86400000).toISOString(),
      },
    ];
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-30*86400000, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: [
        { id: 'm1', moodScore: 2, comment: '', categories: [], createdAt: new Date(today.getTime() - 1*86400000).toISOString() },
        { id: 'm2', moodScore: 3, comment: '', categories: [], createdAt: new Date(today.getTime() - 2*86400000).toISOString() },
        { id: 'm3', moodScore: 1, comment: '', categories: [], createdAt: new Date(today.getTime() - 3*86400000).toISOString() },
      ],
      moyamoyaRecords,
      goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [],
      deepDiveSessions: [],
      coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // きろくタブへ
  await page.click('[data-tab="record"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_record_calendar.png'), fullPage: true });

  // フィルタチップ
  await page.click('[data-act="record-filter"][data-filter="moyamoya"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02_record_filter_moyamoya.png'), fullPage: true });

  // もやもや記録の詳細を開く
  await page.click('[data-act="record-filter"][data-filter="all"]');
  await page.waitForTimeout(150);
  await page.click('[data-act="kiroku-detail"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_kiroku_detail.png'), fullPage: true });

  // 思考のクセTOP3
  await page.click('[data-act="open-distortions"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_distortions_top3.png'), fullPage: true });

  // 推移
  await page.click('[data-act="open-trend"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '05_trend.png'), fullPage: true });

  // レーダー
  await page.click('[data-act="open-radar"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06_radar.png'), fullPage: true });

  // AI分析プレビュー（UI shell - 実装は後日タスク）
  await page.evaluate(() => { if (typeof go === 'function') go('kiroku-distortions'); });
  await page.waitForTimeout(300);
  await page.click('[data-act="open-ai-analysis"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07_ai_analysis_preview.png'), fullPage: true });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
