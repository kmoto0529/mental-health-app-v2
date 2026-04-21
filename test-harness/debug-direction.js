const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('aside_prototype_state_v1', JSON.stringify({
      onboarded: true, nickname: 'テスト太郎', apiKey: '',
      selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
      notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [],
      forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null }
    }));
  });
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // Direction goal setup screen
  await page.evaluate(() => { directionGoalSelection = null; App.go('directionGoalSetup'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/27_direction_setup.png' });

  // With selection
  await page.evaluate(() => { directionGoalSelection = 'understand_my_feelings'; render(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/28_direction_setup_selected.png' });

  // Confirmation screen
  await page.evaluate(() => {
    state.directionGoal = { key: 'understand_my_feelings', title: '自分の気持ちをわかるようになりたい', description: 'なんとなくの気分を、少しずつ見つけられるようになりたい', status: 'active', selectedAt: Date.now() };
    state.directionGoalPromptShown = true;
    App.go('directionGoalConfirm');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/29_direction_confirm.png' });

  // Home with direction goal card
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/30_home_with_direction.png' });

  await browser.close();
  console.log('done');
})();
