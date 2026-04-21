const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const seed = {
    onboarded: true, nickname: 'テスト太郎', apiKey: '', apiModel: 'gemini-2.5-flash',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [], sessions: [], reflections: [], crisisLogs: [],
    forest: { checkinDays: 5, startedAt: Date.now() - 5 * 86400000, lastCheckinDate: null, completedAt: null },
    goal: { mainConcern: '仕事のストレス', aspiration: '心穏やかに過ごせる毎日', checkpoints: [{ date: '2026-04-21', score: 5 }], subgoals: [] }
  };
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(500);

  // まず scroll=0
  await page.screenshot({ path: 'test-results/ui/scroll_home_top.png' });

  // 一番下までスクロール
  await page.evaluate(() => {
    document.querySelector('.home-content')?.scrollTo({ top: 99999 });
    window.scrollTo(0, 99999);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/scroll_home_bottom.png' });

  // カレンダー画面でも
  await page.evaluate(() => App.go('calendar'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/scroll_cal_top.png' });
  await page.evaluate(() => {
    document.querySelector('.home-content')?.scrollTo({ top: 99999 });
    window.scrollTo(0, 99999);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/scroll_cal_bottom.png' });

  // history
  await page.evaluate(() => { historyFilter = 'chat'; App.go('history'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/scroll_history_top.png' });
  await page.evaluate(() => window.scrollTo(0, 99999));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/scroll_history_bottom.png' });

  await browser.close();
  console.log('done');
})();
