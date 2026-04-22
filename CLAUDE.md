# HOPE21 コーポレートサイト (hope21jp-website)

このファイルは Claude Code で本リポジトリを開いた際、自動的にコンテキストとして読み込まれます。開発者・AIの双方がこの内容を前提に作業します。

## プロジェクト概要
HOPE21（同人誌印刷会社）のコーポレートサイト。
元々WordPressで運用していたサイトを静的HTML化し、AWS S3+CloudFrontで配信する構成に移行中。

- **本番URL**: https://hope21.jp
- **検証URL (Preview)**: https://crosswing-co-jp.github.io/hope21jp-website/
- **リポジトリ**: crosswing-co-jp/hope21jp-website

## 関連ドキュメント（先に読んで）

| ドキュメント | 内容 |
|---|---|
| [README.md](README.md) | 開発環境セットアップ・インフラ構成の全体像 |
| [RELEASE.md](RELEASE.md) | リリースフロー・ロールバック・緊急対応 |
| [SITE_PAGES.md](SITE_PAGES.md) | サイトページカタログ（どこに何があるか） |
| [SETUP_PRODUCTION.md](SETUP_PRODUCTION.md) | 本番環境の初回セットアップ手順（完了済みのランブック） |
| [SETUP_LOG.md](SETUP_LOG.md) | 初期構築の履歴 |

---

## ブランチ運用ルール（GitOps）

**厳守**。このプロジェクトは GitOps 風の運用をしています。

### ブランチ構成

- **`dev`** — 開発作業用のデフォルトブランチ。push すると Preview (GitHub Pages) に自動反映
- **`main`** — 本番反映ブランチ。push または merge すると **即本番 (S3) に自動デプロイ**

### フロー

```
dev で作業 → push → Preview で確認 → PR (dev→main) → レビュー → Merge → 本番反映
```

### 禁止事項
- ❌ **`main` への直接 push**（緊急時を除く）
- ❌ **PR レビューなしの Merge**
- ❌ **パス書き換えスクリプトを壊すような <script>タグ外での絶対パス記述**

### 必須事項
- ✅ 普段の作業は `dev` ブランチで
- ✅ `main` への変更は PR 経由
- ✅ PR レビューは **1名以上** 必須

緊急ホットフィックスは [RELEASE.md](RELEASE.md) の「緊急修正」参照。

---

## インフラ構成

### 本番 (hope21.jp)

```
CloudFront (ID: E1LXYQAH5K3U8)
 ├─ /sys/*  → ELB → EC2 (見積システム sys2023)  ★触らない
 ├─ /wp-content/*, /wp-includes/*, /hopemedia/* → S3
 └─ Default (*) → S3 + CloudFront Functions (URL正規化・301 redirect)
```

- **S3 bucket**: `hope21-jp-site` (ap-northeast-1)
- **CloudFront Function**: `hope21-url-normalizer` (旧URL→新URL の 301 redirect + trailing slash 正規化 + index.html 解決)
- **デプロイ**: GitHub Actions `deploy-production.yml` が OIDC で AWS にアクセス

### 検証 (GitHub Pages)

- **URL**: https://crosswing-co-jp.github.io/hope21jp-website/
- サブディレクトリ配信なので Actions がパス変換する
- `.github/workflows/pages.yml` で dev push 時に自動ビルド

---

## サイト構造

- 各ページはディレクトリごとに `index.html`（例: `faq/index.html`, `lineup/set/pocket/index.html`）
- `wp-content/`, `wp-includes/` — WordPress由来の静的アセット（CSS/JS/画像）
- `hopemedia/` — ウェブメディア（HOME to HOPE）配下の記事群
- `index.html`（ルート）— トップページ

### URLの正規化履歴（2026-04-21）

重複していた旧URL 94件を物理削除し、正規URL に統一:
- `/set/pocket/` → `/lineup/set/pocket/`
- `/postcard/` → `/lineup/goods/postcard/`
- `/aboutoffset/` → `/creative-guide/aboutoffset/`
- 他91件

旧URLへのアクセスは CloudFront Function で **301 redirect** される。新規リンクは必ず **正規URLのみ** を使用。

---

## 開発時の注意

### パス記述
- **HTMLファイル内のパスは相対パスのまま**。ローカル表示と Preview (GitHub Pages) で別のベースパスが必要なので、Actions が自動変換する
- 手動で `/hope21jp-website/` を書かない
- `<script>` タグ内のJSコードにも URL リテラルがあれば変換対象

### 画像追加
- **WebP形式を推奨**（`cwebp -q 85 input.png -o output.webp`）
- `wp-content/uploads/YYYY/MM/` に配置
- `<img>` タグには必ず `alt` 属性を（装飾画像でも `alt=""`）

### ページ追加
- ディレクトリ + `index.html` を作成
- `<title>`, `<meta name="description">`, `<meta property="og:*">` を設定
- canonical タグを `<link rel="canonical" href="https://hope21.jp/...">` で指定
- JSON-LD BreadcrumbList を入れる（パンくずから自動生成する想定）
- `sitemap.xml` に追加

### SEO
- 全ページに og:image, twitter:card, canonical, BreadcrumbList が既に入っている
- sitemap.xml はルートに1枚、`hope21.jp/` の正規URLを記載

### テスト
- ローカル: `python3 -m http.server 3000` → http://localhost:3000
- Preview: dev push → GitHub Pages

### 検索機能 (Pagefind)
- デプロイ時に `pagefind/` が自動生成
- ローカルで動作確認する場合は `npx pagefind@latest --site . --glob "**/*.html"`

### 営業日カレンダー
- `wp-content/themes/hope21/assets/js/calendar-data.json` の `holidays` に月別で休業日を記述
- 外部API依存なしの静的JS実装

---

## 過去の主な作業履歴

- WordPress → 静的HTML化 + GitHub Pages移行
- Pagefind 静的検索導入（モーダルオーバーレイUI）
- 営業日カレンダーの静的JS実装への移行
- 構造化データ（JSON-LD）追加
- hopemedia 画像の WebP 変換（34MB → 13MB）
- Actions パス変換ロジックの改善（script タグ src 対応、二重ベースパス修正）
- **canonical URL統一**（94ディレクトリ削除、24,675件の href 書換）
- **SEO最適化**（sitemap再生成、og/twitter/canonical/構造化データ全ページ付与）
- **S3+CloudFront移行**（WP EC2 脱却、CF Function で 301 redirect）
- **GitOps フロー導入**（dev=preview, main=production 自動）

---

## AI アシスタント（Claude Code 等）への指示

Claude Code などのAIアシスタントがこのリポジトリで作業する際は：

1. **必ず `dev` ブランチで作業する**。main への直接コミットは禁止
2. **変更は PR 経由**。コミットメッセージは日本語で、「何を」「なぜ」を明記
3. **パス書き換えはActionsが行う**ので、HTMLの相対パスを維持
4. **旧URLを新規リンクで使わない**（canonical 正規URLのみ）
5. **WordPress由来のクラス名（`wp-*`）は静的サイトでは装飾用のみ**。機能はJSで書く
6. **Formspree等の外部サービス** を使う場合は事前に相談（本番に直接影響するため）
7. **大量ファイル変更を伴う作業は PR で diff 確認必須**
8. 迷ったら上記ドキュメント（README.md, RELEASE.md, SITE_PAGES.md）を読む
