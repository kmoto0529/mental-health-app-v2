#!/usr/bin/env node
/**
 * Aside UI 検証ハーネス
 * Playwrightでモバイルビューポートに各画面をレンダリングし、
 * スクリーンショット＋DOMメトリクスで UI 課題を自動検出する。
 */

const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8765';
const OUT_DIR = path.join(__dirname, '..', 'test-results', 'ui');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 事前シード（localStorage）で各画面の状態を再現
const SEED_STATE = {
  onboarded: true,
  nickname: 'テスト太郎',
  apiKey: '',
  apiModel: 'gemini-2.5-flash',
  personaNames: {},
  selectedPersonaId: 'haru',
  profile: { age: 'hide', gender: 'hide' },
  notificationTime: '08:00',
  lastLoginDate: null,
  currentSaying: null,
  currentSayingKind: null,
  forest: { checkinDays: 5, lastCheckinDate: null, startedAt: Date.now() - 5 * 86400000, completedAt: null },
  engagement: { dates: Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  }) },
  moods: [
    { id: 'm1', date: (() => { const d = new Date(); return d.toISOString().slice(0, 10); })(), score: 3, comment: '午前中はだるかったけど、昼から少し持ち直した', checkedAt: Date.now() },
    { id: 'm2', date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })(), score: 2, comment: '', checkedAt: Date.now() - 86400000 },
    { id: 'm3', date: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(), score: 4, comment: 'いい日だった', checkedAt: Date.now() - 2 * 86400000 }
  ],
  sessions: [
    {
      id: 's1', startedAt: Date.now() - 3600000, endedAt: Date.now() - 1800000,
      moodCheckId: 'm1', moodScore: 3,
      messages: [
        { role: 'user', content: 'なんか疲れた', timestamp: Date.now() - 3600000 },
        { role: 'assistant', content: 'そうなんですね、お疲れさま。\nどんな疲れでしょうか？', choices: ['体の疲れ', '気の疲れ', '人疲れ', 'うまく言えない'], timestamp: Date.now() - 3590000 },
        { role: 'user', content: '気の疲れ', timestamp: Date.now() - 3580000 },
        { role: 'assistant', content: '気の疲れ、じわじわ効いてきますよね。\n今日は何か神経使うことがありましたか？', choices: ['会議続き', '人と話した', '何となく', 'うまく言えない'], timestamp: Date.now() - 3570000 },
        { role: 'user', content: '会議続き', timestamp: Date.now() - 3560000 },
        { role: 'assistant', content: '会議続きはほんと消耗しますよね。\n一息つける時間はありましたか？', choices: ['少しだけ', 'なかった', 'これから', 'うまく言えない'], timestamp: Date.now() - 3550000 }
      ]
    },
    {
      id: 's2', startedAt: Date.now() - 86400000 * 2, endedAt: Date.now() - 86400000 * 2 + 600000,
      moodCheckId: 'm3', moodScore: 4,
      messages: [
        { role: 'user', content: '嬉しいことがあった', timestamp: Date.now() - 86400000 * 2 },
        { role: 'assistant', content: 'それは素敵ですね。\nどんな嬉しいことがあったんですか？', choices: ['褒められた', '達成した', '予想外', 'うまく言えない'], timestamp: Date.now() - 86400000 * 2 + 10000 }
      ]
    }
  ],
  reflections: [
    {
      id: 'r1', startedAt: Date.now() - 7200000, completedAt: Date.now() - 7100000,
      event: '上司から細かく修正指示を受けた',
      thoughts: '自分はやっぱり仕事ができない、また失敗した',
      emotionBefore: { id: 'sad', label: '落ち込み', emoji: '😔', score: 7 },
      emotionAfter: { id: 'sad', label: '落ち込み', emoji: '😔', score: 4 },
      alternativesAI: [
        { uid: 'a1', tag: '事実を見る', text: '修正指示は改善の機会かもしれません。' },
        { uid: 'a2', tag: '視点を変える', text: '同じ状況の友達がいたら何と声をかけますか。' },
        { uid: 'a3', tag: '小さな一歩', text: '今回の指摘を一つだけ次回に活かせそうです。' }
      ],
      alternativesPicked: ['a1'],
      alternativeCustom: ''
    }
  ],
  crisisLogs: [],
  goal: { mainConcern: '仕事のストレス', aspiration: '心穏やかに過ごせる毎日', checkpoints: [{ date: new Date().toISOString().slice(0, 10), score: 5 }], subgoals: [{ id: 'sg1', title: '朝7時にカーテンを開ける', progress: 6, createdAt: Date.now() - 86400000 * 3, history: [] }] }
};

async function setupPage(page) {
  await page.goto(BASE + '/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  // localStorageにシード投入
  await page.evaluate((seedJson) => {
    localStorage.setItem('aside_prototype_state_v1', seedJson);
  }, JSON.stringify(SEED_STATE));
  await page.goto(BASE + '/index.html?_=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function auditScreen(page, name, gotoFn) {
  if (gotoFn) await gotoFn(page);
  await page.waitForTimeout(400);

  // スクリーンショット
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
  const fullPath = path.join(OUT_DIR, `${name}_full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });

  // DOM メトリクス取得
  const metrics = await page.evaluate(() => {
    const issues = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 1. body/html 横オーバーフロー（横スクロール発生）
    const bodyW = document.body.scrollWidth;
    if (bodyW > vw + 2) issues.push({ kind: 'horizontal_overflow', detail: `body ${bodyW}px > viewport ${vw}px` });

    // 2. 各要素が viewport 幅を超えているか
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 && r.left < vw) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${String(el.className).split(' ')[0]}` : '';
        issues.push({ kind: 'element_overflow', detail: `${tag}${cls} width=${Math.round(r.width)} left=${Math.round(r.left)}` });
      }
    });

    // 3. 固定要素（bottom-nav）のz-indexと配置
    const nav = document.querySelector('.bottom-nav');
    let navHeight = 0;
    if (nav) {
      const r = nav.getBoundingClientRect();
      navHeight = r.height;
      if (r.bottom > vh + 2) issues.push({ kind: 'nav_below_viewport', detail: `nav.bottom=${Math.round(r.bottom)} vh=${vh}` });
    }

    // 4. コンテンツが bottom-nav に隠れていないか（末尾要素の底部 vs navトップ）
    const lastVisible = document.querySelector('.home-content, .history-list, .letter-body, .chat-input-area');
    if (lastVisible && nav) {
      const r = lastVisible.getBoundingClientRect();
      const navR = nav.getBoundingClientRect();
      if (r.bottom > navR.top + 4 && lastVisible.scrollHeight <= lastVisible.clientHeight + 10) {
        // スクロール領域じゃないのに nav と被ってる
        issues.push({ kind: 'content_under_nav', detail: `${lastVisible.className} bottom=${Math.round(r.bottom)} navTop=${Math.round(navR.top)}` });
      }
    }

    // 5. スクロールできない構造なのに overflow してる
    const screens = document.querySelectorAll('.screen.active');
    screens.forEach(s => {
      const r = s.getBoundingClientRect();
      const contentH = s.scrollHeight;
      if (contentH > vh + 20 && !['auto','scroll'].includes(getComputedStyle(s).overflowY)) {
        // screen 自体 or body がスクロールする必要があるが、body のスクロール高さを見る
        const bodyScrollH = document.documentElement.scrollHeight;
        if (bodyScrollH <= vh + 10 && contentH > vh + 20) {
          issues.push({ kind: 'content_not_scrollable', detail: `screen h=${contentH} vh=${vh}, body scrollH=${bodyScrollH}` });
        }
      }
    });

    // 6. チャット系画面の chat-messages スクロール領域確認
    const cm = document.querySelector('.chat-messages');
    if (cm) {
      const r = cm.getBoundingClientRect();
      const cs = getComputedStyle(cm);
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') {
        issues.push({ kind: 'chat_messages_no_scroll', detail: `overflowY=${cs.overflowY}` });
      }
      if (r.height < 100) issues.push({ kind: 'chat_messages_too_short', detail: `h=${Math.round(r.height)}` });
    }

    // 7. テキスト要素のはみ出し（white-space: nowrap の要素が切れてないか）
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length > 0) return; // テキストノードがある末端のみ
      const txt = (el.textContent || '').trim();
      if (!txt || txt.length < 4) return;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') {
        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${String(el.className).split(' ')[0]}` : '';
        if (!['svg','path','line','circle','polyline','polygon','rect'].includes(tag)) {
          issues.push({ kind: 'text_truncated', detail: `${tag}${cls} scrollW=${el.scrollWidth} clientW=${el.clientWidth} text="${txt.slice(0, 30)}"` });
        }
      }
    });

    return {
      viewport: { vw, vh },
      navHeight,
      bodyScrollHeight: document.documentElement.scrollHeight,
      issues
    };
  });

  return { name, metrics };
}

const gotoGoal = async (page) => { await page.evaluate(() => { App.go('goal'); }); };
const gotoTalk = async (page) => { await page.evaluate(() => { App.go('talk'); }); };
const gotoCalendar = async (page) => { await page.evaluate(() => { App.go('calendar'); }); };
const gotoHistoryChat = async (page) => { await page.evaluate(() => { historyTopTab='list'; historyFilter = 'chat'; App.go('history'); }); };
const gotoHistoryReflect = async (page) => { await page.evaluate(() => { historyTopTab='list'; historyFilter = 'reflect'; App.go('history'); }); };
const gotoHistoryWeek = async (page) => { await page.evaluate(() => { historyTopTab='week'; App.go('history'); }); };
const gotoHistoryMonth = async (page) => { await page.evaluate(() => { historyTopTab='month'; App.go('history'); }); };
const gotoChat = async (page) => { await page.evaluate(() => { state.currentSessionId = 's1'; chatState.session = state.sessions.find(s => s.id === 's1'); chatState.session.endedAt = null; const lastAi = [...chatState.session.messages].reverse().find(m => m.role === 'assistant'); chatState.currentChoices = lastAi?.choices || []; App.go('chat'); }); };
const gotoHistoryDetailChat = async (page) => { await page.evaluate(() => { historyDetailId = 's1'; historyDetailKind = 'chat'; App.go('historyDetail'); }); };
const gotoHistoryDetailReflect = async (page) => { await page.evaluate(() => { historyDetailId = 'r1'; historyDetailKind = 'reflect'; App.go('historyDetail'); }); };
const gotoInsights = async (page) => { await page.evaluate(() => { App.go('insights'); }); };
const gotoSettings = async (page) => { await page.evaluate(() => { App.go('settings'); }); };
const gotoMood = async (page) => { await page.evaluate(() => { moodDraft = { score: null, comment: '' }; App.go('mood'); }); };
const gotoRescue = async (page) => { await page.evaluate(() => { rescueState = { flowId: null, stepIdx: 0, picks: [] }; App.go('rescue'); }); };
const gotoRescueFlow = async (page) => { await page.evaluate(() => { rescueState = { flowId: 'fuzzy', stepIdx: 0, picks: [] }; App.go('rescueFlow'); }); };
const gotoMiniExp = async (page) => { await page.evaluate(() => { miniExpState = { phase: 'pick', moodScore: null }; App.go('miniExperience'); }); };
const gotoMiniExpResponse = async (page) => { await page.evaluate(() => { miniExpState = { phase: 'response', moodScore: 3 }; App.go('miniExperience'); }); };
const gotoNightEntry = async (page) => { await page.evaluate(() => { nightState = newNightState(); App.go('nightRescue'); }); };
const gotoNightState = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.phase = 'state'; App.go('nightRescue'); }); };
const gotoNightAck = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.stateChoice = 'tomorrow'; nightState.phase = 'ack'; App.go('nightRescue'); }); };
const gotoNightChoose = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.stateChoice = 'nohalt'; nightState.phase = 'choose'; App.go('nightRescue'); }); };
const gotoNightBreath = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.branch = 'A'; nightState.phase = 'a2'; App.go('nightRescue'); }); };
const gotoNightBLabel = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.branch = 'B'; nightState.phase = 'b2'; App.go('nightRescue'); }); };
const gotoNightBAck = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.branch = 'B'; nightState.bLabel = 'つかれた'; nightState.bMemo = 'とにかく疲れた日'; nightState.phase = 'b4'; App.go('nightRescue'); }); };
const gotoNightCTheme = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.branch = 'C'; nightState.phase = 'c2'; App.go('nightRescue'); }); };
const gotoNightCAck = async (page) => { await page.evaluate(() => { nightState = newNightState(); nightState.branch = 'C'; nightState.cTheme = '人間関係'; nightState.cHandoff = 'まず事実だけ整理する'; nightState.cMemo = '明日の朝に事実だけ書き出す'; nightState.phase = 'c5'; App.go('nightRescue'); }); };

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  });
  const page = await context.newPage();
  await setupPage(page);

  const screens = [
    { name: '01_home', go: gotoGoal },
    { name: '02_talk', go: gotoTalk },
    { name: '03_calendar', go: gotoCalendar },
    { name: '04_history_chat', go: gotoHistoryChat },
    { name: '05_history_reflect', go: gotoHistoryReflect },
    { name: '06_chat_screen', go: gotoChat },
    { name: '07_history_detail_chat', go: gotoHistoryDetailChat },
    { name: '08_history_detail_reflect', go: gotoHistoryDetailReflect },
    { name: '09_insights', go: gotoInsights },
    { name: '10_settings', go: gotoSettings },
    { name: '11_mood', go: gotoMood },
    { name: '12_rescue', go: gotoRescue },
    { name: '13_rescue_flow', go: gotoRescueFlow },
    { name: '14_mini_exp_pick', go: gotoMiniExp },
    { name: '15_mini_exp_response', go: gotoMiniExpResponse },
    { name: '16_night_entry', go: gotoNightEntry },
    { name: '17_night_state', go: gotoNightState },
    { name: '18_night_ack', go: gotoNightAck },
    { name: '19_night_choose', go: gotoNightChoose },
    { name: '20_night_breath', go: gotoNightBreath },
    { name: '21_night_b_label', go: gotoNightBLabel },
    { name: '22_night_b_ack', go: gotoNightBAck },
    { name: '23_night_c_theme', go: gotoNightCTheme },
    { name: '24_night_c_ack', go: gotoNightCAck },
    { name: '25_history_week', go: gotoHistoryWeek },
    { name: '26_history_month', go: gotoHistoryMonth }
  ];

  const allResults = [];
  for (const s of screens) {
    console.log(`\n▶ ${s.name}...`);
    try {
      const r = await auditScreen(page, s.name, s.go);
      allResults.push(r);
      const issues = r.metrics.issues;
      console.log(`  viewport: ${r.metrics.viewport.vw}x${r.metrics.viewport.vh}, navH=${Math.round(r.metrics.navHeight)}, bodyScroll=${r.metrics.bodyScrollHeight}`);
      if (issues.length === 0) {
        console.log('  ✓ no issues');
      } else {
        // 頻出の text_truncated を集約
        const grouped = {};
        issues.forEach(i => {
          grouped[i.kind] = (grouped[i.kind] || []);
          grouped[i.kind].push(i.detail);
        });
        for (const [k, arr] of Object.entries(grouped)) {
          console.log(`  ✗ ${k} x${arr.length}`);
          arr.slice(0, 3).forEach(d => console.log(`     - ${d}`));
          if (arr.length > 3) console.log(`     - ... +${arr.length - 3}件`);
        }
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(allResults, null, 2));
  console.log(`\n結果: ${OUT_DIR}/audit.json`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
