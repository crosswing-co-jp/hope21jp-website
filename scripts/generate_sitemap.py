#!/usr/bin/env python3
"""
sitemap.xml を実ファイルから自動生成する。

- ルート直下の全 index.html をスキャン
- lastmod: git の最終コミット日時 (フォールバック: mtime)
- priority, changefreq: パスパターンによる自動判定
- プロト・テスト系は除外
- 外部アセット (wp-content/wp-includes) は除外
"""

import os
import re
import subprocess
import sys
import unicodedata
from datetime import datetime

BASE_URL = "https://hope21.jp"
EXCLUDE_DIR_PATTERNS = [
    "/wp-content/",
    "/wp-includes/",
    "/.git/",
    "/.github/",
    "/pagefind/",
    "/node_modules/",
    "/.claude/",
    "/scripts/",
    "/proto",  # /proto, /proto_event_calendar, /proto2 等を全カバー
]


def nfc(s):
    return unicodedata.normalize("NFC", s)


def last_commit_date(path, fallback_mtime):
    """git の最終コミット日時を取得。取れなければ mtime。"""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            # ISO8601 → YYYY-MM-DD のみ取り出す
            return result.stdout.strip()[:10]
    except Exception:
        pass
    return datetime.fromtimestamp(fallback_mtime).strftime("%Y-%m-%d")


def classify(url_path):
    """
    URL パスから priority と changefreq を決定する。
    優先順位が上の条件にマッチするものを採用。
    """
    # トップページ
    if url_path == "/":
        return ("1.0", "daily")

    # ニュース・キャンペーン（時事性が高い）
    if url_path.startswith("/news") or url_path.startswith("/pr/"):
        return ("0.9", "daily")

    # 締切・イベントカレンダー
    if url_path.startswith("/deadline") or url_path.startswith("/event-calendar"):
        return ("0.8", "weekly")

    # 主要商品カタログ・ガイド
    if url_path.startswith("/lineup/") or url_path.startswith("/creative-guide/"):
        return ("0.8", "monthly")

    # PREMIUM21
    if url_path.startswith("/premium21"):
        return ("0.8", "monthly")

    # サポート系
    if url_path.startswith("/faq") or url_path.startswith("/guide/"):
        return ("0.7", "monthly")

    # アクセス・会社情報・問い合わせ
    if url_path in ("/access/", "/contact/", "/consult/", "/information-request/", "/aboutpoint/"):
        return ("0.7", "monthly")

    # サンプル
    if url_path.startswith("/sample"):
        return ("0.6", "monthly")

    # hopemedia: トップとカテゴリページ
    if url_path in ("/hopemedia/", "/hopemedia/hopecolumn/", "/hopemedia/hopetalk/"):
        return ("0.7", "weekly")

    # hopemedia: ページネーション
    if re.match(r"^/hopemedia/hopecolumn/page/\d+/$", url_path):
        return ("0.4", "monthly")

    # hopemedia: 個別記事
    if url_path.startswith("/hopemedia/"):
        return ("0.5", "yearly")

    # 数字ディレクトリ (旧WP post IDアーカイブ)
    if re.match(r"^/\d+/$", url_path):
        return ("0.3", "yearly")

    # ポリシー類（低頻度）
    if url_path in ("/privacypolicy/", "/sctl/", "/link/"):
        return ("0.4", "yearly")

    # その他
    return ("0.5", "monthly")


def generate():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    urls = []
    for dirpath, dirnames, filenames in os.walk(root):
        # ディレクトリ除外
        if any(p in dirpath for p in EXCLUDE_DIR_PATTERNS):
            continue
        # ディレクトリ直接除外（/ 付きの途中マッチを避けたい場合）
        if "/proto" in dirpath.replace(root, ""):
            continue
        if "index.html" not in filenames:
            continue
        fpath = os.path.join(dirpath, "index.html")
        rel_dir = os.path.relpath(dirpath, root).replace(os.sep, "/")
        if rel_dir == ".":
            url_path = "/"
        else:
            url_path = "/" + rel_dir + "/"
        url_path = nfc(url_path)
        loc = BASE_URL + url_path
        mtime = os.path.getmtime(fpath)
        lastmod = last_commit_date(fpath, mtime)
        priority, changefreq = classify(url_path)
        urls.append((loc, lastmod, changefreq, priority))

    # ソート (トップ→その他ABC順)
    urls.sort(key=lambda x: (x[0] != f"{BASE_URL}/", x[0]))

    # XML 組み立て
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, freq, pri in urls:
        lines.append(
            f"  <url><loc>{loc}</loc>"
            f"<lastmod>{lastmod}</lastmod>"
            f"<changefreq>{freq}</changefreq>"
            f"<priority>{pri}</priority></url>"
        )
    lines.append("</urlset>")
    lines.append("")

    out = os.path.join(root, "sitemap.xml")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Generated {out}: {len(urls)} URLs")

    # priority 分布
    from collections import Counter
    pri_dist = Counter(u[3] for u in urls)
    print("Priority distribution:")
    for p, n in sorted(pri_dist.items(), reverse=True):
        print(f"  {p}: {n}")

    # lastmod 分布 (トップ5)
    lm_dist = Counter(u[1] for u in urls)
    print(f"Unique lastmod dates: {len(lm_dist)}")
    for d, n in sorted(lm_dist.items(), reverse=True)[:5]:
        print(f"  {d}: {n}")


if __name__ == "__main__":
    generate()
