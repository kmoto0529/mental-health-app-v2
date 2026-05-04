/**
 * iOS Safari の挙動を再現:
 *  - 100dvh がキーボードに追従しない
 *  - visualViewport.height が縮んでもCSS高さが追従しない
 * → JS で visualViewport.height を chat-screen に直接書き込む実装が
 *    正しく機能しているか検証する。
 *
 * Playwright の webkit エンジン + visualViewport のモック書き換えで
 * iOS Safari と類似の状況を作る。
 */
const { webkit, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'mood-chat-ios');
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

const PORT = 7844;

async function setupSession(page) {
  await page.evaluate(() => {
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-30*86400000, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: [{
        id: 'mlog1', moodScore: 4,
        comment: '明日はデートなんだ',
        categories: ['relationship'],
        createdAt: new Date().toISOString()
      }],
      moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [], ippoPending: [], deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home' }, preferences: {}
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await webkit.launch();
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, // iPhone 15 Pro 論理サイズ
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ja-JP',
  });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!t.includes('404')) errs.push('console.error: ' + t); } });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await setupSession(page);

  // 1. AIチャット起動
  await page.evaluate(() => {
    if (typeof startMoodChat === 'function') startMoodChat(state.moodLogs[0]);
  });
  await page.waitForTimeout(500);

  // ---- ケース1: 通常時（キーボードなし） ----
  await page.screenshot({ path: path.join(OUT, '01_no_keyboard.png'), fullPage: false });
  let m = await page.evaluate(() => {
    const screen = document.querySelector('.mood-chat-screen.active');
    const bottom = document.querySelector('.mood-chat-bottom');
    return {
      vp: { w: window.innerWidth, h: window.innerHeight },
      vv: window.visualViewport ? { h: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop } : null,
      screenH: screen ? screen.style.height : null,
      screenRect: screen ? screen.getBoundingClientRect().toJSON() : null,
      bottomRect: bottom ? bottom.getBoundingClientRect().toJSON() : null,
    };
  });
  console.log('[1] No keyboard:');
  console.log('  vp.h=', m.vp.h, 'vv.h=', m.vv?.h, 'vv.offsetTop=', m.vv?.offsetTop);
  console.log('  screen.style.height=', m.screenH);
  console.log('  screen.bottom=', m.screenRect?.bottom, 'bottom.bottom=', m.bottomRect?.bottom);
  let gap = m.vp.h - (m.bottomRect?.bottom || 0);
  console.log(`  bottom-row gap to viewport bottom: ${gap.toFixed(1)}px`, Math.abs(gap) <= 5 ? '✅' : '❌');

  // ---- ケース2: iOS Safari の100dvh不具合をシミュレーション ----
  // visualViewport.height を縮めて (キーボード相当) chat-screen が追従するか
  await page.evaluate(() => {
    // visualViewport.height を強制的に縮める（iOS でキーボード出した状態を再現）
    if (!window.__origVV) window.__origVV = window.visualViewport;
    const fakeHeight = window.innerHeight - 360; // 360pxキーボード相当
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: new Proxy(window.__origVV, {
        get(target, prop) {
          if (prop === 'height') return fakeHeight;
          if (prop === 'offsetTop') return 0;
          if (prop === 'addEventListener' || prop === 'removeEventListener') return target[prop].bind(target);
          return target[prop];
        }
      })
    });
    // resize イベントを発火させて fitChatScreenToViewport を呼ばせる
    window.dispatchEvent(new Event('resize'));
    if (window.__origVV) window.__origVV.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_keyboard_open.png'), fullPage: false });

  m = await page.evaluate(() => {
    const screen = document.querySelector('.mood-chat-screen.active');
    const bottom = document.querySelector('.mood-chat-bottom');
    const app = document.getElementById('app');
    return {
      vp: { w: window.innerWidth, h: window.innerHeight },
      vv: window.visualViewport ? { h: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop } : null,
      cssVarChatVh: document.documentElement.style.getPropertyValue('--chat-vh'),
      bodyClass: document.body.className,
      bodyRect: document.body.getBoundingClientRect().toJSON(),
      appRect: app ? app.getBoundingClientRect().toJSON() : null,
      screenComputedH: screen ? getComputedStyle(screen).height : null,
      screenRect: screen ? screen.getBoundingClientRect().toJSON() : null,
      bottomRect: bottom ? bottom.getBoundingClientRect().toJSON() : null,
    };
  });
  console.log('\n[2] Keyboard simulated (visualViewport.height shrunk):');
  console.log(JSON.stringify(m, null, 2));
  // 本来 bottom row は visualViewport の下端 (= vv.height + vv.offsetTop) に張り付くはず
  const expected = (m.vv?.h || m.vp.h) + (m.vv?.offsetTop || 0);
  gap = expected - (m.bottomRect?.bottom || 0);
  console.log(`  bottom-row gap to vv-bottom: ${gap.toFixed(1)}px`, Math.abs(gap) <= 5 ? '✅' : '❌');
  // body / #app が visualViewport にロックされているか
  const bodyGap = expected - (m.bodyRect?.bottom || 0);
  const appGap  = expected - (m.appRect?.bottom || 0);
  console.log(`  body bottom gap:   ${bodyGap.toFixed(1)}px`, Math.abs(bodyGap) <= 5 ? '✅' : '❌');
  console.log(`  #app bottom gap:   ${appGap.toFixed(1)}px`,  Math.abs(appGap)  <= 5 ? '✅' : '❌');
  console.log(`  body has in-chat-mode class:`, m.bodyClass.includes('in-chat-mode') ? '✅' : '❌');
  console.log(`  body has keyboard-open class:`, m.bodyClass.includes('keyboard-open') ? '✅' : '❌');

  // input row 直下の textarea からキーボード(=vv 下端) までの実距離をチェック
  const inputGap = await page.evaluate(() => {
    const ta = document.getElementById('moodChatInput');
    if (!ta || !window.visualViewport) return null;
    const r = ta.getBoundingClientRect();
    const vvBottom = window.visualViewport.height + (window.visualViewport.offsetTop || 0);
    return { textareaBottom: r.bottom, vvBottom, gap: vvBottom - r.bottom };
  });
  console.log(`  textarea→vv bottom gap: ${inputGap?.gap?.toFixed(1)}px`,
    inputGap && inputGap.gap >= 0 && inputGap.gap < 18 ? '✅ (キーボード直上)' : '❌ (浮いてる)');

  // ---- ケース3: チャットを抜けたあと body の position:fixed が解除されるか ----
  await page.evaluate(() => {
    if (typeof endMoodChat === 'function') endMoodChat();
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    bodyClass: document.body.className,
    bodyPosition: getComputedStyle(document.body).position,
  }));
  console.log('\n[3] After endMoodChat:');
  console.log(`  body.position = ${after.bodyPosition}`, after.bodyPosition !== 'fixed' ? '✅' : '❌');
  console.log(`  body.classList has in-chat-mode:`, after.bodyClass.includes('in-chat-mode') ? '❌' : '✅');

  if (errs.length) { console.log('\n---ERRORS---'); errs.forEach(e=>console.log(e)); }
  console.log('\ndone.');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
