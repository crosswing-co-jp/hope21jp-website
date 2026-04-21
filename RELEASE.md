# リリースフロー

hope21.jp のリリース運用ガイドです。開発者が日常的に参照することを想定しています。

## TL;DR

1. ブランチ or main に push → **Preview（GitHub Pages）** に自動反映
2. Preview で確認OK → Actions タブから **Production デプロイ**を手動トリガー
3. 承認者がボタン押下 → **本番 S3 + CloudFront** に配信（2〜3分）

```
[push]──────► GitHub Actions "Preview"
                │
                ▼
         GitHub Pages (preview)
         crosswing-co-jp.github.io/hope21jp-website/
                
[workflow_dispatch + 承認] ──► GitHub Actions "Production"
                ▼
                S3 + CloudFront
                https://hope21.jp
```

## 環境一覧

| 環境 | URL | 用途 | デプロイ契機 |
|------|-----|------|-------------|
| **ローカル** | http://localhost:3000 | 開発・動作確認 | `python3 -m http.server 3000` |
| **Preview** | https://crosswing-co-jp.github.io/hope21jp-website/ | レビュー・検証 | `main` への push（自動）|
| **Production** | https://hope21.jp | 本番 | 手動トリガー + 承認制 |

Preview のURLは `/hope21jp-website/` サブディレクトリ配信なので、全HTMLのパスを GitHub Actions が自動変換します（ソースは相対パスのまま管理）。

---

## Preview デプロイ（自動）

### トリガー
`main` ブランチへの push（直接 or PR マージ）

### フロー
1. GitHub Actions `pages.yml` が起動
2. Pagefind インデックス生成（サイト内検索）
3. パス変換（`/wp-content/...` → `/hope21jp-website/wp-content/...`）
4. GitHub Pages Artifact としてアップロード
5. デプロイ → Preview URL に反映（通常 1〜3分）

### 確認先
- 進捗: https://github.com/crosswing-co-jp/hope21jp-website/actions
- 反映先: https://crosswing-co-jp.github.io/hope21jp-website/

### 注意点
- Preview の `robots.txt` は `Disallow: /` で検索エンジンに登録されません
- Preview 環境は公開URLですがBasic認証は無いため、URLを知っていれば誰でも閲覧可能

---

## Production デプロイ（承認制）

### トリガー
GitHub Actions の [**Run workflow**] ボタン（`workflow_dispatch`）

手順：
1. https://github.com/crosswing-co-jp/hope21jp-website/actions へ移動
2. 左メニューの **"Deploy to Production"** ワークフローを選択
3. 右上の [**Run workflow**] を押す（ブランチは通常 `main`）
4. 実行開始後、承認者にメール/Slack通知が届く
5. 承認者が [**Review deployments**] → `production` → [**Approve and deploy**]
6. S3 sync（差分のみ） + CloudFront invalidation 実行
7. 2〜3分で https://hope21.jp に反映

### 承認者（environment: production）
GitHub Environment の設定で指定された reviewer のみが承認可能。設定変更は Settings → Environments → production。

### デプロイ中に何が起きるか

| 処理 | 処理時間 | 失敗時の影響 |
|------|---------|-------------|
| Pagefind ビルド | ~30秒 | 検索UI動作せず |
| 本番用 robots.txt 差し替え | 即時 | Preview用robotsが本番に出てしまう（クロール拒否） |
| S3 差分同期 | ~30秒〜2分 | 中断時、一部のみ更新の状態になる |
| CloudFront invalidation | ~1〜3分 | 古いキャッシュがエッジに残る |

### 確認先
- 進捗: https://github.com/crosswing-co-jp/hope21jp-website/actions
- デプロイログ: ワークフロー詳細から各ステップ確認
- 反映確認: https://hope21.jp（CloudFront キャッシュ反映まで数分かかる場合あり）

---

## 日常的な作業

### ケース1: ページ内容の修正

```bash
git checkout -b fix/update-pocket-set-text
# ファイル編集
git add lineup/set/pocket/index.html
git commit -m "ポケットセット: 価格表記を更新"
git push origin fix/update-pocket-set-text
# → PR作成 → レビュー → main マージ
# → 自動で Preview 反映 → Preview 確認 → Production デプロイ
```

### ケース2: 画像追加

1. 画像を WebP に変換（推奨）
   ```bash
   cwebp -q 85 input.png -o output.webp
   ```
2. `wp-content/uploads/YYYY/MM/` に配置
3. HTML から参照（`<img alt="..." src="../wp-content/uploads/...">`）
4. `alt` 属性は必ず設定（装飾的なら `alt=""`）

### ケース3: 営業日カレンダー更新

`wp-content/themes/hope21/assets/js/calendar-data.json` の休業日を編集:
```json
{
  "holidays": {
    "2026-05": [2,3,4,5,6,9,10,16,17,23,24,30,31]
  }
}
```
push → Preview 確認 → Production デプロイ。

### ケース4: 新しいイベントカレンダー追加

1. 既存ページをコピー: `event-calendar/260419_calendar/` → `event-calendar/YYMMDD_calendar/`
2. `index.html` 内のイベント名・日付・締切テーブルを編集
3. `<title>`、`meta description`、`og:*` を更新
4. `sitemap.xml` に URL 追加
5. Preview 確認 → Production デプロイ

### ケース5: キャンペーンページ追加

1. `pr/キャンペーン名/index.html` を作成
2. 既存の `pr/*/index.html` をひな形に
3. `sitemap.xml` に追加
4. トップページや関連ページからリンク

### ケース6: 緊急修正（ホットフィックス）

```bash
git checkout main
git pull
# 修正コミット
git commit -m "緊急修正: ..."
git push origin main
# → Preview 自動反映（確認）
# → 即 Production デプロイ実行（承認も即時でOK）
```

重大な修正の場合は Slack 等で承認者に事前に声をかけてからトリガーすると早い。

---

## ロールバック

### Preview のロールバック
不要。次の push で上書きされる。

### Production のロールバック（2つの方法）

**方法A: 前の main コミットに戻す**
```bash
git checkout main
git revert HEAD  # or 戻したい範囲を revert
git push origin main
# → Preview 自動更新 → Production デプロイ手動実行
```

**方法B: S3 のバージョニングから復元（緊急時）**
S3 バケットは Versioning 有効なので、特定バージョンへ即戻すことが可能。
```bash
# CLIで特定ファイルを前バージョンに戻す例
aws s3api list-object-versions --bucket hope21-jp-site --prefix index.html
aws s3api copy-object --bucket hope21-jp-site --key index.html \
  --copy-source "hope21-jp-site/index.html?versionId=<OLD_VERSION_ID>"
aws cloudfront create-invalidation --distribution-id <CF_ID> --paths "/*"
```

---

## デプロイ前チェックリスト（Production 承認者向け）

- [ ] Preview で対象ページを確認した
- [ ] 壊れたリンクがない（特にサイドバー・フッター等の共通部分）
- [ ] 画像が表示される（`wp-content/uploads/` のパス）
- [ ] モバイル表示が崩れていない
- [ ] 新規追加ページなら `sitemap.xml` に URL が含まれている
- [ ] 大量のファイル変更がある場合、PR のコミット履歴を確認した

---

## トラブルシューティング

### Preview は反映されたが Production に出ない
- CloudFront のキャッシュが残っている可能性 → `create-invalidation` が成功しているか確認
- ブラウザキャッシュ → シークレットウィンドウで確認

### Production デプロイで S3 sync が失敗
- IAM Role のパーミッション不足 → `s3:PutObject` / `s3:DeleteObject` 確認
- OIDC のトラストポリシーが repo と一致していない → `sub` claim を確認

### 404 が出る
- 削除したページへの古いリンクが残っている → canonical の見直し、または `SITE_PAGES.md` と現状を照合
- Trailing slash 問題（`/page` vs `/page/`） → CloudFront Functions の正規化が効いているか確認

### 検索が動かない
- Pagefind の index がデプロイに含まれているか確認（`pagefind/` ディレクトリ）
- ビルドログで Pagefind ステップを確認

---

## 関連ドキュメント

- [README.md](README.md) — プロジェクト全体の概要
- [CLAUDE.md](CLAUDE.md) — 開発時の注意点・技術構成
- [SITE_PAGES.md](SITE_PAGES.md) — サイトページカタログ
- [SETUP_LOG.md](SETUP_LOG.md) — セットアップ履歴

## 連絡先・質問

- リポジトリ: https://github.com/crosswing-co-jp/hope21jp-website
- 本番インフラ: AWS（S3 + CloudFront + ELB）
- 承認者: [Environment settings で確認](https://github.com/crosswing-co-jp/hope21jp-website/settings/environments)
