/**
 * まめこキャラクターの統合確認
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'mameko');
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

(async () => {
  await new Promise(r => server.listen(7795, r));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  // === Welcome画面 ===
  await page.goto('http://127.0.0.1:7795/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '01_welcome.png') });

  // === 各成長段階のホーム ===
  const stages = [
    { name: 'tane',   moodN:0,  moyaN:0, actionN:0 },
    { name: 'futaba', moodN:3,  moyaN:0, actionN:0 },
    { name: 'nae',    moodN:5,  moyaN:2, actionN:0 },
    { name: 'hana',   moodN:10, moyaN:4, actionN:2 },
    { name: 'ookii',  moodN:15, moyaN:8, actionN:8 },
  ];

  for (const s of stages) {
    await page.goto('http://127.0.0.1:7795/', { waitUntil: 'networkidle' });
    await page.evaluate((s) => {
      const now = Date.now();
      const moods = [];
      for (let i = 0; i < s.moodN; i++) moods.push({ id: 'm'+i, moodScore: 3, moodLabel: 'ふつう', categories: ['self'], comment: '', createdAt: new Date(now - i*86400000).toISOString() });
      const moyas = [];
      for (let i = 0; i < s.moyaN; i++) moyas.push({ id: 'my'+i, eventText: '', emotion: '', emotionScoreBefore: 50, emotionScoreAfter: 30, alternativeView:'', letterTitle:'', letterBody:'', createdAt: new Date(now - i*86400000).toISOString() });
      const actions = [{ id:'a1', goalId:'g1', policyId:'p1', actionText:'test', status:'inactive', createdAt:new Date(now).toISOString() }];
      const actionLogs = [];
      for (let i = 0; i < s.actionN; i++) actionLogs.push({ id:'al'+i, actionId:'a1', rating:4, comment:'', createdAt: new Date(now - i*86400000).toISOString() });
      localStorage.setItem('aside_v3_state', JSON.stringify({
        consent: { given:true, version:'v1', at:now },
        user: { nickname:'もと', createdAt:now-14*86400000, daysUsed:14 },
        initialDone: true,
        moodLogs: moods, moyamoyaRecords: moyas, goals: [], policies: [], actions, actionLogs, aiChats: [],
        ui: { currentTab:'home', recordSubtab:'calendar' },
        preferences: { themeOverride:'light' }
      }));
    }, s);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `02_home_stage_${s.name}.png`) });
  }

  // === 設定モーダル ===
  await page.click('.navbtn[data-tab="record"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="open-settings"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '03_settings_modal.png') });

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
