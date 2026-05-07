/**
 * AIプロンプト管理モーダル + まめこフォールバック検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const ROOT = path.join(__dirname, '..', 'aside-prototype');
const OUT = path.join(__dirname, '..', 'test-results', 'ai-prompts');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.md':'text/markdown' };
const server = http.createServer((req, res) => {
  let p = url.parse(req.url).pathname;
  if (p === '/') p = '/index.html';
  // 一部のリクエストは意図的に 404 にして mameko フォールバックを確認
  if (req.headers['x-block-png'] === '1' && p.endsWith('.png')) {
    res.statusCode = 404; res.end('blocked'); return;
  }
  const file = path.join(ROOT, p);
  if (!fs.existsSync(file)) { res.statusCode = 404; res.end('404'); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

const PORT = 7832;

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
      preferences: { themeOverride: 'dark' }
    }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // 設定モーダルを開く（きろくタブ → 設定アイコン）
  // 直接 handleAction を呼ぶ
  await page.evaluate(() => {
    if (typeof handleAction === 'function') handleAction('open-settings');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '01_settings_modal.png'), fullPage: false });

  // 「プロンプト一覧を見る」をクリック
  await page.click('[data-act="open-ai-prompts"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02_ai_prompts_list.png'), fullPage: false });

  // 1個目を展開
  const expandBtns = await page.$$('[data-act="ai-prompt-expand"]');
  if (expandBtns[0]) {
    await expandBtns[0].click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '03_prompt_expanded_mood.png'), fullPage: true });
  }

  // 2個目を展開（CBT）
  await page.click('[data-act="ai-prompt-expand"][data-prompt-id="cbt_alternative_views"]').catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04_prompt_expanded_cbt.png'), fullPage: true });

  // コピーボタンの動作確認（ログ出力）
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'warning') console.log(`[browser ${msg.type()}]`, msg.text());
  });

  // モーダルを閉じてレターのまめこフォールバック検証
  await page.click('[data-act="close-modal"]').catch(() => {});
  await page.waitForTimeout(200);

  // もやもや整理フローを進めてレターまで
  await page.click('[data-act="moyamoya-start"]');
  await page.fill('#moyaInput', '上司に強く注意された');
  await page.click('[data-act="moya-step1-next"]');
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.click('[data-act="moya-step2-next"]');
  await page.click('[data-act="moya-set-score"][data-score="8"]');
  await page.click('[data-act="moya-step3-next"]');
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 5000 });
  await page.click('[data-act="moya-step4-pick"][data-index="1"]');
  await page.click('[data-act="moya-step4-next"]');
  await page.click('[data-act="moya-set-score-after"][data-score="3"]');
  await page.click('[data-act="moya-step5-next"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '05_letter_with_mameko.png'), fullPage: true });

  // まめこ画像が表示されているかチェック
  const mamekoStatus = await page.evaluate(() => {
    const container = document.querySelector('.letter-mameko-img');
    if (!container) return { ok: false, reason: 'container not found' };
    const img = container.querySelector('img');
    const svg = container.querySelector('svg');
    if (img) return { ok: true, type: 'img', src: img.getAttribute('src'), naturalWidth: img.naturalWidth };
    if (svg) return { ok: true, type: 'svg' };
    return { ok: false, reason: 'no img or svg in container' };
  });
  console.log('[mameko]', JSON.stringify(mamekoStatus));

  // フォールバック挙動確認: PNGがブロックされた状態でリロード→レター再到達
  console.log('--- testing PNG block fallback ---');
  await ctx.setExtraHTTPHeaders({ 'x-block-png': '1' });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  // 短縮: state を直接書き換えてレター表示
  await page.evaluate(() => {
    // すでに consent済の state はそのまま
    // もやもや実行
    document.querySelector('[data-act="moyamoya-start"]')?.click();
  });
  await page.waitForTimeout(200);
  await page.fill('#moyaInput', 'テスト');
  await page.click('[data-act="moya-step1-next"]');
  await page.click('[data-act="moya-step2-pick"][data-emotion="不安"]');
  await page.click('[data-act="moya-step2-next"]');
  await page.click('[data-act="moya-set-score"][data-score="6"]');
  await page.click('[data-act="moya-step3-next"]');
  await page.waitForSelector('[data-act="moya-step4-pick"]', { timeout: 5000 });
  await page.click('[data-act="moya-step4-pick"][data-index="0"]');
  await page.click('[data-act="moya-step4-next"]');
  await page.click('[data-act="moya-set-score-after"][data-score="3"]');
  await page.click('[data-act="moya-step5-next"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '06_letter_png_blocked.png'), fullPage: true });

  const fbStatus = await page.evaluate(() => {
    const container = document.querySelector('.letter-mameko-img');
    if (!container) return { ok: false, reason: 'container not found' };
    const img = container.querySelector('img');
    const svg = container.querySelector('svg');
    if (svg) return { ok: true, type: 'svg (fallback)' };
    if (img) return { ok: img.naturalWidth > 0, type: 'img', naturalWidth: img.naturalWidth };
    return { ok: false, reason: 'empty container' };
  });
  console.log('[mameko-png-blocked]', JSON.stringify(fbStatus));

  console.log('done');
  await browser.close();
  server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
