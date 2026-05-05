/**
 * v0.9.8 オンボーディング刷新 (5ステップ) のスクショ + 動線検証
 *
 *   1. ようこそ画面 → はじめる
 *   2. 安心して使うために → 詳しく見る (モーダル) → 同意して進む
 *   3. ニックネームを教えてね → 入力 → これで進む
 *   4. あなたについて教えてね → 立場/年代/性別/気になること選択 → これでOK
 *   5. もやの森の使い方ガイド → はじめてみる
 *   → ホーム
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'onboarding-v2');
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

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!t.includes('404')) errs.push('console.error: ' + t); } });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // 完全リセット
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  async function snap(name, opts = {}) {
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: opts.fullPage !== false });
  }
  async function curScreen() {
    return await page.evaluate(() => {
      if (typeof window.currentScreen === 'string') return window.currentScreen;
      // home は専用クラス
      if (document.querySelector('.home-screen')) return 'home';
      const screen = document.querySelector('.screen.active, .ob-welcome-screen');
      if (!screen) return null;
      if (screen.classList.contains('ob-welcome-screen')) return 'welcome';
      const t = screen.textContent || '';
      if (t.includes('安心してご利用いただくために')) return 'consent';
      if (t.includes('ニックネームを教えてね')) return 'nickname';
      if (t.includes('あなたについて教えてね')) return 'profile';
      if (t.includes('もやの森の使い方ガイド')) return 'guide';
      return 'unknown';
    });
  }
  async function dumpDraft() {
    return await page.evaluate(() => {
      return typeof profileDraft !== 'undefined' ? profileDraft : null;
    });
  }

  // ---- Step 1: Welcome ----
  await snap('01_welcome');
  let s = await curScreen();
  console.log(`[1] welcome screen=${s}`, s === 'welcome' ? '✅' : '❌');

  await page.click('[data-act="welcome-next"]');
  await page.waitForTimeout(200);

  // ---- Step 2: Consent ----
  await snap('02_consent');
  s = await curScreen();
  console.log(`[2] consent screen=${s}`, s === 'consent' ? '✅' : '❌');

  // 詳しく見るモーダルを開く
  await page.click('[data-act="open-consent-details"]');
  await page.waitForTimeout(200);
  await snap('02b_consent_details', { fullPage: false });
  // モーダルの cards 領域を一番下までスクロールして再撮影 (安全カードの確認)
  await page.evaluate(() => {
    const c = document.querySelector('.modal-card-tall .ob-details-cards');
    if (c) c.scrollTop = c.scrollHeight;
  });
  await page.waitForTimeout(150);
  await snap('02c_consent_details_scrolled', { fullPage: false });
  const modalOpen = await page.evaluate(() => document.getElementById('modal').classList.contains('open'));
  console.log(`[2b] details modal open:`, modalOpen ? '✅' : '❌');
  await page.click('[data-act="close-modal"]');
  await page.waitForTimeout(150);

  await page.click('[data-act="consent-agree"]');
  await page.waitForTimeout(200);

  // ---- Step 3: Nickname ----
  await snap('03_nickname');
  s = await curScreen();
  console.log(`[3] nickname screen=${s}`, s === 'nickname' ? '✅' : '❌');

  await page.fill('#nicknameInput', 'もと');
  await page.click('[data-act="nickname-save"]');
  await page.waitForTimeout(200);

  // ---- Step 4: Profile ----
  await snap('04_profile_empty');
  s = await curScreen();
  console.log(`[4] profile screen=${s}`, s === 'profile' ? '✅' : '❌');

  // 必須未入力時は save ボタンが disabled (Playwright で disabled をチェック)
  const saveDisabledEmpty = await page.evaluate(() => {
    const btn = document.querySelector('[data-act="profile-save"]');
    return btn ? btn.disabled : null;
  });
  console.log(`[4b] save button disabled when profile empty:`, saveDisabledEmpty ? '✅' : '❌');

  // 立場 = 学生
  await page.click('[data-act="profile-pick"][data-type="occupation"][data-id="student"]');
  await page.waitForTimeout(150);
  console.log('  draft after 1 click:', await dumpDraft());
  // 年代 = 20s
  await page.click('[data-act="profile-pick"][data-type="ageRange"][data-id="20s"]');
  await page.waitForTimeout(150);
  console.log('  draft after 2 clicks:', await dumpDraft());
  // 性別 = female
  await page.click('[data-act="profile-pick"][data-type="gender"][data-id="female"]');
  await page.waitForTimeout(150);
  console.log('  draft after 3 clicks:', await dumpDraft());
  // 気になること: work + relationship + future (複数選択)
  await page.click('[data-act="profile-pick"][data-type="interests"][data-id="work"]');
  await page.waitForTimeout(80);
  await page.click('[data-act="profile-pick"][data-type="interests"][data-id="relationship"]');
  await page.waitForTimeout(80);
  await page.click('[data-act="profile-pick"][data-type="interests"][data-id="future"]');
  await page.waitForTimeout(100);
  await snap('04c_profile_filled');

  await page.click('[data-act="profile-save"]');
  await page.waitForTimeout(200);

  // ---- Step 5: Guide ----
  await snap('05_guide');
  s = await curScreen();
  console.log(`[5] guide screen=${s}`, s === 'guide' ? '✅' : '❌');

  await page.click('[data-act="guide-done"]');
  await page.waitForTimeout(300);

  // ---- Home 到達 ----
  await snap('06_home');
  s = await curScreen();
  console.log(`[6] home reached:`, s === 'home' ? '✅' : '❌');

  // 保存 state を確認
  const savedState = await page.evaluate(() => {
    const raw = localStorage.getItem('aside_v3_state');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('\n--- 保存された state ---');
  console.log('  consent.given:', savedState?.consent?.given ? '✅' : '❌');
  console.log('  user.nickname:', savedState?.user?.nickname || '(空)');
  console.log('  user.occupation:', savedState?.user?.occupation);
  console.log('  user.ageRange:', savedState?.user?.ageRange);
  console.log('  user.gender:', savedState?.user?.gender);
  console.log('  user.interests:', JSON.stringify(savedState?.user?.interests));
  console.log('  user.profileDone:', savedState?.user?.profileDone ? '✅' : '❌');
  console.log('  guidedShown:', savedState?.guidedShown ? '✅' : '❌');

  // ---- リロード時に home に直行する? ----
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
  s = await curScreen();
  console.log(`\n[reload] after onboarding completion → ${s}`, s === 'home' ? '✅' : '❌');

  if (errs.length) { console.log('\n---ERRORS---'); errs.forEach(e=>console.log(e)); }
  else console.log('\nno errors');

  console.log(`\nスクショ: ${OUT}`);
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
