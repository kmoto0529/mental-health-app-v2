#!/usr/bin/env node
/**
 * すぷらん画像 一括生成スクリプト
 *
 * プロンプト出典:
 *   company/design/characters/suplan_v1_dalle_prompts_2026-05.md
 *
 * 使い方:
 *   OPENAI_API_KEY=sk-... node test-harness/generate-suplan-assets.js
 *
 * オプション:
 *   --quality=low|medium|high   生成品質 (default: medium)
 *   --only=<category|name>      特定カテゴリ/名前だけ (例: --only=expressions, --only=happy)
 *   --force                     既存PNGを上書きする
 *   --dry                       APIを叩かずに対象一覧と概算コストだけ表示
 *   --model=gpt-image-1|dall-e-3 (default: gpt-image-1)
 *
 * 出力先:
 *   aside-prototype/assets/suplan/{category}/{name}.png
 *   aside-prototype/assets/suplan/base.png  (ベース画像のみ)
 *
 * コスト概算 (gpt-image-1, 1024x1024):
 *   low    ≈ $0.011 / 画像
 *   medium ≈ $0.042 / 画像
 *   high   ≈ $0.167 / 画像
 *   30枚 × medium ≒ $1.26
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'aside-prototype', 'assets', 'suplan');

// ---------- CLI 引数 ----------
const args = process.argv.slice(2);
const arg = (k, def) => {
  const m = args.find(a => a.startsWith(`--${k}=`));
  return m ? m.split('=')[1] : def;
};
const has = (k) => args.includes(`--${k}`);

const QUALITY = arg('quality', 'medium');
const ONLY = arg('only', null);
const MODEL = arg('model', 'gpt-image-1');
const FORCE = has('force');
const DRY = has('dry');

const API_KEY = process.env.OPENAI_API_KEY;
if (!DRY && !API_KEY) {
  console.error('❌ OPENAI_API_KEY が環境変数に設定されていません。');
  console.error('   PowerShell:  $env:OPENAI_API_KEY="sk-..."');
  console.error('   bash:        export OPENAI_API_KEY=sk-...');
  process.exit(1);
}

// ---------- 共通ベース (suplan_v1_dalle_prompts_2026-05.md §0) ----------
const BASE_PROMPT = `A small, gentle, cute mascot character named "Suplan" for a Japanese mental health
care app called "Moya no Mori" (もやの森).
Style: soft watercolor / pastel illustration, kawaii but mature enough for ages 22-28,
warm minimal palette (cream, soft green, off-white, pale pink),
extremely clean linework, no harsh shadows, calm and reassuring atmosphere.

Character base:
- A small round body, slightly egg-shaped, off-white / cream colored
- Two round black dot eyes
- Tiny pink blush circles on cheeks
- A simple kind line for the mouth (vary per emotion)
- TWO short little arms only, no fingers visible
- A pair of small sprouting cotyledon leaves on top of the head (light green)
- Sometimes a small symbol/accessory rests on top of the head
- White or transparent background, no text in image`;

// ---------- 生成タスク ----------
// isBase: true は base.png に保存 (カテゴリ無し直下)
// bg: 'opaque' は背景込みシーン (daily) 用
// size: デフォルトは 1024x1024。横長は '1536x1024' を指定
const TASKS = [
  // ----- ベース (1) -----
  { cat: 'base', name: 'base', isBase: true,
    prompt: 'Front view of Suplan, facing forward, eyes looking at viewer, gentle calm smile, two cotyledon leaves on top, two short arms hanging naturally, soft full-body pose, centered composition, transparent background.' },

  // ----- 表情 (8) -----
  { cat: 'expressions', name: 'happy',
    prompt: 'Front view of Suplan with big sparkling smile, eyes are gentle arches, light pink blush stronger.' },
  { cat: 'expressions', name: 'relieved',
    prompt: 'Front view of Suplan with half-closed eyes, soft relaxed smile, peaceful breath-out feeling.' },
  { cat: 'expressions', name: 'effort',
    prompt: 'Front view of Suplan with cheerful determined smile, a small drop of effort sweat near the temple.' },
  { cat: 'expressions', name: 'slightAnxious',
    prompt: 'Front view of Suplan with eyes looking slightly upward, mouth a tiny downward curve, hint of worry.' },
  { cat: 'expressions', name: 'thinking',
    prompt: 'Front view of Suplan with one small question mark or thought wisp floating above head, eyes glancing aside.' },
  { cat: 'expressions', name: 'surprised',
    prompt: 'Front view of Suplan with wide round eyes, a tiny exclamation mark floating above head, mouth in a small "o" shape, body slightly bouncing in surprise.' },
  { cat: 'expressions', name: 'excited',
    prompt: 'Front view of Suplan with sparkling stars inside the eyes, big upturned smile, both little arms slightly raised in anticipation.' },
  { cat: 'expressions', name: 'thanks',
    prompt: 'Front view of Suplan with eyes gently closed in gratitude, soft warm smile, a small pink heart floats near the chest.' },

  // ----- ポーズ (6) -----
  { cat: 'poses', name: 'hello',
    prompt: 'Front view of Suplan, raising one little arm in a friendly wave, smiling.' },
  { cat: 'poses', name: 'thanks',
    prompt: 'Front view of Suplan, bringing both little arms together in front of the chest, like saying thank you. Eyes gently closed in gratitude.' },
  { cat: 'poses', name: 'ganbatte',
    prompt: 'Front view of Suplan, both arms making small fists raised, cheering pose, encouraging smile.' },
  { cat: 'poses', name: 'think_with',
    prompt: 'Front view of Suplan, one arm raised toward chin in a thoughtful gesture, eyes pondering, calm smile.' },
  { cat: 'poses', name: 'otsukare',
    prompt: 'Front view of Suplan, gentle smile, eyes closed in a kind way, slight head tilt, like saying "good work".' },
  { cat: 'poses', name: 'see_you',
    prompt: 'Front view of Suplan, lightly waving one little arm goodbye, soft smile, peaceful evening atmosphere.' },

  // ----- 季節 (4) -----
  { cat: 'seasonal', name: 'spring',
    prompt: 'Front view of Suplan in spring: a tiny pink cherry blossom petal resting on the cotyledon leaves, soft pastel pink and green palette, gentle breeze atmosphere, transparent background.' },
  { cat: 'seasonal', name: 'summer',
    prompt: 'Front view of Suplan in summer: wearing a tiny straw hat over the cotyledon leaves, light summer cheer, warm cream palette, transparent background.' },
  { cat: 'seasonal', name: 'autumn',
    prompt: 'Front view of Suplan in autumn: a small red maple leaf resting on the cotyledon leaves, warm orange and yellow accents, calm autumn mood, transparent background.' },
  { cat: 'seasonal', name: 'winter',
    prompt: 'Front view of Suplan in winter: wearing a soft pastel-blue knitted scarf, cotyledon leaves lightly dusted with snow, cozy quiet atmosphere, transparent background.' },

  // ----- 家族 (6) -----
  { cat: 'family', name: 'mother',
    prompt: 'Front view of a Suplan-family character. Same round egg-shaped body, but on top of the head: a delicate flower crown made of small white five-petal blossoms intertwined with tiny green leaves (replacing the cotyledon leaves). Soft motherly smile, eyes gently arched, kind and embracing aura. Body size same as standard Suplan. Transparent background.' },
  { cat: 'family', name: 'father',
    prompt: 'Front view of a Suplan-family character. Slightly larger, more grounded body proportions. On top of the head: a small leafy bush of mature dark-green foliage (like a tiny round shrub) instead of soft cotyledons. Calm steady smile, eyes wide and kind, stable confident posture, both arms relaxed at sides. Transparent background.' },
  { cat: 'family', name: 'brother',
    prompt: 'Front view of a Suplan-family character. Slightly taller than the standard Suplan. On top of the head: two enlarged, more developed cotyledon leaves (bigger and slightly more pointed than baby Suplan). Cheerful slightly mischievous smile, one little arm casually raised in a wave. Friendly easy-going aura. Transparent background.' },
  { cat: 'family', name: 'sister',
    prompt: 'Front view of a Suplan-family character. Slightly smaller than standard Suplan. On top of the head: a single bright pink five-petal flower (replacing the cotyledons), soft pink center. Bright curious smile, large sparkling eyes, slight forward lean as if eager to explore. Transparent background.' },
  { cat: 'family', name: 'baby',
    prompt: 'Front view of a baby Suplan-family character. Distinctly smaller than the standard Suplan (about half size). On top of the head: very tiny just-emerging cotyledon leaves (smaller and softer than the standard ones). Big round innocent eyes, tiny gentle smile, soft squishy round body. Transparent background.' },
  { cat: 'family', name: 'family_group', size: '1536x1024',
    prompt: 'Group portrait of the Suplan family standing side by side: from left to right — mother (with flower crown), father (with leafy bush head), older brother (with enlarged cotyledons), younger sister (with single pink flower), and baby Suplan (very small, tiny cotyledons). All facing forward with warm gentle smiles, soft watercolor pastel palette, transparent background.' },

  // ----- 日常シーン (5・背景込み) -----
  { cat: 'daily', name: 'quietly_beside', bg: 'opaque',
    prompt: 'Suplan sitting calmly at the base of a large soft watercolor tree, dappled morning light filtering through the leaves, tiny yellow wildflowers around. Suplan looks up gently with a peaceful smile. Soft pastel forest background. NO TEXT in the image.' },
  { cat: 'daily', name: 'thinking_together', bg: 'opaque',
    prompt: 'Suplan sitting on soft soil, holding a small twig in one little arm, drawing gentle squiggles on the ground. Eyes thoughtful, slight smile. Watercolor brown-green earth tones, calm afternoon atmosphere. NO TEXT in the image.' },
  { cat: 'daily', name: 'taking_breather', bg: 'opaque',
    prompt: 'Suplan sitting cross-legged style, holding a small steaming mug between both little arms, eyes half-closed in relaxation, warm soft cozy mood. A small cushion or blanket suggested in the background. Pastel cream palette. NO TEXT in the image.' },
  { cat: 'daily', name: 'cheer_small_step', bg: 'opaque',
    prompt: 'Suplan standing front, both little arms slightly raised, surrounded by gentle soft sparkles and tiny stars. Hopeful encouraging smile, eyes bright. Soft glowing aura around the body, pastel cream + light green background. NO TEXT in the image.' },
  { cat: 'daily', name: 'sweet_dreams', bg: 'opaque',
    prompt: 'Suplan tucked under a small pastel-green soft blanket, only the upper half of its body and the cotyledon leaves visible. Eyes peacefully closed, gentle smile. Surrounded by tiny stars and a small crescent moon, dreamy night purple-blue atmosphere. NO TEXT in the image.' },
];

// gpt-image-1 価格表 (2026-04 時点の参考値、ピクセル/品質ベース概算)
const COST_TABLE = {
  '1024x1024': { low: 0.011, medium: 0.042, high: 0.167 },
  '1024x1536': { low: 0.016, medium: 0.063, high: 0.250 },
  '1536x1024': { low: 0.016, medium: 0.063, high: 0.250 },
};

function targetPath(t) {
  if (t.isBase) return path.join(ASSETS, 'base.png');
  return path.join(ASSETS, t.cat, `${t.name}.png`);
}

function estimateCost(t) {
  const size = t.size || '1024x1024';
  return COST_TABLE[size]?.[QUALITY] || 0;
}

function callImagesApi(t) {
  const fullPrompt = `${BASE_PROMPT}\n\n${t.prompt}`;
  const payload = {
    model: MODEL,
    prompt: fullPrompt,
    n: 1,
    size: t.size || '1024x1024',
  };
  if (MODEL === 'gpt-image-1') {
    payload.quality = QUALITY;
    payload.background = t.bg || 'transparent';
    payload.output_format = 'png';
  } else if (MODEL === 'dall-e-3') {
    payload.quality = QUALITY === 'high' ? 'hd' : 'standard';
    payload.response_format = 'b64_json';
  }
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${API_KEY}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 600)}`));
        }
        try {
          const j = JSON.parse(data);
          const b64 = j.data?.[0]?.b64_json;
          if (!b64) return reject(new Error('レスポンスに b64_json が無い: ' + data.slice(0, 300)));
          resolve(Buffer.from(b64, 'base64'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const tasks = ONLY ? TASKS.filter(t => t.cat === ONLY || t.name === ONLY) : TASKS;
  const totalCost = tasks.reduce((s, t) => s + estimateCost(t), 0);

  console.log(`========================================`);
  console.log(`すぷらん画像 一括生成`);
  console.log(`  対象: ${tasks.length} 件`);
  console.log(`  モデル: ${MODEL}`);
  console.log(`  品質: ${QUALITY}`);
  console.log(`  概算コスト: $${totalCost.toFixed(2)}`);
  console.log(`  上書き: ${FORCE}`);
  console.log(`  dry-run: ${DRY}`);
  console.log(`========================================\n`);

  let ok = 0, skipped = 0, failed = 0;
  for (const t of tasks) {
    const out = targetPath(t);
    if (!FORCE && fs.existsSync(out)) {
      console.log(`  ⏭  ${t.cat}/${t.name}  (既存 — スキップ)`);
      skipped++;
      continue;
    }
    if (DRY) {
      console.log(`  📝 ${t.cat}/${t.name}  ($${estimateCost(t).toFixed(3)})`);
      console.log(`     → ${path.relative(ROOT, out)}`);
      console.log(`     ${t.prompt.slice(0, 110)}...`);
      continue;
    }
    process.stdout.write(`  ⏳ ${t.cat}/${t.name}  ...`);
    try {
      const buf = await callImagesApi(t);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, buf);
      console.log(` ✅ ${(buf.length / 1024).toFixed(0)}KB`);
      ok++;
    } catch (e) {
      console.log(` ❌`);
      console.log(`     ${e.message}`);
      failed++;
    }
    // OpenAI レート制限を緩めるための短いインターバル
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n========================================`);
  console.log(`完了: 成功 ${ok} / スキップ ${skipped} / 失敗 ${failed}`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
