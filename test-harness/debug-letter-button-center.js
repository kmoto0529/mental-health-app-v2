/**
 * もやもや整理レター 保存ボタンの中央配置確認
 * - フローを進めてレター画面まで到達
 * - letter-bottombar をスクショ
 * - ボタンの bounding box から中央度を数値検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'letter-button-center');
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

const PORT = 7847;

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
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: null }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // onboarding をスキップして home に直接遷移
  await page.evaluate(() => { try { go('home'); } catch (e) { console.warn(e); } });
  await page.waitForSelector('[data-act="moyamoya-start"]', { timeout: 5000 });

  // フローを進めてレターまで
  await page.click('[data-act="moyamoya-start"]');
  await page.fill('#moyaInput', '上司に強く注意された');
  await page.click('[data-act="moya-step1-next"]');
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.click('[data-act="moya-step2-next"]');
  await page.click('[data-act="moya-set-score"][data-score="8"]');
  await page.click('[data-act="moya-step3-next"]');
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 8000 });
  await page.click('[data-act="moya-step4-pick"][data-index="0"]');
  await page.click('[data-act="moya-step4-next"]');
  await page.click('[data-act="moya-set-score-after"][data-score="3"]');
  await page.click('[data-act="moya-step5-next"]');
  await page.waitForSelector('.letter-bottombar', { timeout: 5000 });
  await page.waitForTimeout(300);

  // ボタンの bounding box / viewport 中央との差を計測
  const result = await page.evaluate(() => {
    const bar = document.querySelector('.letter-bottombar');
    const actions = document.querySelector('.letter-actions');
    const btn = document.querySelector('.letter-bottombar .letter-action-btn.primary');
    if (!bar || !actions || !btn) return { error: 'elements not found' };
    const vw = window.innerWidth;
    const barBox = bar.getBoundingClientRect();
    const actionsBox = actions.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    const btnCenter = btnBox.left + btnBox.width / 2;
    const viewportCenter = vw / 2;
    const offsetFromCenter = btnCenter - viewportCenter;
    return {
      vw, viewportCenter,
      bar: { left: barBox.left, right: barBox.right, width: barBox.width },
      actions: { left: actionsBox.left, right: actionsBox.right, width: actionsBox.width, display: getComputedStyle(actions).display, gridTemplateColumns: getComputedStyle(actions).gridTemplateColumns, justifyContent: getComputedStyle(actions).justifyContent },
      btn: { left: btnBox.left, right: btnBox.right, width: btnBox.width, center: btnCenter },
      offsetFromCenter,
      verdict: Math.abs(offsetFromCenter) < 5 ? '✅ 中央' : Math.abs(offsetFromCenter) < 30 ? '🟡 ほぼ中央' : '❌ ずれあり'
    };
  });
  console.log(JSON.stringify(result, null, 2));

  // 全画面スクショ
  await page.screenshot({ path: path.join(OUT, '01-letter-fullpage.png'), fullPage: true });
  // bottombar 周辺のクロップスクショ
  const barBox = await page.locator('.letter-bottombar').boundingBox();
  if (barBox) {
    await page.screenshot({ path: path.join(OUT, '02-bottombar-crop.png'), clip: { x: 0, y: Math.max(0, barBox.y - 20), width: result.vw, height: barBox.height + 40 } });
  }

  await browser.close();
  server.close();
  console.log('--- saved ---');
  console.log(path.join(OUT, '01-letter-fullpage.png'));
  console.log(path.join(OUT, '02-bottombar-crop.png'));
})().catch(e => { console.error(e); process.exit(1); });
