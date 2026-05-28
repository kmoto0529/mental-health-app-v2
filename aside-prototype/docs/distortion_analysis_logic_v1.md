# 思考のクセ分析ロジック仕様書 v1

**受領**: 2026-05-28（社長提供）
**ステータス**: 実装前 — エンジンロジックの正本。画面遷移図は追って提供される。
**対応バージョン**: v0.9.83-beta.1 時点の `aside-prototype/index.html` を改修対象とする
**注記**: 本機能は医療行為・診断・心理検査ではない。もやの森は予防目的であり診断・治療を行わない前提。

---

## 1. 目的

ユーザーの記録・ワーク・AI会話をもとに、思考のクセを**診断ではなくセルフケア用の傾向メモ**として可視化する。

- 自分の考え方の傾向に気づく
- つらくなりやすい思考パターンを理解する
- 自分を責めるのではなく、行動や見方のヒントにつなげる
- ワークを通じて分析精度を高める

---

## 2. 基本方針（抽出の優先順位）

```text
1. ワークの記録
2. もやもや整理の内容
3. 下向き矢印法の内容
4. 認知のゆがみ自己評価
5. AI会話の要約
6. 気分ログのコメント
7. いっぽ実施後の変化
```

最重視は、ユーザーが自分で言語化した **自動思考・根拠・深掘り回答・スキーマ**。
AIの返信文、AIが生成した適応的思考、レター本文は本人の思考ではないため**原則スコア算出に使わない**。

---

## 3. 対象とする思考のクセ（初期8種）

| id | 表示名 |
|---|---|
| all_or_nothing | 全か無か思考 |
| overgeneralization | 過度の一般化 |
| labeling | レッテル貼り |
| mind_reading | 心の読みすぎ |
| should | すべき思考 |
| personalization | 自分への関連付け |
| disqualifying | マイナス思考 |
| fortune_telling | 先読み思考 |

補足：「感情的決めつけ」「破局視」は将来追加候補。初期は全か無か思考・先読み思考・マイナス思考の近いものとして扱う。

> ⚠️ 現行コードの `fortune_telling` 表示名は「運命の先読み」。本仕様では「先読み思考」に変更。

---

## 4. 入力データ

### 4.1 主入力 — moyamoyaRecords

使う項目: `eventText / automaticThought / evidence / counterEvidence / emotionScoreBefore / emotionScoreAfter / createdAt`
**原則使わない**: `alternativeView`（AI生成）/ `letterBody`（AI生成）

### 4.2 深掘り入力 — deepDiveSessions

使う項目: `firstThought / deeper[] / coreBelief / oldSchema / extractedBelief / tags`

### 4.3 自己評価入力 — kizukiResults.distortion

`answers[distortionId]`: 0=あてはまらない / 1=少しあてはまる / 2=よくあてはまる

### 4.4 補助入力

- `aiChats`: 基本は `summary` のみ・ユーザー発話のみ（AI返答は使わない）。強いリスクワード時は安全対応優先。
- `moodLogs`: `moodScore / categories[] / comment / createdAt`
- `ippoSessions`: `actionId / beforeIntensity / afterIntensity / changeValue / completedAt`

---

## 5. 分析対象期間

```text
サマリ：直近28日
推移：直近28日 vs その前28日
詳細：直近90日まで参照可
```

| 記録数 | 表示 |
|---:|---|
| 0〜2件 | 分析不足。ワーク促進を表示 |
| 3〜5件 | 仮の傾向として表示 |
| 6〜9件 | 参考傾向として表示 |
| 10件以上 | 通常分析として表示 |

---

## 6. 分析単位（正規化）

すべての記録をまず `AnalysisItem` に正規化:

```js
AnalysisItem = {
  id,
  sourceType: "moyamoya" | "deepDive" | "distortionTest" | "chat" | "moodLog" | "ippo",
  createdAt,
  textFields: { situation, thought, evidence, deeperThought, belief, comment, summary },
  emotion: { label, before, after, change },
  userGenerated: true | false
}
```

`userGenerated=false` はスコア計算対象から除外 or 低重み。

---

## 7. ラベル抽出ロジック

### 7.1 各記録ごとの抽出

```js
DetectedLabel = {
  distortionId,
  confidence: 0.0 - 1.0,
  sourceField: "automaticThought" | "evidence" | "deeper" | "coreBelief" | "chatSummary" | "selfAssessment",
  evidenceText,
  reason,
  severityHint: "low" | "mid" | "high"
}
```

### 7.2 抽出の考え方（組み合わせ）

```text
A. 明示キーワード   B. 文脈   C. 頻度
D. 感情強度        E. ワーク内での出現場所   F. 本人の自己評価
```

例:
- 「全部ダメだった」→ 全か無か思考 / confidence 高
- 「いつもこうなる」→ 過度の一般化 / 文脈確認が必要
- 「相手に嫌われたと思う」→ 心の読みすぎ / confidence 中〜高
- 「ちゃんとしなきゃ」→ すべき思考 / confidence 高

---

## 8. スコア計算（distortionId ごと）

```text
最終スコア =
    もやもや整理スコア   × 0.35
  + 下向き矢印スコア     × 0.25
  + 自己評価スコア       × 0.20
  + AI会話補助スコア     × 0.10
  + 気分ログ補助スコア   × 0.05
  + 感情強度・反復補正   × 0.05
```

---

## 9. 各スコアの詳細

### 9.1 もやもや整理スコア
対象と重み: `automaticThought 1.0 / evidence 0.7 / eventText 0.4 / counterEvidence 0.3`
`alternativeView` は原則除外。

### 9.2 下向き矢印スコア
重み: `coreBelief 1.2 / oldSchema 1.1 / deeper[] 1.0 / firstThought 0.8`（深い信念ほど重い）

### 9.3 自己評価スコア
`selfAssessmentScore = answer / 2 * 100`
ただし**自己評価だけでTOP1にしない**。記録との一致を確認。

### 9.4 AI会話補助スコア
`summary` とユーザー発話のみ。AI返答は使わない。重み低め。会話だけで強いラベルを出さない。

### 9.5 気分ログ補助スコア
短文コメント・カテゴリから補助的に拾う（例: カテゴリ「仕事」+「また失敗した」→ レッテル貼り or 過度の一般化の補助材料）。

### 9.6 感情強度・反復補正（上限 +10点）
```text
emotionScoreBefore >= 8
同じラベルが3回以上出現
同じカテゴリで繰り返し出現
emotionScoreAfterの改善が小さい
```

---

## 10. レベル判定

```text
score >= 50 → "やや強め"
score >= 25 → "ややあり"
score >= 8  → "少しだけ"
else        → "ほぼなし"
```

| level | 表示 |
|---|---|
| やや強め | 最近少し出やすいかも |
| ややあり | ときどき見られる |
| 少しだけ | 少しだけ見られる |
| ほぼなし | 今はあまり見られない |

「強い」「問題」「歪みがある」などの断定は避ける。

---

## 11. TOP3抽出

```text
1. scoreが高い順
2. 同点 → 直近14日の出現回数が多いものを優先
3. さらに同点 → ワーク由来の根拠が多いものを優先
4. 会話由来のみのラベルはTOP1にしない
```

---

## 12. 根拠表示（Basis）

```js
Basis = {
  distortionId, evidenceCount,
  sourceBreakdown: { moyamoya, deepDive, selfAssessment, chat, moodLog },
  representativeEvidence: [{ text, sourceType, date, sourceField }],  // 最大3つ
  explanation: "0か100かで捉える表現が複数回見られたため",
  caution: "一部の記録から見えた傾向であり、診断ではありません"
}
```

センシティブな全文は出さず、必要に応じて短く要約。

---

## 13. サマリ生成

```js
Summary = { title, mainMessage, suplanComment, topDistortions, oneActionHint, dataConfidence, cautionText }
```

例:
```js
{
  title: "完璧を目指しやすい傾向が少し見られます",
  mainMessage: "最近の記録では、できた部分よりも、足りなかった部分に目が向きやすい場面がありました。",
  suplanComment: "「できてない」だけじゃなくて、その間にある「少しできた」にも目を向けてみよう。",
  oneActionHint: "今日できたことを30点・50点・70点で見直してみる",
  dataConfidence: "参考傾向",
  cautionText: "これは記録から見えたセルフケア用の傾向メモです。診断ではありません。"
}
```

---

## 14. 行動ヒント生成（ラベル別）

- **全か無か思考**: 0/100でなく30・50・70点で見る／今日できた部分を1つ書く／「完璧ではないけど進んだこと」を探す
- **過度の一般化**: 「いつも」を「今回は」に／例外が1つでもなかったか／過去に少し違った場面を書く
- **レッテル貼り**: 「私はダメ」→「今回はここが難しかった」／出来事の一部として見る／友達に同じことを言われたら何と返すか
- **心の読みすぎ**: 事実と想像を分ける／相手が実際に言ったことだけ取り出す／別の可能性を2つ書く
- **すべき思考**: 「すべき」→「できたらいい」／そのルールは誰の声か／現実的なラインを探す
- **自分への関連付け**: 自分以外の要因を3つ書く／関わった人・環境を分ける／自分が担う範囲を狭める
- **マイナス思考**: 小さく良かったことを1つ拾う／「大したことない」も事実として残す／できたことを消さない
- **先読み思考**: 未来予想と今わかっている事実を分ける／最悪以外のシナリオを2つ／今日できる小さな一歩に戻す

---

## 15. 精度向上ワーク促進ロジック

### 15.1 促進条件
記録数が少ない／特定ラベルの根拠が弱い／会話由来のラベルが多い／自己評価と記録分析がズレ／感情強度は高いが思考内容が不足／同じテーマの繰り返し

### 15.2 推奨ワークの出し分け

| 条件 | 推奨ワーク |
|---|---|
| 自動思考が少ない | もやもや整理 |
| 根本の信念が見えない | 下向き矢印法 |
| 自分のクセを広く把握したい | 認知のゆがみセルフチェック |
| 行動に落としたい | 行動実験 |
| 同じ場面で繰り返す | 刺激統制 |
| 不安が強く未来予測が多い | 事実と予想を分けるワーク |
| 完璧主義が強い | グラデーション思考ワーク |

### 15.3 表示文言例
- 「もっと自分に合った分析にするために、次は『もやもや整理』を1回やってみませんか？」
- 「今の記録だけだと、まだ少し仮の分析です。下向き矢印法をやると、奥にある思い込みまで整理しやすくなります。」
- 「会話の記録から少し傾向が見えています。ワークで整理すると、より正確に振り返れます。」

---

## 16. dataConfidence（3段階）

```text
low（まだ仮の分析）:
  有効記録 0〜5件 / 会話由来が大半 / ワーク記録が少ない
medium（参考傾向）:
  有効記録 6〜9件 / もやもや整理が複数 / 一部ワークもある
high（記録から見えた傾向）:
  有効記録 10件以上 / もやもや整理・下向き矢印・自己評価のうち2種以上 / 同じ傾向が複数ソースで確認
```

---

## 17. リスク対応

以下が含まれる場合、分析より安全案内を優先:
```text
死にたい / 自殺 / リスカ / 自分を傷つけたい / 消えたい / いなくなりたい / 全部終わらせたい / 殺してほしい
```
表示: 「今は分析よりも、安全を優先してほしい状態かもしれません。ひとりで抱えず、信頼できる人や専門窓口につながることを検討してください。」

---

## 18. 禁止表現

```text
あなたは〇〇です / 〇〇の認知の歪みがあります / 病的です / 治療が必要です
うつ傾向です / 不安障害の可能性があります / この考え方を直しましょう / 間違った考え方です
```

## 19. 推奨表現

```text
最近の記録では、〇〇に目が向きやすい場面がありました
〇〇のように考えやすい時期かもしれません
これは診断ではなく、記録から見えた傾向です
少しだけ見方をゆるめるヒントとして使ってください
```

---

## 20. 最終出力スキーマ

```js
{
  generatedAt,
  period: { from, to, days },
  dataConfidence: "low" | "medium" | "high",
  summary: { title, mainMessage, suplanComment, cautionText },
  topDistortions: [
    { id, name, score, level, shortDescription, userFriendlyMessage, actionHint }
  ],
  chart: { labels: [], userScores: [], averageScores: [] },
  trend: [
    { id, name, previousScore, currentScore, delta, trendLabel }
  ],
  basis: [
    { id, name, evidenceCount, sourceBreakdown, representativeEvidence, explanation }
  ],
  actionSuggestions: [
    { title, description, relatedDistortionId, difficulty: "easy" | "normal", estimatedMinutes }
  ],
  recommendedWorks: [
    { workId, title, reason, priority: "high" | "medium" | "low", estimatedMinutes, ctaText }
  ],
  safety: { riskDetected: boolean, message }
}
```

---

## 21. 実装方針まとめ

```text
記録する → ワークで整理する → 思考のクセを仮説として抽出する
→ 根拠を見せる → 行動ヒントに変える → 必要に応じて追加ワークを促す → 分析精度が上がる
```

最重要: 思考のクセを**"判定"するのではなく、ユーザーが自分をやさしく理解するための鏡として出すこと。**
