const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  // Phase 2/3検証用：アクション実績ありの状態で週次レポートを見る
  const now = Date.now();
  const day = 86400000;
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [
      { id: 'm1', date: new Date(now - 6*day).toISOString().slice(0,10), score: 2, comment: 'しんどい', checkedAt: now - 6*day },
      { id: 'm2', date: new Date(now - 5*day).toISOString().slice(0,10), score: 2, comment: '', checkedAt: now - 5*day + 20 * 3600000 },
      { id: 'm3', date: new Date(now - 3*day).toISOString().slice(0,10), score: 3, comment: 'ふつう', checkedAt: now - 3*day + 22 * 3600000 },
      { id: 'm4', date: new Date(now - 2*day).toISOString().slice(0,10), score: 4, comment: '', checkedAt: now - 2*day + 21 * 3600000 },
      { id: 'm5', date: new Date(now - 1*day).toISOString().slice(0,10), score: 4, comment: '持ち直した', checkedAt: now - 1*day + 23 * 3600000 }
    ],
    sessions: [
      { id: 's1', startedAt: now - 5*day + 22*3600000, endedAt: null, personaId: 'haru', messages: [{role:'user',content:'a',timestamp:now-5*day},{role:'assistant',content:'b',timestamp:now-5*day}] }
    ],
    reflections: [],
    rescueHistory: [
      { id: 'r1', flowId: 'night', startedAt: now - 4*day + 23*3600000, endedAt: now - 4*day + 23*3600000 + 60000, linkedDate: '' }
    ],
    crisisLogs: [],
    actionLogs: [
      { actionId: 'act_ai_one_line', executedAt: now - 5*day + 20*3600000, status: 'done' },
      { actionId: 'act_mood_one', executedAt: now - 3*day + 21*3600000, status: 'done' },
      { actionId: 'act_night_reset', executedAt: now - 2*day + 22*3600000, status: 'done' },
      { actionId: 'act_reflect_once', executedAt: now - 1*day + 10*3600000, status: 'skipped', skipReason: 'no_time' }
    ],
    forest: { checkinDays: 5, startedAt: now - 5*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', description: '', status: 'active', selectedAt: now - 7*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    weekTheme: {
      weekStartDate: new Date(now - 6*day).toISOString().slice(0,10),
      weekEndDate: new Date(now).toISOString().slice(0,10),
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '考えを全部整理しきらなくても大丈夫。今週は、抱え込みすぎない練習をしてみよう。',
      actions: [
        { id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'start-chat' }
      ],
      status: 'accepted', acceptedAt: now - 6*day
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 週次レポートへ
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/ui/80_weekly_report_phase2.png', fullPage: true });

  // 来週どうする？ の step_up を押す
  const btns = await page.$$('[data-act="next-week-pick"]');
  console.log('next-week buttons:', btns.length);
  if (btns[2]) {
    await btns[2].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/ui/81_next_week_suggest.png' });
  }

  // Profile verification
  const profile = await page.evaluate(() => computeProfile());
  console.log('Profile:', JSON.stringify(profile, null, 2));

  await browser.close();
  console.log('done');
})();
