const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [], sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'organize_feelings', title: '気持ちを整理できるようになりたい', status: 'active', selectedAt: Date.now() },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'daily', duration: 'three' }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // カタログサイズ
  const total = await page.evaluate(() => ACTION_CATALOG.length);
  console.log('ACTION_CATALOG 件数:', total);

  // goalKey 別カウント
  const byGoal = await page.evaluate(() => {
    const goals = ['organize_feelings','reduce_overthinking','understand_my_feelings','have_place_to_rely','not_sure_yet'];
    return goals.reduce((acc, g) => {
      acc[g] = ACTION_CATALOG.filter(a => a.goalKeys.includes(g)).length;
      return acc;
    }, {});
  });
  console.log('goal別:', byGoal);

  // 状態 mixed / duration 3分 / daily での抽出数
  const filtered = await page.evaluate(() => {
    return getActionsForGoal('organize_feelings', { lifeStatus: 'mixed', actionType: 'daily', duration: 'three' }).length;
  });
  console.log('organize_feelings × mixed × daily × 3分 抽出数:', filtered);

  // 提案画面
  await page.evaluate(() => { prepareActionSuggestions({ skipAi: true }); App.go('actionSuggest'); });
  await page.waitForTimeout(500);
  const proposals = await page.evaluate(() => actionSuggestState.proposals.map(a => ({ id: a.id, title: a.title, diff: a.difficulty, dur: a.duration })));
  console.log('提案:', JSON.stringify(proposals, null, 2));

  await page.screenshot({ path: 'test-results/ui/b0_catalog_v32_suggest.png', fullPage: true });

  // 難易度ラベル確認
  const label = await page.evaluate(() => {
    const el = document.querySelector('.suggest-label-diff');
    return el ? el.textContent : null;
  });
  console.log('難易度ラベル:', label);

  await browser.close();
  console.log('\ndone');
})();
