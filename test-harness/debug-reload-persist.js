const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [],
    forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // テスト1: カレンダー → リロード → カレンダーが復元されるか
  console.log('=== TEST1: カレンダー画面 ===');
  await page.evaluate(() => App.go('calendar'));
  await page.waitForTimeout(400);
  let screen = await page.evaluate(() => App.currentScreen);
  console.log('  初期遷移先:', screen);
  // リロード
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  screen = await page.evaluate(() => App.currentScreen);
  console.log('  リロード後:', screen, screen === 'calendar' ? '✓' : '✗');
  await page.screenshot({ path: 'test-results/ui/60_reload_calendar.png' });

  // テスト2: きろく・週次タブ → リロード → きろく・週次タブ復元
  console.log('=== TEST2: きろく 週次タブ ===');
  await page.evaluate(() => { historyTopTab = 'week'; persistUiState(); App.go('history'); });
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  screen = await page.evaluate(() => App.currentScreen);
  let tab = await page.evaluate(() => historyTopTab);
  console.log('  リロード後: screen=' + screen + ', tab=' + tab, (screen === 'history' && tab === 'week') ? '✓' : '✗');
  await page.screenshot({ path: 'test-results/ui/61_reload_history_week.png' });

  // テスト3: はなす画面 → リロード → はなす復元
  console.log('=== TEST3: はなす画面 ===');
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  screen = await page.evaluate(() => App.currentScreen);
  console.log('  リロード後:', screen, screen === 'talk' ? '✓' : '✗');

  // テスト4: chat画面（ephemeral） → リロード → homeフォールバック
  console.log('=== TEST4: chat画面（ephemeralなのでhomeに戻る）===');
  await page.evaluate(() => { App.currentScreen = 'chat'; /* あえて直接セット */ });
  // App.go('chat') だと保存されない。chat画面は RESTORABLE_SCREENS にないので保存もされない
  // 実際の挙動：ユーザーが chat 画面にいる状態でリロードしても、前回 persist された画面（例：home）に戻る
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  screen = await page.evaluate(() => App.currentScreen);
  console.log('  リロード後:', screen, (screen === 'talk' || screen === 'home') ? '✓ (talk直前保存 または home fallback)' : '✗');

  // テスト5: せってい → リロード → せってい復元
  console.log('=== TEST5: せってい ===');
  await page.evaluate(() => App.go('settings'));
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  screen = await page.evaluate(() => App.currentScreen);
  console.log('  リロード後:', screen, screen === 'settings' ? '✓' : '✗');

  await browser.close();
  console.log('\ndone');
})();
