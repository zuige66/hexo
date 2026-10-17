#!/bin/sh
# 本地发布友链朋友圈：先抓 RSS 生成 JSON，再构建并部署。
set -e
python tools/circle_fetch.py
npx hexo generate -d
