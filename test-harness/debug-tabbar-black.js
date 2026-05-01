/**
 * 黒い四角の正体を特定する診断スクリプト
 * - 本番デプロイURLにiPhone13エミュレーションでアクセス
 * - 全画面の下部領域をスクショ + DOM解析
 * - 何が「黒い四角」を作っているかを特定
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://mental-health-app-v2-51bc.vercel.app/';
const OUT = path.join(__dirname, '..', 'test-results', 'black-square');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();

  // SW無効化（最新コードを必ず読む）
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  console.log('[1/5] ページ読み込み...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);

  // --- consent通過 → home → タブバーが見える状態にする ---
  await page.evaluate(() => {
    const seed = {
      consent: { given: true, version: 'v1', at: Date.now() },
      user: { nickname: 'デバッグ', createdAt: Date.now() - 86400000, daysUsed: 1 },
      initialDone: true,
      moodLogs: [{
        id: 'mig_1', moodScore: 3, moodLabel: 'くもり',
        categories: [], comment: '',
        createdAt: new Date().toISOString()
      }],
      moyamoyaRecords: [], goals: [], policies: [], actions: [], actionLogs: [], aiChats: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar' },
      preferences: { themeOverride: 'light' }
    };
    localStorage.setItem('aside_v3_state', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // --- ホーム画面下部のスクショ ---
  const fullScr = path.join(OUT, '01_home_full.png');
  await page.screenshot({ path: fullScr, fullPage: true });
  console.log(`[2/5] フルスクショ: ${fullScr}`);

  // タブバー周辺をクロップ
  const tabbarScr = path.join(OUT, '02_tabbar_area.png');
  const vh = await page.evaluate(() => window.innerHeight);
  const vw = await page.evaluate(() => window.innerWidth);
  await page.screenshot({
    path: tabbarScr,
    clip: { x: 0, y: vh - 150, width: vw, height: 150 }
  });
  console.log(`[3/5] タブバー領域クロップ: ${tabbarScr}`);

  // --- DOM解析: 下部領域(viewport bottom-150px〜bottom)に存在する全要素 ---
  const elementsAtBottom = await page.evaluate(() => {
    const vh = window.innerHeight;
    const all = document.querySelectorAll('*');
    const found = [];
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      // viewport bottomから150px以内
      if (rect.bottom > vh - 150 && rect.top < vh && rect.width > 0 && rect.height > 0) {
        const cs = getComputedStyle(el);
        const isVisible = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
        if (!isVisible) continue;
        // 黒系背景 or 黒テキストブロックを抽出
        const bg = cs.backgroundColor;
        const bgImg = cs.backgroundImage;
        const isBlackBg = bg && (bg.includes('rgb(0, 0, 0)') || bg.includes('rgba(0, 0, 0'));
        const isVeryDark = bg && /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(bg);
        let dark = false;
        if (isVeryDark) {
          const r = +isVeryDark[1], g = +isVeryDark[2], b = +isVeryDark[3];
          if (r < 50 && g < 50 && b < 50) dark = true;
        }
        found.push({
          tag: el.tagName,
          class: el.className && (typeof el.className === 'string' ? el.className : ''),
          id: el.id,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          bg, bgImg: bgImg !== 'none' ? bgImg.slice(0, 80) : null,
          isBlackBg, dark,
          text: (el.textContent || '').slice(0, 30),
          parent: el.parentElement ? (el.parentElement.tagName + '.' + (el.parentElement.className || '').toString().slice(0, 50)) : null
        });
      }
    }
    return found;
  });

  fs.writeFileSync(path.join(OUT, '03_bottom_elements.json'), JSON.stringify(elementsAtBottom, null, 2));
  console.log(`[4/5] 下部要素 ${elementsAtBottom.length}件 を記録`);

  // --- 「黒い」と判定された要素のみ別途リスト ---
  const blackOnes = elementsAtBottom.filter(e => e.dark || e.isBlackBg);
  console.log(`\n[5/5] 黒系背景の要素: ${blackOnes.length}件`);
  blackOnes.forEach(e => {
    console.log(`  ${e.tag}.${e.class} #${e.id} ${JSON.stringify(e.rect)} bg=${e.bg} text="${e.text}"`);
  });

  // ピクセル単位で実際にスクショを解析: 黒いピクセルクラスタを検出
  const sharp = await tryRequire('sharp');
  if (sharp) {
    const buf = fs.readFileSync(tabbarScr);
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const blackPixels = [];
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * info.channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r < 30 && g < 30 && b < 30) {
          blackPixels.push({ x, y });
        }
      }
    }
    if (blackPixels.length > 0) {
      const minX = Math.min(...blackPixels.map(p => p.x));
      const maxX = Math.max(...blackPixels.map(p => p.x));
      const minY = Math.min(...blackPixels.map(p => p.y));
      const maxY = Math.max(...blackPixels.map(p => p.y));
      console.log(`\n  画素レベル黒検出: ${blackPixels.length}個 (x:${minX}-${maxX}, y:${minY}-${maxY})`);
      console.log(`  → タブバー領域内の絶対位置: x:${minX}-${maxX}, y:${vh - 150 + minY}-${vh - 150 + maxY}`);
    } else {
      console.log('\n  画素レベル: 黒い領域なし ✅');
    }
  } else {
    console.log('  (sharp未導入のため画素解析スキップ)');
  }

  await browser.close();
  console.log('\n完了。スクショは', OUT);
})().catch(e => { console.error(e); process.exit(1); });

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}
