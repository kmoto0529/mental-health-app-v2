// data/*.json から data/*.js を生成する（行動マスター・相談先マスター）
// usage: node scripts/build-action-master-js.js
//
// 正本は各 .json。.js は demo-v2.html を file:// で直接開いたときの代替読み込み用
// （file:// では fetch が使えないため、<script> で読める形にして持っておく）。
// JSON を編集したら必ずこのスクリプトを実行すること。

const fs = require('fs');
const path = require('path');

const TARGETS = [
  { json: 'action-master.json',     js: 'action-master.js',     global: 'ACTION_MASTER' },
  { json: 'support-resources.json', js: 'support-resources.js', global: 'SUPPORT_RESOURCES' }
];

TARGETS.forEach(function (t) {
  const src = path.join(__dirname, '..', 'data', t.json);
  const out = path.join(__dirname, '..', 'data', t.js);
  const json = JSON.parse(fs.readFileSync(src, 'utf8'));
  const body = '/* 自動生成（scripts/build-action-master-js.js）。直接編集しない。正本は ' + t.json + ' */\n'
    + 'window.' + t.global + ' = ' + JSON.stringify(json, null, 2) + ';\n';
  fs.writeFileSync(out, body, 'utf8');
  console.log('wrote', path.relative(process.cwd(), out));
});
