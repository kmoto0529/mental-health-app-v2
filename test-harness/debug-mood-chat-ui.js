/**
 * AIと話す（mood-chat）UI バグ検証 + 修正後の自動テスト
 *
 * 期待動作（LINE風）:
 *   - 入力欄は viewport の最下端 (env(safe-area-inset-bottom) 込み) にある
 *   - ヘッダーは固定で最上部
 *   - メッセージリストが flex:1 で間を埋める
 *   - キーボードが出た想定（visualViewport を縮小）→ 入力欄は新しい viewport 下端に追従
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'mood-chat-ui');
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

const PORT = 7843;

async function setupSession(page) {
  await page.evaluate(() => {
    const today = new Date();
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: Date.now()-30*86400000, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs: [{
        id: 'mlog1', moodScore: 4,
        comment: 'アプリ開発頑張っているよ',
        categories: ['work'],
        createdAt: today.toISOString()
      }],
      moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ippoSessions: [], ippoPending: [], deepDiveSessions: [], coreBeliefTags: [],
      ui: { currentTab: 'home' }, preferences: {}
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}

async function gotoMoodChat(page) {
  // ホームから「すべて見る」リンクではなく、JSで直接 startMoodChat を呼ぶ
  const ok = await page.evaluate(() => {
    if (typeof startMoodChat !== 'function') return false;
    const log = state.moodLogs[0];
    startMoodChat(log);
    return true;
  });
  if (!ok) throw new Error('startMoodChat not callable');
  await page.waitForTimeout(400);
}

async function measureLayout(page) {
  return await page.evaluate(() => {
    const screen = document.querySelector('.mood-chat-screen');
    const header = document.querySelector('.mood-chat-header');
    const list = document.querySelector('.mood-chat-list');
    const bottom = document.querySelector('.mood-chat-bottom');
    const input = document.querySelector('#moodChatInput');
    const r = el => el ? el.getBoundingClientRect() : null;
    const cs = el => el ? getComputedStyle(el) : null;
    return {
      vp: { w: window.innerWidth, h: window.innerHeight },
      dvh: { h: document.documentElement.clientHeight },
      screen: r(screen) && { ...r(screen).toJSON(), display: cs(screen).display, height: cs(screen).height },
      header: r(header) && r(header).toJSON(),
      list: r(list) && r(list).toJSON(),
      bottom: r(bottom) && { ...r(bottom).toJSON(), display: cs(bottom).display },
      input: r(input) && r(input).toJSON(),
    };
  });
}

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
  await setupSession(page);
  await gotoMoodChat(page);

  await page.screenshot({ path: path.join(OUT, '01_chat_initial.png'), fullPage: false });
  const layout = await measureLayout(page);
  console.log('--- Layout (no keyboard) ---');
  console.log(JSON.stringify(layout, null, 2));

  // 検証: 入力エリアの bottom が viewport.height にほぼ等しい (±20px)
  if (layout.bottom) {
    const gap = layout.vp.h - layout.bottom.bottom;
    console.log(`bottom-of-input-row to viewport-bottom gap: ${gap.toFixed(1)}px (expected near 0)`);
    if (Math.abs(gap) > 30) {
      console.log('❌ BUG: 入力欄が viewport 下端に張り付いていません');
    } else {
      console.log('✅ OK: 入力欄が viewport 下端に正しく配置されています');
    }
  } else {
    console.log('❌ .mood-chat-bottom not found');
  }

  // メッセージを増やして溢れ動作も確認
  await page.evaluate(() => {
    if (!moodChatSession) return;
    for (let i = 0; i < 6; i++) {
      moodChatSession.messages.push({ role: 'user', content: 'てすと' + i, createdAt: new Date().toISOString() });
      moodChatSession.messages.push({ role: 'assistant', content: 'うん、聞かせてね' + i, createdAt: new Date().toISOString() });
    }
    document.getElementById('main').innerHTML = viewMoodChat();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '02_chat_long.png'), fullPage: false });

  // ---- キーボード表示シミュレーション ----
  // 実機ではキーボード出現時に visualViewport.height が縮小し、
  // ブラウザによっては 100dvh も連動して縮む。
  // ここでは viewport を短くしてキーボード相当の状態を再現する。
  console.log('\n--- Keyboard simulation (viewport shrink to 740 → 380) ---');
  await page.setViewportSize({ width: 430, height: 380 }); // 360px キーボード相当
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03_chat_keyboard_open.png'), fullPage: false });
  const layoutKb = await measureLayout(page);
  console.log('vp:', layoutKb.vp, '| screen.height:', layoutKb.screen?.height, '| screen.display:', layoutKb.screen?.display);
  console.log('input.bottom:', layoutKb.input?.bottom, '| viewport.h:', layoutKb.vp.h);
  if (layoutKb.bottom) {
    const gap = layoutKb.vp.h - layoutKb.bottom.bottom;
    console.log(`bottom-of-input-row to viewport-bottom gap: ${gap.toFixed(1)}px`);
    if (Math.abs(gap) > 30) {
      console.log('❌ BUG: キーボード時に入力欄が下端に追従していません');
    } else {
      console.log('✅ OK: キーボード時も入力欄が下端に追従しています');
    }
  }
  // viewport を戻す
  await page.setViewportSize({ width: 430, height: 740 });
  await page.waitForTimeout(200);

  // ---- goal-chat 画面も検証 ----
  console.log('\n--- goal-chat layout ---');
  await page.evaluate(() => {
    if (typeof startGoalChat === 'function') {
      startGoalChat();
      go('goal-chat');
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '04_goal_chat.png'), fullPage: false });
  const goalLayout = await page.evaluate(() => {
    const input = document.querySelector('#goalChatInput');
    const inputRow = document.querySelector('.input-row');
    return {
      vp: { w: window.innerWidth, h: window.innerHeight },
      input: input ? input.getBoundingClientRect().toJSON() : null,
      inputRow: inputRow ? inputRow.getBoundingClientRect().toJSON() : null,
    };
  });
  console.log(JSON.stringify(goalLayout, null, 2));
  if (goalLayout.inputRow) {
    const gap = goalLayout.vp.h - goalLayout.inputRow.bottom;
    console.log(`goal-chat input bottom gap: ${gap.toFixed(1)}px`);
    if (Math.abs(gap) > 30) console.log('⚠️  goal-chat の入力欄も下端に張り付いていません');
    else console.log('✅ goal-chat OK');
  }

  if (errs.length) { console.log('---ERRORS---'); errs.forEach(e=>console.log(e)); }
  console.log('done.');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
