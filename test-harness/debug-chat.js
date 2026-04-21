const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ja-JP' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('aside_prototype_state_v1', JSON.stringify({
      onboarded: true, nickname: 'テスト太郎', apiKey: '', apiModel: 'gemini-2.5-flash',
      selectedPersonaId: 'haru', personaNames: {}, profile: { age: 'hide', gender: 'hide' },
      notificationTime: '08:00', moods: [], currentSessionId: 's1',
      sessions: [{
        id: 's1', startedAt: Date.now() - 3600000, endedAt: null, moodCheckId: null, moodScore: 3,
        messages: [
          { role: 'user', content: 'なんか疲れた', timestamp: Date.now() - 3600000 },
          { role: 'assistant', content: 'そうなんですね、お疲れさま。\nどんな疲れでしょうか？', choices: ['体の疲れ', '気の疲れ', '人疲れ', 'うまく言えない'], timestamp: Date.now() - 3590000 },
          { role: 'user', content: '気の疲れ', timestamp: Date.now() - 3580000 },
          { role: 'assistant', content: '気の疲れ、じわじわ効いてきますよね。\n今日は何か神経使うことがありましたか？', choices: ['会議続き', '人と話した', '何となく', 'うまく言えない'], timestamp: Date.now() - 3570000 },
          { role: 'user', content: '会議続き', timestamp: Date.now() - 3560000 },
          { role: 'assistant', content: '会議続きはほんと消耗しますよね。\n一息つける時間はありましたか？', choices: ['少しだけ', 'なかった', 'これから', 'うまく言えない'], timestamp: Date.now() - 3550000 }
        ]
      }],
      reflections: [], crisisLogs: [],
      forest: { checkinDays: 0, startedAt: Date.now(), lastCheckinDate: null, completedAt: null }
    }));
  });
  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    state.currentSessionId = 's1';
    chatState.session = state.sessions[0];
    chatState.currentChoices = ['少しだけ', 'なかった', 'これから', 'うまく言えない'];
    App.go('chat');
  });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    console.log('--app-h:', rootStyle.getPropertyValue('--app-h'));
    const chat = document.querySelector('.chat-screen');
    const cs = getComputedStyle(chat);
    const msgs = document.querySelector('.chat-messages');
    const ms = getComputedStyle(msgs);
    const inp = document.querySelector('.chat-input-area');
    const choices = document.querySelector('.choices');
    return {
      viewport: { vw: window.innerWidth, vh: window.innerHeight, visualVH: window.visualViewport?.height },
      chat: { h: chat.getBoundingClientRect().height, top: chat.getBoundingClientRect().top, bot: chat.getBoundingClientRect().bottom, cssHeight: cs.height, overflow: cs.overflow, overflowY: cs.overflowY, display: cs.display, position: cs.position },
      msgs: { h: msgs.getBoundingClientRect().height, top: msgs.getBoundingClientRect().top, bot: msgs.getBoundingClientRect().bottom, scrollH: msgs.scrollHeight, clientH: msgs.clientHeight, cssH: ms.height, overflowY: ms.overflowY, flex: ms.flex },
      choices: choices ? { top: choices.getBoundingClientRect().top, bot: choices.getBoundingClientRect().bottom, h: choices.getBoundingClientRect().height } : null,
      input: inp ? { top: inp.getBoundingClientRect().top, bot: inp.getBoundingClientRect().bottom, h: inp.getBoundingClientRect().height } : null,
      bodyScrollH: document.documentElement.scrollHeight,
      appScrollH: document.getElementById('app').scrollHeight,
      appRect: document.getElementById('app').getBoundingClientRect(),
      appHVar: getComputedStyle(document.documentElement).getPropertyValue('--app-h'),
      docElHeight: document.documentElement.clientHeight,
      bodyHeight: document.body.clientHeight
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'test-results/ui/debug_chat.png' });
  await browser.close();
})();
