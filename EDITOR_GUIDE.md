# 編集ガイド（Claude Code で作業する方向け）

このサイトを Claude Code を使って編集・公開するガイドです。
難しいコマンドを暗記する必要はありません。**Claude Code に日本語で話しかければ代わりにやってくれます**。

> 🤖 **前提**: Claude Code がインストール済み、GitHub 連携済み

---

## 目次

1. [基本用語（3つだけ）](#基本用語3つだけ)
2. [初回セットアップ（1回だけ）](#初回セットアップ1回だけ)
3. [日常の編集フロー](#日常の編集フロー)
4. [ローカルで見た目を確認](#ローカルで見た目を確認)
5. [Preview と 本番](#preview-と-本番)
6. [よくある作業パターン](#よくある作業パターン)
7. [困ったとき](#困ったとき)

---

## 基本用語（3つだけ）

### 1. `main` ブランチ = 本番
ここに入ったものは即 **https://hope21.jp** に出ます。直接触りません。

### 2. `dev` ブランチ = 練習場 / Preview
ここで作業します。push すると Preview 用URL に自動反映（本番にはまだ出ない）。

### 3. Pull Request (PR) = 本番反映のお願い
`dev` → `main` のマージ申請。レビューを受けてからマージ。マージした瞬間に本番デプロイ。

---

## 初回セットアップ（1回だけ）

Claude Code に以下のプロンプトをそのまま送ってください。コマンドは Claude が代わりに実行します。

```
このリポジトリで初めて作業します。以下を手伝ってください:
1. dev ブランチに切り替える（存在しなければ作成）
2. 最新の main と dev を同期
3. ローカルプレビュー用のサーバーを起動
4. 起動したら URL を教えてください
```

Claude が:
- `git fetch` / `git checkout dev` / `git pull`
- `python3 -m http.server 3000` をバックグラウンドで起動
- http://localhost:3000 を案内

してくれます。

---

## 日常の編集フロー

### ステップの全体像

```
① dev ブランチにいることを確認
        ↓
② Claude に「XXを△△に変えて」と依頼
        ↓
③ ローカルで表示を目視確認（http://localhost:3000）
        ↓
④ Claude に「コミットしてdevにpushして」と依頼
        ↓
⑤ 2〜3分後 → Preview URL で確認
        ↓
⑥ Claude に「PR作って」と依頼
        ↓
⑦ GitHub 上でレビュアーに確認依頼
        ↓
⑧ レビュー後、Merge → 本番自動デプロイ 🎉
```

### 具体例

#### 編集を依頼

> 「ポケットセット（`lineup/set/pocket/index.html`）の価格表記を『税込』から『税抜/税込』併記にして」

→ Claude が該当箇所を探して編集。どこを変えたか差分も見せます。

#### ローカル確認を依頼

> 「変更内容をブラウザで確認したい。サーバー起動して URL 教えて」

→ Claude が `python3 -m http.server 3000` を起動、URL を案内。

目で確認 → OKなら次へ。

#### コミットと push を依頼

> 「OK。コミットして dev にプッシュして」

→ Claude が:
- 変更ファイルを `git add`
- 日本語で適切なコミットメッセージを作成
- `git push origin dev`

#### Preview 確認

1〜3分後に https://crosswing-co-jp.github.io/hope21jp-website/ で自動反映。

同じページをブラウザで開いて確認。

#### PR 作成を依頼

> 「Preview で確認OK。dev から main への PR を作って」

→ Claude が `gh pr create` を実行。PR URL を返します。

#### レビュー依頼

GitHub 上で PR ページを開き、右側の **Reviewers** でレビュアーを指定。
Slack なり口頭なりで「レビューお願い」と声かけ。

#### マージ

レビュアー（または自分）が PR を Merge。2〜3分後、https://hope21.jp に反映。

---

## ローカルで見た目を確認

Claude に以下を頼めば `python3 -m http.server` を起動します:

> 「ローカルサーバー起動して」

- **トップページ**: http://localhost:3000
- **ポケットセットページ**: http://localhost:3000/lineup/set/pocket/
- **FAQ**: http://localhost:3000/faq/

> ⚠️ HTMLファイルを **直接ダブルクリックで開くのはNG**。パスが解決できず表示崩れします。必ずローカルサーバー経由で。

---

## Preview と 本番

| 環境 | URL | 反映タイミング |
|---|---|---|
| **ローカル** | http://localhost:3000 | 保存したらすぐ（リロードで反映） |
| **Preview** | https://crosswing-co-jp.github.io/hope21jp-website/ | dev に push して **2〜3分後** |
| **本番** | https://hope21.jp | main にマージして **2〜3分後** |

### Actions で進捗を見る
https://github.com/crosswing-co-jp/hope21jp-website/actions

緑のチェック ✅ が出ればデプロイ成功。赤い ❌ が出たらエラー。
エラーなら Claude に「Actions で失敗してる、原因調べて」と頼めば確認してくれます。

---

## よくある作業パターン

### ケース A: 文章を変更

> 「`index.html` の『春のキャンペーン』という文言を『春の特別企画』に変えて」

### ケース B: 画像を差し替え

> 「`wp-content/uploads/2026/04/` に `new-banner.webp` を追加してほしい。
> 置いたら `index.html` のトップビジュアル画像をそれに差し替えて」

実際に画像ファイルは手動で配置 or Claude に Finder 操作を頼む。
配置後、Claude に HTML側の `<img src="...">` 書き換えを依頼。

### ケース C: 営業日カレンダー更新

> 「2026年6月の休業日を `calendar-data.json` に追加して。
>  土日全部と、6/5 (金) を休みにして」

Claude が JSON を適切に編集します。

### ケース D: 新しいキャンペーンページ追加

> 「`/pr/summer-2026-cp/` に新しいキャンペーンページを作って。
>  既存の `pr/nosenose_cp/` をテンプレにして、
>  タイトルは『夏の2026キャンペーン』で。
>  中身はあとで編集するので、まずは箱だけ用意してほしい」

Claude が既存ページをコピーして最低限書き換えます。
その後、内容を詰める段階で再度 Claude に頼みます。

### ケース E: PR のレビューコメントに対応

> 「PR #42 にコメントが付いてる。内容を確認して、指摘に対応する変更を dev にコミットして」

Claude が `gh pr view 42 --comments` で確認 → 修正 → コミット。

---

## 困ったとき

### Q1. Preview が反映されない
> 「Preview に反映されてない。Actions で失敗してないか確認して」

→ Claude が `gh run list` などで確認、原因を説明。

### Q2. 間違ってコミットしてしまった
> 「直前のコミットを取り消して、変更内容は残したい」

→ `git reset --soft HEAD^` を Claude が実行。

### Q3. 本番にすでに出てしまった悪い変更を戻したい
> 「直前の本番デプロイを revert したい」

→ Claude が `git revert` + PR 作成で対処。

### Q4. Claude が何をしているか分からなくなった
> 「今の git 状態と、やろうとしていることを整理して」

→ 現状のブランチ・変更・未コミット等をまとめて説明します。

### Q5. 致命的なエラーが出た
→ そのままエラー文を Claude に貼って「これ何？」と聞く。
→ それでも不明なら **エンジニア（またはSlack）に連絡**。

---

## 魔法の合言葉（困ったら最初にこれ）

> 「このリポジトリの運用ルールをざっくり教えて」

→ Claude が [CLAUDE.md](CLAUDE.md) を元に概要説明。

> 「`/welcome`」

→ 詳細なウェルカムメッセージが出ます。

---

## 参考ドキュメント

- [README.md](README.md) — プロジェクト全体の概要
- [RELEASE.md](RELEASE.md) — エンジニア向けの詳細リリース手順
- [SITE_PAGES.md](SITE_PAGES.md) — どのページがどこにあるかの一覧
- [CLAUDE.md](CLAUDE.md) — Claude Code 用の運用ルール（Claude が自動参照）

## 連絡先

- リポジトリ: https://github.com/crosswing-co-jp/hope21jp-website
- 本番: https://hope21.jp
- Preview: https://crosswing-co-jp.github.io/hope21jp-website/
- Actions: https://github.com/crosswing-co-jp/hope21jp-website/actions

---

## 心構え

1. **Claude と協働する** — 全部自分でやろうとしない
2. **dev で試してから main へ** — Preview で目視必須
3. **迷ったら聞く** — Claude にも人間にも

✨ お疲れさまです。
