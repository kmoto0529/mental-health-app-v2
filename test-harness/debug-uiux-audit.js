// UIUX 総点検：主要画面を縦断的に撮影
const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();

  const now = Date.now();
  const day = 86400000;
  const today = new Date().toISOString().slice(0, 10);

  const week = (function () {
    const d = new Date(now);
    const diff = (d.getDay() + 6) % 7;
    const monday = new Date(d); monday.setDate(d.getDate() - diff); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    return { start: fmt(monday), end: fmt(sunday) };
  })();

  // ===== SEED: 中級ユーザー（目標set / 週テーマset / 10日の履歴） =====
  const moods = [];
  const actionLogs = [];
  const sessions = [];
  for (let i = 0; i < 14; i++) {
    if (i % 2 === 0) moods.push({ id:'m'+i, date: new Date(now - i*day).toISOString().slice(0,10), score: i<5 ? 4 : 3, comment: i%4===0?'まあまあ':'', checkedAt: now - i*day + 9*3600000 });
    if (i % 3 === 0) actionLogs.push({ actionId: 'act_one_event', executedAt: now - i*day + 10*3600000, status: 'done', execType: 'memo_done', memoText: 'テスト記録' });
    if (i % 4 === 0) sessions.push({ id:'s'+i, startedAt: now - i*day + 22*3600000, endedAt: now - i*day + 22.2*3600000, personaId:'haru', messages: [] });
  }

  const seed = {
    onboarded: true, nickname: 'たろう', apiKey: '',
    selectedPersonaId: 'mina', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods, sessions, reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs,
    forest: { checkinDays: 7, startedAt: now - 14*day, lastCheckinDate: today, completedAt: null },
    directionGoal: { key: 'reduce_overthinking', title: '考えすぎる時間を少し減らしたい', status: 'active', selectedAt: now - 14*day },
    directionGoalPromptShown: true,
    userStateSurvey: { lifeStatus: 'mixed', actionType: 'app_only', duration: 'one' },
    weekTheme: {
      weekStartDate: week.start, weekEndDate: week.end,
      key: 'act_ai_one_line', category: 'AI',
      title: '頭の中にためすぎず、少しずつ外に出してみる',
      description: '考えを全部整理しきらなくても大丈夫。',
      goalKey: 'reduce_overthinking', goalTitle: '考えすぎる時間を少し減らしたい',
      actions: [
        { id:'act_ai_one_line', title:'もやもやしたらAIに一言だけ話す', desc:'うまく話せなくても、短く始めれば十分。', type:'app', difficulty:'easy', duration:1, ctaAct:'start-chat' },
        { id:'act_one_event',   title:'今日いちばん気になったことを1つ残す', desc:'全部じゃなくて、1つだけでいい。', type:'daily', difficulty:'easy', duration:1, ctaAct:'goto-mood' },
        { id:'act_breath_10s',  title:'10秒だけ呼吸する', desc:'長くやらなくていい。', type:'daily', difficulty:'easy', duration:1, ctaAct:'goto-rescue' }
      ],
      status: 'accepted', acceptedAt: now - 2*day
    }
  };

  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  const scr = async (name) => { await page.screenshot({ path: `test-results/ui/uiux_${name}.png`, fullPage: true }); };

  // 01 Home (設定済みユーザー)
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await scr('01_home_normal');

  // 02 Home - 目標未設定ユーザー
  const unsetSeed = { ...seed, directionGoal: null };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), unsetSeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  await scr('02_home_goal_unset');

  // 戻す
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // 03 はなすタブ
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(400);
  await scr('03_talk');

  // 04 chat (feel モード開始)
  await page.evaluate(() => {
    chatState.session = null;
    chatState.mode = 'feel';
    chatState.modeStartedAt = Date.now();
    App.go('chat');
  });
  await page.waitForTimeout(500);
  await scr('04_chat_feel');

  // 05 カレンダー
  await page.evaluate(() => App.go('calendar'));
  await page.waitForTimeout(400);
  await scr('05_calendar');

  // 06 きろく・週次
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(400);
  await scr('06_history_week');

  // 07 きろく・月次
  await page.evaluate(() => { historyTopTab = 'month'; App.go('history'); });
  await page.waitForTimeout(400);
  await scr('07_history_month');

  // 08 きろく・履歴
  await page.evaluate(() => { historyTopTab = 'all'; App.go('history'); });
  await page.waitForTimeout(400);
  await scr('08_history_list');

  // 09 設定
  await page.evaluate(() => App.go('settings'));
  await page.waitForTimeout(400);
  await scr('09_settings');

  // 10 ひといき
  await page.evaluate(() => { rescueState = { flowId: null, stepIdx: 0, picks: [] }; App.go('rescue'); });
  await page.waitForTimeout(400);
  await scr('10_rescue');

  // 11 もやもや整理
  await page.evaluate(() => { startNewReflection(); App.go('reflect'); });
  await page.waitForTimeout(400);
  await scr('11_reflect');

  // 12 action suggest
  await page.evaluate(() => {
    actionSuggestState = { proposals: [], selected: [], mode: 'change', isAiLoading: false, aiSuccess: false };
    prepareActionSuggestions({ skipAi: true });
    App.go('actionSuggest');
  });
  await page.waitForTimeout(400);
  await scr('12_action_suggest');

  // 13 完了モーダル (memo型)
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(300);
  await page.evaluate(() => openActionLogModal('act_one_event'));
  await page.waitForTimeout(300);
  await scr('13_memo_modal');

  // 14 完了モーダル (instant型)
  await page.evaluate(() => { closeModal(); openActionLogModal('act_breath_10s'); });
  await page.waitForTimeout(300);
  await scr('14_instant_modal');

  // 15 完了モーダル (choice型) — 選択肢モーダル
  await page.evaluate(() => {
    closeModal();
    openActionLogModal('act_ai_one_line'); // ai_assist になる
  });
  await page.waitForTimeout(300);
  await scr('15_ai_assist_modal');

  // 16 方向性ゴール画面
  await page.evaluate(() => { closeModal(); App.go('directionGoalSetup'); });
  await page.waitForTimeout(400);
  await scr('16_direction_goal_setup');

  // 17 状態設問 STEP1
  await page.evaluate(() => {
    stateSurveyStep = 0;
    stateSurveyDraft = { lifeStatus: null, actionType: null, duration: null };
    App.go('stateSurvey');
  });
  await page.waitForTimeout(400);
  await scr('17_state_survey');

  // 18 完了画面 (達成バッジ込み)
  await page.evaluate(() => {
    openActionDoneCelebration(
      { id: 'act_one_event', title: '今日いちばん気になったことを1つ残す' },
      { execType: 'memo_done', memoText: '今日はやらなかった仕事があった' }
    );
  });
  await page.waitForTimeout(400);
  await scr('18_completion');

  await browser.close();
  console.log('done — 18 screenshots saved to test-results/ui/uiux_*.png');
})();
