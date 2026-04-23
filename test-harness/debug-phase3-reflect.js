const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  const actionLogs = [];
  const moods = [];
  // act_mood_one が効果あり、act_phone_down が効果なし になる データを作る
  for (let i = 20; i >= 0; i--) {
    const d = new Date(now - i * day);
    const dk = d.toISOString().slice(0, 10);
    if (i % 2 === 0) {
      actionLogs.push({ actionId: 'act_mood_one', executedAt: now - i*day + 9*3600000, status: 'done' });
      moods.push({ id: 'm'+i, date: dk, score: 4, comment: '', checkedAt: now - i*day + 8*3600000 });
    } else {
      moods.push({ id: 'm'+i, date: dk, score: 2, comment: '', checkedAt: now - i*day + 20*3600000 });
    }
  }
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '22:00',  // 夜に設定しつつ preferredTimeSlot=朝 とのズレを見せる
    moods, sessions: [], reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs,
    forest: { checkinDays: 10, startedAt: now - 20*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 20*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 1. 設定画面（通知時刻ズレのhint、profile section表示）
  await page.evaluate(() => { computeProfile(); App.go('settings'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/87_settings_with_notification_hint.png', fullPage: true });

  // 2. テーマ確認画面（effect badge）
  await page.evaluate(() => {
    computeProfile();
    actionSuggestState.proposals = [
      { id: 'act_mood_one', title: '気持ちを一言だけ残す', desc: 'しんどい日も、ひとことだけで大丈夫。', type: 'app', difficulty: 'easy', duration: 1, aiReason: '記録を積み重ねる今のペースに合いそうです。' },
      { id: 'act_phone_down', title: '今日は5分だけスマホを置いて休む', desc: '', type: 'daily', difficulty: 'easy', duration: 5 }
    ];
    actionSuggestState.selected = ['act_mood_one', 'act_phone_down'];
    themeConfirmState = { title: null, meaning: null, actions: [] };
    App.go('themeConfirm');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/88_theme_confirm_with_effect.png', fullPage: true });

  await browser.close();
  console.log('done');
})();
