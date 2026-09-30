// data/action-master.json から data/action-master.js を生成する
// usage: node scripts/build-action-master-js.js
//
// 正本は action-master.json。.js は demo-v2.html を file:// で直接開いたときの代替読み込み用
// （file:// では fetch が使えないため、<script> で読める形にして持っておく）。
// JSON を編集したら必ずこのスクリプトを実行すること。

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'action-master.json');
const OUT = path.join(__dirname, '..', 'data', 'action-master.js');

const json = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const body = '/* 自動生成（scripts/build-action-master-js.js）。直接編集しない。正本は action-master.json */\n'
  + 'window.ACTION_MASTER = ' + JSON.stringify(json, null, 2) + ';\n';
fs.writeFileSync(OUT, body, 'utf8');
console.log('wrote', path.relative(process.cwd(), OUT), '(' + json.actions.length + ' actions)');
