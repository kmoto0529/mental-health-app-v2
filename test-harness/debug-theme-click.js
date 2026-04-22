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
    directionGoalPromptShown: true
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);

  // 1. Open modal via home card tap
  console.log('STEP1: ホームのテーマカードをタップ');
  await page.click('.week-theme-card-empty');
  await page.waitForTimeout(500);
  const modalOpen1 = await page.$('.theme-radio-list');
  console.log('  モーダル開いた:', !!modalOpen1);
  await page.screenshot({ path: 'test-results/ui/40_modal_opened.png' });

  // 2. Click second theme card (alt)
  console.log('STEP2: 2つ目のテーマ（候補）をタップ');
  const cards = await page.$$('.theme-radio-card');
  console.log('  カード数:', cards.length);
  if (cards[1]) {
    await cards[1].click();
    await page.waitForTimeout(400);
    const selectedCount = await page.$$eval('.theme-radio-card.selected', arr => arr.length);
    console.log('  選択状態のカード数:', selectedCount);
    const ctaBtn = await page.$('.theme-radio-cta');
    console.log('  CTAボタン表示:', !!ctaBtn);
    await page.screenshot({ path: 'test-results/ui/41_card_selected.png' });

    // 3. Click CTA to confirm
    if (ctaBtn) {
      console.log('STEP3: CTAボタン押下で確定');
      await ctaBtn.click();
      await page.waitForTimeout(600);
      const modalStillOpen = await page.$('.theme-radio-list');
      console.log('  モーダル閉じた:', !modalStillOpen);
      const weekTheme = await page.evaluate(() => state.weekTheme);
      console.log('  採用したテーマ:', weekTheme && weekTheme.title);
      await page.screenshot({ path: 'test-results/ui/42_after_confirm.png' });
    }
  }

  // 4. Click "変える" then verify flow
  console.log('STEP4: 見直しフロー');
  await page.click('.week-theme-change');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/43_change_reason.png' });
  const reasonBtns = await page.$$('.theme-change-reason');
  console.log('  変更理由ボタン数:', reasonBtns.length);
  if (reasonBtns[0]) {
    await reasonBtns[0].click();
    await page.waitForTimeout(500);
    const cards2 = await page.$$('.theme-radio-card');
    console.log('  STEP2カード数:', cards2.length);
    await page.screenshot({ path: 'test-results/ui/44_change_step2.png' });
  }

  await browser.close();
  console.log('done');
})();
