const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'mina', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [], sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // はなすタブ
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/a0_talk_mode_picker.png', fullPage: true });

  // モード2「整理したい」を選択
  await page.click('[data-act="start-chat-mode"][data-mode="organize"]');
  await page.waitForTimeout(600);
  const chatState1 = await page.evaluate(() => ({ mode: chatState.mode, screen: App.currentScreen }));
  console.log('モード選択後:', chatState1);
  await page.screenshot({ path: 'test-results/ui/a1_chat_organize_mode.png', fullPage: true });

  // 状態バーのテキスト確認
  const modeBar = await page.evaluate(() => {
    const el = document.querySelector('.chat-mode-bar');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  console.log('モードバー:', modeBar);

  // 終了ボタンのラベル
  const endLabel = await page.evaluate(() => {
    const el = document.querySelector('.chat-end');
    return el ? el.textContent : null;
  });
  console.log('終了ボタン:', endLabel);

  // モード4（ひといき）は rescue へ
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(300);
  await page.click('[data-act="start-chat-mode"][data-mode="breath"]');
  await page.waitForTimeout(400);
  const afterBreath = await page.evaluate(() => App.currentScreen);
  console.log('ひといきモード遷移先:', afterBreath);
  await page.screenshot({ path: 'test-results/ui/a2_breath_routes_to_rescue.png', fullPage: true });

  // system prompt にモードが組み込まれるか
  await page.evaluate(() => { chatState.mode = 'feel'; });
  const sp = await page.evaluate(() => buildSystemPrompt('BASE'));
  console.log('feel モード含む?:', sp.includes('気持ちを話したい'));

  await page.evaluate(() => { chatState.mode = 'forward'; });
  const sp2 = await page.evaluate(() => buildSystemPrompt('BASE'));
  console.log('forward モード含む?:', sp2.includes('前に進みたい'));

  await browser.close();
  console.log('\ndone');
})();
