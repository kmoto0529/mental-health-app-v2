#!/usr/bin/env node
/**
 * すぷらん画像アセット 配置確認スクリプト
 *
 * ChatGPT (DALL-E) で生成して保存した PNG が、想定パスに揃っているかを確認する。
 *
 * 使い方:
 *   node test-harness/verify-suplan-assets.js
 *
 * 出力:
 *   - 配置済 / 未配置の件数
 *   - 未配置のリスト (どの Step を生成すれば良いか分かる)
 *   - 想定外のファイルが置かれていれば警告
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'aside-prototype', 'assets', 'suplan');

// 想定するファイル一覧 (ChatGPT バッチシートの 30 Step に対応)
const EXPECTED = [
  // base (1)
  { step: 1,  rel: 'base.png' },

  // expressions (8)
  { step: 2,  rel: 'expressions/happy.png' },
  { step: 3,  rel: 'expressions/relieved.png' },
  { step: 4,  rel: 'expressions/effort.png' },
  { step: 5,  rel: 'expressions/slightAnxious.png' },
  { step: 6,  rel: 'expressions/thinking.png' },
  { step: 7,  rel: 'expressions/surprised.png' },
  { step: 8,  rel: 'expressions/excited.png' },
  { step: 9,  rel: 'expressions/thanks.png' },

  // poses (6)
  { step: 10, rel: 'poses/hello.png' },
  { step: 11, rel: 'poses/thanks.png' },
  { step: 12, rel: 'poses/ganbatte.png' },
  { step: 13, rel: 'poses/think_with.png' },
  { step: 14, rel: 'poses/otsukare.png' },
  { step: 15, rel: 'poses/see_you.png' },

  // seasonal (4)
  { step: 16, rel: 'seasonal/spring.png' },
  { step: 17, rel: 'seasonal/summer.png' },
  { step: 18, rel: 'seasonal/autumn.png' },
  { step: 19, rel: 'seasonal/winter.png' },

  // family (6)
  { step: 20, rel: 'family/mother.png' },
  { step: 21, rel: 'family/father.png' },
  { step: 22, rel: 'family/brother.png' },
  { step: 23, rel: 'family/sister.png' },
  { step: 24, rel: 'family/baby.png' },
  { step: 25, rel: 'family/family_group.png' },

  // daily (5)
  { step: 26, rel: 'daily/quietly_beside.png' },
  { step: 27, rel: 'daily/thinking_together.png' },
  { step: 28, rel: 'daily/taking_breather.png' },
  { step: 29, rel: 'daily/cheer_small_step.png' },
  { step: 30, rel: 'daily/sweet_dreams.png' },
];

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const placed = [];
const missing = [];

for (const item of EXPECTED) {
  const full = path.join(ASSETS, item.rel);
  if (fs.existsSync(full)) {
    const stat = fs.statSync(full);
    placed.push({ ...item, size: stat.size, full });
  } else {
    missing.push(item);
  }
}

// 想定外の PNG (アセット直下を再帰スキャン)
function scanPngs(dir, base = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'icon' || name === 'scenes') continue;  // 別目的なので除外
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...scanPngs(full, rel));
    } else if (name.endsWith('.png')) {
      out.push(rel);
    }
  }
  return out;
}

const allPngs = scanPngs(ASSETS);
const expectedRels = new Set(EXPECTED.map(e => e.rel.replace(/\\/g, '/')));
const unexpected = allPngs.filter(p => !expectedRels.has(p.replace(/\\/g, '/')));

// 出力
console.log('======================================================');
console.log('すぷらん画像アセット 配置確認');
console.log('======================================================');
console.log(`配置済: ${placed.length} / ${EXPECTED.length}`);
console.log(`未配置: ${missing.length}`);
console.log('');

if (missing.length > 0) {
  console.log('--- 未配置 (この Step を生成・保存してください) ---');
  for (const m of missing) {
    console.log(`  Step ${String(m.step).padStart(2)}: ${m.rel}`);
  }
  console.log('');
  console.log('  → company/design/characters/suplan_v1_chatgpt_batch_2026-05.md');
  console.log('     の該当 Step を ChatGPT に貼って生成してください');
  console.log('');
}

if (placed.length > 0) {
  console.log('--- 配置済 ---');
  for (const p of placed) {
    console.log(`  ✅ Step ${String(p.step).padStart(2)}: ${p.rel}  (${fmtSize(p.size)})`);
  }
  console.log('');
}

if (unexpected.length > 0) {
  console.log('--- 想定外のファイル (削除候補) ---');
  for (const u of unexpected) console.log(`  ⚠  ${u}`);
  console.log('');
}

console.log('======================================================');
if (missing.length === 0) {
  console.log('🎉 全 30 枚配置完了!  アプリ側はコード変更不要で自動読込。');
  process.exit(0);
} else {
  console.log(`残り ${missing.length} 枚です。`);
  process.exit(1);
}
