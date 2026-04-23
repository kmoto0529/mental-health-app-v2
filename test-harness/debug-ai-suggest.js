const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs: [
      { actionId: 'act_ai_one_line', executedAt: now - 5*day, status: 'done' },
      { actionId: 'act_mood_one',    executedAt: now - 3*day, status: 'done' },
      { actionId: 'act_night_reset', executedAt: now - 2*day, status: 'done' },
      { actionId: 'act_reflect_once',executedAt: now - 1*day, status: 'skipped' }
    ],
    forest: { checkinDays: 3, startedAt: now - 5*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 7*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    personalizationProfile: {
      completionRate: 75, preferredTimeSlot: 'morning', preferredActionType: 'app',
      avoidedActionType: 'daily', supportStyle: 'recorder',
      actionDayMoodAvg: 3.3, nonActionDayMoodAvg: 2.5, freeTextTendency: 'low',
      sampleSize: { logs: 4, moods: 3, sessions: 0, reflects: 0, rescues: 0 },
      updatedAt: now
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 1. buildProfileContext の出力を確認
  const profileCtx = await page.evaluate(() => buildProfileContext());
  console.log('=== buildProfileContext ===');
  console.log(profileCtx);
  console.log('===');

  // 2. buildSystemPrompt に profile が末尾に差し込まれることを確認
  const sp = await page.evaluate(() => buildSystemPrompt('TEST_BASE'));
  console.log('\nbuildSystemPrompt contains profile?:', sp.includes('伴走スタイル'));

  // 3. action suggest画面のUI：aiReasonとaiSuccessバッジの表示確認（モック）
  await page.evaluate(() => {
    prepareActionSuggestions({ skipAi: true });
    // AI成功の状態をモック
    actionSuggestState.proposals = actionSuggestState.proposals.slice(0, 3).map((a, i) => ({
      ...a,
      aiReason: ['記録を短く積み重ねる今のペースに合いそうです。', '朝の時間帯に合いやすい小さな一歩かもしれません。', 'アプリ内で完結するので、続けやすいかもしれません。'][i]
    }));
    actionSuggestState.aiSuccess = true;
    App.go('actionSuggest');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/82_ai_suggest_mocked.png', fullPage: true });

  // 4. ローディング状態の表示確認
  await page.evaluate(() => {
    actionSuggestState.isAiLoading = true;
    actionSuggestState.aiSuccess = false;
    render();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/83_ai_suggest_loading.png', fullPage: true });

  await browser.close();
  console.log('\ndone');
})();
