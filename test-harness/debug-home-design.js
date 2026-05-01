/**
 * ホーム画面が画像と一致しているか検証
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://mental-health-app-v2-51bc.vercel.app/';
const OUT = path.join(__dirname, '..', 'test-results', 'home-design');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  // iPhone 14 Pro 393x852 を狙う
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();

  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  console.log('[1] ロード...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  // home に直行できるよう state を仕込む（最近のきもち3件入り）
  await page.evaluate(() => {
    const now = Date.now();
    const day = 86400000;
    const seed = {
      consent: { given: true, version: 'v1', at: now },
      user: { nickname: 'もと', createdAt: now - 14 * day, daysUsed: 14 },
      initialDone: true,
      moodLogs: [
        { id: 'm3', moodScore: 4, moodLabel: '少しよい', categories: ['self'], comment: '朝散歩して、少しリフレッシュできた', createdAt: new Date(now - 3 * day - 12 * 3600 * 1000).toISOString() },
        { id: 'm2', moodScore: 2, moodLabel: '少しつらい', categories: ['family'], comment: 'なんとなく気持ちが落ち着かない', createdAt: new Date(now - 2 * day - 4 * 3600 * 1000).toISOString() },
        { id: 'm1', moodScore: 3, moodLabel: 'ふつう', categories: ['work', 'self'], comment: '上司に言われたことがずっと残っている', createdAt: new Date(now - 1 * day + 2 * 3600 * 1000).toISOString() },
      ],
      moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'light' }
    };
    localStorage.setItem('aside_v3_state', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  console.log('[2] フルスクショ');
  await page.screenshot({ path: path.join(OUT, 'home_full.png'), fullPage: true });

  console.log('[3] ビューポートのみスクショ');
  await page.screenshot({ path: path.join(OUT, 'home_viewport.png') });

  // タブバー領域確認
  const vh = await page.evaluate(() => window.innerHeight);
  const vw = await page.evaluate(() => window.innerWidth);
  console.log(`viewport: ${vw} x ${vh}`);
  await page.screenshot({
    path: path.join(OUT, 'tabbar.png'),
    clip: { x: 0, y: vh - 90, width: vw, height: 90 }
  });

  // 黒い領域チェック（画素レベル）
  const sharp = require('sharp');
  const buf = fs.readFileSync(path.join(OUT, 'home_viewport.png'));
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const blackPx = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r < 40 && g < 40 && b < 40) blackPx.push({ x, y });
    }
  }
  console.log(`画素レベル黒系: ${blackPx.length}px`);
  if (blackPx.length > 0 && blackPx.length < 5000) {
    const minX = Math.min(...blackPx.map(p => p.x));
    const maxX = Math.max(...blackPx.map(p => p.x));
    const minY = Math.min(...blackPx.map(p => p.y));
    const maxY = Math.max(...blackPx.map(p => p.y));
    console.log(`  範囲: x:${minX}-${maxX}, y:${minY}-${maxY}`);
  }

  // ホームに表示される要素一覧
  const visibleElements = await page.evaluate(() => {
    const res = [];
    const grab = (sel) => {
      const el = document.querySelector(sel);
      if (!el) { res.push({ sel, present: false }); return; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      res.push({
        sel, present: true,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.textContent || '').slice(0, 60).trim(),
        bg: cs.backgroundColor
      });
    };
    grab('.home-greet-h1');
    grab('.home-subtitle');
    grab('.home-mascot');
    grab('.home-mood-card');
    grab('.home-mood-illust');
    grab('.home-mood-title');
    grab('.home-mood-row');
    grab('.home-mood-cta');
    grab('.home-moya-card');
    grab('.home-moya-illust');
    grab('.home-moya-title');
    grab('.recent-header');
    grab('.recent-list');
    grab('.navbar');
    grab('.navbtn[data-tab="home"]');
    grab('.navbtn[data-tab="action"] .navtxt');
    grab('.navbtn[data-tab="record"] .navtxt');
    return res;
  });

  console.log('\n要素チェック:');
  visibleElements.forEach(e => {
    if (!e.present) { console.log(`  ❌ ${e.sel}`); return; }
    console.log(`  ✓ ${e.sel} ${JSON.stringify(e.rect)} "${e.text}"`);
  });

  await browser.close();
  console.log('\n出力:', OUT);
})().catch(e => { console.error(e); process.exit(1); });
