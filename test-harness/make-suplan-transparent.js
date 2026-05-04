#!/usr/bin/env node
/**
 * すぷらん画像の白背景を flood-fill で透過化する
 *
 * 背景: ChatGPT (DALL-E) が「transparent background」指定を無視して
 *      RGB PNG (alpha無し) を返すケースがあり、ダークモードで白い四角が浮く。
 * 解決: 4隅の白ピクセルから BFS flood-fill。たどり着けたピクセルだけ
 *      alpha=0 にする。中央のクリーム色のボディは隣接で繋がっていないので
 *      侵食されない。
 *
 * 使い方:
 *   node test-harness/make-suplan-transparent.js                  全PNG処理
 *   node test-harness/make-suplan-transparent.js poses/bulb.png   1枚だけ
 *   node test-harness/make-suplan-transparent.js --dry            判定だけ
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'aside-prototype', 'assets', 'suplan');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const targets = args.filter(a => !a.startsWith('--'));

// しきい値: 背景判定
//   - R, G, B すべて >= 240  (≒ 94% 以上の明るさ)
//   - |R-G|, |G-B| <= 8       (彩度が低い)
// → 純白〜淡いオフホワイトだけマッチ。クリーム色 (R≈250,G≈245,B≈230) は除外。
const BG_MIN = 240;
const SAT_MAX = 8;

function isBg(buf, idx) {
  const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
  if (r < BG_MIN || g < BG_MIN || b < BG_MIN) return false;
  if (Math.abs(r - g) > SAT_MAX) return false;
  if (Math.abs(g - b) > SAT_MAX) return false;
  return true;
}

async function process1(rel) {
  const file = path.join(ASSETS, rel);
  if (!fs.existsSync(file)) {
    console.log(`  ⏭  ${rel}  (存在しない)`);
    return { skipped: true };
  }

  // 既に alpha 付きで透過済みかチェック
  const meta = await sharp(file).metadata();
  if (meta.channels === 4 && meta.hasAlpha) {
    // alpha チャンネルは持っているが全ピクセル不透明な場合もあるので一応続行できる
    // 簡易: 隅が alpha < 255 なら既に処理済みとみなしスキップ
    const { data: probeData } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    if (probeData[3] < 250) {
      console.log(`  ✅ ${rel}  (既に透過済み — スキップ)`);
      return { skipped: true };
    }
  }

  // RGBA raw に展開
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const buf = Buffer.from(data);

  // 4 隅から BFS flood-fill
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qHead = 0, qTail = 0;

  function tryEnqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    if (!isBg(buf, i * 4)) return;
    visited[i] = 1;
    queue[qTail++] = i;
  }

  tryEnqueue(0, 0);
  tryEnqueue(w - 1, 0);
  tryEnqueue(0, h - 1);
  tryEnqueue(w - 1, h - 1);

  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % w;
    const y = (i / w) | 0;
    buf[i * 4 + 3] = 0;  // alpha 0
    tryEnqueue(x - 1, y);
    tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1);
    tryEnqueue(x, y + 1);
  }

  const filled = qTail;
  const total = w * h;
  const pct = (filled / total * 100).toFixed(1);

  if (DRY) {
    console.log(`  📝 ${rel}  → 透過化対象 ${filled.toLocaleString()}px / ${total.toLocaleString()} (${pct}%)`);
    return { dry: true };
  }

  // 元ファイルにバックアップ拡張子
  const backup = file + '.bak';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(file);

  const newSize = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ✅ ${rel}  → ${pct}% 透過 / ${newSize}KB (元: ${backup})`);
  return { ok: true, pct };
}

(async () => {
  // 既定の処理対象 (alpha が無い 4 枚)
  const defaultRels = [
    'expressions/happy.png',
    'poses/heart.png',
    'poses/bulb.png',
    'poses/watering.png',
  ];
  const list = targets.length > 0 ? targets : defaultRels;

  console.log('========================================');
  console.log('すぷらん画像 白背景透過化');
  console.log(`  対象: ${list.length} 件 / dry-run=${DRY}`);
  console.log('========================================');

  for (const rel of list) await process1(rel);

  console.log('\n完了。元ファイルは <name>.png.bak に退避済み (不要なら削除可)。');
})().catch(e => { console.error(e); process.exit(1); });
