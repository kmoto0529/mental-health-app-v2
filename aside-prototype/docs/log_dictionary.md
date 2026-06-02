# ログ・データ辞書（もやの森β）

`v_customer_timeline` などの **`種別`（event）** と **`内容`（details/payload）** を読み解くための対応表。
出典: `index.html` の `MoyaLogger.event(...)` 発火箇所、`supabase/schema.sql`、`v_user_journey` 定義。

---

## 1. 種別（event）の意味とアプリ行動の対応

| 種別 (event) | アプリでの行動 | 記録タイミング | 内容(details)の主なフィールド |
|---|---|---|---|
| `session_start` | アプリ起動（セッション開始） | 起動時／30分無操作後の再開 | `entry_point`=起動経路, `mood_before`=起動時の気分(1-5) |
| `session_end` | セッション終了 | 30分無操作 or 明示終了 | `mood_after`=終了時の気分(1-5) |
| `emotion_check` | 気持ちチェックを記録 | 気分を記録した時（emotion_log） | `emotion_level`=気分(1-5), `note`=ひとことメモ |
| `action_start` | いっぽ（行動）を開始 | 行動を始めた時 | `action_id`=行動ID, `type`=実行形式, `difficulty`=難易度 |
| `action_done` | いっぽを完了 | 行動をやり切った時 | `action_id`, `reaction`=やった後の体感, `memo` |
| `action_abandoned` | いっぽを中断/放棄 | 途中でやめた時 | `action_id` |
| `screen_view` | 画面を表示 | 各画面に遷移するたび | `screen`=画面名 |
| `mood_logged` | ホームで気分を記録 | ホームの気分入力を保存 | `score`=気分(1-5), `categories`=カテゴリ配列 |
| `moyamoya_saved` | もやもや整理（コラム法）を保存 | もやもや整理ワーク完了 | `emotion`=感情, `deltaScore`=整理前後の気分改善幅 |
| `ippo_completed` | いっぽセッション完了（サマリ） | いっぽの振り返りまで完了 | `evaluation`/`moodLabel`, `changeValue`=気分変化, `actionId`, `directionIds` |
| `deepdive_saved` | 下向き矢印法を保存 | 深掘りワーク完了 | `tags`, `oldSchema`=古い思い込み, `newSchema`=新しい捉え方 |
| `crisis_shown` | 専門窓口（クライシス）を表示 | リスクワード検知で窓口表示 | `severity`=重大度（4以上で表示） |
| `feedback` | アプリ内フィードバック送信 | 設定から送信 | `category`=種別, `text`=本文, `screen`=送信元 |
| `consent_given` | 利用同意 | オンボで同意 | `version`=同意したポリシー版 |
| `error` | JSエラー（自動捕捉） | アプリ内でエラー発生 | `message`=エラー内容, `screen`=発生画面, `stack` |
| `content_open` | コンテンツを選択/開いた | 各コンテンツに入った時 | `tab`, `content`=コンテンツキー |
| `content_step` | コンテンツのステップ進行 | ステップが進むたび | `tab`, `content`, `step`=到達ステップ, `total`=全ステップ, `label`=ステップ名 |
| `content_done` | コンテンツを完了 | ワークを完了した時 | `tab`, `content` |

### コンテンツキー（`content`）一覧

| タブ | content | 表示名 |
|---|---|---|
| home | `mood_check` | 今の気持ち |
| home | `moyamoya` | もやもや整理（コラム法・ホーム入口） |
| ippo | `ippo_action` | 行動実施 |
| kizuki | `downward_arrow` | 下向き矢印法 |
| kizuki | `behavior_experiment` | 行動実験 |
| kizuki | `column_method` | コラム法（きづき入口） |
| kizuki | `stimulus_control` | 刺激統制 |
| record | `calendar` | カレンダー（閲覧） |
| record | `trend` | 傾向分析（閲覧） |
| record | `distortion` | 思考のクセ分析（閲覧） |

→ 集計は `v_content_engagement` ビュー（誰が・どのコンテンツを・到達ステップ・完了回数・最終実施）。

---

## 2. 内容(details)のコード値の読み方

### 気分（`emotion_level` / `mood_before` / `mood_after` / `score`）
| 値 | 意味 |
|---|---|
| 1 | つらい |
| 2 | いまいち |
| 3 | ふつう |
| 4 | まあいい |
| 5 | とてもいい |

### 実行形式（`type` / `action_execution_type`）
| 値 | 意味 |
|---|---|
| `instant_done` | その場で完了（ワンタップ） |
| `memo_done` | メモを記入して完了 |
| `ai_assist` | AI対話を挟んで完了 |
| `choice_done` | 選択肢から選んで完了 |

### 難易度（`difficulty`）
| 値 | 意味 |
|---|---|
| `easy` | かんたん |
| `normal` | ふつう |
| `bold` | 少し前進（チャレンジ） |

### やった後の体感（`reaction`）
| 値 | 意味 |
|---|---|
| `better` | 少し楽になった |
| `same` | 変わらない |
| `hard` | むずかしかった |

### 状態（`status`）
| 値 | 意味 |
|---|---|
| `started` | 開始 |
| `done` | 完了 |
| `abandoned` | 中断 |

### 起動経路（`entry_point`）
| 値 | 意味 |
|---|---|
| `direct` | 直接起動 |
| `resumed` | 再開（バックグラウンド復帰） |

### 行動ID（`action_id`）
- 行動カタログのID（例: `A012`, `A047`）。実際の行動名は Supabase `public.actions` テーブル（`id` で照合）またはアプリ内カタログに対応。

---

## 3. Excel/スプレッドシートへのエクスポート手順

1. Supabase Dashboard → **SQL Editor**
2. 見たいビューを SELECT（例: 特定の人の全行動）
   ```sql
   select * from public.v_customer_timeline
   where "匿名ID" = '★匿名ID★'
   order by "日時";
   ```
3. 結果パネル右上の **「Export」▾ → 「Download CSV」**
4. ダウンロードしたCSVをExcel/Googleスプレッドシートで開く
   - ※Excelで日本語が文字化けする場合: Excelで「データ → テキスト/CSVから」→ 文字コード **UTF-8** を選んで読み込む（または Google スプレッドシートで開くと自動でUTF-8）
