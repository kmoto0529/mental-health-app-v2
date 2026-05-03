# すぷらん画像アセット

このフォルダには もやの森 のマスコット「すぷらん」の画像アセットを配置します。

## 配置するだけで自動切替

PNGをここに配置すれば、アプリ側のコードを変更せずに自動でSVGプレースホルダーから差し替わります。

## ファイル一覧（26枚）

```
growth/
  stage1-tane.png         たねのすぷらん（出会ったばかり）
  stage2-futaba.png       ふたばのすぷらん（標準形）
  stage3-nae.png          なえのすぷらん（ぐんぐん成長）
  stage4-hana.png         はなのすぷらん（花が咲いた）
  stage5-ookii.png        おおきなすぷらん（鉢植え）

expressions/
  happy.png               うれしい
  calm.png                おだやか（デフォルト）
  cheering.png            がんばれ！
  sad.png                 しょんぼり
  thinking.png            考え中…

poses/
  heart.png               あなたの味方（ハート）
  blanket.png             よくがんばったね（毛布）
  watering.png            いっしょに育てよう（じょうろ）
  bulb.png                気づきをくれるよ（電球）
  cup.png                 ひとやすみしよう（カップ）
  sleeping.png            おやすみなさい（寝帽子）

seasonal/
  spring.png              春（桜）
  summer.png              夏（麦わら）
  autumn.png              秋（紅葉）
  winter.png              冬（マフラー）

icon/
  icon-512.png            アプリアイコン用
```

## 仕様

- **形式**: PNG透過、512×512px推奨
- **背景**: 透過必須（白背景は不可）
- **タッチ**: 水彩風、やわらかい色調

## 生成方法

`company/design/characters/mameko_v1_prompts_2026-05.md` に DALL-E / Midjourney / Imagen 用のプロンプトテンプレートが用意されています。コピー&ペーストで生成可能。

## 一貫性チェック

各画像配置後、以下を確認：
- [ ] 同じ「すぷらん」だと認識できる
- [ ] 水彩タッチが揃っている
- [ ] 背景が透過になっている
- [ ] 文字が含まれていない

## 動作確認

- いずれかの画像が無くても、アプリはSVGプレースホルダーで動作します
- PNGが配置されると、ロード時に自動検出して切替
- 確認は `aside-prototype/index.html` をブラウザで開く
