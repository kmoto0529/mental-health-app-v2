# 行動カタログ更新ガイド（Supabase運用）

**対象**: もやの森 β版 / いっぽの「行動カタログ（ACTIONS）」
**真実の源**: Supabase `public.actions` テーブル
**仕組み**: アプリ起動時に Supabase REST から `is_active=true` の行を取得 → `ACTIONS` 配列を上書き → 表示反映
**カタログ規模**: 50件（physical 15 / cognitive 15 / relax 10 / assertion 10）

> **2026-05-13 改訂**: Google Sheets 公開CSV運用は廃止（外部公開リスク回避）。Supabase の actions テーブルに移行。

---

## 初回セットアップ（1回だけやる）

### Step 1. SQL をSupabaseに適用

1. https://supabase.com/dashboard にログイン
2. もやの森のプロジェクト（`tkhxymaxwaokeqsthydi`）を開く
3. 左メニュー **SQL Editor** → **New query**
4. リポの [`supabase/02-actions-catalog.sql`](../supabase/02-actions-catalog.sql) を全文コピー → 貼り付け
5. 右下 **Run** ボタンをクリック
6. 「Success. No rows returned」と表示されればOK
   - `insert into ... values (...)` のメッセージで50件が入っていることも確認

### Step 2. 動作確認

同じ SQL Editor で:

```sql
select count(*) from public.actions;
-- → 50

select cat, count(*) from public.actions group by cat order by cat;
-- → assertion 10, cognitive 15, physical 15, relax 10
```

### Step 3. アプリ側を最新版にデプロイ

リポを最新版 (`v0.9.66-beta.1` 以降) に上げる。
catalog-loader.js が Supabase REST から自動取得するようになっている。

→ 完了。以降は社長が Supabase Studio 上で表を編集するだけで反映される。

---

## 日々の更新フロー

### 表を開く

1. Supabase Dashboard → 左メニュー **Table Editor**
2. **public.actions** をクリック
3. Excel風の50行表が開く

### 編集する

| やりたいこと | 操作 |
|---|---|
| 文言を修正 | セルをダブルクリック → 編集 → Enter（即時保存） |
| 行動を新規追加 | 表の下の **Insert row** ボタン |
| 行動を非公開にする | `is_active` のチェックを外す（ドラフト保存・アプリには出ない） |
| 行動を削除 | 行のチェック → 右上 **Delete** |
| カテゴリで絞り込み | `cat` 列のフィルタアイコン |
| 並び替え | 列ヘッダクリック |
| CSVエクスポート（心理士共有用） | 右上 **Export** → CSV |

### アプリに反映されるタイミング

- アプリは起動時に Supabase REST を叩く → 即座に新しい一覧が読み込まれる
- ユーザー側で「リロード」すれば即反映
- ブラウザキャッシュは最大1日（localStorageキャッシュ）。`MoyaCatalog.clearCache()` で強制クリア可

---

## 列の書き方ルール

| 列 | 必須 | 値の例 | 制約 |
|---|---|---|---|
| `id` | ✓ | `A001`, `A042` | 一意。半角英数 |
| `cat` | ✓ | `physical` / `cognitive` / `relax` / `assertion` | この4つから |
| `icon` |  | `🚶` `🌬` `💧` | 絵文字1〜2文字（任意） |
| `title` | ✓ | `5分だけ散歩` | 表示タイトル |
| `description` | ✓ | `玄関を出て5分歩く。家の周りでもOK。` | 補足説明 |
| `time_label` | ✓ | `1分` `5分` `5-10分` `15分` | 自由記述（表示用） |
| `technique` | ✓ | `行動活性化` 等 | 既知リスト推奨（下表）／不明値はwarning |
| `domains` | ✓ | `work\|self\|sleep` | **パイプ区切り**で複数指定 |
| `is_active` | ✓ | `true` / `false` | デフォルト `true`。`false` で非公開（ドラフト） |

### cat に使える値（4種・固定）

- `physical` — 物理的にできる行動（散歩・呼吸・ストレッチ等）
- `cognitive` — 考え方を整理する行動（認知再構成・別の見方等）
- `relax` — リラクセーション・気持ちを落ち着ける行動
- `assertion` — アサーション（自分の意見を伝える練習）

### domains に使える値（5種・固定）

- `work` — 仕事・学業
- `self` — 自己理解・自分との関係
- `sleep` — 睡眠
- `relationship` — 人間関係
- `future` — 将来・未来不安

### technique に使える値（既知リスト・拡張可）

- `行動活性化`
- `リラクセーション`
- `マインドフルネス`
- `認知の外在化`
- `認知再構成`
- `下向き矢印法`
- `ホット思考特定`
- `行動実験`
- `感情ラベリング`
- `アサーション準備`
- `アサーション`
- `アサーション計画`

> 既知リスト外の技法を入れた場合は**警告のみ**でデータは受け入れます（CBT 技法拡張に対応）。

---

## ドラフト運用（心理士レビュー前提）

新しい行動案を心理士レビュー後に公開したいとき:

1. **Insert row** で行を追加（id/cat/title 等を入力）
2. **is_active のチェックを外す** ＝ アプリには出ない
3. 心理士レビュー → 修正
4. レビューOKになったら is_active を `true` に → 次回アプリリロードで反映

---

## 編集事故から守る仕組み

| 起こりうる事故 | アプリの挙動 |
|---|---|
| 必須欄が空（id/title/description/time_label/cat/technique） | その行だけスキップ・コンソールに warn |
| `cat` に `physical2` 等の不正値 | DB側 CHECK 制約で**保存自体が拒否される** |
| `domains` に `aaa` 等の不正値 | その行スキップ（アプリ側バリデーション） |
| `technique` に既知リスト外の値 | warning のみ・データは受け入れる |
| id重複 | DB側 PRIMARY KEY で**保存自体が拒否される** |
| Supabase取得失敗（オフライン等） | localStorage キャッシュを使用。それも無ければバンドル既定値 |
| パース不能 | バンドル既定値にfallback |

→ **DBが壊れてもアプリは死なない**。ただし Console に警告が出るので、編集後は念のため DevTools Console で `[MoyaCatalog]` 警告がないか確認推奨。

---

## 動作確認

ブラウザで本番URL（または `node serve.js` で http://localhost:8765）を開き、DevTools Console:

- 成功時:
  ```
  [MoyaCatalog] キャッシュから 50 件適用 (2分前)
  [MoyaCatalog] supabase から 50 件読み込み完了 (skip: 0, warn: 0)
  ```
- 設定ミス時:
  ```
  [MoyaCatalog] バリデーションエラー (3件、最初の5件):
    - L15 (A099): domains 不正 [aaa] — 許可値: work/self/sleep/relationship/future
  ```

---

## 心理士アドバイザーへのレビュー依頼

### 方法A: Supabase アカウント招待（推奨）

1. Supabase Dashboard → Settings → **Team** → **Invite**
2. 心理士のメアドを追加 → Role: `Developer` または `Read-only`
3. 心理士はログイン後 Table Editor → actions を直接見られる
4. コメントは別途（Slack / メール / シート）

### 方法B: CSV エクスポート＋共有（招待不要）

1. Supabase Table Editor 右上 **Export** → CSV
2. CSVを心理士にメール / 共有ドライブ等で送付
3. 心理士はExcel等でレビュー → 修正案を返信
4. 社長が Supabase Studio で反映

→ 招待不要・レビュー前ドラフトが外部に出ない、最もシンプルなフロー。

---

## トラブルシュート

### 編集してもアプリに反映されない

- ブラウザのキャッシュが残っている可能性。DevTools Console で `MoyaCatalog.clearCache()` → リロード
- Supabase 側で `is_active = true` になっているか確認
- DevTools Console で `[MoyaCatalog]` の取得結果を確認

### Supabase 接続できない

- [index.html:6082-6086](../index.html#L6082-L6086) の `ASIDE_CONFIG.supabaseUrl` と `supabaseAnonKey` を確認
- Supabase Dashboard → Settings → API でキーが有効か確認

### バリデーションエラー多発

- DB上の値が壊れていないか確認: `select * from public.actions where domains !~ '^[a-z|]+$' or cat not in ('physical','cognitive','relax','assertion');`
- 必要なら [`supabase/02-actions-catalog.sql`](../supabase/02-actions-catalog.sql) のシード部だけ再実行（`on conflict (id) do nothing` なので既存行は壊さない）

---

## なぜ Google Sheets 運用から Supabase に移したか

| 観点 | Google Sheets 公開CSV | **Supabase actions テーブル** |
|---|---|---|
| 外部公開リスク | ✕ 全世界が読める | ✓ RLS で社長ログインのみ |
| 編集UI | ◎ スプレッドシート | ○ Excel風テーブルエディタ |
| インフラ追加 | 別途用意 | ✓ もやの森既設インフラを流用 |
| ドラフト管理 | △ 手動 | ✓ `is_active` で公開/非公開切替 |
| 心理士レビュー | URL共有 | アカウント招待 or CSVエクスポート |

→ レビュー前ドラフトや競合への露出を避けたい・既存Supabaseで完結させたい、という方針で 2026-05-13 に切替。
