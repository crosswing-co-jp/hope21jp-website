# hope21.jp 静的サイト

同人誌印刷の株式会社ホープツーワン (https://hope21.jp) のWebサイトです。
WordPressの静的ミラーをGitHubで管理しています。

## クイックスタート

### 1. クローン

```bash
git clone git@github.com:crosswing-co-jp/hope21jp-website.git
cd hope21jp-website
```

### 2. ローカルで確認

```bash
python3 -m http.server 3000
```

http://localhost:3000 にアクセスしてください。

> **注意**: HTMLファイルをダブルクリックで直接開く（`file://`）と、CSS内の絶対パス `url(/wp-content/...)` が解決できず表示が崩れます。必ずローカルサーバーを経由してください。

### 3. 検索機能のローカル確認

サイト内検索（Pagefind）はGitHub Actionsでインデックスが生成されるため、ローカルでは動きません。
ローカルで検索を動かしたい場合：

```bash
npx pagefind --site . --glob "**/*.html"
python3 -m http.server 3000
```

`pagefind/` ディレクトリは `.gitignore` で除外されています。

## 環境一覧

| 環境 | URL | 用途 | デプロイ契機 |
|------|-----|------|------|
| **本番 (Production)** | https://hope21.jp | エンドユーザー向け | 手動トリガー + 承認制 |
| **検証 (Preview)** | https://crosswing-co-jp.github.io/hope21jp-website/ | レビュー・確認 | `main` への push で自動 |
| **ローカル** | http://localhost:3000 | 開発中の動作確認 | `python3 -m http.server 3000` |

詳細なリリース手順は [RELEASE.md](RELEASE.md) を参照。

### 関連リンク

- **リポジトリ**: https://github.com/crosswing-co-jp/hope21jp-website
- **GitHub Actions（デプロイ状況）**: https://github.com/crosswing-co-jp/hope21jp-website/actions
- **リリースフロー**: [RELEASE.md](RELEASE.md) — preview/production デプロイ手順・ロールバック・緊急対応
- **ページカタログ**: [SITE_PAGES.md](SITE_PAGES.md) — サイト構成の索引
- **プロジェクト情報**: [CLAUDE.md](CLAUDE.md) — 開発時の注意点

## インフラ構成

### 現行（移行中）

```
hope21.jp
  ↓
CloudFront
  ↓
ELB
  ├─ /sys/*   → EC2 (見積システム = sys2023 / React SPA)
  └─ /*       → EC2 (WordPress)  ← 段階的に廃止予定
```

### 移行後（計画）

```
hope21.jp
  ↓
CloudFront ──────────────────────────────────────────┐
  │                                                  │
  ├─ Behavior: /sys/*                    → Origin A: ELB → EC2 (見積システム、変更なし)
  │
  ├─ Behavior: /wp-content/uploads/*     → Origin B: S3 (画像、1年キャッシュ)
  ├─ Behavior: /wp-content/*, /wp-includes/*  → Origin B: S3 (CSS/JS、1週間キャッシュ)
  │
  └─ Behavior: Default (*)               → Origin B: S3 (HTML、5分キャッシュ)
                                            ↑
                                   CloudFront Functions:
                                     ├ 301 redirect (旧URL 94件→新URL)
                                     ├ trailing slash 正規化
                                     └ index.html 解決
                                            ↑
                   GitHub Actions (deploy-production.yml) が S3 sync + CF invalidation
```

### 構成のポイント

| 項目 | 内容 |
|---|---|
| 静的配信 | S3 (CloudFront OAC で保護、直接公開なし) |
| 動的部分 (/sys/*) | ELB → EC2 上の見積システム（**既存のまま維持**） |
| ドメイン・証明書 | hope21.jp (ACM + CloudFront、**既存のまま維持**) |
| WAF / ログ | CloudFront の既存設定を継承 |
| 旧URL対応 | CloudFront Functions で 94件を 301 redirect |
| デプロイ | GitHub Actions → S3 sync（差分のみ） + CloudFront invalidation |
| 認証 | OIDC ベース（AWS キーはリポジトリに保持しない） |

### 移行のメリット

| 項目 | Before (EC2+WP) | After (CF+S3) |
|---|---|---|
| 月次コスト (静的部分) | ~¥3,000 (EC2) | ~¥500 (S3+CF 転送) |
| デプロイ | WP管理画面 or rsync | push → 承認 → 2〜3分で反映 |
| 脆弱性対応 | WP+プラグイン継続パッチ | 不要（静的） |
| バックアップ | DB + ファイル | GitHub 履歴 + S3 Versioning |
| 負荷耐性 | EC2 スペック依存 | CloudFront 実質無制限 |

### ネットワーク図（現行→移行後）

```
【現行】
User ──► CloudFront ──► ELB ──┬──► EC2 (sys2023 / 動的)
                               └──► EC2 (WordPress / 静的HTML生成)

【移行後】
User ──► CloudFront ──┬──► ELB ──► EC2 (sys2023 / 動的)
                       └──► S3 (静的ファイル)
                                   ↑
                            GitHub Actions が同期

【変更部分】
  WP EC2 → S3 に置き換え。ELB と sys2023 は完全に維持。
```

## デプロイフロー（概要）

**Preview（自動）**
1. `main` に push → [GitHub Actions](https://github.com/crosswing-co-jp/hope21jp-website/actions) が起動
2. Pagefind インデックス生成 → パス変換 → GitHub Pages へ公開
3. 2〜3分で Preview URL に反映

**Production（承認制）**
1. Actions タブから "Deploy to Production" を手動トリガー
2. 承認者が Approve
3. S3 sync + CloudFront invalidation 実行
4. 2〜3分で https://hope21.jp に反映

詳細手順・ロールバック・緊急対応は [RELEASE.md](RELEASE.md)。

## 最近の主な変更

### 2026-04-21 — canonical URL統一とリポジトリ整理
- 旧URL（例: `/set/pocket/`, `/postcard/`, `/aboutoffset/`）と新URL（`/lineup/set/pocket/`, `/lineup/goods/postcard/`, `/creative-guide/aboutoffset/` 等）が重複していた **94ディレクトリを物理削除**
- 全HTMLの内部hrefを canonical に準拠して一括書換（24,675件 / 280ファイル）
- orphan parent `/set/index.html`, `/goods/index.html` も削除
- **注意**: 旧URLへの外部被リンクは404になります。Search Consoleの監視推奨

## ファイル編集ガイド

### ページの編集

各ページは `ディレクトリ名/index.html` で管理されています。
HTMLを直接編集し、`git push origin main` すればGitHub Pagesに自動デプロイされます。

### 営業日カレンダーの更新

休業日データは以下のJSONファイルで管理しています：

```
wp-content/themes/hope21/assets/js/calendar-data.json
```

月ごとの休業日を配列で指定します：

```json
{
  "holidays": {
    "2026-04": [4,5,11,12,18,19,25,26,29],
    "2026-05": [2,3,4,5,6,9,10,16,17,23,24,30,31]
  }
}
```

新しい月を追加する場合はキーを追加してpushするだけでOKです。

### イベントカレンダーページの追加

1. 既存ページ（例: `event-calendar/260505_calendar/`）をコピー
2. ディレクトリ名を変更（例: `event-calendar/YYMMDD_calendar/`）
3. `index.html` 内のイベント名・日付・締切テーブルを編集
4. `<title>`、`<meta name="description">`、`<meta property="og:*">` を更新
5. `sitemap.xml` に新しいURLを追加

### 画像の追加

- 画像は `wp-content/uploads/YYYY/MM/` に配置
- WebP形式を推奨（`cwebp -q 85 input.png -o output.webp`）
- `<img>` タグには必ず `alt` 属性を設定

## 技術情報

### GitHub Pages（検証環境）の仕組み

`.github/workflows/pages.yml` でデプロイ時に以下を自動実行：

1. **Pagefindインデックス生成** — サイト内検索用
2. **パス変換** — ルート絶対パス（`/wp-content/...`）をサブディレクトリ用に変換
3. **デプロイ** — GitHub Pages Artifactとしてアップロード

ソースファイルは変更されないため、本番デプロイには影響しません。

### ディレクトリ構成

```
hope21jp-website/
├── index.html              # トップページ
├── sitemap.xml             # サイトマップ（420 URL）
├── robots.txt              # クローラー制御
├── .github/workflows/      # GitHub Actions
├── lineup/                 # セット・グッズ・オプション一覧
│   ├── set/                # 印刷セット各種
│   ├── goods/              # グッズ各種
│   └── option/             # オプション加工各種
├── guide/                  # ご利用ガイド
├── creative-guide/         # 原稿作成ガイド
├── deadline/               # 締切情報
├── event-calendar/         # イベント締切カレンダー
├── faq/                    # よくある質問
├── hopemedia/              # コラム・インタビュー
├── news/                   # お知らせ
├── pr/                     # キャンペーン
├── sample/                 # 各種見本
├── wp-content/
│   ├── uploads/            # 画像（WebP変換済み）
│   ├── themes/hope21/      # テーマCSS・JS・アイコン
│   └── plugins/            # プラグインCSS・JS
└── wp-includes/            # jQuery・ブロックCSS等
```
