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
      forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
      directionGoalPromptShown: true, directionGoal: { status: 'skipped' }
    }));
  });
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(300);

  // open theme selection modal
  await page.evaluate(() => openThemeSelectionModal());
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/31_theme_modal_unselected.png' });

  // select a theme
  await page.evaluate(() => {
    selectedWeeklyTheme = _lastSuggest.alts[0].key;
    renderThemeSelectionModal();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/32_theme_modal_selected_alt.png' });

  // select recommend
  await page.evaluate(() => {
    selectedWeeklyTheme = _lastSuggest.recommend.key;
    renderThemeSelectionModal();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/33_theme_modal_selected_rec.png' });

  await browser.close();
  console.log('done');
})();
