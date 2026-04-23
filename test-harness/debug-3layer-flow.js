const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const now = Date.now();
  const day = 86400000;
  const week = (function() {
    const d = new Date(now);
    const diff = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(d.getDate() - diff); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    return { start: fmt(monday), end: fmt(sunday) };
  })();

  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [{ id: 'm1', date: new Date().toISOString().slice(0,10), score: 3, comment: '', checkedAt: now }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs: [
      { actionId: 'act_mood_one', executedAt: now - 2*day, status: 'done' },
      { actionId: 'act_ai_one_line', executedAt: now - 1*day, status: 'done' }
    ],
    forest: { checkinDays: 2, startedAt: now - 5*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 7*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    weekTheme: {
      weekStartDate: week.start, weekEndDate: week.end,
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '考えを全部整理しきらなくても大丈夫。',
      goalKey: 'reduce_overthinking',
      goalTitle: '考えすぎる時間を少し減らしたい',
      actions: [
        { id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'start-chat', themeTitle: '頭の中にためすぎず、少しずつ外に出してみる' },
        { id:'act_mood_one', title:'気持ちを一言だけ残す', desc:'', type:'app', difficulty:'easy', duration:1, ctaAct:'goto-mood', themeTitle: '頭の中にためすぎず、少しずつ外に出してみる' }
      ],
      status: 'accepted', acceptedAt: now - 3*day
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 1. ホーム: 3層のリンク表示
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/94_home_3layer.png', fullPage: true });

  const links = await page.evaluate(() => ({
    weekThemeGoalLink: document.querySelector('.week-theme-goal-link')?.textContent || null,
    actionThemeLink: document.querySelectorAll('.today-action-theme-link')[0]?.textContent || null
  }));
  console.log('3層リンク:', links);

  // 2. 週次レポート: Goal→Theme→Action ナラティブ
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/95_report_narrative.png', fullPage: true });
  const narrative = await page.evaluate(() => document.querySelector('.report-goal-theme-narrative')?.textContent || null);
  console.log('週次ナラティブ:', narrative);

  // 3. Goal変更 → 整え直し確認モーダル
  await page.evaluate(() => App.go('directionGoalSetup'));
  await page.waitForTimeout(300);
  // 別の goal を選択
  await page.click('[data-act="direction-goal-pick"][data-key="understand_my_feelings"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="direction-goal-confirm"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui/96_goal_realign_modal.png', fullPage: true });

  const modalVisible = await page.evaluate(() => document.querySelector('#modalBackdrop.open') !== null);
  const modalText = await page.evaluate(() => document.querySelector('#modalContent')?.textContent || null);
  console.log('モーダル表示:', modalVisible);
  console.log('モーダル本文:', (modalText || '').replace(/\s+/g, ' ').slice(0, 100));

  // 4. 「まだ変えない」を押した時: needs_refresh 状態を確認
  await page.click('[data-act="goal-realign-later"]');
  await page.waitForTimeout(400);
  const themeStatus = await page.evaluate(() => state.weekTheme?.status || null);
  console.log('テーマstatus:', themeStatus);
  await page.screenshot({ path: 'test-results/ui/97_home_theme_stale.png', fullPage: true });

  await browser.close();
  console.log('\ndone');
})();
