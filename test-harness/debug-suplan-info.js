/**
 * ホーム右上すぷらん→紹介モーダル 検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'suplan-info');
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

const PORT = 7842;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!t.includes('404')) errs.push('console.error: ' + t); } });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-30*86400000, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: [], moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [], ippoPending: [], deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home' }, preferences: {}
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '01_home.png'), fullPage: true });

  // Click suplan
  await page.click('[data-act="open-suplan-info"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '02_modal_top.png'), fullPage: true });

  // 新仕様: × ボタンは modal-card の外側 (modal-bg の直接の子) に居る
  const closeMeta = await page.evaluate(() => {
    const close = document.querySelector('.suplan-info-close-outside');
    const card = document.querySelector('.suplan-info-modal-card');
    if (!close || !card) return null;
    return {
      parentId: close.parentElement?.id,
      parentIsCard: card.contains(close),
      rect: close.getBoundingClientRect().toJSON(),
      heroTitleSize: getComputedStyle(document.querySelector('.suplan-info-hero-title')).fontSize,
      h3Size: getComputedStyle(document.querySelector('.suplan-info-h3')).fontSize,
      bodySize: getComputedStyle(document.querySelector('.suplan-info-text')).fontSize,
    };
  });
  console.log('[close button]', closeMeta);
  console.log(' parentId is modal:', closeMeta?.parentId === 'modal' ? '✅' : '❌');
  console.log(' close NOT inside card:', !closeMeta?.parentIsCard ? '✅' : '❌');
  console.log(' fonts:', closeMeta?.heroTitleSize, closeMeta?.h3Size, closeMeta?.bodySize);

  // Scroll modal-card to bottom and confirm × position is unchanged (fixed)
  await page.evaluate(() => {
    const card = document.querySelector('.suplan-info-modal-card');
    if (card) card.scrollTop = card.scrollHeight;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02b_modal_bottom.png'), fullPage: true });
  const closeAfterScroll = await page.evaluate(() => {
    const close = document.querySelector('.suplan-info-close-outside');
    return close ? close.getBoundingClientRect().toJSON() : null;
  });
  const dy = Math.abs((closeAfterScroll?.top || 0) - (closeMeta?.rect?.top || 0));
  console.log(`[scroll bottom] × top moved by ${dy.toFixed(1)}px`, dy < 1 ? '✅ fixed' : '❌ moved with scroll');

  // Scroll midway
  await page.evaluate(() => {
    const card = document.querySelector('.suplan-info-modal-card');
    if (card) card.scrollTop = card.scrollHeight / 2;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02c_modal_mid.png'), fullPage: true });

  // 旧 × (.suplan-info-close) はもう存在しないこと
  const oldClose = await page.$('.suplan-info-close');
  console.log('[legacy close] removed:', oldClose === null ? '✅' : '❌');

  // 免責 (※ で始まる disclaimer) が無いこと
  const hasDisclaimer = await page.evaluate(() => {
    const card = document.querySelector('.suplan-info-modal-card');
    if (!card) return false;
    const txt = card.textContent || '';
    return /※|医療行為|診断を目的|気づくお手伝い|心の変化/.test(txt);
  });
  console.log('[disclaimer] absent:', !hasDisclaimer ? '✅' : '❌');

  // Click outside × to close
  await page.click('.suplan-info-close-outside');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '03_modal_closed.png'), fullPage: true });
  const closedState = await page.evaluate(() => ({
    modalOpen: document.getElementById('modal').classList.contains('open'),
    leftoverOutside: !!document.querySelector('.suplan-info-close-outside'),
  }));
  console.log('[close click]', closedState,
    !closedState.modalOpen ? '✅ closed' : '❌',
    !closedState.leftoverOutside ? '✅ × cleaned up' : '❌ × leaked');

  if (errs.length) { console.log('---ERRORS---'); errs.forEach(e=>console.log(e)); }
  else console.log('no errors');
  console.log('done. screenshots in', OUT);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
