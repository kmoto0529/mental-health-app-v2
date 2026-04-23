const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const today = new Date().toISOString().slice(0, 10);

  // ケース1: 目標未設定 / テーマ未設定（新規ユーザー）
  const seed1 = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [], sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed1);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/90_home_case1_unset.png', fullPage: true });

  // ケース2: 目標設定済み / テーマ未設定
  const seed2 = {
    ...seed1,
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: Date.now() }
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed2);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/91_home_case2_goal_set.png', fullPage: true });

  // ケース3: 目標設定済み / テーマ設定済み
  const seed3 = {
    ...seed2,
    weekTheme: {
      weekStartDate: today, weekEndDate: today,
      key: 'act_mood_one', category: 'MOOD',
      title: '今日の気分、ひとこと残してみる',
      description: '',
      actions: [{ id:'act_mood_one', title:'気持ちを一言だけ残す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'goto-mood' }],
      status: 'accepted', acceptedAt: Date.now()
    },
    moods: [{ id: 'm1', date: today, score: 3, comment: '', checkedAt: Date.now() }]
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed3);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/92_home_case3_both_set.png', fullPage: true });

  // 設定画面から「今の方向」行が消えた確認
  await page.evaluate(() => App.go('settings'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/93_settings_no_direction.png', fullPage: true });

  await browser.close();
  console.log('done');
})();
