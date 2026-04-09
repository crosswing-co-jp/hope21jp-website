# HOPE21 コーポレートサイト (hope21jp-website)

## プロジェクト概要
HOPE21（同人誌印刷会社）のコーポレートサイト。
元々WordPressで運用していたサイトを静的HTML化し、GitHub Pagesへ移行したもの。

- **本番URL**: https://crosswing-co-jp.github.io/hope21jp-website/
- **リポジトリ**: crosswing-co-jp/hope21jp-website

## 技術構成

### サイト構造
- 各ページはディレクトリごとに `index.html` を配置（例: `faq/index.html`, `goods/index.html`）
- `wp-content/`, `wp-includes/` — WordPress由来の静的アセット（CSS/JS/画像）
- `hopemedia/` — メディアファイル（画像はWebP変換済み）
- `index.html`（ルート）— トップページ（約221KB）

### デプロイ（GitHub Actions）
ワークフロー: `.github/workflows/pages.yml`

1. `main` ブランチへのpushで自動実行
2. **Pagefind** で全HTMLから検索インデックスをビルド（ビルドはパス変換の前に実行）
3. **Pythonスクリプト** でHTML/CSS内のパスを `/hope21jp-website/` ベースパスに書き換え
4. GitHub Pages にデプロイ

### パス変換の注意点
- GitHub Pagesはサブディレクトリ (`/hope21jp-website/`) で配信されるため、ビルド時にパスを変換している
- HTML内の `href="/foo/"` → `href="/hope21jp-website/foo/"` のように書き換え
- `<script>` タグ内は別ロジック（エスケープ済みパス `\/wp-includes\/` なども対応）
- `application/ld+json`（構造化データ）はパス変換の対象外
- CSS内の `url(/wp-content/...)` も変換対象

### 検索機能
- Pagefind による静的サイト内検索
- UIはモーダルオーバーレイ方式

### 営業日カレンダー
- 外部API依存なしの静的JS実装

## 過去の主な作業履歴
- WordPress → 静的HTML化 + GitHub Pages移行
- Pagefind静的検索導入（モーダルオーバーレイUI）
- 営業日カレンダーの静的JS実装への移行
- 構造化データ（JSON-LD）追加
- hopemedia画像のWebP変換（34MB→13MB）
- Actionsパス変換ロジックの改善（scriptタグsrc対応、二重ベースパス修正）

## 開発時の注意
- HTMLファイル内のパスはローカルでは相対パスのまま。GitHub Pagesへのデプロイ時にActionsが自動変換するため、手動でベースパスを入れない
- `pagefind/` ディレクトリはビルド生成物なので `.gitignore` 済み
- 画像追加時はWebP形式を推奨
