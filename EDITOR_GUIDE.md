# 編集ガイド（エンジニア以外の方向け）

このサイトの文章や画像を**安全に**編集・公開するための、手取り足取り解説書です。

> 👀 **読む前に**: このガイドは「GitHub のウェブページだけで完結する」作業方法を説明します。黒い画面（ターミナル）や難しいコマンドは使いません。

---

## 目次

1. [基本用語（3つだけ覚える）](#基本用語3つだけ覚える)
2. [全体の流れ](#全体の流れ)
3. [ステップ・バイ・ステップ](#ステップバイステップ)
4. [よくある作業パターン](#よくある作業パターン)
5. [困ったとき](#困ったとき)

---

## 基本用語（3つだけ覚える）

### 1. 本番 (main ブランチ)
**本物のサイト**。ここに入った変更は即 https://hope21.jp に反映されます。
直接いじってはいけません。

### 2. 開発 (dev ブランチ)
**練習場**。ここに変更を置いても本番には出ません。
「**お試し版**」のようなもの。普段の編集は全部 dev 側でやります。

### 3. Pull Request (プルリクエスト / 略してPR)
**「dev の内容を本番に反映させてくれ」というお願い**。
誰かのレビュー（確認）を経てから反映されます。

---

## 全体の流れ

```
【1】GitHub で dev ブランチにファイル編集
         ↓
【2】「Commit changes」ボタンを押して保存
         ↓
【3】2〜3分待つ  →  Preview URL で自動反映されたか確認
         ↓
【4】見た目がOKなら Pull Request を作成（ボタン1つ）
         ↓
【5】レビュアーに依頼  →  レビュアーが「Merge」ボタンを押す
         ↓
【6】2〜3分待つ  →  本番 https://hope21.jp に反映完了 🎉
```

---

## ステップ・バイ・ステップ

### Step 1: GitHub にログイン

https://github.com/crosswing-co-jp/hope21jp-website を開き、自分のアカウントでログインします。

### Step 2: `dev` ブランチに切り替える

ページ左上あたりに `main` と書かれた**ブランチ切替えドロップダウン**があります。

1. `main` と書かれたボタンをクリック
2. 表示されるリストから **`dev`** を選択

これで「dev ブランチの画面」を見ている状態になります。画面上に **`dev`** と表示されていればOK。

### Step 3: 編集したいファイルを開く

ファイル一覧から該当のファイル・フォルダをクリックして進みます。

**よくある編集先**:
- `index.html` → トップページ
- `faq/index.html` → FAQページ
- `lineup/set/pocket/index.html` → ポケットセットの説明ページ
- `wp-content/themes/hope21/assets/js/calendar-data.json` → 営業日カレンダー

👉 どこに何があるか迷ったら [SITE_PAGES.md](SITE_PAGES.md) を見てください。

### Step 4: 編集モードに入る

ファイルを開いた画面の **右上にある鉛筆アイコン 🖊️** をクリックします。

### Step 5: 内容を編集

変更したい箇所を直接書き換えます。

⚠️ **注意**:
- HTMLタグ（`<div>` など）は**壊さないように**
- `src="..."` `href="..."` の中のパスは**触らない**
- 文字だけ変えるのが一番安全

### Step 6: 保存（Commit）

画面右上の **[Commit changes...]** という緑のボタンをクリックします。

ポップアップが出ます:
| 項目 | 入力内容 |
|---|---|
| Commit message (変更内容の説明) | 例: `トップページのキャンペーン文言を更新` |
| 拡張説明 (Extended description) | 任意（空欄でOK） |
| コミット先 | **`Commit directly to the dev branch`** を選択 |

→ **[Commit changes]** をクリック。

### Step 7: Preview で確認（2〜3分待つ）

自動的にプレビュー環境にアップされます。所要 2〜3分。

**Preview URL**:
https://crosswing-co-jp.github.io/hope21jp-website/

変更したページをここで開いて、**正しく表示されるか確認**してください。

> 🕰️ 2〜3分経っても反映されない場合は [Actions タブ](https://github.com/crosswing-co-jp/hope21jp-website/actions) でエラーが出ていないか確認。

### Step 8: Pull Request を作成

Preview で確認OKなら、本番に反映する準備をします。

1. https://github.com/crosswing-co-jp/hope21jp-website/compare/main...dev を開く
2. 右上の **[Create pull request]** ボタンをクリック
3. タイトル: `〇〇ページの△△を更新` のように分かりやすく
4. 説明欄: 何を変えたかを簡潔に書く（任意）
5. 右側の **Reviewers** 欄でレビュアー（確認してくれる人）を指定
6. **[Create pull request]** をクリック

これで「レビュー待ち」状態になります。

### Step 9: レビュー → マージ

レビュアー（または自分自身が承認権限ありなら）:
1. PR のページを開く
2. 変更内容を見て問題なければ **[Merge pull request]** ボタン
3. **[Confirm merge]** をクリック

マージが完了すると、**自動的に本番デプロイが始まります**。

### Step 10: 本番反映を確認（2〜3分待つ）

https://hope21.jp を開いて、変更が反映されているか確認してください。

> 🕰️ ブラウザのキャッシュが残っていると古いページが表示される場合があります。
> Chromeなら **Cmd+Shift+R**（Mac）/ **Ctrl+F5**（Windows）で強制リロード。

---

## よくある作業パターン

### ケース A: ページ内の文章を変更したい

Step 1〜10 をそのまま実行。

### ケース B: 画像を差し替えたい

1. `dev` ブランチに移動
2. `wp-content/uploads/YYYY/MM/` フォルダへ移動（YYYY/MMは現在の年月）
3. 右上 **[Add file]** → **[Upload files]**
4. 新しい画像（**WebP形式推奨**）をドラッグ＆ドロップ
5. Commit message を書いて **[Commit changes]**
6. その画像を表示するHTMLファイルの `<img src="...">` を新ファイル名に書き換え（Step 3〜6）
7. Preview で確認、PR、マージ

### ケース C: 営業日（休業日）を更新したい

1. `dev` ブランチに移動
2. `wp-content/themes/hope21/assets/js/calendar-data.json` を開く
3. 編集モード（🖊️）
4. 該当月を追加・編集:
```json
{
  "holidays": {
    "2026-05": [2, 3, 4, 5, 6, 9, 10, 16, 17, 23, 24, 30, 31]
  }
}
```
5. Commit → Preview確認 → PR → マージ

### ケース D: 新しいキャンペーンページを作りたい

ちょっと複雑なので、**エンジニアに相談**するのがおすすめです。
既存のキャンペーンページ（例: `pr/nosenose_cp/`）をコピーしてもらってから、中身だけ編集する流れだと安全。

---

## 困ったとき

### Q1. Preview に反映されない
- 2〜3分待ってもダメな場合、[Actions タブ](https://github.com/crosswing-co-jp/hope21jp-website/actions) を確認
- 赤い❌マークがあったら、エンジニアに見せて原因を聞く
- 黄色い◎マーク（進行中）なら、もう少し待つ

### Q2. 本番に反映されない
- マージ後 2〜3分待つ
- ブラウザキャッシュを強制リロード（Cmd+Shift+R / Ctrl+F5）
- それでもダメなら [Actions タブ](https://github.com/crosswing-co-jp/hope21jp-website/actions) の "Deploy to Production" が成功したか確認

### Q3. 間違って編集してしまった（マージ前）
- dev ブランチ上の該当ファイルをもう一度編集して、正しい状態に戻す
- Commit すれば Preview も更新される

### Q4. 間違ってマージしてしまった（本番に悪い変更が出た）
- **すぐエンジニアに連絡**
- 緊急度が高ければエンジニア側で `git revert`（取り消し）して再デプロイ

### Q5. 文字化けや表示崩れが起きた
- HTMLタグを壊してしまった可能性
- 1つ前の状態に戻す（Step 8 を逆に実行 or エンジニア相談）

### Q6. そもそもよくわからない
エンジニアに声をかけてください。事故を起こすよりよっぽど良いです。

---

## 連絡先

- **リポジトリ**: https://github.com/crosswing-co-jp/hope21jp-website
- **本番サイト**: https://hope21.jp
- **Preview サイト**: https://crosswing-co-jp.github.io/hope21jp-website/
- **Actions（デプロイ状況）**: https://github.com/crosswing-co-jp/hope21jp-website/actions

## 参考ドキュメント

- [README.md](README.md) — プロジェクト全体の概要
- [RELEASE.md](RELEASE.md) — エンジニア向けの詳しいリリース手順
- [SITE_PAGES.md](SITE_PAGES.md) — どのページがどこにあるかの一覧

---

## 心構え

1. **急がない**: Preview で確認する癖をつける
2. **迷ったら聞く**: 小さな疑問でも早めに
3. **大きな変更は PR 段階でスクショ共有**: 視覚的に確認してもらう

✨ 安全に運用できればサイトが長く健康でいられます。お疲れさまです。
