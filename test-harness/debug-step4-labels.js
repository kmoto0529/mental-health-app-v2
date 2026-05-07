/**
 * もやもや整理 step4 別の見方カードのラベル表示確認
 * - フローを step4 まで進める
 * - 各カードのラベル表示・配置をスクショ
 * - ラベル一覧を抽出して JSON で出力
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'step4-labels');
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

const PORT = 7848;

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

  await page.evaluate(() => { try { go('home'); } catch (e) {} });
  await page.waitForSelector('[data-act="moyamoya-start"]', { timeout: 5000 });

  // step4 まで進める
  await page.click('[data-act="moyamoya-start"]');
  await page.fill('#moyaInput', '上司に強く注意された');
  await page.click('[data-act="moya-step1-next"]');
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.click('[data-act="moya-step2-next"]');
  await page.click('[data-act="moya-set-score"][data-score="8"]');
  await page.click('[data-act="moya-step3-next"]');
  // step4 はテンプレフォールバック（API key なし）が動くまで少し待つ
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 8000 });
  await page.waitForTimeout(300);

  // ラベル一覧抽出
  const cards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.moya-altview-card')).map(card => {
      const num = card.querySelector('.moya-altview-num');
      const label = card.querySelector('.moya-altview-label');
      const text = card.querySelector('.moya-altview-text');
      const labelBox = label ? label.getBoundingClientRect() : null;
      return {
        num: num ? num.textContent.trim() : '',
        label: label ? label.textContent.trim() : '(no label)',
        text: text ? text.textContent.slice(0, 50) + (text.textContent.length > 50 ? '…' : '') : '',
        labelHasBackground: label ? !!getComputedStyle(label).backgroundColor && getComputedStyle(label).backgroundColor !== 'rgba(0, 0, 0, 0)' : false,
        labelBoxWidth: labelBox ? Math.round(labelBox.width) : null,
        labelBoxHeight: labelBox ? Math.round(labelBox.height) : null
      };
    });
  });
  console.log(JSON.stringify(cards, null, 2));

  // 全画面 + step4 だけクロップ
  await page.screenshot({ path: path.join(OUT, '01-step4-fullpage.png'), fullPage: true });
  // 1枚目のカードクロップ（拡大確認用）
  const cardBox = await page.locator('.moya-altview-card').first().boundingBox();
  if (cardBox) {
    await page.screenshot({ path: path.join(OUT, '02-card1-crop.png'), clip: { x: 0, y: cardBox.y - 4, width: 430, height: cardBox.height + 8 } });
  }
  // ラベル領域だけのクロップ（複数カードのラベル並びを確認）
  const allCards = await page.locator('.moya-altview-card').all();
  if (allCards.length >= 3) {
    const first = await allCards[0].boundingBox();
    const third = await allCards[2].boundingBox();
    if (first && third) {
      await page.screenshot({ path: path.join(OUT, '03-cards-1to3.png'), clip: { x: 0, y: first.y - 4, width: 430, height: (third.y + third.height) - first.y + 8 } });
    }
  }

  await browser.close();
  server.close();
  console.log('--- saved ---');
  console.log(path.join(OUT, '01-step4-fullpage.png'));
  console.log(path.join(OUT, '02-card1-crop.png'));
  console.log(path.join(OUT, '03-cards-1to3.png'));
})().catch(e => { console.error(e); process.exit(1); });
