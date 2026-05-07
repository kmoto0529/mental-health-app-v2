/**
 * v0.9.5 全機能検証
 *  - すぷらん画像が初回からPNG表示される（SVGフラッシュなし）
 *  - mood chat: ひとこと引用 + クイックリプライ + flexレイアウト
 *  - 過去履歴クリック → 会話/レター閲覧
 *  - 1ヶ月超レコードのクリーンアップ
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'v095');
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

const PORT = 7836;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro Max'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  // テストデータ仕込み: 古い記録（2ヶ月前）+ 新しい記録 + AI会話付き気分ログ
  await page.evaluate(() => {
    const now = Date.now();
    const day = 86400000;
    const oldDate = new Date(now - 60 * day).toISOString();   // 2ヶ月前 → cleanup対象
    const recentDate = new Date(now - 2 * day).toISOString(); // 2日前 → 残る
    const moodLogs = [
      { id: 'mlog-old', moodScore: 2, comment: '古いログ', categories: ['work'], createdAt: oldDate },
      { id: 'mlog1', moodScore: 2, comment: '今日は仕事で失敗してしまった。あの会議の発言が頭から離れない。', categories: ['work'], createdAt: recentDate },
    ];
    const aiChats = [
      {
        id: 'chat1', sourceType: 'mood_log', sourceId: 'mlog1',
        messages: [
          { role: 'assistant', content: '「仕事で失敗してしまった」って書いてくれたんだね。\nそのことを、もう少し聞かせてもらえる？', createdAt: recentDate },
          { role: 'user',      content: '会議の発言で頭が真っ白になった', createdAt: recentDate },
          { role: 'assistant', content: 'そっか、緊張する場面で言葉が出ないって、すごく辛いよね。\n他の場面ではどんな感じ？', createdAt: recentDate },
        ],
        summary: '',
        createdAt: recentDate,
      },
      {
        id: 'chat-old', sourceType: 'mood_log', sourceId: 'mlog-old',
        messages: [{ role: 'assistant', content: '古い会話', createdAt: oldDate }],
        summary: '',
        createdAt: oldDate,
      },
    ];
    localStorage.setItem('aside_v3_state', JSON.stringify({
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'もと', createdAt: now-30*day, daysUsed: 30, direction: 'lighter' },
      initialDone: true,
      moodLogs,
      moyamoyaRecords: [],
      goals: [], policies: [], actions: [], actionLogs: [],
      aiChats,
      ippoSessions: [],
      deepDiveSessions: [],
      coreBeliefTags: [],
      lastCleanup: 0,  // 強制的にクリーンアップ実行
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);

  // 1: ホーム — すぷらん画像確認（SVGではなくIMGを期待）
  await page.screenshot({ path: path.join(OUT, '01_home_suplan.png'), fullPage: false });
  const homeImg = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[alt="すぷらん"]');
    return Array.from(imgs).map(i => ({ src: i.src.split('/').slice(-2).join('/'), naturalWidth: i.naturalWidth, complete: i.complete }));
  });
  console.log('[home suplan IMGs]', JSON.stringify(homeImg));

  // 2: クリーンアップ確認 — 2ヶ月前の moodLogs/aiChats が消えているか
  const afterCleanup = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('aside_v3_state') || '{}');
    return {
      moodLogs: (s.moodLogs || []).map(m => m.id),
      aiChats: (s.aiChats || []).map(c => c.id),
    };
  });
  console.log('[after cleanup]', JSON.stringify(afterCleanup));

  // 3: 気分入力 → 保存してAIと話す（ひとこと引用 + クイックリプライ確認）
  await page.click('[data-act="mood-input-start"]').catch(() => {});
  await page.waitForTimeout(200);
  // ホーム再描画後の気分入力入口を探す
  const tryStart = async (selectors) => {
    for (const s of selectors) {
      const el = await page.$(s);
      if (el) { await el.click(); return true; }
    }
    return false;
  };
  // mood-full への遷移を試行
  await page.evaluate(() => { if (typeof go === 'function') go('mood-full'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_mood_full.png'), fullPage: false });

  // 既存の mlog1 を使ってチャット直接起動
  await page.evaluate(() => {
    const log = state.moodLogs.find(l => l.id === 'mlog1');
    if (log && typeof startMoodChat === 'function') startMoodChat(log);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '03_mood_chat_with_quote.png'), fullPage: false });

  // クイックリプライがあるか確認
  const replies = await page.$$('[data-act="mood-quick-reply"]');
  console.log('[quick replies count]', replies.length);

  // クイックリプライをタップ
  if (replies.length > 0) {
    await replies[0].click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '04_after_quick_reply.png'), fullPage: false });
  }

  // 4: 過去履歴 — 気分ログをタップして会話履歴閲覧
  await page.evaluate(() => { if (typeof go === 'function') go('record'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '05_kiroku_with_chat_link.png'), fullPage: true });

  // mood log card をタップ
  const chatBtn = await page.$('[data-act="kiroku-chat"]');
  if (chatBtn) {
    await chatBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '06_chat_history.png'), fullPage: true });
  } else {
    console.log('[no chat link found]');
  }

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
