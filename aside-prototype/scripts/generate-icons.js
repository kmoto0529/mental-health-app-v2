/**
 * もやの森 アプリアイコン生成スクリプト
 *
 * 既存の assets/suplan/base.png（すぷらん）を、デザイン仕様の
 * クリーム→グリーンのグラデ + グラスヒル背景に合成してPNGアイコン群を出力する。
 *
 * 出力:
 *   icons/icon-512.png            (any)
 *   icons/icon-192.png            (any)
 *   icons/icon-maskable-512.png   (maskable: セーフゾーン内に縮小配置)
 *   icons/apple-touch-icon.png    (180x180)
 *   icons/favicon-32.png
 *   icons/favicon-16.png
 *
 * 実行: node aside-prototype/scripts/generate-icons.js
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_CHAR = path.join(ROOT, 'assets', 'suplan', 'base.png');
const OUT_DIR = path.join(ROOT, 'icons');

// デザイン仕様のカラーパレット
const COLOR = {
  ivory: '#FFF6E9',
  paleGreen: '#EAF4E3',
  lightGreen: '#A8D18D',
  green: '#7FB36A',
  peach: '#FFDCC2',
};

/**
 * 角丸スクエア (iOS風 squircle) の背景SVGを生成する。
 * @param {number} size  出力サイズ (px)
 * @param {boolean} rounded  角丸クリップを適用するか (maskable は false)
 */
function backgroundSvg(size, rounded = true) {
  const radius = Math.round(size * 0.22); // iOS app icon radius (≈22.37%)
  const clip = rounded
    ? `<clipPath id="clip"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></clipPath>`
    : '';
  const clipAttr = rounded ? ' clip-path="url(#clip)"' : '';

  // 下部のグラスヒル: 中央が盛り上がる滑らかな曲線
  const hillTop = Math.round(size * 0.72);
  const hillPeak = Math.round(size * 0.58);
  const hillRight = Math.round(size * 0.72);
  const hill = `
    <path d="M 0 ${hillTop}
             C ${size * 0.25} ${hillPeak}, ${size * 0.5} ${hillPeak * 0.95}, ${size * 0.55} ${hillPeak}
             S ${size * 0.85} ${hillRight}, ${size} ${hillTop * 0.95}
             L ${size} ${size} L 0 ${size} Z"
          fill="url(#hillGrad)" />
  `;

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="${COLOR.ivory}"/>
      <stop offset="55%" stop-color="${COLOR.ivory}"/>
      <stop offset="100%" stop-color="${COLOR.paleGreen}"/>
    </linearGradient>
    <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${COLOR.lightGreen}"/>
      <stop offset="100%" stop-color="${COLOR.green}"/>
    </linearGradient>
    ${clip}
  </defs>
  <g${clipAttr}>
    <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bgGrad)"/>
    ${hill}
  </g>
</svg>`);
}

/**
 * アイコン1枚生成。
 * @param {number} size     出力サイズ
 * @param {string} outFile  出力先絶対パス
 * @param {object} opts
 * @param {boolean} opts.rounded   角丸クリップを適用するか
 * @param {number}  opts.charScale 文字キャラの幅占有率 (0-1)
 * @param {number}  opts.charBias  Y方向の中心オフセット (px, +で下)
 */
async function makeIcon(size, outFile, opts = {}) {
  const { rounded = true, charScale = 0.78, charBias = 0 } = opts;

  // 1) 背景レイヤー
  const bgPng = await sharp(backgroundSvg(size, rounded))
    .png()
    .toBuffer();

  // 2) キャラレイヤー: base.png を charScale 倍にリサイズ
  const charSize = Math.round(size * charScale);
  const charPng = await sharp(SRC_CHAR)
    .resize(charSize, charSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3) キャラを中央配置（顔がやや上に来るよう少し上寄せ）
  const top = Math.round((size - charSize) / 2 + charBias);
  const left = Math.round((size - charSize) / 2);

  await sharp(bgPng)
    .composite([{ input: charPng, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(outFile);

  console.log(`✓ ${path.relative(ROOT, outFile)}  (${size}x${size})`);
}

(async () => {
  if (!fs.existsSync(SRC_CHAR)) {
    console.error(`source not found: ${SRC_CHAR}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // any 用 (角丸あり)
  await makeIcon(512, path.join(OUT_DIR, 'icon-512.png'),         { rounded: true,  charScale: 0.78, charBias: -8 });
  await makeIcon(192, path.join(OUT_DIR, 'icon-192.png'),         { rounded: true,  charScale: 0.78, charBias: -3 });

  // maskable 用: PWA仕様で外周20%はトリミングされうるのでキャラを縮める + 角丸なし
  await makeIcon(512, path.join(OUT_DIR, 'icon-maskable-512.png'),{ rounded: false, charScale: 0.58, charBias: -6 });

  // Apple Touch / Favicon
  await makeIcon(180, path.join(OUT_DIR, 'apple-touch-icon.png'), { rounded: true,  charScale: 0.78, charBias: -3 });
  await makeIcon(32,  path.join(OUT_DIR, 'favicon-32.png'),       { rounded: true,  charScale: 0.82, charBias: -1 });
  await makeIcon(16,  path.join(OUT_DIR, 'favicon-16.png'),       { rounded: true,  charScale: 0.86, charBias: 0  });

  console.log('done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
