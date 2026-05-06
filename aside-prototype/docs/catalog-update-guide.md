# 行動カタログ更新ガイド（Google Sheets運用）

**対象**: もやの森 β版 / いっぽの「行動カタログ（ACTIONS）」
**真実の源**: Google Sheets（公開CSV）
**仕組み**: アプリ起動時に Sheets の CSV を取得 → `ACTIONS` 配列を上書き → 表示反映
**カタログ規模**: 50件（physical 15 / cognitive 15 / relax 10 / assertion 10）

> **2026-05-06 改訂**: 旧 `ACTION_CATALOG` 用の構造から、現行 `ACTIONS`（いっぽ50項目）スキーマへ移行。

---

## 初回セットアップ（1回だけやる）

### Step 1. Google Sheets を新規作成

1. https://sheets.new で新規スプレッドシート作成
2. ファイル名: 「**もやの森 行動カタログ（ACTIONS）**」
3. 1行目に**そのままヘッダー**を貼り付け（重要：列順を守る）：

```
id	cat	icon	title	desc	time	technique	domains
```

### Step 2. 既存50件の初期データを貼り付け

1. リポの [`scripts/actions-seed.tsv`](../scripts/actions-seed.tsv) を VSCode 等で開く
2. 全選択 → コピー
3. Sheets の A1 セルにペースト → 一気に50行＋ヘッダーが入る

> 既存リポの ACTIONS と完全一致するよう自動生成されています。
> 再生成: `node scripts/export-catalog.js`

### Step 3. ウェブに公開

1. メニュー: **ファイル** → **共有** → **ウェブに公開**
2. リンクタブで:
   - 1番目のドロップダウン: **シート1** を選択
   - 2番目: **カンマ区切り形式（.csv）** を選択
3. **公開** ボタンクリック → 確認ダイアログ「OK」
4. 表示されるURL（`https://docs.google.com/spreadsheets/d/.../pub?output=csv` など）を**コピー**

### Step 4. アプリに URL を設定

[index.html](../index.html) の `ASIDE_CONFIG.actionCatalogUrl` に貼り付け：

```js
window.ASIDE_CONFIG = {
  ...
  actionCatalogUrl: 'https://docs.google.com/spreadsheets/d/XXXXX/pub?output=csv'
};
```

コミット → push → Vercel自動デプロイで反映。

---

## 日々の更新フロー

1. Google Sheets を開く
2. 行を追加 / 編集 / 削除
3. 保存（自動）
4. 数分待つ（Sheets の公開CSV は 5〜15分のCDNキャッシュあり）
5. アプリをリロードすると新カタログ反映

**コミットもデプロイも不要**。Sheets だけで完結する。

---

## 列の書き方ルール

| 列 | 必須 | 値の例 | 制約 |
|---|---|---|---|
| `id` | ✓ | `A001`, `A042` | 一意。半角英数 |
| `cat` | ✓ | `physical` / `cognitive` / `relax` / `assertion` | この4つから |
| `icon` |  | `🚶` `🌬` `💧` | 絵文字1〜2文字（任意） |
| `title` | ✓ | `5分だけ散歩` | 表示タイトル |
| `desc` | ✓ | `玄関を出て5分歩く。家の周りでもOK。` | 補足説明 |
| `time` | ✓ | `1分` `5分` `5-10分` `15分` | 自由記述（表示用） |
| `technique` | ✓ | `行動活性化` 等 | 既知リスト推奨（下表）／不明値はwarning |
| `domains` | ✓ | `work\|self\|sleep` | **パイプ区切り**で複数指定 |

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

## 編集事故から守る仕組み

| 起こりうる事故 | アプリの挙動 |
|---|---|
| 必須欄が空（id/title/desc/time/cat/technique） | その行だけスキップ・コンソールに warn |
| `cat` に `physical2` 等の不正値 | その行スキップ |
| `domains` に `aaa` 等の不正値 | その行スキップ |
| `technique` に既知リスト外の値 | warning のみ・データは受け入れる |
| id重複 | 後の行スキップ |
| Sheets取得失敗（オフライン等） | localStorage キャッシュを使用。それも無ければバンドル既定値 |
| パース不能 | バンドル既定値にfallback |

→ **シートが壊れてもアプリは死なない**。ただし Console に警告が出るので、編集後は念のため DevTools Console で `[MoyaCatalog]` 警告がないか確認推奨。

---

## 動作確認

ブラウザで本番URL（または `node serve.js` で http://localhost:8765）を開き、DevTools Console:

- 成功時:
  ```
  [MoyaCatalog] キャッシュから 50 件適用 (2分前)
  [MoyaCatalog] sheets から 52 件読み込み完了 (skip: 0, warn: 0)
  ```
- 設定ミス時:
  ```
  [MoyaCatalog] バリデーションエラー (3件、最初の5件):
    - L15 (A099): cat 不正 "phys" — 許可値: physical/cognitive/relax/assertion
  ```

---

## 心理士アドバイザーへのレビュー依頼

1. Sheets の右上 **共有** ボタン
2. 心理士のメアド追加 → 「閲覧者」または「コメント可」
3. 心理士はコメント機能で行ごとにフィードバック
4. 取り込み済みの修正をコメント解決でチェック

→ Sheets が**実装と監修の共通言語**として機能する。

---

## トラブルシュート

### 編集してもアプリに反映されない

- Sheets の**公開**設定を再確認（共有とは別。「ウェブに公開」が必要）
- Sheets のキャッシュは最大15分。時間を置いて再リロード
- DevTools Console で `[MoyaCatalog]` の取得結果を確認
- それでもダメなら DevTools Console で `MoyaCatalog.clearCache()` を実行 → リロード

### URLを変えたい / シートを別のものに切り替えたい

[index.html](../index.html) の `ASIDE_CONFIG.actionCatalogUrl` を書き換える → コミット → デプロイ。

### バリデーションエラー多発

`scripts/actions-seed.tsv` の最新版を Sheets に貼り直すと安全。
ローカル ACTIONS から再生成: `node scripts/export-catalog.js`

### 既存ローカル ACTIONS と Sheets を同期したい

```bash
# ローカル → Sheets 用 TSV を再生成
node scripts/export-catalog.js
# 生成された scripts/actions-seed.tsv を Sheets に貼り付け
```

逆方向（Sheets → ローカルバンドル既定値の更新）は手動。
β運用中は **Sheets を真実の源** とし、ローカル既定値は**初期化用 / オフライン用** と割り切る。
