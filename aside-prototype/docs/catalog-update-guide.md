# 行動カタログ更新ガイド（Google Sheets運用）

**対象**: もやの森 β版
**真実の源**: Google Sheets（公開CSV）
**仕組み**: アプリ起動時に Sheets の CSV を取得 → ACTION_CATALOG を上書き → 表示反映

---

## 初回セットアップ（1回だけやる）

### Step 1. Google Sheets を新規作成

1. https://sheets.new で新規スプレッドシート作成
2. ファイル名: 「**もやの森 行動カタログ**」
3. 1行目に**そのままヘッダー**を貼り付け（重要：列順を守る）：

```
id	title	desc	type	difficulty	duration	category	goalKeys	states	ctaAct
```

### Step 2. 既存120件の初期データを貼り付け

1. リポの [`scripts/actions-seed.tsv`](../scripts/actions-seed.tsv) を VSCode 等で開く
2. 全選択 → コピー
3. Sheets の A1 セルにペースト → 一気に120行＋ヘッダーが入る

### Step 3. ウェブに公開

1. メニュー: **ファイル** → **共有** → **ウェブに公開**
2. リンクタブで:
   - 1番目のドロップダウン: **シート1** を選択
   - 2番目: **カンマ区切り形式（.csv）** を選択
3. **公開** ボタンクリック → 確認ダイアログ「OK」
4. 表示されるURL（`https://docs.google.com/spreadsheets/d/.../pub?output=csv`）を**コピー**

### Step 4. アプリに URL を設定

[index.html](../index.html) の `ASIDE_CONFIG` を編集:

```js
window.ASIDE_CONFIG = {
  ...
  actionCatalogUrl: 'https://docs.google.com/spreadsheets/d/XXXXX/pub?output=csv'  // ← Step 3でコピーしたURL
};
```

コミット → push → Vercel自動デプロイで反映。

---

## 日々の更新フロー

1. Google Sheets を開く
2. 行を追加 / 編集 / 削除
3. 保存（自動）
4. 数分待つ（Sheetsの公開CSVは5-15分のCDNキャッシュあり）
5. アプリをリロードすると新カタログ反映

**コミットもデプロイも不要**。Sheets だけで完結する。

---

## 列の書き方ルール

| 列 | 必須 | 値の例 | 制約 |
|---|---|---|---|
| `id` | ✓ | `act_a09`, `act_calm_01` | 一意。半角英数とアンダースコア |
| `title` | ✓ | `気持ちを一言だけ残す` | 表示タイトル |
| `desc` | | `しんどい日も、ひとことだけで大丈夫。` | 補足説明（空欄可） |
| `type` | ✓ | `app` / `daily` / `social` | この3つから |
| `difficulty` | ✓ | `easy` / `normal` / `bold` | bold=「少し前進」 |
| `duration` | ✓ | `1`, `3`, `5` | 分数（数値のみ） |
| `category` | ✓ | `A` 〜 `H` | 仕様§7のカテゴリ記号 |
| `goalKeys` | ✓ | `organize_feelings\|reduce_overthinking` | **パイプ区切り**で複数指定 |
| `states` | ✓ | `calm\|mixed\|heavy` | パイプ区切り |
| `ctaAct` | | `goto-mood`, `start-chat`, `start-reflect`, `goto-rescue` | 空ならただ表示するだけ |

### goalKeys に使える値（5種）

- `organize_feelings` — 気持ちを整理したい
- `reduce_overthinking` — 考えすぎを減らしたい
- `understand_my_feelings` — 自分の気持ちを理解したい
- `have_place_to_rely` — 頼れる場所がほしい
- `not_sure_yet` — まだわからない

### states に使える値（3種）

- `calm` — 落ち着いている
- `mixed` — 少しもやもや
- `heavy` — しんどい

### ctaAct に使える値

- 空欄 — 表示のみ（CTAボタンなし）
- `goto-mood` — 気持ちチェック画面へ
- `start-chat` — AI会話開始
- `start-reflect` — もやもや整理開始
- `goto-rescue` — レスキュー画面へ
- `goto-rescue-night` / `goto-rescue-words` / `goto-rescue-fuzzy` — 各種レスキュー

---

## 編集事故から守る仕組み

| 起こりうる事故 | アプリの挙動 |
|---|---|
| 必須欄が空 | その行だけスキップ・コンソールにwarn |
| typeに `app2` 等の不正値 | その行スキップ |
| id重複 | 後の行スキップ |
| Sheets取得失敗（オフライン等） | localStorageキャッシュを使用。それも無ければバンドル既定値 |
| パース不能 | バンドル既定値にfallback |

→ **シートが壊れてもアプリは死なない**。ただしConsoleに警告が出るので、編集後は念のため DevTools Console で `[MoyaCatalog]` 警告がないか確認推奨。

---

## 動作確認

ブラウザで http://localhost:8765 (or 本番URL) を開き、DevTools Console:

- 成功時:
  ```
  [MoyaCatalog] キャッシュから 120 件適用 (2分前)
  [MoyaCatalog] sheets から 122 件読み込み完了 (skip: 0)
  ```
- 設定ミス時:
  ```
  [MoyaCatalog] バリデーションエラー (3件、最初の5件表示):
    - L15 (act_xx): type 不正 "ap"
  ```

---

## 心理士アドバイザーへのレビュー依頼

1. Sheets の右上 **共有** ボタン
2. 心理士のメアド追加 → 「閲覧者」または「コメント可」
3. 心理士はコメント機能で行ごとにフィードバック
4. 取り込み済みの修正をコメント解決でチェック

→ Sheetsが**実装と監修の共通言語**として機能する。

---

## トラブルシュート

### 編集してもアプリに反映されない

- Sheetsの**公開**設定を再確認（共有とは別。「ウェブに公開」が必要）
- Sheetsのキャッシュは最大15分。時間を置いて再リロード
- DevTools Console で `[MoyaCatalog]` の取得結果を確認
- それでもダメなら `localStorage.removeItem('aside_catalog_cache_v1')` してリロード

### URLを変えたい / シートを別のものに切り替えたい

[index.html](../index.html) の `ASIDE_CONFIG.actionCatalogUrl` を書き換える → コミット → デプロイ。

### バリデーションエラー多発

`scripts/actions-seed.tsv` の最新版を seed として再ロードすると安全。
