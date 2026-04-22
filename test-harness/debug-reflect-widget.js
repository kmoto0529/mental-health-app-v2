const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('aside_prototype_state_v1', JSON.stringify({
      onboarded: true, nickname: 'テスト太郎', apiKey: '',
      selectedPersonaId: 'mina', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
      notificationTime: '08:00', moods: [], sessions: [], reflections: [], crisisLogs: [],
      forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null },
      directionGoalPromptShown: true
    }));
  });
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // もやもや整理をフェイクで最後まで進めて、alt カードが6つ出る状態にする
  await page.evaluate(() => {
    startNewReflection();
    reflectState.draft.event = '上司から細かく修正指示を受けた';
    reflectState.draft.thoughts = '自分はやっぱり仕事ができない、また失敗した';
    reflectState.draft.emotionBefore = { id: 'sad', label: '落ち込み', emoji: '😔', score: 7 };
    reflectState.messages = [
      { role: 'ai', text: '何があったか教えてもらえる？', widget: null, timestamp: Date.now() - 60000 },
      { role: 'user', text: '上司から細かく修正指示を受けた', timestamp: Date.now() - 50000 },
      { role: 'ai', text: 'そうなんですね。そのとき頭に浮かんだのは？', widget: null, timestamp: Date.now() - 40000 },
      { role: 'user', text: '自分はやっぱり仕事ができない、また失敗した', timestamp: Date.now() - 30000 },
      { role: 'ai', text: '気持ちの強さは？', widget: null, timestamp: Date.now() - 20000 },
      { role: 'user', text: '7', timestamp: Date.now() - 10000 },
      {
        role: 'ai',
        text: '別の角度で3つ提案してみるね。気になるのをタップして。\n+他の見方でさらに追加もできるよ。',
        widget: {
          type: 'alternatives',
          newCount: 3,
          data: [
            { uid: 'a1', tag: '事実を見る', text: '今ある情報だけでは、最悪の結論にはまだ決まっていないかもしれない。' },
            { uid: 'a2', tag: '視点を変える', text: '同じ状況にいる大切な人がいたら、自分は何て声をかけるだろう。' },
            { uid: 'a3', tag: '小さな一歩', text: '全部いっぺんに解決しなくてもいい。今夜・明日にできる、ほんの小さな一歩は何があるだろう。' },
            { uid: 'a4', tag: '時間軸', text: '今のしんどさは、1週間後、1ヶ月後にはどう見えるだろう。' },
            { uid: 'a5', tag: '自分を労う', text: 'ここまで頑張ってきた自分を、少しだけ認めてあげてもいいかも。' },
            { uid: 'a6', tag: '一人じゃない', text: 'この気持ちは、自分だけが抱えてるものじゃないかもしれない。' }
          ]
        },
        timestamp: Date.now()
      }
    ];
    reflectState.draft.alternativesAI = [
      { uid: 'a1', tag: '事実を見る', text: '今ある情報だけでは、最悪の結論にはまだ決まっていないかもしれない。' },
      { uid: 'a2', tag: '視点を変える', text: '同じ状況にいる大切な人がいたら、自分は何て声をかけるだろう。' },
      { uid: 'a3', tag: '小さな一歩', text: '全部いっぺんに解決しなくてもいい。' },
      { uid: 'a4', tag: '時間軸', text: '今のしんどさは、1週間後、1ヶ月後にはどう見えるだろう。' },
      { uid: 'a5', tag: '自分を労う', text: 'ここまで頑張ってきた自分を、少しだけ認めてあげてもいいかも。' },
      { uid: 'a6', tag: '一人じゃない', text: 'この気持ちは、自分だけが抱えてるものじゃないかもしれない。' }
    ];
    reflectState.draft.alternativesPicked = [];
    reflectState.phase = 'alternatives';
    App.go('reflect');
  });
  await page.waitForTimeout(600);
  // 上部
  await page.screenshot({ path: 'test-results/ui/50_reflect_with_widget_top.png' });

  // 下までスクロール
  await page.evaluate(() => {
    const rm = document.getElementById('reflectMessages');
    if (rm) rm.scrollTop = 0; // 一度上に
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/51_reflect_scroll_top.png' });

  await page.evaluate(() => {
    const rm = document.getElementById('reflectMessages');
    if (rm) rm.scrollTop = rm.scrollHeight;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/52_reflect_scroll_bottom.png' });

  // クリック選択テスト
  const cards = await page.$$('.alt-card');
  console.log('alt-cards count:', cards.length);
  if (cards[0]) {
    await cards[0].click();
    await page.waitForTimeout(400);
    const picked = await page.evaluate(() => reflectState.draft.alternativesPicked.length);
    console.log('picked after click:', picked);
    await page.screenshot({ path: 'test-results/ui/53_reflect_alt_picked.png' });
  }

  await browser.close();
  console.log('done');
})();
