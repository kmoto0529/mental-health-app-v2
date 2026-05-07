/**
 * ホーム画面「最近のきろく」+ 「すべて見る」遷移確認
 *  - mood / moyamoya のサンプルデータを投入
 *  - ホームの recent セクションが kr-rec-card で表示されるか
 *  - 「すべて見る」押下できろくタブの「最近のきろく」位置にスクロールするか
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'home-recent');
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

const PORT = 7849;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: now },
      user: { nickname: 'もと', createdAt: now-14*86400000, daysUsed: 14 },
      initialDone: true,
      moodLogs: [
        { id: 'm1', moodScore: 2, comment: '電車で疲れた', createdAt: new Date(now - 2*3600*1000).toISOString() },
        { id: 'm2', moodScore: 4, comment: '会議が終わってホッとした', createdAt: new Date(now - 26*3600*1000).toISOString() }
      ],
      moyamoyaRecords: [
        { id: 'r1', eventText: '上司に強く注意された', emotion: '不安', emotionScoreBefore: 8, alternativeView: '今回はうまくいかなかったけれど…', emotionScoreAfter: 4, letterTitle: '今日のあなたへ', createdAt: new Date(now - 5*3600*1000).toISOString() }
      ],
      goals: [], policies: [], actions: [], actionLogs: [],
      aiChats: [],
      ippoSessions: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: null }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  await page.evaluate(() => { try { go('home'); } catch (e) {} });
  await page.waitForSelector('.recent-header', { timeout: 5000 });
  await page.waitForTimeout(200);

  // ヘッダー文言と表示件数を計測
  const homeInfo = await page.evaluate(() => {
    const headerSpan = document.querySelector('.recent-header .recent-title span');
    const cards = document.querySelectorAll('.kr-rec-card');
    const meta = Array.from(cards).map(c => {
      const m = c.querySelector('.kr-rec-meta');
      return m ? m.textContent.trim() : '';
    });
    return {
      headerText: headerSpan ? headerSpan.textContent.trim() : '(none)',
      cardCount: cards.length,
      cardMeta: meta
    };
  });
  console.log('--- HOME ---');
  console.log(JSON.stringify(homeInfo, null, 2));

  await page.screenshot({ path: path.join(OUT, '01-home-fullpage.png'), fullPage: true });
  // recent セクションだけクロップ
  const headerBox = await page.locator('.recent-header').boundingBox();
  if (headerBox) {
    await page.screenshot({ path: path.join(OUT, '02-home-recent-crop.png'), clip: { x: 0, y: headerBox.y - 10, width: 430, height: Math.min(700, 932 - headerBox.y) } });
  }

  // 「すべて見る」クリック
  await page.click('[data-act="see-all-records"]');
  await page.waitForTimeout(600); // smooth scroll 完了待ち

  const recordInfo = await page.evaluate(() => {
    const headers = document.querySelectorAll('h3.section-title');
    const target = Array.from(headers).find(h => h.textContent.includes('最近のきろく'));
    return {
      currentScreen: typeof currentScreen !== 'undefined' ? currentScreen : null,
      recordSubtab: state && state.ui ? state.ui.recordSubtab : null,
      kirokuHeaderFound: !!target,
      kirokuHeaderTopAfterScroll: target ? Math.round(target.getBoundingClientRect().top) : null,
      scrollY: Math.round(window.scrollY)
    };
  });
  console.log('--- AFTER "すべて見る" ---');
  console.log(JSON.stringify(recordInfo, null, 2));

  await page.screenshot({ path: path.join(OUT, '03-record-after-scroll.png'), fullPage: true });
  // viewport だけ
  await page.screenshot({ path: path.join(OUT, '04-record-viewport.png') });

  await browser.close();
  server.close();
  console.log('--- saved ---');
  ['01-home-fullpage.png','02-home-recent-crop.png','03-record-after-scroll.png','04-record-viewport.png'].forEach(f => console.log(path.join(OUT, f)));
})().catch(e => { console.error(e); process.exit(1); });
