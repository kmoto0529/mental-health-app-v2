const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  // 過去ログで memo_done を多く成功させ、ai_assist を失敗させる
  const actionLogs = [];
  for (let i = 1; i <= 5; i++) actionLogs.push({ actionId: 'act_one_event', executedAt: now - i*day, status: 'done', execType: 'memo_done' });
  for (let i = 6; i <= 8; i++) actionLogs.push({ actionId: 'act_ai_one_line', executedAt: now - i*day, status: 'skipped', execType: 'ai_assist' });
  // 連続3日: 今日、昨日、おととい
  actionLogs.push({ actionId: 'act_breath_10s', executedAt: now, status: 'done', execType: 'instant_done' });
  actionLogs.push({ actionId: 'act_breath_10s', executedAt: now - 1*day, status: 'done', execType: 'instant_done' });

  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [{ id:'m1', date: new Date().toISOString().slice(0,10), score: 3, checkedAt: now }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs,
    forest: { checkinDays: 5, startedAt: now - 10*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'organize_feelings', title: '気持ちを整理できるようになりたい', status: 'active', selectedAt: now - 10*day },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // profile 確認
  const profile = await page.evaluate(() => computeProfile());
  console.log('=== profile ===');
  console.log('preferredExecType:', profile.preferredExecType);
  console.log('streak:', profile.streak);
  console.log('totalDone:', profile.totalDone);
  console.log('execTypeAttempt:', profile.execTypeAttempt);
  console.log('execTypeDone:', profile.execTypeDone);

  // マイルストーン
  const mile = await page.evaluate(() => getActionMilestone());
  console.log('milestone:', mile);

  // 完了画面（emulated）
  await page.evaluate(() => {
    state.weekTheme = {
      weekStartDate: '2026-04-20', weekEndDate: '2026-04-26',
      key: 'act_breath_10s', title: '少しずつ外に出してみる',
      goalTitle: '気持ちを整理できるようになりたい',
      actions: [{ id:'act_breath_10s', title:'10秒だけ呼吸する', type:'daily', difficulty:'easy', duration:1 }],
      status: 'accepted'
    };
    openActionDoneCelebration({ id: 'act_breath_10s', title: '10秒だけ呼吸する' }, { execType: 'instant_done' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/d0_completion_with_badge.png', fullPage: true });

  const badgeText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.exec-done-badge')).map(el => el.textContent.trim());
  });
  console.log('完了画面バッジ:', badgeText);

  // balancedActionMix に preferredExecType が反映されるか
  const mixTop = await page.evaluate(() => {
    const pool = ACTION_CATALOG.filter(a => a.goalKeys.includes('organize_feelings'));
    return balancedActionMix(pool, 6).map(a => ({ id: a.id, diff: a.difficulty, exec: getActionExecutionType(a) }));
  });
  console.log('balancedActionMix(preferredExec):', mixTop);

  await browser.close();
  console.log('\ndone');
})();
