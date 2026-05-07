// UIUX 追加点検：エッジケース/空状態/長文テキスト/特殊シーン
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

  const scr = async (name) => { await page.screenshot({ path: `test-results/ui/uiux2_${name}.png`, fullPage: true }); };

  // ===== ケース1: 新規ユーザー（全部未設定） =====
  const newUserSeed = {
    onboarded: true, nickname: '', apiKey: '',
    selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
    notificationTime: '08:00',
    moods: [], sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 0, startedAt: now, lastCheckinDate: null, completedAt: null }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), newUserSeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(300);
  await scr('01_brand_new_home');

  // ===== ケース2: 空の週次レポート =====
  await page.evaluate(() => { historyTopTab = 'week'; App.go('history'); });
  await page.waitForTimeout(300);
  await scr('02_empty_week_report');

  // ===== ケース3: 空のはなすタブ =====
  await page.evaluate(() => App.go('talk'));
  await page.waitForTimeout(300);
  await scr('03_talk_no_profile');

  // ===== ケース4: カレンダー空 =====
  await page.evaluate(() => App.go('calendar'));
  await page.waitForTimeout(300);
  await scr('04_empty_calendar');

  // ===== ケース5: 設定 (minimal) =====
  await page.evaluate(() => App.go('settings'));
  await page.waitForTimeout(300);
  await scr('05_settings_minimal');

  // ===== ケース6: welcome/onboarding =====
  const preOnboardSeed = { onboarded: false, apiKey: '' };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), preOnboardSeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await scr('06_welcome');

  // ===== ケース7: 長いニックネーム + 長い目標タイトル =====
  const longSeed = {
    onboarded: true, nickname: 'すごく長いニックネームをテスト', apiKey: '',
    selectedPersonaId: 'mina', personaNames: { mina: 'とても長いカスタム名前' },
    profile: { age: 'hide', gender: 'hide' }, notificationTime: '08:00',
    moods: [{ id:'m1', date: today, score: 3, comment: '', checkedAt: now }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [],
    actionLogs: [],
    forest: { checkinDays: 1, startedAt: now, lastCheckinDate: today, completedAt: null },
    directionGoal: { key: 'organize_feelings', title: '気持ちを整理できるようになりたい', status: 'active', selectedAt: now },
    directionGoalPromptShown: true,
    weekTheme: {
      weekStartDate: week.start, weekEndDate: week.end,
      key: 'act_a19', category: 'AI',
      title: 'AIにもやもやを話して、今週の次の一歩まで一緒に決める',
      description: '',
      goalKey: 'organize_feelings', goalTitle: '気持ちを整理できるようになりたい',
      actions: [
        { id:'act_a19', title:'AIにもやもやを話して次の一歩を決める', desc:'言葉にしたあと、そのまま今週の行動までつなげる。', type:'app', difficulty:'bold', duration:5, ctaAct:'start-chat' }
      ],
      status: 'accepted', acceptedAt: now
    }
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), longSeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(300);
  await scr('07_long_text');

  // ===== ケース8: きろく・履歴リストに大量データ =====
  const manyHistorySeed = {
    ...longSeed, nickname: 'たろう', selectedPersonaId: 'haru', personaNames: {},
    sessions: (function(){
      const arr = [];
      for (let i = 0; i < 10; i++) {
        arr.push({ id:'s'+i, startedAt: now - i*day, endedAt: now - i*day + 100000, personaId:'haru', topicStart:'なんとなくしんどい', messages:[] });
      }
      return arr;
    })(),
    reflections: [
      { id: 'r1', startedAt: now - 2*day, endedAt: now - 2*day, event: '仕事が立て込んでいて', thoughts: '自分はダメだ', emotionBefore: { id: 'sad', label: '落ち込み', emoji: '☹️', score: 7 }, alternatives: [], completedAt: now - 2*day }
    ],
    rescueHistory: [
      { id: 'rs1', flowId: 'night', startedAt: now - 1*day, endedAt: now - 1*day + 60000, linkedDate: '' }
    ]
  };
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), manyHistorySeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => { historyTopTab = 'all'; App.go('history'); });
  await page.waitForTimeout(300);
  await scr('08_history_list_many');

  // ===== ケース9: 完了モーダル streak badge（5日連続） =====
  const streakSeed = { ...manyHistorySeed };
  streakSeed.actionLogs = [];
  for (let i = 0; i < 5; i++) {
    streakSeed.actionLogs.push({ actionId: 'act_mood_one', executedAt: now - i*day, status: 'done', execType: 'memo_done' });
  }
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), streakSeed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    state.weekTheme = {
      weekStartDate: '2026-04-20', weekEndDate: '2026-04-26',
      key: 'act_mood_one', title: '自分のペースを見つけていく',
      goalTitle: '気持ちを整理できるようになりたい',
      actions: [{ id:'act_mood_one', title:'気持ちを一言だけ残す', type:'daily', difficulty:'easy', duration:1 }],
      status: 'accepted'
    };
    openActionDoneCelebration(
      { id: 'act_mood_one', title: '気持ちを一言だけ残す' },
      { execType: 'memo_done', memoText: '今日は仕事で疲れたけど、夕方には少し落ち着けた気がする' }
    );
  });
  await page.waitForTimeout(400);
  await scr('09_celebration_streak');

  // ===== ケース10: 設定（profile蓄積あり） =====
  await page.evaluate(() => { closeModal(); App.go('settings'); });
  await page.waitForTimeout(400);
  await scr('10_settings_with_profile');

  // ===== ケース11: 行動提案画面（6件） =====
  await page.evaluate(() => {
    actionSuggestState = { proposals: [], selected: [], mode: 'initial', isAiLoading: false, aiSuccess: false };
    prepareActionSuggestions({ skipAi: true });
    App.go('actionSuggest');
  });
  await page.waitForTimeout(400);
  await scr('11_action_suggest_6items');

  // ===== ケース12: テーマ確定画面 =====
  await page.evaluate(() => {
    actionSuggestState.selected = ['act_mood_one'];
    actionSuggestState.proposals = [
      { id: 'act_mood_one', title: '気持ちを一言だけ残す', desc: 'しんどい日も、ひとことだけで大丈夫。', type: 'app', difficulty: 'easy', duration: 1, aiReason:'記録を短く積み重ねる今のペースに合いそう' }
    ];
    themeConfirmState = { title: null, meaning: null, actions: [] };
    App.go('themeConfirm');
  });
  await page.waitForTimeout(400);
  await scr('12_theme_confirm');

  await browser.close();
  console.log('done — 12 screenshots saved to test-results/ui/uiux2_*.png');
})();
