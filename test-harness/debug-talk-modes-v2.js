const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const today = new Date().toISOString().slice(0, 10);
  // 気分低め → feel がレコメンドされる
  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'mina', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [{ id: 'm1', date: today, score: 2, comment: '', checkedAt: Date.now() }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 1, startedAt: Date.now(), lastCheckinDate: today, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // レコメンドバッジ確認
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(400);
  const rec = await page.evaluate(() => recommendTalkMode());
  console.log('recommended mode (気分2):', rec);
  const badgeMode = await page.evaluate(() => {
    const card = document.querySelector('.talk-mode-card-recommended');
    return card ? card.getAttribute('data-mode') : null;
  });
  console.log('バッジ付きモード:', badgeMode);
  await page.screenshot({ path: 'test-results/ui/a3_talk_recommended.png', fullPage: true });

  // モード1「気持ちを話したい」を選ぶ → 3ターン後チェックイン出す
  await page.click('[data-act="start-chat-mode"][data-mode="feel"]');
  await page.waitForTimeout(500);
  // ユーザー3メッセージ注入
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      chatState.session.messages.push({ role: 'user', content: 'test' + i, timestamp: Date.now() });
      chatState.session.messages.push({ role: 'assistant', content: 'そうなんですね' + i, timestamp: Date.now() });
    }
    render();
  });
  await page.waitForTimeout(300);
  const feelPanel = await page.evaluate(() => document.querySelector('.talk-mode-panel-feel') !== null);
  console.log('feelチェックインパネル表示:', feelPanel);
  await page.screenshot({ path: 'test-results/ui/a4_feel_checkin.png', fullPage: true });

  // モード3「前に進みたい」 → 2ターン後3択出す
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(300);
  await page.click('[data-act="start-chat-mode"][data-mode="forward"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    for (let i = 0; i < 2; i++) {
      chatState.session.messages.push({ role: 'user', content: 'test' + i, timestamp: Date.now() });
      chatState.session.messages.push({ role: 'assistant', content: 'そうなんですね' + i, timestamp: Date.now() });
    }
    render();
  });
  await page.waitForTimeout(300);
  const forwardPanel = await page.evaluate(() => document.querySelector('.talk-mode-panel-forward') !== null);
  const choiceCount = await page.evaluate(() => document.querySelectorAll('.talk-mode-choice').length);
  console.log('forward選択肢パネル:', forwardPanel, '/ 選択肢数:', choiceCount);
  await page.screenshot({ path: 'test-results/ui/a5_forward_choices.png', fullPage: true });

  await browser.close();
  console.log('\ndone');
})();
