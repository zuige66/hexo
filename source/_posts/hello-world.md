---
title: Hello World
date: 2026-10-20 12:00:00
tags:
  - 模板
categories:
  - 示例
---

这是一篇**模板自带的示例文章**，用于验证首页、归档、分类、标签、搜索等功能是否正常。
学会写文章后，删掉它，开始写你自己的内容。

## 怎么写新文章

在本目录（`source/_posts/`）新建 `.md` 文件，头部写上 front-matter：

```markdown
---
title: 文章标题
date: 2026-10-20 12:00:00
tags:
  - 标签1
categories:
  - 分类1
---

正文……
```

也可以用 Hexo 命令（效果相同，会自动补全 front-matter）：

```bash
hexo new "文章标题"
```

## 常用命令

```bash
pnpm install          # 首次使用安装依赖
hexo clean           # 清理缓存（改动主题配置后必须先执行，见下文「缓存坑」）
hexo generate        # 生成静态文件到 public/
hexo server          # 本地预览 http://localhost:4000
hexo deploy          # 部署（需先在 _config.yml 配置 deploy.repo）
```

## 更多说明

完整的模板使用说明见仓库根目录的 [README.md](https://github.com/zuige66/hexo/blob/template/README.md)。
