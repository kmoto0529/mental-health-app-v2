# もやの森 アプリ仕様書（LLM協業用スナップショット）

**最終更新**: 2026-05-28
**対応バージョン**: v0.9.83-beta.1
**目的**: 外部LLM（GPT等）にアプリ全体像を共有し、**思考のクセ分析の精度向上**および**プロンプト整理**の協業を行うためのスナップショット。
**主出典**: `aside-prototype/index.html`（PWA本体）、`aside-prototype/api/gemini-proxy.js`

---

## 0. このドキュメントの読み方

- **§1〜§4**: プロダクト・設計哲学の前提
- **§5**: データモデル（プロンプト設計の前提）
- **§6〜§7**: 認知の歪み（DISTORTIONS）と思考のクセ分析の現状実装 ★主要相談対象★
- **§8**: AIプロンプト12個のカタログ
- **§9**: GPTに相談したい改善ポイント

---

## 1. アプリ概要

| 項目 | 内容 |
|---|---|
| プロダクト名 | もやの森（旧 Aside） |
| マスコット | すぷらん（AI伴走者として登場） |
| 形態 | PWA（Webブラウザ／ホーム画面追加で起動） |
| ターゲット | **22-28歳・キャリア初期女性中心の「相談したいができていない層」** |
| コア価値 | **書く前にAIと話して整理する**メンタルヘルス予防アプリ |
| 治療範囲 | **予防のみ・診断や治療はしない**（医療機器化は当面見送り） |
| 理論ベース | CBT（認知行動療法）・来談者中心療法・感情焦点アプローチ |
| 現在のフェーズ | β版（招待コードゲート付き・テストユーザー配布前） |
| 次の節目 | 2026-05-31 β完成 → 2026-06-01 配布開始 → 2026-08-01 公式リリース |

---

## 2. 設計哲学（プロンプト設計の最重要前提）

### 2.1 AI伴走者「すぷらん」のキャラクター

- **ナナメの関係**: 親でも上司でもセラピストでもない、少し年上の信頼できる友達のような距離感
- 一人称はAI／呼称は「すぷらん」
- 22-28歳の若者と日常会話として自然に話せる温かい口語

### 2.2 心理士監修水準のトーン基準

**絶対NG表現**（mood_chat 等の自然文プロンプトで明示）:
- ポエム調（「光が差してきたんだね」）
- 過剰な励まし（「きっと大丈夫」「あなたは素晴らしい」）
- スピリチュアル表現・不自然な比喩
- 「無理しないでね」の連発
- 「絶対大丈夫」「うつです」等の保証・断定
- 「すばらしい」「えらい」と評価する

**禁止行為**:
- 診断・病名断定・薬の指示
- 強い決めつけ
- 医療判断

### 2.3 質問疲労防止ポリシー（v0.9.83 で導入）

会話バランスの目標比率:
| ターン要素 | 比率 |
|---|---|
| 共感・受け止め | 40% |
| 感情の整理・翻訳 | 30% |
| 問い | 20% |
| 小さな提案 | 10% |

ルール:
- 1返信につき質問は最大1つ
- 2ターン連続で質問しないことを推奨
- **質問なしの返信を積極的に混ぜる**（受け止めだけで終わる返答を許可）
- 質問は「焦り？疲れ？不安？」のような答えやすい選択肢提示型に変換

### 2.4 Quick Reply（回答候補）の必須化

`mood_chat`では毎ターン 3〜4個の Quick Reply を AI が動的生成。必須要件:
- 1タップで押しやすい長さ（12文字前後）
- 毎回必ず「逃げ道」を1つ以上含める（「今はうまく言えない」「少し休みたい」「聞いてくれてありがとう」「またあとで話す」）
- 会話段階（初回／深掘り／行動／リスク）でレパートリーを変える

### 2.5 リスクワード対応

```
重大度5（即時専門機関案内）: 死にたい、自殺、リスカ、自分を傷つけ、消えてしまいたい、全部終わらせたい、殺してほしい
重大度4: 消えたい、いなくなりたい、殴られた、過呼吸
重大度3: もう限界、生きる意味、眠れない
```

severity 4 以上で専門窓口モーダル（**よりそいホットライン 0120-279-338 / いのちの電話 0570-064-556**）。

---

## 3. アーキテクチャ

```
┌─────────────────────────────────────┐
│  クライアント（PWA）                       │
│  aside-prototype/index.html               │
│  - 全機能を1ファイルに集約（約17,500行）       │
│  - localStorage で state を永続化           │
│  - Service Worker（CACHE_VERSION 管理）    │
└──────────────────┬──────────────────┘
                   │ /api/gemini-proxy
                   ▼
┌─────────────────────────────────────┐
│  Vercel Functions                          │
│  aside-prototype/api/gemini-proxy.js       │
│  - 招待コード検証                            │
│  - Gemini API 中継（thinkingBudget:0 必須） │
│  - responseMimeType サポート               │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│  Google Gemini 2.5 Flash                   │
└─────────────────────────────────────┘

別系統: Supabase (`aside-beta` プロジェクト)
- public.actions: 行動カタログ50件のリモート管理
- public.app_logs: PWAイベントログ（任意・匿名）
```

**重要な技術的制約**:
- Geminiで構造化JSON出力する時は **thinkingBudget:0 + maxOutputTokens余裕** が必須
- 新形式キー利用時は `Prefer: return=representation` で 42501 エラー（return=minimal推奨）

---

## 4. アプリ構造（4タブ + αモード）

### 4.1 メインタブ

| タブ | 役割 |
|---|---|
| **ホーム** | 気分入力（5段階＋カテゴリ＋任意ひとこと）→ AIとチャット |
| **いっぽ** | 推薦された改善行動を5ステップで実施（カタログ50件） |
| **きづき** | CBTセルフワーク群（認知のゆがみ、行動実験、下向き矢印法、もやもや整理、刺激統制） |
| **きろく** | 過去ログ閲覧 + 3サブタブ（カレンダー／傾向分析／**思考のクセ分析**） |

### 4.2 主要なAI対話フロー

| フロー | AIプロンプト | 場所 |
|---|---|---|
| 気分→AI対話 | `mood_chat` | ホームから単発チャット |
| もやもや整理（コラム法8ステップ） | `cbt_counter_evidence_hints` (Step5)、`cbt_alternative_views` (Step6) | ホーム |
| 下向き矢印法（9ステップ） | `dd_schema_identify` (Step5)、`dd_merit_demerit` (Step6)、`dd_new_schema` (Step7) | きづき |
| 行動実験（5ステップ） | `kizuki_behavior_plan_candidates` (Step2)、`kizuki_behavior_next_candidates` (Step5) | きづき |
| 刺激統制（9ステップ） | `stimulus_control_plans` (Step3-4)、`stimulus_control_advice` (Step8) | きづき |
| 認知のゆがみテスト結果コメント | `kizuki_distortion` ※UIから非表示中 | きづき（隠し） |
| 行動実験 結果コメント | `kizuki_behavior_experiment` ※旧版 | きづき（旧版） |

---

## 5. データモデル（state shape）

```js
state = {
  consent: { given, version, at },
  user: {
    nickname, createdAt, daysUsed,
    occupation, ageRange, gender, interests[],
    profileDone, habitActionIds[],
    directionIds[],  // 「リラックスしたい」等6択複数選択
  },

  // === 気分ログ（思考のクセ分析の主要入力ではない） ===
  moodLogs: [{
    id, moodScore (1-5), moodLabel, categories[], comment, createdAt
  }],

  // === もやもや整理（コラム法）レコード ★思考のクセ分析の主要入力★ ===
  moyamoyaRecords: [{
    id,
    eventText,           // ①状況
    emotion,             // ②気分（28種から1つ）
    emotionScoreBefore,  // ②強さ（0-10）
    automaticThought,    // ③自動思考  ※v0.9.80〜
    evidence,            // ④根拠      ※v0.9.80〜
    counterEvidence,     // ⑤反証      ※v0.9.80〜
    alternativeView,     // ⑥適応的思考（AI生成）
    emotionScoreAfter,   // ⑦再評価
    letterTitle,         // 独自要素: レター
    letterBody,
    createdAt,
  }],

  // === AIチャット履歴 ===
  aiChats: [{
    id, sourceType ('mood_log' | 'moyamoya'), sourceId,
    messages[], summary, createdAt
  }],

  // === きょうのいっぽ（行動セッション） ===
  ippoSessions: [{
    id, moodLabel, moodIntensity, actionId, score,
    beforeIntensity, afterIntensity, changeValue, completedAt,
    directionIds[]
  }],

  // === 習慣化 ===
  customHabits: [], habitLogs: [],

  // === 深掘りループ（下向き矢印法） ===
  deepDiveSessions: [{
    id, themeType, event, firstThought,
    deeper: [Lv1, Lv2, Lv3, Lv4, Lv5],
    coreBelief,  // 古いスキーマ
    oldSchema, newSchema,
    extractedBelief, tags[],
    startedAt, completedAt
  }],

  // === きづきワーク結果（認知のゆがみテスト等） ===
  kizukiResults: {
    distortion: {
      completedAt,
      answers: { [distortionId]: 0|1|2 },  // 8つの歪みについて0-2の3択
      result: {
        type: 'applicable',
        applicable: [{ id, name, desc, counter, score }],  // 1以上のみ
        totalCount
      },
      aiComment
    },
    'behavior-experiment': { completedAt, answers, result, aiComment },
  },

  // === UI状態 ===
  ui: {
    currentTab,                              // home|action|kizuki|record
    recordSubtab: 'calendar'|'trend'|'distortion',
    calendarMonthOffset,
    reportGraphTab,
  },
}
```

**自動クリーンアップ**: 1ヶ月超の `moodLogs / moyamoyaRecords / aiChats / ippoSessions / deepDiveSessions` は起動時に自動削除（容量管理）。

---

## 6. 認知の歪み（DISTORTIONS）の現状定義

8種類が `aside-prototype/index.html` の定数として定義されている。**tier: 'core' が 5種・'expansion' が 3種**。

### 6.1 コア5種（tier: 'core'）

| id | 名称 | 説明 | 検出キーワード（examples） | counter（カウンター質問） |
|---|---|---|---|---|
| `labeling` | レッテル貼り | 「私はダメ」と決めつけてしまう | 私はダメ／無能／使えない／価値ない | 「ダメ」と思った瞬間、具体的に何が起きていた？それは『あなた全体』じゃなくて、その出来事の中の一部かもしれないね |
| `mind_reading` | 心の読みすぎ | 相手の気持ちを勝手に決めつけてしまう | 嫌われた／呆れられた／冷たかった | 相手が実際に「嫌い」と言ったわけじゃないなら、それは想像かも。他の可能性も一緒に考えてみない？ |
| `should` | すべき思考 | 「〜すべき」で自分を縛ってしまう | すべき／しなきゃ／ねばならない／もっと頑張 | 「〜すべき」と思った時、誰の声が聞こえる？それは本当にあなたの声？ |
| `personalization` | 自分への関連付け | 何でも自分のせいにしてしまう | 全部私のせい／私が悪い／私が原因 | その出来事に関わった人は何人？すべてがあなた一人の責任という前提、本当にそう？ |
| `disqualifying` | マイナス思考 | 良いことを「大したことない」と消す | するほどじゃない／気のせい／大したことない／甘えてる／みんな同じくらい | 「大したことない」と思っても、いま実際にしんどく感じてる。それは事実として認めていいかも |

### 6.2 拡張3種（tier: 'expansion'）

| id | 名称 | 説明 | examples | counter |
|---|---|---|---|---|
| `all_or_nothing` | 全か無か思考 | 完璧か無価値か、白黒で考える | 完璧／100／無価値／すべて | 「50%できた」こともあるよね。0と100の間にあるグラデーションを見つけてみない？ |
| `overgeneralization` | 過度の一般化 | 一回の出来事を「いつも」に拡張 | いつも／絶対／どうせ／永遠に／一度も | 「いつも」って、本当に毎回？1回でも違うパターンがなかった？ |
| `fortune_telling` | 運命の先読み | 将来を悲観的に決めつける | 将来真っ暗／もう手遅れ／絶対上手くいかない／未来ない | 未来は予想であって事実じゃないよね。今わかってる事実だけに目を向けてみない？ |

### 6.3 別所で参照される CBT 認知の歪み（プロンプト内で言及されるもの）

`cbt_alternative_views`（もやもや整理のAI）プロンプト内では「相談者の自動思考に隠れがちな代表例」として:
- 全か無か思考 / 過度の一般化 / 心の読みすぎ / 運命の先読み / すべき思考 / 自分への関連付け / マイナス思考 / レッテル貼り

→ 上記8種と一致（DISTORTIONSと同一の8種）。

ただし**「適応的思考のラベル」**は別の固定8種を使用:
- 第三者視点 / 時間軸 / 事実と解釈 / 反証 / 状況の幅 / 自分への声かけ / 小さな事実 / 不確実性の確認

---

## 7. 思考のクセ分析の現状実装

### 7.1 2つの経路

#### 経路A: テキストからのルールベース検出（自動）

**入力**: 直近28日間の `moyamoyaRecords`
**処理**: `eventText + letterBody + alternativeView` の連結テキストに対し、各 DISTORTION の `examples` キーワードを正規表現マッチ
**スコア計算**:
```
hitRecords = この歪みがヒットしたレコード数
hits = この歪みのキーワードヒット総数（密度）
total = 直近28日のレコード総数（最低1）
ratio = hitRecords / total
density = hits / total
score = min(100, round(ratio × 70 + density × 30))
```

**ラベリング**:
| score | label | tone | color |
|---|---|---|---|
| ≥ 50 | ちょっと強め | high | #D77B5B |
| ≥ 25 | ややあり | mid | #B07F2F |
| ≥ 8 | 少しだけ | low | #7BA876 |
| < 8 | ほぼなし | none | muted |

**表示**: きろくタブ → 思考のクセ分析サブタブで TOP3 + counter（カウンター質問）

#### 経路B: ユーザー自己評価ワーク（手動）

**場所**: きづきタブ → 「認知のゆがみを理解する」ワーク（※現在は一覧から非表示）
**入力**: 8つの歪みについて 0-2 の3択（あてはまらない／少しあてはまる／よくあてはまる）
**処理**: スコア1以上を「あてはまる傾向」として集計
**結果**: `state.kizukiResults.distortion.applicable[]` に保存
**AIコメント**: `kizuki_distortion` プロンプトで自然文振り返り

### 7.2 サブ画面

- **TOP3**: `viewDistortionSection()` — TOP3カード + counter + 過去きづきワーク履歴
- **推移**: `getDistortionTrend()` — 直近30日 vs その前30日の歪み別スコア比較（before/after/delta）
- **レーダー**: 5軸のレーダーチャート（過度な一般化／心の読みすぎ／レッテル貼り／感情的決めつけ＝all_or_nothing／べき思考）

### 7.3 1記録ごとの分析（`decomposeRecord`）

```
{
  fact: eventText,                    // 事実
  interp: (明示記録なし注記),          // 解釈
  emo: { label, before, after },     // 感情変化
  action: (同日のいっぽ要約),          // 行動
  detectedDistortions: [{id, name}], // この記録からヒットした歪み
}
```

### 7.4 「すぷらんメモ」自動生成（1記録ごと）

```js
generateRecordMemo(record):
  detectedDistortions[0] → "{name}のパターンがあるかも"
  emo.before - emo.after ≥ 3 → "気持ちがしっかり軽くなった日"
  ≥ 1 → "すこし気持ちが軽くなった"
  ≤ -1 → "まだ少し重く感じた日かも"
```

### 7.5 ★計画中★ AI版 思考のクセ分析

UI shell は配置済み（`viewKirokuAiAnalysis()`）。ボタンは「近日公開」で disabled。
**Why**: 現状のキーワードルールは精度に限界があり、文脈理解した分析にしたい。
**4種類のインサイト（プレビューUI表記）**:
1. クセ同士のつながり
2. きっかけのパターン
3. あなた専用の改善ヒント
4. 推移の質的な解釈

**実装着手判断**: 記録10件以上溜まったタイミング（β配布後）。手動トリガー想定。

→ **このAI分析プロンプトの設計が、本仕様書を渡してGPTに相談したい主目的**。

### 7.6 ルールベースの既知の弱点

- キーワード一致なので**文脈無視**（例: 「いつも」が「いつも会社にいる」の中性的文脈でもヒット）
- 検出例（examples）が短く偏っている（特に core 5種で 3-5語程度）
- **alternativeView を分析対象に含めている**ため、AI が出した「適応的思考」のテキストが歪みとして誤検出されるリスク
- 5軸レーダーが arbitrary（残り3種が落ちる）
- counter（カウンター質問）が固定文・心理士視点でレビュー未完了

---

## 8. AIプロンプト全12個カタログ

すべて `aside-prototype/index.html` の `AI_PROMPTS` オブジェクト（L13300〜）にメタ情報付きで集約。**心理士レビュー前**は全プロンプトが `psychologistReviewStatus: 'レビュー待ち'`。

| # | ID | フロー位置 | model | temp | maxTokens | outputFormat | 最終更新 |
|---|---|---|---|---|---|---|---|
| 1 | `mood_chat` | ホーム → 気分→AI対話 | gemini-2.5-flash | 0.8 | 1024 | JSON `{message, quickReplies[3-4]}` | 2026-05-28 (v0.9.83) |
| 2 | `cbt_alternative_views` | もやもや整理 Step7（適応的思考6個） | 2.5-flash | 0.95 | 1800 | JSON配列 6個 `{label, text}` (label固定8種) | 2026-05-27 |
| 3 | `cbt_counter_evidence_hints` | もやもや整理 Step6（反証ヒント） | 2.5-flash | 0.85 | 600 | JSON配列 3〜5文字列 | 2026-05-27 |
| 4 | `dd_schema_identify` | 下向き矢印法 Step5（スキーマ特定） | 2.5-flash | 0.7 | 600 | JSON配列 4短文 | 2026-05-26 |
| 5 | `dd_merit_demerit` | 下向き矢印法 Step6（メリデメ） | 2.5-flash | 0.7 | 600 | JSON `{merits[3], demerits[3]}` | 2026-05-26 |
| 6 | `dd_new_schema` | 下向き矢印法 Step7（新スキーマ） | 2.5-flash | 0.85 | 600 | JSON配列 4短文 | 2026-05-26 |
| 7 | `kizuki_distortion` | きづき 認知のゆがみ結果コメント（非表示中） | 2.5-flash | 0.7 | 280 | 自然文 3-4文160字 | 2026-05-26 |
| 8 | `kizuki_behavior_experiment` | きづき 行動実験 結果コメント（旧版） | 2.5-flash | 0.75 | 280 | 自然文 3-5文180字 | 2026-05-26 |
| 9 | `kizuki_behavior_plan_candidates` | きづき 行動実験 Step2（行動候補4個） | 2.5-flash | 0.8 | 600 | JSON配列 4件 `{level,title,desc}` | 2026-05-27 |
| 10 | `kizuki_behavior_next_candidates` | きづき 行動実験 Step5（次の一歩3個） | 2.5-flash | 0.8 | 500 | JSON配列 3件 `{level,title,desc}` | 2026-05-27 |
| 11 | `stimulus_control_plans` | きづき 刺激統制 Step3-4（プラン5個） | 2.5-flash | 0.85 | 1200 | JSON配列 5件 `{id,title,desc,tags}` | 2026-05-27 |
| 12 | `stimulus_control_advice` | きづき 刺激統制 Step8（振り返り） | 2.5-flash | 0.75 | 350 | 自然文 3-5文200字 | 2026-05-27 |

### 8.1 各プロンプトのメタフィールド構造

```js
{
  id, title, purpose,
  triggerLocation,        // ユーザー側の発火位置
  callSite,               // コード上の呼び出し関数
  model, temperature, maxTokens,
  outputFormat,           // 自然文 or JSONスキーマ
  fallbackBehavior,       // API失敗・JSON失敗時の挙動
  safetyChecks: [],       // 安全要件
  systemPrompt: `...`,    // システムプロンプト本文
  userTemplate: `...`,    // ユーザーメッセージテンプレート（任意）
  contextTemplate: `...`, // 動的文脈差し込み（任意）
  lastUpdated, changeNote,
  psychologistReviewStatus, psychologistReviewNote,
}
```

### 8.2 ★重要★ mood_chat の最新仕様（v0.9.83）

`mood_chat` だけが他プロンプトと明確に方針が異なる:

| 観点 | mood_chat (v0.9.83) | 他11プロンプト |
|---|---|---|
| 出力形式 | JSON `{message, quickReplies[]}` | JSON配列 or 自然文 |
| Quick Reply 動的生成 | あり（毎ターン3-4個・逃げ道強制） | なし |
| 質問疲労防止ポリシー | あり（40/30/20/10・1返信1質問） | なし |
| トーンNG明示 | ポエム調・比喩・過剰励まし禁止 | 一部のみ |
| クライシス対応 | 専門窓口番号を本文に内蔵 | safetyChecksに記載のみ |

→ **この方針を他プロンプトにも展開すべきか**は GPT に意見を聞きたい論点。

---

## 9. GPTに相談したい改善ポイント

### 9.1 思考のクセ分析（最優先）

#### Q1. AI版分析プロンプトの設計
- 入力: `moyamoyaRecords[]`（直近10件以上）、`kizukiResults.distortion`（自己評価）
- 出力すべき4インサイトの構造化スキーマは何が最適か
- 「クセ同士のつながり」をどう検出するか（共起？因果？文脈？）
- 「あなた専用の改善ヒント」を心理士監修水準で書くためのプロンプト構造

#### Q2. DISTORTIONS 8種の妥当性
- Beck/Burns 等の標準分類と比較してこの8種は適切か
- 「自分への関連付け」と「個人化（personalization）」の訳語選択
- 「感情的決めつけ」（emotional reasoning）が抜けている問題
- 「破局視」（catastrophizing）と「運命の先読み」の関係

#### Q3. counter（カウンター質問）の心理士視点レビュー
- 各歪みの counter は適切か／断定が混ざってないか
- 22-28歳の言葉遣いとして自然か

#### Q4. ルールベース検出の改善
- examples（キーワード）を増やす？文脈窓を入れる？
- alternativeView を入力から除外すべきか（誤検出問題）
- 5軸レーダーの軸選定の見直し

### 9.2 プロンプト整理

#### Q5. mood_chat の新ポリシー（質問疲労防止、Quick Reply、JSON出力）を他プロンプトに展開すべきか
- もやもや整理の各ステップAI（cbt_*）にも質問疲労防止は必要か
- 下向き矢印法（dd_*）の各ステップでQuick Replyを出すべきか

#### Q6. トーンの統一
- 「あなたは…のセラピストです」系（cbt_*, dd_*）と「あなたは伴走者すぷらん」系（kizuki_*, stimulus_*）の混在
- 心理士監修水準のNG表現リストを共通プリアンブル化すべきか

#### Q7. JSON出力の安定性
- thinkingBudget:0 + maxTokens余裕は全プロンプトに適用済みか
- responseMimeType を全JSONプロンプトに適用すべきか

#### Q8. 重複と網羅性
- もやもや整理の「適応的思考6個」と下向き矢印法の「新スキーマ4個」は機能重複しているか
- 行動実験と刺激統制で「プラン提案」のロジック差別化は明確か

---

## 10. 参考: 心理士監修プロセス

**監修者**: 公認心理師・臨床心理士（アドバイザリー部所属、2026-04-18 契約）
**監修対象**: 全AIプロンプト + DISTORTIONS定義 + counter表現
**監修ステータス**: 全プロンプトが現在「レビュー待ち」（`psychologistReviewStatus: 'レビュー待ち'`）
**プロセス**: β配布後、実出力サンプル10件 + 本プロンプト本文を提示してフィードバック取得

---

## 11. 関連ドキュメント

- システム仕様書: `company/product_development/projects/mental-health-app/requirements/system_spec_v1_2026-04.md`
- MVP仕様書: `company/product_development/projects/mental-health-app/requirements/mvp_spec_v1_2026-04.md`
- AIプロンプトQAフレームワーク: `company/product_development/projects/mental-health-app/ai_prompt_qa_framework_for_beta.md`
- UIコピー スタイルガイド: `company/product_development/projects/mental-health-app/ui_copy_style_guide.md`
- リリースロードマップv1: `company/product_management/roadmap/release_roadmap_v1_2026-05.md`

---

## 12. このドキュメントの利用方法（GPTへの依頼例）

```
このアプリ仕様書を読んで、§9 の Q1（AI版 思考のクセ分析プロンプトの設計）について
具体的な systemPrompt と outputFormat のスキーマを提案してください。

制約:
- §2 の設計哲学（特に質問疲労防止・ナナメの関係・NG表現）を厳守
- 出力は JSON で、§7.5 の4種類のインサイトを構造化
- 心理士監修水準で、Beck/Burns の認知療法理論を参照
- 22-28歳の若者向けの口語トーン
```
