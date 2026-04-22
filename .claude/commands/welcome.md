---
description: hope21jp-website プロジェクトのオンボーディング案内
---

ユーザーが本プロジェクトで初めて作業する可能性があります。以下の形式で親切にガイドしてください:

# 👋 ようこそ hope21jp-website へ！

HOPE21 コーポレートサイトの開発へようこそ。あなたを導くための短いオリエンテーションです。

## このプロジェクトは何？

HOPE21（同人誌印刷会社）のコーポレートサイト。
WordPress → 静的HTML化 → AWS S3+CloudFront で配信。見積システム (/sys/*) は別のEC2で稼働中。

- **本番**: https://hope21.jp
- **Preview**: https://crosswing-co-jp.github.io/hope21jp-website/
- **ローカル**: `python3 -m http.server 3000` → http://localhost:3000

## GitOps フロー（絶対守って）

```
dev ブランチで作業 → push → Preview 自動反映
             ↓
      PR (dev→main) → レビュー → Merge
             ↓
         本番 https://hope21.jp 自動反映
```

**禁止事項**:
- ❌ `main` への直接コミット/push（緊急時を除く）
- ❌ レビューなしマージ
- ❌ 旧URL（例: `/set/pocket/`）を新規リンクで使うこと（→ `/lineup/set/pocket/` 推奨）

## よく使うドキュメント

| ファイル | 内容 |
|---|---|
| [EDITOR_GUIDE.md](EDITOR_GUIDE.md) | **まずはこれを読む**（Claude Code 使った編集フロー） |
| [README.md](README.md) | プロジェクト全体・インフラ構成 |
| [RELEASE.md](RELEASE.md) | リリース手順・ロールバック |
| [SITE_PAGES.md](SITE_PAGES.md) | どのページがどこにあるかの索引 |
| [CLAUDE.md](CLAUDE.md) | AI用運用ルール（Claudeが自動参照） |

## 今すぐ試す: 初回セットアップ

私（Claude）に以下を頼んでください:

> 「dev ブランチに切り替えて、ローカルサーバー起動して」

すると:
1. `git fetch && git checkout dev && git pull` を実行
2. `python3 -m http.server 3000` をバックグラウンドで起動
3. http://localhost:3000 を案内

## 日常の依頼例

- 「`faq/index.html` の〇〇という文言を△△に変えて」
- 「変更内容を確認したい、ローカルで開ける状態にして」
- 「OKそうだからコミットして dev にpushして」
- 「PRを作って」
- 「PR #42 のコメントに対応して」

Claude が git/gh コマンドを代理実行します。

## 今の git 状態

（この下にユーザーの現在のブランチ・状態を `git status` で確認して表示）

---

何か質問があれば気軽に聞いてください。困ったら「CLAUDE.md のルール教えて」とだけ言えばOK。
