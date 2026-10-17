#!/usr/bin/env python3
"""抓取友链 RSS，生成 source/circle/circle.json 供友链页朋友圈卡片渲染。

纯标准库实现，无第三方依赖。在 GitHub Actions 或本地运行：
    python tools/circle_fetch.py

数据策略（一直存）：
- 仓库根目录 circle-archive.json 为累积归档，每次运行把新抓到的文章按 URL
  去重合并进归档（每人上限 MAX_PER_FRIEND 篇，防止无限膨胀）。
- source/circle/circle.json 为展示数据：全部文章按时间倒序取前 MAX_DISPLAY 条，
  扁平结构（一篇文章一条，含作者信息）。
输入的友链源列表见仓库根目录 circle-feeds.json（仅含带 rss 字段的友链）。
"""
import json
import os
import ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEEDS_PATH = os.path.join(REPO_ROOT, "circle-feeds.json")
ARCHIVE_PATH = os.path.join(REPO_ROOT, "circle-archive.json")
OUT_PATH = os.path.join(REPO_ROOT, "source", "circle", "circle.json")

MAX_PER_FRIEND = 100  # 归档中每位友链保留的最大文章数
MAX_DISPLAY = 60      # 页面展示的最新文章条数

UA = "Mozilla/5.0 (compatible; zuiges-circle/1.0; +https://blog.zuiges.com)"


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.read().decode("utf-8", "replace")


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]
    for f in fmts:
        try:
            dt = datetime.strptime(s, f)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


ATOM = "{http://www.w3.org/2005/Atom}"


def parse_feed(text):
    root = ET.fromstring(text)
    posts = []
    tag = root.tag
    if tag == ATOM + "feed" or tag == "feed":
        for e in root.findall(ATOM + "entry") or root.findall("entry"):
            title = (e.findtext(ATOM + "title") or e.findtext("title") or "").strip()
            link = ""
            for l in (e.findall(ATOM + "link") or e.findall("link")):
                rel = l.get("rel")
                if rel is None or rel == "alternate":
                    link = l.get("href") or ""
                    break
            date = (
                e.findtext(ATOM + "updated")
                or e.findtext("updated")
                or e.findtext(ATOM + "published")
                or e.findtext("published")
            )
            if title and link:
                posts.append((title, link, parse_date(date)))
    else:
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = item.findtext("link") or ""
            date = item.findtext("pubDate") or item.findtext("dc:date") or ""
            if title and link:
                posts.append((title, link, parse_date(date)))
    posts.sort(
        key=lambda p: p[2] or datetime.min.replace(tzinfo=timezone.utc), reverse=True
    )
    return posts[:12]


def load_archive():
    if os.path.exists(ARCHIVE_PATH):
        try:
            with open(ARCHIVE_PATH, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def main():
    with open(FEEDS_PATH, encoding="utf-8") as f:
        feeds = json.load(f)
    archive = load_archive()
    display = []
    fetched = failed = 0

    for fd in feeds:
        rss = fd.get("rss")
        if not rss:
            continue
        name = fd.get("name", "")
        ent = archive.setdefault(
            name,
            {
                "link": fd.get("link", ""),
                "avatar": fd.get("avatar", ""),
                "rss": rss,
                "posts": [],
            },
        )
        idx = {p.get("url"): p for p in ent.get("posts", [])}
        try:
            posts = parse_feed(fetch(rss))
            fetched += 1
        except Exception as e:  # 单个源失败不影响其他源
            print(f"[warn] {name} 抓取失败: {e}")
            failed += 1
        else:
            for t, u, d in posts:
                item = idx.get(u)
                if item is None:
                    idx[u] = {"title": t, "url": u, "date": d.isoformat() if d else None}
                elif t:  # 已有文章仅更新标题
                    item["title"] = t
        merged = sorted(idx.values(), key=lambda p: p.get("date") or "", reverse=True)
        ent["posts"] = merged[:MAX_PER_FRIEND]
        for p in ent["posts"]:
            display.append(
                {
                    "title": p.get("title", ""),
                    "url": p.get("url", ""),
                    "date": p.get("date"),
                    "name": name,
                    "link": ent.get("link", ""),
                    "avatar": ent.get("avatar", ""),
                }
            )

    display.sort(key=lambda p: p.get("date") or "", reverse=True)
    display = display[:MAX_DISPLAY]
    out = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "total_archived": sum(len(v.get("posts", [])) for v in archive.values()),
        "posts": display,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    with open(ARCHIVE_PATH, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, indent=2)
    print(
        f"wrote {OUT_PATH}: 源 {fetched} 成功 / {failed} 失败，"
        f"展示 {len(display)} 条，归档共 {out['total_archived']} 篇"
    )


if __name__ == "__main__":
    main()
