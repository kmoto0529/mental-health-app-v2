const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  // 今月(0-29日) vs 前月(30-59日)で差を出す
  const moods = [];
  const sessions = [];
  const rescues = [];
  for (let i = 0; i < 30; i++) {
    // 今月: 多く記録、会話多め
    if (i % 2 === 0) {
      moods.push({ id: 'cm'+i, date: new Date(now - i*day).toISOString().slice(0,10), score: 3 + (i % 3 === 0 ? 1 : 0), comment: '', checkedAt: now - i*day + 20*3600000 });
    }
    if (i % 3 === 0) sessions.push({ id: 'cs'+i, startedAt: now - i*day + 21*3600000, personaId:'haru', messages: [] });
    if (i === 5) rescues.push({ id: 'cr'+i, flowId: 'night', startedAt: now - i*day + 23*3600000, linkedDate: '' });
  }
  for (let i = 30; i < 60; i++) {
    // 前月: 少なめ記録、会話少なめ、気分低め
    if (i % 5 === 0) moods.push({ id: 'lm'+i, date: new Date(now - i*day).toISOString().slice(0,10), score: 2, comment: '', checkedAt: now - i*day + 9*3600000 });
    if (i % 10 === 0) sessions.push({ id: 'ls'+i, startedAt: now - i*day + 10*3600000, personaId:'haru', messages: [] });
  }

  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods, sessions, reflections: [], crisisLogs: [],
    rescueHistory: rescues,
    actionLogs: [],
    forest: { checkinDays: 15, startedAt: now - 60*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 60*day },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  const stats = await page.evaluate(() => ({
    cur: computeRangeCompareStats(30, 0),
    prev: computeRangeCompareStats(30, 1)
  }));
  console.log('=== monthly stats ===');
  console.log(JSON.stringify(stats, null, 2));

  await page.evaluate(() => { historyTopTab = 'month'; App.go('history'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/99_monthly_v3.png', fullPage: true });

  // week/month 切替で両方見える確認
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/99a_weekly_v3_regen.png', fullPage: true });

  await browser.close();
  console.log('\ndone');
})();
