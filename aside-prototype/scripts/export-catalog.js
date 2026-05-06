// 現在の ACTIONS（いっぽの行動カタログ）を index.html から抽出して TSV / JSON に出力
// usage: node scripts/export-catalog.js
//
// 出力ファイル:
//   scripts/actions-seed.tsv   ← Google Sheets に貼り付け用（ヘッダー込み）
//   scripts/actions-seed.json  ← バックアップ・差分確認用
//
// Sheets 列順（ACTIONS スキーマ・2026-05-06〜）:
//   id / cat / icon / title / desc / time / technique / domains
//
// 履歴:
//   〜2026-05-05: ACTION_CATALOG（dead）を抽出していた
//   2026-05-06〜: ACTIONS（いっぽの50項目）を抽出するように刷新

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// ACTIONS 配列ブロック抽出
const m = html.match(/const ACTIONS = \[([\s\S]*?)\n\];/);
if (!m) { console.error('ACTIONS が index.html に見つかりません'); process.exit(1); }

// ACTIONS を eval（JS literal なので安全に評価）
const ACTIONS = eval('(' + '[' + m[1] + ']' + ')');

// TSV 列定義（Google Sheets で使う列順）
const COLUMNS = ['id', 'cat', 'icon', 'title', 'desc', 'time', 'technique', 'domains'];

// セル整形
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join('|');   // パイプ区切り
  return String(v);
}

// TSV 生成（タブ区切り、改行はLFのみ・タブ・改行混入時は空白に置換）
function tsv(rows) {
  const sanitize = s => String(s).replace(/[\t\n\r]/g, ' ');
  const header = COLUMNS.join('\t');
  const body = rows.map(r => COLUMNS.map(c => sanitize(fmt(r[c]))).join('\t')).join('\n');
  return header + '\n' + body + '\n';
}

const tsvContent = tsv(ACTIONS);
const jsonContent = JSON.stringify(ACTIONS, null, 2);

fs.writeFileSync(path.join(__dirname, 'actions-seed.tsv'), tsvContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'actions-seed.json'), jsonContent, 'utf8');

// 集計（運用上の確認用）
const cats = {};
const techs = {};
ACTIONS.forEach(a => {
  cats[a.cat] = (cats[a.cat] || 0) + 1;
  techs[a.technique] = (techs[a.technique] || 0) + 1;
});

console.log('--- 抽出完了 ---');
console.log('レコード数:', ACTIONS.length);
console.log('カテゴリ別:', cats);
console.log('技法別:', techs);
console.log('TSV : scripts/actions-seed.tsv （Google Sheets に貼り付け用）');
console.log('JSON: scripts/actions-seed.json （バックアップ）');
