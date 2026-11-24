#!/usr/bin/env python3
"""
把 giscus 历史评论（GitHub Discussions 导出 JSON）转换成 D1 可导入的 SQL。

用法:
  python tools/import_giscus.py <giscus-export.json> <output.sql>

导出方式见 cf-worker/README.md。脚本只读取本地文件，不联网、不需要 token。
"""

import json
import sys
from pathlib import Path
from urllib.parse import unquote


def esc(s: str) -> str:
    """SQL 字符串转义（D1 使用 SQLite 语法）"""
    return "'" + str(s or "").replace("'", "''") + "'"


# 旧站点曾挂在 /hexo/ 子路径下，迁移时修正为现在的永久链接
PATH_ALIASES = {
    "/hexo/2026/09/04/markdown-guide": "/2026/09/04/markdown-guide",
}


def normalize_title(title: str) -> str:
    """Discussion 标题即页面 pathname，转成 Worker 使用的统一路径格式"""
    p = unquote(title.strip()).split("?")[0].split("#")[0]
    if not p.startswith("/"):
        p = "/" + p
    if p.endswith("/index.html"):
        p = p[:-len("index.html")]
    if p.endswith("/") and len(p) > 1:
        p = p[:-1]
    return PATH_ALIASES.get(p, p)


def convert(export_path: Path, out_path: Path) -> tuple[int, int]:
    with export_path.open(encoding="utf-8") as f:
        discussions = json.load(f)

    lines = [
        "-- 由 tools/import_giscus.py 从 giscus 导出数据生成",
        "-- 重复执行安全：先清除旧的历史留言再插入",
        "DELETE FROM comments WHERE source = 'giscus';",
    ]

    n_disc = 0
    n_comment = 0
    for d in discussions:
        title = d.get("title", "")
        comments = d.get("comments") or []
        if not comments:
            continue
        if title.startswith("Welcome to"):
            continue  # GitHub 自动欢迎帖，不是博客评论
        thread = normalize_title(title)
        n_disc += 1
        for c in comments:
            author = (c.get("author") or "unknown")
            avatar = c.get("avatar") or ""
            content = c.get("body") or ""
            created = c.get("createdAt") or ""
            lines.append(
                "INSERT INTO comments "
                "(thread, parent_id, author, email, content, avatar, ip_hash, created_at, status, source) "
                "VALUES ({thread}, 0, {author}, '', {content}, {avatar}, '', {created}, 'approved', 'giscus');"
                .format(
                    thread=esc(thread), author=esc(author), content=esc(content),
                    avatar=esc(avatar), created=esc(created),
                )
            )
            n_comment += 1

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return n_disc, n_comment


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    export_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    if not export_path.is_file():
        print(f"错误：找不到导出文件 {export_path}")
        sys.exit(1)
    nd, nc = convert(export_path, out_path)
    print(f"已生成 {out_path}：{nd} 个页面，{nc} 条历史评论")


if __name__ == "__main__":
    main()
