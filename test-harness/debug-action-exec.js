const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  // 4タイプ代表を持つテーマを seed
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
    moods: [{ id: 'm1', date: today, score: 3, comment: '', checkedAt: now }],
    sessions: [], reflections: [], crisisLogs: [], rescueHistory: [], actionLogs: [],
    forest: { checkinDays: 3, startedAt: now, lastCheckinDate: null, completedAt: null },
    directionGoal: { key: 'organize_feelings', title: '気持ちを整理できるようになりたい', status: 'active', selectedAt: now },
    directionGoalPromptShown: true,
    weekTheme: {
      weekStartDate: week.start, weekEndDate: week.end,
      key: 'act_breath_10s', category: 'AI', title: '少しずつ外に出してみる', description: '',
      goalKey: 'organize_feelings', goalTitle: '気持ちを整理できるようになりたい',
      actions: [
        { id:'act_breath_10s', title:'10秒だけ呼吸する',            desc:'長くやらなくていい。', type:'daily', difficulty:'easy',   duration:1, ctaAct:'goto-rescue' },
        { id:'act_one_event',  title:'今日いちばん気になったことを1つ残す', desc:'1つだけでいい。',   type:'daily', difficulty:'easy',   duration:1, ctaAct:'goto-mood' },
        { id:'act_ai_one_line',title:'もやもやしたらAIに一言だけ話す',  desc:'短く始めれば十分。',    type:'app',   difficulty:'easy',   duration:1, ctaAct:'start-chat' }
      ],
      status: 'accepted', acceptedAt: now
    }
  };
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.evaluate((s) => localStorage.setItem('aside_prototype_state_v1', JSON.stringify(s)), seed);
  await page.goto('http://localhost:8765/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });

  // ホーム: CTAラベル確認
  await page.evaluate(() => App.go('goal'));
  await page.waitForTimeout(400);
  const ctas = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.today-action-log')).map(b => b.textContent.trim());
  });
  console.log('今日の行動CTA:', ctas);
  await page.screenshot({ path: 'test-results/ui/c0_today_actions_cta.png', fullPage: true });

  // instant 型モーダル
  await page.evaluate(() => openActionLogModal('act_breath_10s'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/c1_instant_modal.png', fullPage: true });

  // memo 型モーダル
  await page.evaluate(() => { closeModal(); openActionLogModal('act_one_event'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/c2_memo_modal.png', fullPage: true });

  // ai_assist 型モーダル
  await page.evaluate(() => { closeModal(); openActionLogModal('act_ai_one_line'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui/c3_ai_assist_modal.png', fullPage: true });

  // memo 保存のend-to-end
  await page.evaluate(() => { closeModal(); openActionLogModal('act_one_event'); });
  await page.waitForTimeout(200);
  await page.fill('#execMemoInput', '今日は返信を1つ返す');
  await page.click('[data-act="exec-memo-save"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ui/c4_memo_completion.png', fullPage: true });

  // 完了画面の確認
  const doneTitle = await page.evaluate(() => {
    const el = document.querySelector('.modal .modal-title');
    return el ? el.textContent : null;
  });
  console.log('完了画面タイトル:', doneTitle);

  await browser.close();
  console.log('\ndone');
})();
