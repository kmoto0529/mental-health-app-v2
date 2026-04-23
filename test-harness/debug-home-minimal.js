const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const today = new Date().toISOString().slice(0, 10);
  // ユーザーのスクショと同等の最小データ：nickname空、今日だけmood=3(ふつう)
  const seed = {
    onboarded: true, nickname: '', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [{ id: 'm1', date: today, score: 3, comment: '', checkedAt: Date.now() }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 1, startedAt: Date.now(), lastCheckinDate: today, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(500);
  const hintText = await page.evaluate(() => {
    const el = document.querySelector('.home-greet-hint');
    return el ? el.textContent : null;
  });
  const profile = await page.evaluate(() => state.personalizationProfile || null);
  console.log('homeStyleHint text:', hintText);
  console.log('profile:', JSON.stringify(profile, null, 2));
  await page.screenshot({ path: 'test-results/ui/89_home_minimal_user.png', fullPage: true });

  await browser.close();
})();
