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
    notificationTime: '08:00',
    moods: [
      { id: 'm1', date: new Date(now - 6*day).toISOString().slice(0,10), score: 2, comment: '', checkedAt: now - 6*day },
      { id: 'm2', date: new Date(now - 5*day).toISOString().slice(0,10), score: 3, comment: '', checkedAt: now - 5*day },
      { id: 'm3', date: new Date(now - 3*day).toISOString().slice(0,10), score: 3, comment: '', checkedAt: now - 3*day },
    ],
    sessions: [], reflections: [], rescueHistory: [], crisisLogs: [],
    actionLogs: [
      { actionId: 'act_ai_one_line', executedAt: now - 5*day, status: 'done' },
      { actionId: 'act_mood_one', executedAt: now - 3*day, status: 'done' },
    ],
    forest: { checkinDays: 3, startedAt: now - 5*day, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 7*day },
    directionGoalPromptShown: true,
    weekTheme: {
      weekStartDate: new Date(now - 6*day).toISOString().slice(0,10),
      weekEndDate: new Date(now).toISOString().slice(0,10),
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '',
      actions: [{ id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', desc:'', type:'app', difficulty:'easy', duration:1 }],
      status: 'accepted', acceptedAt: now - 6*day
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(600);

  // スクロールを最下部へ
  await page.evaluate(() => {
    const hc = document.querySelector('.home-content');
    if (hc) hc.scrollTop = hc.scrollHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/90_history_week_bottom.png' });

  // nav との重なり判定
  const info = await page.evaluate(() => {
    const hc = document.querySelector('.home-content');
    const nav = document.querySelector('.bottom-nav');
    const hcR = hc ? hc.getBoundingClientRect() : null;
    const navR = nav ? nav.getBoundingClientRect() : null;
    // 最下部テキストの可視判定
    const lastChild = hc ? hc.lastElementChild : null;
    const lastR = lastChild ? lastChild.getBoundingClientRect() : null;
    return {
      hcBottom: hcR ? Math.round(hcR.bottom) : null,
      hcScroll: hc ? { scrollTop: hc.scrollTop, scrollH: hc.scrollHeight, clientH: hc.clientHeight } : null,
      navTop: navR ? Math.round(navR.top) : null,
      lastBottom: lastR ? Math.round(lastR.bottom) : null,
      lastText: lastChild ? lastChild.textContent.slice(0, 40) : null,
      windowScrollY: window.scrollY,
      docScrollH: document.documentElement.scrollHeight
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
