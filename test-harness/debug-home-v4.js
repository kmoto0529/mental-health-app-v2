const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [],
    forest: { checkinDays: 3, startedAt: Date.now() - 3 * 86400000, lastCheckinDate: null, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  // 未記録 + テーマ未設定
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/34_home_v4_empty.png', fullPage: true });

  // テーマ設定（rescueカテゴリ → 少しひと息ボタン）
  const seed2 = {
    ...seed,
    weekTheme: {
      key: 'rescue_use',
      title: 'しんどい時に「少しひと息」を開く',
      description: '開くだけでも十分。使うかは後で決めていい。',
      category: 'D',
      status: 'accepted',
      weekStartDate: '2026-04-20',
      weekEndDate: '2026-04-26',
      selectedAt: Date.now()
    }
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed2);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/35_home_v4_theme_set.png', fullPage: false });

  // 気分記録あり + テーマあり
  const seed3 = {
    ...seed2,
    moods: [{ id: 'm1', date: '2026-04-23', score: 3, comment: '午前はだるかったけど、昼から持ち直した', checkedAt: Date.now() }]
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed3);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/36_home_v4_full.png', fullPage: false });

  await browser.close();
  console.log('done');
})();
