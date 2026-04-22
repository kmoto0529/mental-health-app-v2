const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [],
    forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', description: '頭の中がぐるぐるする時に、少しだけ楽になりたい', status: 'active', selectedAt: Date.now() },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // STEP1: 状態把握設問
  await page.evaluate(() => { stateSurveyStep = 0; stateSurveyDraft = {}; App.go('stateSurvey'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/70_survey_q1.png' });

  // Q1 回答
  await page.click('[data-id="mixed"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="survey-next"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/71_survey_q2.png' });

  // Q2
  await page.click('[data-id="app_only"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="survey-next"]');
  await page.waitForTimeout(300);

  // Q3
  await page.click('[data-id="one"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="survey-next"]');
  await page.waitForTimeout(500);

  // STEP2: 行動提案
  await page.screenshot({ path: 'test-results/ui/72_suggest.png' });
  const firstCard = await page.$('.suggest-card');
  if (firstCard) {
    await firstCard.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/ui/73_suggest_selected.png' });
  }

  // Proceed
  await page.click('[data-act="suggest-next"]');
  await page.waitForTimeout(500);

  // STEP3: テーマ確定
  await page.screenshot({ path: 'test-results/ui/74_theme_confirm.png' });

  // Confirm
  await page.click('[data-act="confirm-theme"]');
  await page.waitForTimeout(600);

  // Home - 今日のおすすめ行動
  await page.screenshot({ path: 'test-results/ui/75_home_with_actions.png', fullPage: true });

  // Action log modal
  const logBtn = await page.$('.today-action-log');
  if (logBtn) {
    await logBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/ui/76_action_log_modal.png' });
  }

  await browser.close();
  console.log('done');
})();
