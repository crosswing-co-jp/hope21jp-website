# hope21jp-website セットアップ記録 (2026-04-06)

## 概要
- hope21.jp（同人誌印刷サイト・WordPress）の静的ミラー
- wgetでミラー取得後、クリーンアップ + 画像WebP変換
- GitHub管理 + GitHub Pagesで検証環境構築

## リポジトリ
- **GitHub**: https://github.com/crosswing-co-jp/hope21jp-website (private)
- **ローカル**: `~/REPO/HOPE21/hope21jp-website/`
- **GitHub Pages**: https://crosswing-co-jp.github.io/hope21jp-website/

## サイト構成
- WordPressの静的ミラー: 420ページ / 約4,150ファイル
- 画像はすべてWebPに変換済み

## クリーンアップ実施内容

| 対象 | 内容 |
|------|------|
| feed/ | RSSフィード削除 |
| wp-json/ | WordPress REST API削除 |
| comments/ | コメントフィード削除 |
| wp-includes/ | 一度削除後、参照されている15ファイルを元サイトから再取得 |
| WPサムネイル | `-NNNxNNN` パターンを一度削除後、HTML参照されている1,068ファイルを再取得 |
| 画像WebP変換 | PNG(1,504) + JPG(1,841) → 全WebPに変換。497MB → 164MB（67%削減） |
| テーマSVGアイコン | main.cssから参照される16個を元サイトから取得 |
| foogallery icons.svg | プラグインのアイコンSVGを取得 |

### 取得できなかったファイル（41件）
- 2017年頃の古い画像。元サイトにも存在しない。影響は軽微

### 復元したwp-includes（15ファイル）
- jquery.min.js, jquery-migrate.min.js
- blocks/navigation/style.min.css, blocks/image/style.min.css, blocks/table/style.min.css 等
- interactivity/index.min.js, block-library/navigation/view.min.js 等
- tinymce.min.js, masonry.min.js, imagesloaded.min.js

## GitHub Pages対応 (.github/workflows/pages.yml)

デプロイ時に以下の変換を実行（ソースは変更しない）:

1. **本番絶対URL変換**: `https://hope21.jp/wp-content/` → `/hope21jp-website/wp-content/`
2. **HTML相対パス変換**: `../../wp-content/` → `/hope21jp-website/wp-content/`
3. **HTMLルート直接参照**: `href="wp-content/"` → `href="/hope21jp-website/wp-content/"`
4. **CSS絶対パス変換**: `url(/wp-content/)` → `url(/hope21jp-website/wp-content/)`
5. **CSS相対パス変換**: `url(../wp-content/)` → `url(/hope21jp-website/wp-content/)`

## 本番デプロイ

- **ソースファイルをそのままドキュメントルート(`/`)にコピーするだけでOK**
- CSS内の `url(/wp-content/...)` はサーバーのルートからの絶対パスなので、ルート配置なら正しく解決される
- GitHub Pagesのパス変換はActionsでのみ実行されるため、ソースには影響しない

## ローカル確認方法
```bash
cd ~/REPO/HOPE21/hope21jp-website
python3 -m http.server 3000
# http://localhost:3000 でアクセス
```
ファイルを直接開く(`file://`)ではCSS内の絶対パス `url(/wp-content/...)` が解決できないため、必ずローカルサーバーを使うこと。

## 既知の問題
- HTML内に残る非表示の壊れた参照（`wp-json/`, `feed/`, `xmlrpc.php`）は `<link>` タグ内のみで見た目に影響なし
- 2017年の古い画像41件が元サイトにも存在せず取得不可（影響軽微）
