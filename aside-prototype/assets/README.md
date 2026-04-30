# Welcome Hero 画像

## ファイル名
`welcome-hero.png`（このフォルダ直下）

## DALL-E プロンプト（推奨）

縦長スマホ画面（9:16 〜 3:4 推奨）で生成してください。

```
A serene, contemplative scene at twilight: a small candle in a glass jar
glowing warmly on a wooden window sill, with a calm forest visible
through the window. Distant mountain silhouettes, a still lake reflecting
soft moonlight, deep teal-green and dark forest tones, hint of warm
amber from the candle. Painterly, atmospheric, calming, no people,
no text. Vertical composition, top half is sky/forest, bottom half
fades to dark. Style: soft impressionist illustration, muted color
palette, peaceful and introspective mood.
```

英語版：上記。日本語短縮：
```
夜の森の窓辺。木の窓枠にろうそくが優しく灯り、外には月明かりに照らされた静かな湖と森のシルエット。深い青緑とダークフォレストの色調、ろうそくのアンバー色がアクセント。穏やかで内省的、人物なし、文字なし。縦長構図。柔らかい印象派風の絵画。
```

## 仕様
- **形式**: PNG（透過不要）
- **比率**: 9:16 縦長 推奨（最低 750×1200px）
- **容量**: 500KB 以下推奨（Vercel 配信を軽くするため）
- **配色**: ベース #1F2A2A 〜 #2F3E3E、アクセントの灯り色 #DCEBD8 / アンバー
- **構図**: 上半分=景色、下半分=暗くフェード（テキストが乗るため）

## 配置後の挙動
- アプリ起動時に自動でこの画像を読み込み Welcome ヒーローに表示
- 読み込みに失敗（ファイルが無い / 壊れている）すると、CSS で疑似的な森の夜景を生成するフォールバックが自動で表示される
- ライト/ダーク両モードで同じ画像を使用（オーバーレイで明度調整）

## 差し替え手順
1. DALL-E などで画像生成
2. `welcome-hero.png` という名前でこのフォルダに保存
3. git add / commit / push → Vercel自動デプロイ
