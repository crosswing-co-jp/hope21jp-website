# リリースフロー

hope21.jp のリリース運用ガイドです。開発者が日常的に参照することを想定しています。

## TL;DR

**GitOps 風フロー** — PR レビュー = 本番承認。

1. `dev` ブランチで開発・push → **Preview（GitHub Pages）** に自動反映
2. 確認後、`dev` → `main` のプルリクエスト作成
3. レビューを受けてマージ → **本番（S3+CloudFront）** に自動デプロイ

```
[dev に push]────► GitHub Actions "Preview"
                    │
                    ▼
             GitHub Pages
             crosswing-co-jp.github.io/hope21jp-website/

[PR dev→main レビュー → merge]
                    │
                    ▼
           GitHub Actions "Production" (自動)
                    │
                    ▼
              S3 + CloudFront
              https://hope21.jp
```

緊急時は `main` への直接 push や `workflow_dispatch` で即時デプロイ可能。

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
`dev` ブランチへの push

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

## Production デプロイ（PR merge で自動）

### トリガー
- **通常**: `main` ブランチへの push（PR マージが典型的）
- **緊急時**: GitHub Actions の [**Run workflow**] ボタンで手動実行

### 通常フロー（PR merge）
1. 開発者が `dev` から `main` への Pull Request を作成
2. レビュアーがコードと Preview を確認
3. PR を **Merge**
4. GitHub Actions が自動起動 → S3 sync + CloudFront invalidation
5. 2〜3分で https://hope21.jp に反映

**PR レビューが本番承認を兼ねる** ため、Environment での追加承認は不要。

### 緊急フロー（workflow_dispatch）
1. Actions タブ → **"Deploy to Production"** → [Run workflow]
2. Branch: `main` を選択 → Run workflow
3. 同じく自動デプロイ（承認待ちなし）

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
# dev ブランチで作業
git checkout dev
git pull

# 修正＆コミット
# (ファイル編集)
git add lineup/set/pocket/index.html
git commit -m "ポケットセット: 価格表記を更新"
git push origin dev

# → Preview に自動反映される
# → Preview URL で確認
# → https://github.com/crosswing-co-jp/hope21jp-website/compare/main...dev で PR 作成
# → レビュー → Merge
# → 本番に自動デプロイ
```

小さな修正なら feature branch を挟まずに `dev` で直接OK。
大きな変更は `dev` から feature branch を切って PR `feature → dev` を経る運用も可能。

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

通常フロー（PR経由）が一番安全だが、どうしても急ぐ場合:

```bash
# main に直接 push（PR スキップ）
git checkout main
git pull
# 修正コミット
git commit -m "緊急修正: ..."
git push origin main
# → 即 Production に自動デプロイ
```

※ main ブランチ保護が有効な場合は、PR を急ぎで作る or 一時的に保護を外す。

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
