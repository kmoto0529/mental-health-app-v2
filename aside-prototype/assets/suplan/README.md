# すぷらん画像アセット

このフォルダには もやの森 のマスコット「すぷらん」の画像アセットを配置します。

## 配置するだけで自動切替

PNGをここに配置すれば、アプリ側のコードを変更せずに自動でSVGプレースホルダーから差し替わります。

## ファイル一覧

> **注: v0.9.7 で成長段階は廃止。すぷらんは1キャラクターに統一。**
> 旧 `growth/stage*` は削除済み。代わりに `base.png` 1枚をベースとして使用する。

```
base.png                      … ベース画像（標準のすぷらん。前向きおだやか）

expressions/                  … 表情（最近の気分で切替）
  happy.png                   うれしい
  calm.png                    おだやか（デフォルト）
  cheering.png                がんばれ！
  sad.png                     しょんぼり
  thinking.png                考え中…
  surprised.png               びっくり
  excited.png                 わくわく
  thanks.png                  ありがとう

poses/                        … ポーズ（場面に合わせて呼び出し）
  heart.png                   あなたの味方（ハート）
  blanket.png                 よくがんばったね（毛布）
  watering.png                いっしょに育てよう（じょうろ）
  bulb.png                    気づきをくれるよ（電球）
  cup.png                     ひとやすみしよう（カップ）
  sleeping.png                おやすみなさい（寝帽子）

seasonal/                     … 季節（自動切替の余地あり）
  spring.png                  春（桜）
  summer.png                  夏（麦わら）
  autumn.png                  秋（紅葉）
  winter.png                  冬（マフラー）

family/                       … すぷらんの家族（NEW: コンセプトv1.1）
  mother.png                  おかあさん（花の冠）
  father.png                  おとうさん（茂みヘッド）
  brother.png                 おにいちゃん（大きいふたば）
  sister.png                  いもうと（ピンクの花一輪）
  baby.png                    あかちゃん（ふたばのみ・極小）
  family_group.png            家族集合（横長 1024×512）

daily/                        … すぷらんのある日常（NEW: 背景込みシーン）
  quietly_beside.png          そっとよりそう（木の下）
  thinking_together.png       いっしょにかんがえる（小枝）
  taking_breather.png         ほっとひとやすみ（マグ）
  cheer_small_step.png        ちいさな一歩をおうえん（キラキラ）
  sweet_dreams.png            いいゆめみてね（毛布で寝る）

icon/
  icon-512.png                アプリアイコン用
```

## 仕様

- **形式**: PNG透過、512×512px推奨（family/daily/seasonalの一部は横長や4:3もOK）
- **背景**: 透過必須（白背景は不可）。ただし `daily/` の背景込みシーンは透過なしでも可
- **タッチ**: 水彩風、やわらかい色調

## サイズの目安（UI 配置上の推奨）

| ID | 目安 | 用途 |
|---|---|---|
| xs | 24–32px | リスト内の小さなアイコン |
| s  | 48px    | カードヒーロー、ひとこと枠 |
| m  | 96–128px | 標準（ホーム/きろく/レポート） |
| l  | 200–256px+ | オンボーディング、達成画面、空状態 |

## 生成方法

### A. ChatGPT Plus + DALL-E (推奨・APIキー不要)

[`company/design/characters/suplan_v1_chatgpt_batch_2026-05.md`](../../../../../company/design/characters/suplan_v1_chatgpt_batch_2026-05.md)
に ChatGPT 用のペースト・テンプレ集 (Step 0 + Step 1〜30) があります。
新規会話で Step 0 を1回貼り、Step 1〜30 を順番に貼って画像を保存してください。
完成後 `node test-harness/verify-suplan-assets.js` で配置確認できます。

### B. OpenAI API キーで自動化

`OPENAI_API_KEY` を環境変数で渡せば一括生成できます。
```
$env:OPENAI_API_KEY="sk-..."
node test-harness/generate-suplan-assets.js --quality=medium
```

### C. プロンプト原本

[`company/design/characters/suplan_v1_dalle_prompts_2026-05.md`](../../../../../company/design/characters/suplan_v1_dalle_prompts_2026-05.md)
に DALL-E / Midjourney / Imagen 用の元プロンプトテンプレートがあります。
A・B のテンプレもこのファイルから派生しています。

## 一貫性チェック

各画像配置後、以下を確認：
- [ ] 同じ「すぷらん」だと認識できる（家族キャラも同種族と分かる）
- [ ] 水彩タッチが揃っている
- [ ] 背景が透過になっている（daily/シーン除く）
- [ ] 文字が含まれていない

## 動作確認

- いずれかの画像が無くても、アプリはSVGプレースホルダーで動作します
- PNGが配置されると、ロード時に自動検出して切替
- 確認は `aside-prototype/index.html` をブラウザで開く

## 補足: 出力対象外

「すぷらんの友達」（もっぴー / そよちゃん / ひかりちゃん / ききちゃん / はなちゃん）は本資料および本フォルダの対象外です（社長判断 2026-05-04）。
