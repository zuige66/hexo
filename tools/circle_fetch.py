#!/usr/bin/env python3
"""抓取友链 RSS，生成 source/circle/circle.json 供友链朋友圈页渲染。

纯标准库实现，无第三方依赖。在 GitHub Actions 或本地运行：
    python tools/circle_fetch.py
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
OUT_PATH = os.path.join(REPO_ROOT, "source", "circle", "circle.json")

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


def main():
    with open(FEEDS_PATH, encoding="utf-8") as f:
        feeds = json.load(f)
    friends = []
    for fd in feeds:
        rss = fd.get("rss")
        if not rss:
            continue
        entry = {
            "name": fd.get("name", ""),
            "link": fd.get("link", ""),
            "avatar": fd.get("avatar", ""),
            "rss": rss,
            "posts": [],
            "error": None,
        }
        try:
            posts = parse_feed(fetch(rss))
            entry["posts"] = [
                {"title": t, "url": u, "date": d.isoformat() if d else None}
                for t, u, d in posts
            ]
        except Exception as e:  # 单个源失败不影响其他源
            entry["error"] = str(e)
        friends.append(entry)
    out = {"generated": datetime.now(timezone.utc).isoformat(), "friends": friends}
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    total = sum(len(x["posts"]) for x in friends)
    print(f"wrote {OUT_PATH}: {len(friends)} friends, {total} posts")


if __name__ == "__main__":
    main()
