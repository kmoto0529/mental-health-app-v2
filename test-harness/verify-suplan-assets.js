#!/usr/bin/env node
/**
 * すぷらん画像アセット 配置確認スクリプト
 *
 * Phase 1 (MVP・必須 6 枚) と Phase 2 (作り置き・任意 25 枚) を分けて評価。
 * Phase 1 が揃った時点でアプリは綺麗に動く。
 *
 * 使い方:
 *   node test-harness/verify-suplan-assets.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'aside-prototype', 'assets', 'suplan');

// ----- Phase 1 (MVP・必須 6 枚) -----
// 実コードで実際に呼ばれる画像セット。これが揃えばアプリ全画面が綺麗に表示される。
const REQUIRED = [
  { step: 1, rel: 'base.png',                    note: '基本 (calm 表情のデフォルト)' },
  { step: 2, rel: 'expressions/happy.png',       note: '元気な時・多くの CTA' },
  { step: 3, rel: 'expressions/sad.png',         note: 'mood 1-2 で動的表示される寄り添い表情' },
  { step: 4, rel: 'poses/heart.png',             note: 'すぷらん紹介モーダル「あなたの味方」' },
  { step: 5, rel: 'poses/bulb.png',              note: '気づき・深堀り' },
  { step: 6, rel: 'poses/watering.png',          note: '行動を育てる/育成系' },
];

// ----- Phase 2 (作り置き・任意 25 枚) -----
// 無くても base.png にフォールバックして動作する追加バリエーション。
const OPTIONAL = [
  // 表情
  { step: 7,  rel: 'expressions/relieved.png' },
  { step: 8,  rel: 'expressions/effort.png' },
  { step: 9,  rel: 'expressions/slightAnxious.png' },
  { step: 10, rel: 'expressions/thinking.png' },
  { step: 11, rel: 'expressions/surprised.png' },
  { step: 12, rel: 'expressions/excited.png' },
  { step: 13, rel: 'expressions/thanks.png' },
  // ポーズ
  { step: 14, rel: 'poses/blanket.png' },
  { step: 15, rel: 'poses/cup.png' },
  { step: 16, rel: 'poses/sleeping.png' },
  // 季節
  { step: 17, rel: 'seasonal/spring.png' },
  { step: 18, rel: 'seasonal/summer.png' },
  { step: 19, rel: 'seasonal/autumn.png' },
  { step: 20, rel: 'seasonal/winter.png' },
  // 家族
  { step: 21, rel: 'family/mother.png' },
  { step: 22, rel: 'family/father.png' },
  { step: 23, rel: 'family/brother.png' },
  { step: 24, rel: 'family/sister.png' },
  { step: 25, rel: 'family/baby.png' },
  { step: 26, rel: 'family/family_group.png' },
  // 日常
  { step: 27, rel: 'daily/quietly_beside.png' },
  { step: 28, rel: 'daily/thinking_together.png' },
  { step: 29, rel: 'daily/taking_breather.png' },
  { step: 30, rel: 'daily/cheer_small_step.png' },
  { step: 31, rel: 'daily/sweet_dreams.png' },
];

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function check(items) {
  const placed = [];
  const missing = [];
  for (const item of items) {
    const full = path.join(ASSETS, item.rel);
    if (fs.existsSync(full)) {
      const stat = fs.statSync(full);
      placed.push({ ...item, size: stat.size, full });
    } else {
      missing.push(item);
    }
  }
  return { placed, missing };
}

const phase1 = check(REQUIRED);
const phase2 = check(OPTIONAL);

console.log('======================================================');
console.log('すぷらん画像アセット 配置確認');
console.log('======================================================');
console.log(`Phase 1 (MVP・必須):  ${phase1.placed.length} / ${REQUIRED.length}`);
console.log(`Phase 2 (作り置き):  ${phase2.placed.length} / ${OPTIONAL.length}`);
console.log('');

// --- Phase 1 詳細 ---
console.log('--- Phase 1 (MVP・必須 6 枚) ---');
for (const item of REQUIRED) {
  const found = phase1.placed.find(p => p.rel === item.rel);
  if (found) {
    console.log(`  ✅ Step ${String(item.step).padStart(2)}: ${item.rel}  (${fmtSize(found.size)})  — ${item.note}`);
  } else {
    console.log(`  ⬜ Step ${String(item.step).padStart(2)}: ${item.rel}  — ${item.note}`);
  }
}
console.log('');

// --- Phase 2 詳細 (配置済のみコンパクト表示、未配置は件数のみ) ---
if (phase2.placed.length > 0) {
  console.log('--- Phase 2 配置済 ---');
  for (const p of phase2.placed) {
    console.log(`  ✅ Step ${String(p.step).padStart(2)}: ${p.rel}  (${fmtSize(p.size)})`);
  }
  console.log('');
}
if (phase2.missing.length > 0) {
  console.log(`--- Phase 2 未配置 (${phase2.missing.length} 枚) ---`);
  console.log('  ※ 任意。時間あるとき1〜2枚ずつでOK');
  for (const m of phase2.missing) {
    console.log(`  ⬜ Step ${String(m.step).padStart(2)}: ${m.rel}`);
  }
  console.log('');
}

console.log('======================================================');
if (phase1.missing.length === 0 && phase2.missing.length === 0) {
  console.log('🎉 全 31 枚配置完了!');
  process.exit(0);
} else if (phase1.missing.length === 0) {
  console.log(`🎉 Phase 1 (MVP) 完了!  アプリ側はコード変更不要で自動読込。`);
  console.log(`   Phase 2 は時間あるとき (残り ${phase2.missing.length} 枚)`);
  process.exit(0);
} else {
  console.log(`⏳ Phase 1 残り ${phase1.missing.length} 枚です。`);
  console.log(`   company/design/characters/suplan_v1_chatgpt_batch_2026-05.md`);
  console.log(`   の該当 Step を ChatGPT に貼って生成してください。`);
  process.exit(1);
}
