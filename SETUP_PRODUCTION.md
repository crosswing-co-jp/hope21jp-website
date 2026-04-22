# 本番環境セットアップ手順（S3 + CloudFront）

hope21.jp を CloudFront + S3 マルチオリジン構成に移行する手順書。初回のみ実施するセットアップのランブック。

## 前提

- AWS アカウントがあり、`aws` CLI が利用可能
- GitHub リポジトリ管理者権限がある
- 既存の CloudFront Distribution の ID・ARN を把握している
- 既存 CloudFront の証明書（ACM）・WAF 設定が使える

## 所要時間

| Phase | 内容 | 目安 | 担当 |
|---|---|---|---|
| 1 | S3 バケット作成 | 10分 | Infra |
| 2 | IAM OIDC + Role | 10分 | Infra |
| 3 | CloudFront 設定（Origin/Behavior/Function） | 30分 | Infra |
| 4 | GitHub 側設定（Environment/Variables） | 10分 | 開発者 |
| 5 | Workflow 作成・初回デプロイ | 15分 | 開発者 |
| 6 | 並行稼働での動作確認 | 3〜7日 | 全員 |
| 7 | 本番切替（Origin スイッチ） | 5分（実作業） | Infra |
| 8 | WP EC2 廃止（1〜2週間後） | 30分 | Infra |

---

## Phase 1: S3 バケット作成

### 1-1. バケット作成

```bash
export BUCKET=hope21-jp-site
export REGION=ap-northeast-1

aws s3api create-bucket \
  --bucket $BUCKET \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION
```

### 1-2. パブリックアクセスを完全ブロック（CloudFront OAC 経由のみ許可）

```bash
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 1-3. バージョニング有効化（誤削除・ロールバック対策）

```bash
aws s3api put-bucket-versioning \
  --bucket $BUCKET \
  --versioning-configuration Status=Enabled
```

### 1-4. ライフサイクルポリシー（古いバージョンの自動削除）

`/tmp/lifecycle.json`:
```json
{
  "Rules": [{
    "ID": "DeleteOldVersions",
    "Status": "Enabled",
    "Filter": {},
    "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
  }]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET \
  --lifecycle-configuration file:///tmp/lifecycle.json
```

### ✅ 検証
```bash
aws s3api get-bucket-location --bucket $BUCKET
aws s3api get-public-access-block --bucket $BUCKET
aws s3api get-bucket-versioning --bucket $BUCKET
```
全て期待通りの値が返れば OK。

---

## Phase 2: GitHub OIDC + IAM Role

### 2-1. GitHub OIDC プロバイダ（AWSアカウントで1度だけ）

既に存在すればスキップ。確認：
```bash
aws iam list-open-id-connect-providers
```

無ければ作成：
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2-2. IAM Role 作成

AWS Account ID を取得：
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $AWS_ACCOUNT_ID
```

信頼ポリシー `/tmp/trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::REPLACE_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:crosswing-co-jp/hope21jp-website:*"
      }
    }
  }]
}
```

```bash
# ACCOUNT_ID を埋める
sed -i '' "s/REPLACE_ACCOUNT_ID/$AWS_ACCOUNT_ID/" /tmp/trust-policy.json

aws iam create-role \
  --role-name GithubDeployHope21Site \
  --assume-role-policy-document file:///tmp/trust-policy.json
```

### 2-3. 実行ポリシー付与

`/tmp/deploy-policy.json`（`CF_DIST_ID` は既存CloudFrontのID）:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion",
        "s3:ListBucketVersions"
      ],
      "Resource": [
        "arn:aws:s3:::hope21-jp-site",
        "arn:aws:s3:::hope21-jp-site/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::REPLACE_ACCOUNT_ID:distribution/REPLACE_CF_DIST_ID"
    }
  ]
}
```

```bash
export CF_DIST_ID=YOUR_CF_DISTRIBUTION_ID  # 既存CFのID

sed -i '' "s/REPLACE_ACCOUNT_ID/$AWS_ACCOUNT_ID/; s/REPLACE_CF_DIST_ID/$CF_DIST_ID/" /tmp/deploy-policy.json

aws iam put-role-policy \
  --role-name GithubDeployHope21Site \
  --policy-name DeployPolicy \
  --policy-document file:///tmp/deploy-policy.json
```

### ✅ Role ARN を記録
```bash
aws iam get-role --role-name GithubDeployHope21Site --query 'Role.Arn' --output text
# 例: arn:aws:iam::123456789012:role/GithubDeployHope21Site
```
→ Phase 4 の GitHub Variables で使用。

---

## Phase 3: CloudFront 設定

### 3-1. S3 Origin を CloudFront に追加

1. AWS Console: CloudFront → Distributions → 既存の hope21.jp のディストリビューション選択
2. **Origins** タブ → **Create origin**
   - Origin domain: `hope21-jp-site.s3.ap-northeast-1.amazonaws.com`
   - Origin path: (空欄)
   - Name: `S3-hope21-jp-site`
   - **Origin access**: Origin access control settings → **Create new OAC**
     - Name: `hope21-jp-site-OAC`
     - Signing behavior: Sign requests
   - 作成後、指示されるバケットポリシーを **S3 側に貼る**：

```bash
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipal",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::hope21-jp-site/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::${AWS_ACCOUNT_ID}:distribution/${CF_DIST_ID}"
      }
    }
  }]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET --policy file:///tmp/bucket-policy.json
```

### 3-2. CloudFront Function（旧URL→新URL 301 redirect + trailing slash + index.html 解決）

CloudFront Console → Functions → Create function
- Name: `hope21-url-normalizer`
- Runtime: cloudfront-js-2.0

コードは `scripts/cf-function-redirects.js` として Git 管理（この後の Phase 5 で作成）。

ひな形：
```javascript
var REDIRECTS = {
  "/set/pocket/": "/lineup/set/pocket/",
  "/set/vivid-set/": "/lineup/set/vivid-set/",
  "/postcard/": "/lineup/goods/postcard/",
  // ... 合計94件（自動生成する）
};

function handler(event) {
  var req = event.request;
  var uri = req.uri;

  // 1. 旧URL → 301 redirect
  if (REDIRECTS[uri]) {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { "location": { "value": REDIRECTS[uri] } }
    };
  }

  // 2. Trailing slash 正規化（ディレクトリらしきURL）
  if (!uri.endsWith("/") && uri.indexOf(".") === -1) {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { "location": { "value": uri + "/" } }
    };
  }

  // 3. index.html 解決
  if (uri.endsWith("/")) {
    req.uri = uri + "index.html";
  }

  return req;
}
```

Test → Publish して **ARN を記録**。

### 3-3. CloudFront Behavior を追加（上から評価順）

Behaviors タブで **Create behavior** を4つ追加。既存の `/sys/*` は変更しない。

| # | Path pattern | Origin | Viewer protocol | Cache policy | Function |
|---|---|---|---|---|---|
| 1 | `/sys/*` | ELB (既存) | Redirect HTTP→HTTPS | **変更なし** | なし |
| 2 | `/wp-content/uploads/*` | S3 | Redirect HTTP→HTTPS | CachingOptimized | なし |
| 3 | `/wp-content/*` | S3 | Redirect HTTP→HTTPS | CachingOptimized | なし |
| 4 | `/wp-includes/*` | S3 | Redirect HTTP→HTTPS | CachingOptimized | なし |
| 5 | Default (`*`) | **S3 へ切替** | Redirect HTTP→HTTPS | CachingDisabled（or 短期） | `hope21-url-normalizer` (Viewer Request) |

**注意**: Default Behavior を S3 に切り替えると即本番に反映されます。この段階ではまだ切替えず、検証後（Phase 7）に実施。ここでは「Default を S3 にする」以外の Behavior だけ先に作成し、Default は既存のまま残してください。

### 3-4. Cache ポリシー（必要に応じて作成）

`CachingOptimized` と `CachingDisabled` は AWS マネージドで既に存在。
Default 用に独自ポリシー（5分TTL）が欲しい場合は Custom policy を作成。

### ✅ 検証
- CloudFront 編集後、Invalidation: `/wp-content/*` を実行
- 既存 hope21.jp がまだ動作していることを確認（Default は EC2 のまま）

---

## Phase 4: GitHub 側設定

### 4-1. Environment "production"

https://github.com/crosswing-co-jp/hope21jp-website/settings/environments

1. **New environment** → 名前: `production`
2. **Required reviewers** を ON → 承認者を追加（2名以上推奨）
3. **Deployment branches** を `main` のみに制限

### 4-2. Repository Variables

https://github.com/crosswing-co-jp/hope21jp-website/settings/variables/actions

| 名前 | 値 |
|---|---|
| `AWS_REGION` | `ap-northeast-1` |
| `AWS_ROLE_ARN` | Phase 2-3 の Role ARN |
| `S3_BUCKET` | `hope21-jp-site` |
| `CF_DISTRIBUTION_ID` | 既存 CF の ID |

※ OIDC 経由なので Secrets に AWS キーは不要。

---

## Phase 5: GitHub Actions ワークフロー

### 5-1. Workflow ファイル作成

`.github/workflows/deploy-production.yml` を作成（次セクションで具体ファイル提供）。

### 5-2. CloudFront Function 更新スクリプト

`scripts/generate-redirects.py` — Git 上の canonical から redirect マップを生成し、`scripts/cf-function-redirects.js` を更新。
CloudFront Function は手動 publish 運用 or workflow で自動化可能。

### 5-3. 初回デプロイテスト

1. Actions → Deploy to Production → Run workflow
2. 承認者が approve
3. ログで以下を確認：
   - Pagefind ビルド成功
   - パス変換なし（production 用のビルドフラグ）
   - `aws s3 sync` が差分をアップロード
   - CloudFront invalidation 完了

### ✅ 検証
S3 にファイルが入ったか確認：
```bash
aws s3 ls s3://hope21-jp-site/ --recursive --summarize | tail -3
# Total Objects: ~3000
# Total Size: ~200MB
```

---

## Phase 6: 並行稼働での動作確認（3〜7日）

**重要**: この時点で Default Behavior は **まだ EC2 のまま**。本番 hope21.jp は WP で動作中。

### 6-1. 検証用 URL で S3 版を確認

一時サブドメイン `preview.hope21.jp` を作る、または **CloudFront 直接URL**（`dXXXXXXX.cloudfront.net`）でテスト：

```bash
# Default Behavior を一時的に S3 向けた CloudFront を別途作成するのが一番安全
# （既存を壊さずに検証できる）
```

または、別の CloudFront Distribution をもう一つ作ってテスト（コスト微増、最安全）。

### 6-2. チェックリスト
- [ ] トップページ表示
- [ ] `/lineup/set/pocket/` 等の主要ページ
- [ ] 画像・CSS が読み込まれる
- [ ] `/sys/` へのリンクが正しく動作する（リンク先のみ確認、クリック時は本番の`/sys/`へ）
- [ ] サイト内検索 (Pagefind) が動く
- [ ] `/set/pocket/`（旧URL）→ `/lineup/set/pocket/` に 301 redirect される
- [ ] 存在しない URL → CloudFront の 404 ページ
- [ ] robots.txt が `Allow: /` （Preview 用の Disallow: / ではない）
- [ ] `sitemap.xml` が新URLを指している

---

## Phase 7: 本番切替（Origin スイッチ）

検証完了後：

### 7-1. CloudFront の Default Behavior を編集

- Origin: ELB → **S3 (hope21-jp-site)** に変更
- CloudFront Function: `hope21-url-normalizer` を Viewer Request に関連付け
- 変更を Save

### 7-2. Invalidation

```bash
aws cloudfront create-invalidation \
  --distribution-id $CF_DIST_ID \
  --paths "/*"
```

### 7-3. 即座に確認
```bash
curl -I https://hope21.jp/
# → Server: CloudFront (S3 origin)
curl -I https://hope21.jp/sys/
# → 既存のまま動作
curl -I https://hope21.jp/set/pocket/
# → 301 Location: /lineup/set/pocket/
```

### ロールバック手順（問題発生時）
1. CloudFront の Default Behavior Origin を **ELB に戻す**
2. Invalidation `/*`
3. 2〜3分で元の状態に戻る

---

## Phase 8: WP EC2 廃止（1〜2週間安定稼働後）

### 8-1. 段階的停止
1. ELB のターゲットグループから WP EC2 を外す（ただし /sys/* のEC2はそのまま）
2. 1週間、EC2 は稼働させたまま監視
3. 問題なければ EC2 を **Stop**（まだ Terminate しない）
4. さらに 1週間後、AMI スナップショットを取って Terminate

### 8-2. クリーンアップ
- 不要な ELB ターゲットグループ削除
- WP 用 RDS があれば snapshot 後に削除
- Route53 の不要なレコード整理

---

## トラブルシューティング

### GitHub Actions の「Error: Could not assume role with OIDC」
- OIDC Provider の thumbprint が古い可能性 → 更新手順は AWS ドキュメント参照
- IAM Role の trust policy の `repo:crosswing-co-jp/hope21jp-website:*` が正確か確認

### S3 sync は成功したが CloudFront から 403
- バケットポリシーで `SourceArn` が当該 CloudFront Distribution を指しているか
- OAC が正しく設定されているか（Legacy OAI ではなく新しい OAC を使う）

### 301 redirect が動かない
- CloudFront Function の publish を忘れていないか
- Default Behavior の Viewer Request に Function が紐付いているか

### 特定URLだけ古い
- CloudFront edge の個別キャッシュが残っている → 該当パスを invalidate
- ブラウザキャッシュも疑う

---

## 参考リンク

- [RELEASE.md](RELEASE.md) — 日常運用のリリースフロー
- [CLAUDE.md](CLAUDE.md) — プロジェクト概要・技術構成
- AWS Docs: [OIDC with GitHub Actions](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- AWS Docs: [CloudFront Origin Access Control (OAC)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- AWS Docs: [CloudFront Functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
