// 現在の ACTION_CATALOG を index.html から抽出して TSV / JSON に出力
// usage: node scripts/export-catalog.js

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// ACTION_CATALOG ブロック抽出
const m = html.match(/const ACTION_CATALOG = \[([\s\S]*?)\n\];/);
if (!m) { console.error('ACTION_CATALOG not found'); process.exit(1); }

// ALL_STATES / ALL_GOALS の中身も抽出
const allStatesMatch = html.match(/const ALL_STATES\s*=\s*(\[[^\]]+\])/);
const allGoalsMatch  = html.match(/const ALL_GOALS\s*=\s*(\[[^\]]+\])/);
const ALL_STATES = eval(allStatesMatch[1]);
const ALL_GOALS  = eval(allGoalsMatch[1]);

// CATALOG を eval（JS literal なので安全に評価）
const ACTION_CATALOG = eval('(' + '[' + m[1] + ']' + ')');

// TSV 列定義（Google Sheets で使う列順）
const COLUMNS = ['id','title','desc','type','difficulty','duration','category','goalKeys','states','ctaAct'];

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

const tsvContent = tsv(ACTION_CATALOG);
const jsonContent = JSON.stringify(ACTION_CATALOG, null, 2);

fs.writeFileSync(path.join(__dirname, 'actions-seed.tsv'), tsvContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'actions-seed.json'), jsonContent, 'utf8');

console.log('--- 抽出完了 ---');
console.log('レコード数:', ACTION_CATALOG.length);
console.log('TSV: scripts/actions-seed.tsv （Google Sheetsに貼り付け用）');
console.log('JSON: scripts/actions-seed.json （バックアップ）');
