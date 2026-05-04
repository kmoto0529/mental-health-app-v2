# scenes/ — UI 内に埋め込む情景画像

ホーム右上のすぷらん紹介モーダルなど、UI 内のカードに埋め込む小型のシーン画像を配置するフォルダ。

## ファイル一覧

| ファイル | 用途 | 推奨サイズ |
|---|---|---|
| `moya_forest.png` | すぷらん紹介モーダル「もやの森って？」セクション右側のサムネイル | 512×512px / 透過なし可 / 中央寄せ |

## DALL-E プロンプト（moya_forest.png）

```
A small square watercolor illustration of "もやの森" (Moya no Mori) — a gentle
warm forest scene used as a thumbnail in a mental health app UI.
- Soft watercolor / pastel illustration, kawaii but mature for ages 22-28
- Two or three light-green watercolor trees, simple stylized
- A small wooden signpost with "もやの森" hand-written in gentle Japanese calligraphy
- A tiny blue bird perched nearby (optional)
- A small clear stream and scattered tiny wildflowers at the base
- Warm cream-pastel background (#FAF7F2 ish), no harsh shadows
- Square 1:1 composition, will be cropped into a rounded thumbnail
- No text other than "もやの森" on the signpost
```

## 配置後の動作

`./assets/suplan/scenes/moya_forest.png` を配置すると、モーダル内で自動的に
PNG が表示されます。未配置時は簡易 SVG プレースホルダーが描画されます
（コード変更不要）。
