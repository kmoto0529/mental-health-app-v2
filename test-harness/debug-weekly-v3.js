const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  // 今週：7日間の大量データ / 前週：少なめデータ で比較を出す
  const moods = [];
  const sessions = [];
  const rescues = [];
  // 今週 (0-6日前)
  for (let i = 0; i < 7; i++) {
    moods.push({ id: 'cm'+i, date: new Date(now - i*day).toISOString().slice(0,10), score: i < 3 ? 4 : 3, comment: '', checkedAt: now - i*day + 20*3600000 });
    if (i < 5) sessions.push({ id: 'cs'+i, startedAt: now - i*day + 21*3600000, endedAt: now - i*day + 21.5*3600000, personaId:'haru', messages: [] });
    if (i === 0 || i === 3) rescues.push({ id: 'cr'+i, flowId: 'night', startedAt: now - i*day + 23*3600000, endedAt: now - i*day + 23.5*3600000, linkedDate: '' });
  }
  // 先週 (7-13日前): もっと少ない
  for (let i = 7; i < 14; i++) {
    if (i < 10) moods.push({ id: 'lm'+i, date: new Date(now - i*day).toISOString().slice(0,10), score: 2, comment: '', checkedAt: now - i*day + 9*3600000 });
    if (i < 8) sessions.push({ id: 'ls'+i, startedAt: now - i*day + 10*3600000, endedAt: now - i*day + 10.2*3600000, personaId:'haru', messages: [] });
  }

  const week = (function() {
    const d = new Date(now);
    const diff = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(d.getDate() - diff); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    return { start: fmt(monday), end: fmt(sunday) };
  })();

  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods, sessions, reflections: [], crisisLogs: [],
    rescueHistory: rescues,
    actionLogs: [],
    forest: { checkinDays: 7, startedAt: now - 14*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 14*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    weekTheme: {
      weekStartDate: week.start, weekEndDate: week.end,
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '',
      goalKey: 'reduce_overthinking', goalTitle: '考えすぎる時間を少し減らしたい',
      actions: [
        { id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', type:'app', difficulty:'easy', duration:1 }
      ],
      status: 'accepted', acceptedAt: now - 6*day
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 比較データ検証
  const stats = await page.evaluate(() => ({
    cur: computeWeekCompareStats(0),
    prev: computeWeekCompareStats(1)
  }));
  console.log('=== compare stats ===');
  console.log(JSON.stringify(stats, null, 2));

  // 週次ビュー
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/98_weekly_v3.png', fullPage: true });

  // 「ひといき」文言
  const rescueLabel = await page.evaluate(() => {
    const el = document.querySelector('[data-filter="rescue"]');
    return el ? el.textContent : null;
  });
  console.log('rescue label on history chip:', rescueLabel);

  await browser.close();
  console.log('\ndone');
})();
