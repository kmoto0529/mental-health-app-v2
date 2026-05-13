/**
 * ホーム「いまのきもち」カセットの ?ボタン位置検証
 * 「いまのきもちを教えてください」テキストと?ボタンが被っていないか確認
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.URL || 'http://localhost:8765/index.html';
const OUT = path.join(__dirname, '..', 'test-results', 'mood-help-position');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], locale: 'ja-JP' });
  const page = await ctx.newPage();

  // SW無効化（ローカル開発時のキャッシュ干渉回避）
  await page.route('**/service-worker.js', r => r.fulfill({ status: 404, body: '' }));

  console.log('[1] ロード...', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);

  // 同意済み・オンボ完了・ホーム直行のstate seed
  await page.evaluate(() => {
    const now = Date.now();
    const seed = {
      consent: { given: true, version: 'v0.2-beta', at: now },
      guidedShown: true,
      initialDone: true,
      user: {
        nickname: 'もと',
        createdAt: now - 14 * 86400000,
        daysUsed: 14,
        direction: 'self',
        occupation: 'worker',
        ageRange: '20s',
        gender: 'no_answer',
        interests: ['self'],
        profileDone: true,
        habitActionIds: []
      },
      moodLogs: [],
      moyamoyaRecords: [],
      aiChats: [],
      ippoSessions: [],
      customHabits: [],
      habitLogs: [],
      deepDiveSessions: [],
      coreBeliefTags: [],
      ui: { currentTab: 'home', recordSubtab: 'calendar', calendarMonthOffset: 0, reportGraphTab: 'date' },
      preferences: { themeOverride: 'light' }
    };
    localStorage.setItem('aside_v3_state', JSON.stringify(seed));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  console.log('[2] フルスクショ');
  await page.screenshot({ path: path.join(OUT, 'home_full.png'), fullPage: true });
  await page.screenshot({ path: path.join(OUT, 'home_viewport.png') });

  // home-record-card の位置・サイズを取得
  const card = await page.locator('.home-record-card').first();
  const cardBox = await card.boundingBox();
  if (!cardBox) {
    console.log('home-record-card 見つからず');
    await browser.close();
    return;
  }

  console.log('[3] カセット部分クロップ撮影');
  await page.screenshot({
    path: path.join(OUT, 'card_zoom.png'),
    clip: {
      x: Math.max(0, cardBox.x - 8),
      y: Math.max(0, cardBox.y - 8),
      width: Math.min(cardBox.width + 16, 393),
      height: cardBox.height + 16
    }
  });

  // ?ボタンとタイトルの位置関係を計算
  const layout = await page.evaluate(() => {
    const btn = document.querySelector('.mood-help-btn');
    const title = document.querySelector('.home-mood-title');
    const sub = document.querySelector('.home-mood-sub');
    const body = document.querySelector('.home-mood-body');
    const mascot = document.querySelector('.home-mood-illust');
    if (!btn) return { error: 'mood-help-btn not found' };
    if (!title) return { error: 'home-mood-title not found' };
    const btnR = btn.getBoundingClientRect();
    const titleR = title.getBoundingClientRect();
    const subR = sub ? sub.getBoundingClientRect() : null;
    const bodyR = body ? body.getBoundingClientRect() : null;
    const mascotR = mascot ? mascot.getBoundingClientRect() : null;

    // overlap detection
    const overlapsTitle = !(
      btnR.right < titleR.left ||
      btnR.left  > titleR.right ||
      btnR.bottom < titleR.top ||
      btnR.top    > titleR.bottom
    );
    const overlapsSub = subR && !(
      btnR.right < subR.left ||
      btnR.left  > subR.right ||
      btnR.bottom < subR.top ||
      btnR.top    > subR.bottom
    );
    return {
      btn:    { x: btnR.x, y: btnR.y, w: btnR.width, h: btnR.height, right: btnR.right, bottom: btnR.bottom },
      title:  { x: titleR.x, y: titleR.y, w: titleR.width, h: titleR.height, right: titleR.right, text: title.textContent.trim() },
      sub:    subR ? { x: subR.x, y: subR.y, w: subR.width, h: subR.height } : null,
      body:   bodyR ? { x: bodyR.x, y: bodyR.y, w: bodyR.width, h: bodyR.height } : null,
      mascot: mascotR ? { x: mascotR.x, y: mascotR.y, w: mascotR.width, h: mascotR.height } : null,
      overlapsTitle,
      overlapsSub
    };
  });

  console.log('[4] レイアウト判定:');
  console.log(JSON.stringify(layout, null, 2));

  const verdict = layout.overlapsTitle || layout.overlapsSub
    ? '❌ 被ってる'
    : '✅ 被り無し';
  console.log('判定:', verdict);

  // 結果を JSON にも保存
  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify({ verdict, layout }, null, 2));

  await browser.close();
  process.exit(layout.overlapsTitle || layout.overlapsSub ? 1 : 0);
})();
