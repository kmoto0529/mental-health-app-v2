const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  // 30日間のサンプル：act_mood_one を実施した日は気分が少し高い、act_night_reset は効果なし
  const moods = [];
  const actionLogs = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(now - i * day);
    const dk = d.toISOString().slice(0, 10);
    // act_mood_one を偶数日実施 → その日は気分 +1
    if (i % 2 === 0) {
      actionLogs.push({ actionId: 'act_mood_one', executedAt: now - i*day + 9*3600000, status: 'done' });
      moods.push({ id: 'm'+i, date: dk, score: 4, comment: '', checkedAt: now - i*day + 8*3600000 });
    } else if (i % 3 === 0) {
      actionLogs.push({ actionId: 'act_night_reset', executedAt: now - i*day + 22*3600000, status: 'done' });
      moods.push({ id: 'm'+i, date: dk, score: 3, comment: '', checkedAt: now - i*day + 22*3600000 });
    } else {
      moods.push({ id: 'm'+i, date: dk, score: 2, comment: '', checkedAt: now - i*day + 20*3600000 });
    }
  }
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods, sessions: [], reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs,
    forest: { checkinDays: 10, startedAt: now - 20*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 20*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    weekTheme: {
      weekStartDate: new Date(now - 6*day).toISOString().slice(0,10),
      weekEndDate: new Date(now).toISOString().slice(0,10),
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '',
      actions: [
        { id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'start-chat' },
        { id:'act_mood_one', title:'気持ちを一言だけ残す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'goto-mood' },
        { id:'act_night_reset', title:'寝る前に一言だけ置いて寝る', desc:'', type:'app', difficulty:'easy', duration:2, ctaAct:'goto-rescue-night' }
      ],
      status: 'accepted', acceptedAt: now - 6*day
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 1. computeProfile の結果確認
  const profile = await page.evaluate(() => computeProfile());
  console.log('=== Profile ===');
  console.log('completionRate:', profile.completionRate);
  console.log('preferredTimeSlot:', profile.preferredTimeSlot);
  console.log('supportStyle:', profile.supportStyle);
  console.log('effectByAction:', JSON.stringify(profile.effectByAction, null, 2));

  // 2. currentTimeSlot
  const slot = await page.evaluate(() => currentTimeSlot());
  console.log('currentTimeSlot:', slot);

  // 3. ホーム画面（style hint が表示されるか）
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/84_home_with_style_hint.png', fullPage: true });
  const hint = await page.evaluate(() => homeStyleHint());
  console.log('homeStyleHint:', hint);

  // 4. 週次レポート（effectByAction が Block D に反映されるか）
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/85_weekly_report_with_effect.png', fullPage: true });

  // 5. 設定画面（「あなたの傾向」セクション）
  await page.evaluate(() => App.go('settings'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/86_settings_with_profile.png', fullPage: true });

  // 6. profileHistory 蓄積の確認
  const hist = await page.evaluate(() => state.profileHistory || []);
  console.log('profileHistory length:', hist.length);
  if (hist.length > 0) console.log('latest snapshot:', JSON.stringify(hist[hist.length - 1], null, 2));

  // 7. rankActionsForContext 動作確認
  const ranked = await page.evaluate(() => {
    const test = [
      { id: 'act_mood_one', title: 'A', type: 'app', difficulty: 'easy', duration: 1 },
      { id: 'act_night_reset', title: 'B', type: 'app', difficulty: 'easy', duration: 2 },
      { id: 'act_breath_10s', title: 'C', type: 'daily', difficulty: 'easy', duration: 1 }
    ];
    return rankActionsForContext(test).map(a => a.id);
  });
  console.log('rankActionsForContext result:', ranked);

  await browser.close();
  console.log('\ndone');
})();
