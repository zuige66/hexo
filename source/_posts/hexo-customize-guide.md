---
title: Hexo博客管理
date: 2026-09-04
tags:
  - Hexo
  - Fluid
  - 教程
categories:
  - 技术
---

## 前言

　　博客搭好了，但怎么改标题、加图标、管理分类标签？本文以当前博客为例，讲解 Hexo + Fluid 的目录结构和常用配置。

## 一、常用命令速查

　　以下命令都在博客根目录下执行。

| 作用 | 命令 |
|------|------|
| 新建文章 | `hexo new "文章标题"` |
| 新建独立页面 | `hexo new page "页面名"` |
| 新建草稿 | `hexo new draft "标题"` |
| 发布草稿 | `hexo publish "标题"` |
| 启动本地预览 | `hexo server` |
| 指定端口预览 | `hexo server -p 4001` |
| 生成静态文件 | `hexo generate` |
| 生成并部署 | `hexo generate -d` |
| 仅部署（需先生成） | `hexo deploy` |
| 清理缓存和旧文件 | `hexo clean` |
| 强制全量重建 | `hexo generate -f` |
| 列出所有文章 | `hexo list post` |
| 查看版本 | `hexo version` |

　　本地预览启动后访问 `http://localhost:4000`，按 `Ctrl+C` 停止。

`hexo deploy` 不会自动生成文件，必须先 `hexo generate` 再 `hexo deploy`；`hexo generate -d`（可简写 `hexo g -d`）一步完成生成加部署，日常发帖用这条即可。

`hexo generate` 默认增量构建，只重新生成改动过的文章以及受影响的归档、分类、标签页，日常发一两篇不会慢。真正会触发全量重建的是 `hexo clean`——它删除缓存 `db.json` 和 `public/`，下次生成只能从头来。只在换主题、大改配置或升级后输出异常时才跑 `hexo clean`，平时不要加。

　　写完一篇文章的标准流程：`hexo new "标题"` 新建 → 编辑 `source/_posts/` 下对应的 md → `hexo generate -d` 发布。

> **推送 `main` 会自动部署（2026-11-09 起）**：`.github/workflows/circle.yml` 已去掉 `push.paths` 白名单，任何推送到 `main` 的改动（文章、CSS、主题配置、动态）都会触发 Actions：抓一次友链 RSS → `npx hexo generate -d` → 把站点推到 `gh-pages`。因此只 `git push` 也能上线，本地 `hexo generate -d` 依旧可用；两者别同时跑，避免互相覆盖 `gh-pages`。自动部署同样要经历下面的 Pages / CDN 延迟。工作流写回数据的提交带 `[skip ci]`，配合 job 级 `if` 判断，不会自触发死循环。详见「十九、自动部署与静态资源版本号」。

> **线上生效有延迟，别误判成没部署成功（2026-11-02 实测）**：`hexo deploy` 只是把 `public/` 推到 `gh-pages`，之后 **GitHub Pages 还要构建 1–2 分钟**，这段时间新增的文件路径会一直 404；构建完成后，Cloudflare 上还有 `Cache-Control: max-age=600`（10 分钟）的整页缓存。
>
> - 页面缓存可尝试带随机查询串：`curl -s "https://blog.zuiges.com/archives/?cb=$RANDOM"`，否则可能拿到十分钟前的旧页面。**2026-11-10 实测更正**：随机串未必绕得开，Fastly 层会返回 `x-cache: HIT` 且 `Age` 持续增长，最长仍需等 `max-age=600` 过期。要立刻判断部署是否成功，应直接读 **`gh-pages` 分支原文件**（不经过 Pages 构建与 CDN）：`https://raw.githubusercontent.com/zuige66/hexo/gh-pages/links/index.html`。
> - **新增图片即使带查询串也可能先被 CDN 记一次 404（负缓存）**，现象是「文字已经更新、图片仍然 404」，通常 5 分钟左右自愈，不需要重新部署。
> - 判断是否真的推上去了，看 `git ls-remote origin gh-pages` 的 commit 与本地 `npx hexo deploy` 输出的 hash 是否一致，而不是看浏览器。

## 二、项目结构

```
hexo/
├── _config.yml           # Hexo 主配置
├── _config.fluid.yml     # Fluid 主题配置
├── package.json          # 依赖管理
├── source/
│   ├── _posts/           # 博客文章
│   ├── images/           # 图片资源
│   ├── about/            # 关于页
│   ├── categories/       # 分类页
│   ├── tags/             # 标签页
│   └── links/            # 友链页
└── themes/               # 主题目录
```

　　两个核心配置文件：

| 文件 | 作用 |
|------|------|
| `_config.yml` | 站点名称、URL、作者、语言等全局设置 |
| `_config.fluid.yml` | 导航栏、颜色、字体、页面布局等主题设置 |

## 三、修改站点信息

　　编辑根目录 `_config.yml`：

```yaml
# Site
title: zuige blog              # 站点标题（浏览器标签页显示）
subtitle: '落魄谷中寒风吹，春秋蝉鸣少年归。'  # 首页副标题
description: 'A blog about technology and life'  # 站点描述（SEO）
author: zuige66                # 作者名
language: zh-CN                # 语言
```

　　修改后执行 `hexo clean && hexo deploy` 生效。

## 四、首页配置

　　编辑 `_config.fluid.yml` 的 `index` 部分：

```yaml
index:
  banner_img: /img/default.png     # 首页大图
  banner_img_height: 100           # 图片高度（屏幕百分比）
  banner_mask_alpha: 0.3           # 蒙版透明度

  slogan:
    enable: true
    text: "落魄谷中寒风吹，春秋蝉鸣少年归。"  # 首页副标题文字

  auto_excerpt:
    enable: true                   # 首页自动截取摘要

  post_meta:
    date: true                     # 显示发布日期
    category: true                 # 显示分类
    tag: true                      # 显示标签
```

## 五、添加 GitHub 图标

　　在 `_config.fluid.yml` 的 `about` 部分配置关于页的社交图标：

```yaml
about:
  enable: true
  avatar: /images/zuige.jpg
  name: "zuige"
  intro: "欢迎来到我的博客"
  icons:
    - { class: "iconfont icon-github-fill", link: "https://github.com/zuige66", tip: "GitHub" }
    - { class: "iconfont icon-email-fill", link: "mailto:your@email.com", tip: "Email" }
```

　　如果想在导航栏也显示 GitHub 图标，修改 `navbar` 部分：

```yaml
navbar:
  blog_title: "zuige blog"
  menu:
    - { key: "home", link: "/", icon: "iconfont icon-home-fill" }
    - { key: "archive", link: "/archives/", icon: "iconfont icon-archive-fill" }
    - { key: "category", link: "/categories/", icon: "iconfont icon-category-fill" }
    - { key: "tag", link: "/tags/", icon: "iconfont icon-tags-fill" }
    - { key: "about", link: "/about/", icon: "iconfont icon-user-fill" }
```

## 六、管理分类

### 创建分类页

`source/categories/index.md` 已存在，内容为：

```markdown
---
title: 分类
date: 2026-09-03
type: categories
---
```

### 给文章添加分类

　　在文章的 front-matter 中指定：

```yaml
---
title: 我的文章
categories:
  - 技术
  - 前端
---
```

　　一个文章可以属于多个分类。如果分类不存在，Hexo 会自动创建。

### 分类页配置

```yaml
category:
  enable: true
  banner_img: /img/default.png
  banner_img_height: 60
  order_by: "-length"          # 按文章数倒序
  collapse_depth: 0            # 折叠深度，0 为全部折叠
  post_limit: 10               # 单个分类最多显示文章数
```

## 七、管理标签

### 创建标签页

`source/tags/index.md` 内容为：

```markdown
---
title: 标签
date: 2026-09-03
type: tags
---
```

### 给文章添加标签

```yaml
---
title: 我的文章
tags:
  - Hexo
  - Markdown
  - 博客
---
```

### 标签云配置

```yaml
tag:
  enable: true
  banner_img_height: 80
  tagcloud:
    min_font: 15         # 最小字号
    max_font: 30         # 最大字号
    unit: px
    start_color: "#BBBBEE"  # 起始颜色
    end_color: "#337ab7"    # 结束颜色
```

## 八、写新文章

```bash
hexo new "文章标题"
```

　　在 `source/_posts/` 下生成 `文章标题.md`，编辑后用一条命令生成并部署：

```bash
hexo generate -d
```

　　文章 front-matter 完整示例：

```yaml
---
title: 文章标题
date: 2026-09-04
tags:
  - 标签1
  - 标签2
categories:
  - 分类1
index_img: /images/cover.jpg    # 首页封面图（可选）
banner_img: /images/banner.jpg  # 文章页大图（可选）
math: true                      # 启用数学公式（可选）
---

正文内容...
```

## 九、关于页

　　编辑 `source/about/index.md`：

```markdown
---
title: 关于我
date: 2026-09-03
---

## Hi there!

这里写个人介绍。

### 联系方式

- GitHub: [zuige66](https://github.com/zuige66)
- Email: your@email.com
```

## 十、自定义样式

　　如需修改颜色、字体等细节，可创建自定义 CSS 文件。

　　在 `_config.fluid.yml` 中指定：

```yaml
custom_css:
  - /css/custom.css
```

　　然后在 `source/css/custom.css` 中编写样式：

```css
/* 修改文章标题颜色 */
.post-title a {
  color: #2c3e50;
}

/* 修改正文行高 */
.post-body {
  line-height: 2;
}
```

> 自定义 CSS / JS 的版本号已自动化：`custom_css` / `custom_js` 里写的 `?v=1` 只是占位，构建时会按文件内容 hash 自动替换，**不必手动递增**。见「十九、自动部署与静态资源版本号」。

## 十一、颜色主题

```yaml
color:
  body_bg_color: "#f5f5f5"       # 页面背景
  navbar_bg_color: "#2f4154"     # 导航栏背景
  navbar_text_color: "#fff"      # 导航栏文字
  text_color: "#3c4858"          # 正文文字
  post_text_color: "#2c3e50"     # 文章文字
  post_heading_color: "#1a202c"  # 文章标题
  post_link_color: "#0366d6"     # 文章链接
  link_hover_color: "#30a9de"    # 链接悬浮
  board_color: "#fff"            # 卡片背景
```

## 十二、常用配置速查

| 需求 | 操作 |
|------|------|
| 改站点标题 | `_config.yml` → `title` |
| 改首页副标题 | `_config.fluid.yml` → `index.slogan.text` |
| 加 GitHub 图标 | `_config.fluid.yml` → `about.icons` |
| 加新分类 | 文章 front-matter 里加 `categories` |
| 加新标签 | 文章 front-matter 里加 `tags` |
| 改导航栏 | `_config.fluid.yml` → `navbar.menu` |
| 改颜色 | `_config.fluid.yml` → `color` |
| 改字体 | `_config.fluid.yml` → `font` |
| 改悬停、浮起与搜索高亮动效 | `source/css/site-motion.css` |
| 改站内搜索定位效果 | `themes/fluid/source/js/local-search.js` 与 `source/js/site-interactions.js` |

## 十三、管理友链

友链配置在 `_config.fluid.yml` 的 `links.items`，每条是一个对象，字段如下：

- `title`：站点名称
- `intro`：一句话简介
- `link`：站点地址
- `avatar`：头像地址
- `rss`：对方订阅源地址，可选；填写后该友链卡片右上角显示 RSS 图标

```yaml
links:
  items:
    - { title: "站点名", intro: "一句话简介", link: "https://example.com", avatar: "https://example.com/avatar.png", rss: "https://example.com/rss.xml" }
```

`rss` 字段非空时，友链卡片右上角出现 RSS 图标，点击跳转到对方订阅源。图标渲染依赖两处改动：`themes/fluid/layout/links.ejs`（卡片内增加 RSS 链接）与 `source/css/site-motion.css`（`.link-rss` 定位样式）。主题升级后需重新应用这两处。友链页本体位于 `source/links/index.md`，一般无需改动。

## 十四、友链朋友圈（动态聚合）

　　友链页 `/links/` 在友链头像与简介**下方**、「我的友链信息」**上方**，把每位友链的最新文章以卡片形式聚合展示，无需自建后端。原理：定时抓取各友链的 RSS，生成一份静态 JSON，友链页的脚本拉取该 JSON 渲染卡片。

- 数据源：`circle-feeds.json`（仓库根目录），只列带 `rss` 的友链，每项含 `name` / `link` / `rss` / `avatar`。
- 生成器：`tools/circle_fetch.py`，纯标准库实现，运行后写出两份文件：
  - `circle-archive.json`（仓库根目录，**入库、不进 `.gitignore`**）：累积归档，每次运行按文章 URL 去重合并新文章，每人上限 100 篇、跨运行一直留存，是「朋友圈一直存在」的来源。
  - `source/circle/circle.json`（**已作为基线数据入库**，部署后地址为 `/circle/circle.json`）：展示用扁平数据，取全部文章按时间倒序前 60 条。入库是为了保证任何一次干净检出 / `hexo deploy` 都带这份数据，不再出现「朋友圈空白」。
- 渲染：`source/js/circle-feed.js` 由 `themes/fluid/layout/links.ejs` 在友链卡片之后引入，拉取 `/circle/circle.json` 后**一篇文章一张小卡片**：标题在上，左下角圆形头像 + 站点名，右下角日期；卡片样式在 `source/css/site-motion.css` 的 `#circle-feed` / `.feed-card` 段（CSS Grid 排布，避免重叠）。
- 自动化：`.github/workflows/circle.yml` 每天 UTC 22:17 定时运行，也可在 Actions 页手动触发；**任何推送到 `main` 的改动**都会触发一次「抓 RSS → `hexo generate -d` → 写回归档」。每次运行把 `circle-archive.json` 与 `source/circle/circle.json` 提交回 `main`，归档跨运行持续累积；提交信息带 `[skip ci]`，配合 job 级 `if` 防止自触发循环。

> **红线：定时抓取曾「一天都没跑过」（2026-11-09 排查）**。查 GitHub Actions 的 12 次运行记录，全部是 `push` / `workflow_dispatch`，**没有一次 `schedule`**；线上 `circle.json` 的 `generated` 停在 2026-10-19。根因是仓库把 **`gh-pages` 设成了默认分支**（Pages 源分支），而 `circle.yml` 只存在于 `main`——GitHub 的定时 `cron` **只在默认分支生效**。修法：GitHub → Settings → Branches 把默认分支改回 `main`；**GitHub Pages 仍从 `gh-pages` 分支部署，与默认分支互不影响**，改完次日 UTC 22:17 起自动生效。在改默认分支之前，每次 push 仍会刷新数据，只是不保证「每天」。
>
> 另一个旧坑：早期 `push.paths` 白名单只列 `circle-feeds.json`、`tools/circle_fetch.py` 等，改文章 / CSS / 主题配置不会触发自动部署，线上像是「一直不更新」——该白名单已删除。

　　新增一个友链的动态：在 `circle-feeds.json` 加一项（填上对方 RSS 地址）即可，其余由流水线自动完成。本地预览可用 `bash tools/deploy-circle.sh` 一键抓数据并部署。

## 十五、首页侧栏吸顶（粘性侧边栏）

　　首页左栏（个人卡片、统计、发文记录、分类、标签、最近文章）在下滑时会跟着一起滚走。用 **粘性侧边栏（sticky sidebar）** 可以让它滚到某个位置后锁住不动，之后只有右栏的文章列表继续滚动。

　　技术上靠 CSS 的 **`position: sticky`**——它跟 `position: fixed` 不同：`fixed` 是一开始就钉死在窗口，`sticky` 是「没滚到之前正常跟着走，滚到了才吸住」，正好是想要的效果。

### 当前实现

　　锁定点定在**「分类」卡片**：左栏上半部分（个人卡片、统计、发文记录）先跟着页面往上滚并自然消失，等「分类」卡片升到固定导航栏下方时，从「分类」开始往下的整块锁死，之后只有右栏继续滚。

　　实现方式是**纯 CSS 容器吸附**，不依赖 JS——早期用 JS 动态算 `top`，但在 iPad Safari 上会因工具栏收展导致锁定点漂移，已被弃用：

| 文件 | 作用 |
|------|------|
| `themes/fluid/layout/index.ejs` | 把「分类」「部分标签」「最近文章」三个 `<section>` 整体包进 `<div class="home-side-sticky">`；上半部分（个人卡片/统计/发文记录）留在容器外，走正常流自然滚走 |
| `source/css/home-sidebar.css` | `.home-sidebar { align-self: stretch }`（拉满 Grid 行高，sticky 子元素才有整页高度可钉）；`.home-side-sticky { position: sticky; top: 76px; max-height: calc(100vh - 76px - 16px); overflow-y: auto; }`，`top` 是常数，不靠 JS |
| `_config.fluid.yml` | `custom_css` 里登记 `home-sidebar.css`；`?v=N` 只是占位，构建时按内容 hash 自动替换（见十九） |

　　原理：`.home-side-sticky` 的 `top: 76px` 是固定值（76 ≈ 导航栏高度 + 间距），它的**上边缘**就是锁定位置——也就是「分类」卡片的顶部。上半部分卡片不在容器里，所以会先滚走；容器本身是 sticky，等上边缘碰到 76px 处就锁住。`top` 是常数，iPad 上也不会漂移。内容若高于视口，仅容器内部滚动（`overflow-y: auto`），**不影响已滚走的上半栏**——这与「整体吸顶 + 内部滚动」的坑不同（旧法会把上半栏卷进内部视口，看起来像消失）。

　　**红线：`.home-sidebar` 必须拉满 Grid 行高**（Grid 默认 `align-items: stretch`，或显式给 `.home-sidebar` 写 `align-self: stretch`）。曾误设 `align-items: start`，导致 `.home-sidebar` 只有「自身内容高」，sticky 子元素只能在父级范围内钉一小段、父级底一到就整条滚走，表现成「完全不吸顶」。要点：sticky 子元素的钉住范围 = 父容器高度 − 自身高度 − top，父容器不高就钉不住。

### 调整锁定位置

　　- 想让锁定时离导航栏更远/更近：改 `home-sidebar.css` 里 `.home-side-sticky` 的 `top: 76px`（值越大贴导航栏越紧、越晚吸住；值越小越早吸住）。注意它同时是容器上边缘与导航栏的间距，也是视口可用高度扣减项。
    - 想换成别的卡片作为锁定点（比如从「标签」开始锁）：在 `index.ejs` 里把 `<div class="home-side-sticky">` 的起始位置挪到那个 `<section>` 之前即可（容器上边缘 = 锁定点）。
    - 想改成「一滚到顶就整体吸住」：把 `<div class="home-side-sticky">` 移到侧栏最上面（包住个人卡片），并把 `top` 设小即可。
    - 手机端（≤767px）左栏在 `home-sidebar.css` 里 `display: none` 隐藏，容器 sticky 自然不生效。

## 十六、首页侧栏卡片

　　首页左栏的卡片内容由 `themes/fluid/layout/index.ejs` 生成。

| 卡片 | 规则 |
|------|------|
| 分类 | 显示前 3 个（按文章数排序），其余收进「展开全部」按钮，按钮固定在**列表下方** |
| 部分标签 | 标题就叫「部分标签」，最多显示 **5 个**：出现次数多的优先，次数相同按首字母排（中文按拼音），完整列表在 `/tags/` 页 |

　　「展开全部 / 收起全部」是一个 `<button class="home-more-toggle">`（不再是 `<details>`——部分浏览器不支持在 `<details>` 内部用 flex 重排，会把「收起全部」渲染到列表上面）。点击逻辑在 `source/js/site-interactions.js` 里用事件委托实现，软导航换页后依然有效；箭头样式在 `source/css/home-sidebar.css` 的 `.home-more-toggle` 段。

　　想调整标签显示数量：改 `index.ejs` 顶部的 `tagLimit`；想改排序规则：改 `tagItems` 的比较函数。

## 十七、动态（Moments）板块

　　「动态」用来发短句、牢骚、随手记；「文章」则是成篇的正式内容。二者本质相同（都是 Markdown 内容），区别在于**长度与语气**，而不是技术形态。

　　设计上**不新增独立板块与路由**：动态挂在已有归档页 `/archives/` 内，顶部新增一个胶囊切换按钮，在「文章归档」与「动态」两个视图之间切换。

### 17.1 数据：写在独立数据文件里

　　动态内容放在 `source/_data/moments.yml`（列表，Hexo 会自动载入为 `site.data.moments`）：

```yaml
- date: '2026-10-19 00:50'
  content: |
    我创建了动态板块，配图也行：![图](/img/xxx.png)
```

| 字段 | 说明 |
|------|------|
| `date` | 必填，建议加英文单引号写成字符串，格式 `YYYY-MM-DD HH:mm`。**时间不能省**——模板固定按 `YYYY-MM-DD HH:mm` 输出，只写日期会显示成 `00:00` |
| `content` | 必填，正文，支持 Markdown 与 HTML（含图片语法） |

- 新增一条：复制模板放到列表**最前面**（模板渲染时按 `date` 倒序，新的在上）。
- **配图**：`content` 里写 `![alt](/img/xxx.png)` 即可，图片文件放 `source/img/` 下（可建子目录）。卡片样式已适配——`.moment-content img { max-width: 100%; border-radius: .35rem }`，超宽图会自动缩到卡片宽度、不再溢出。
  - 图片会随 `hexo deploy` 一起推到 `gh-pages`，无需外部图床。
  - 侧栏「最新动态」预览卡是纯文本（`momentPlain()` 抽掉标记），所以配图的动态在侧栏只显示文字，图只在归档页/首页动态视图里出现。
- 选数据文件而非「文章 + `moment: true` 标记」，是为了**不污染文章归档的统计口径与分页**——动态数不计入「共计 N 篇文章」，也不会挤占归档分页。

　　发一条动态的完整流程（**没有后台，就是改文件 + git**）：

```bash
# 1. 编辑 source/_data/moments.yml，新条目放列表最前面；配图放 source/img/moments/
rm -f db.json && npx hexo generate      # 2. 本地验证（_data 变更保险起见全量重建）
git add source/_data/moments.yml source/img/moments/
git commit -m "content(moments): 新动态"
git push origin main                     # 3. 推送后 Actions 自动部署；或本地 npx hexo generate -d
```

　　只 commit 不部署 → 线上不变；只部署不 commit → 源码会丢。线上还有 Pages 构建 1–2 分钟 + Cloudflare 页面缓存 10 分钟的延迟，验证时给 URL 加随机查询串。

### 17.2 渲染：复用归档页的 partial

　　渲染逻辑在 `themes/fluid/layout/_partials/archive-list.ejs`。该 partial 同时被归档页 / 分类页 / 标签页复用，因此用 `params.key === 'archive'` 判断，**只在归档页**挂载切换控件与动态时间线。

　　两个视图的 DOM 会一次性渲染（`archive-panel-posts` / `archive-panel-moments`），切换只是显隐，不重新请求数据。

### 17.3 样式与交互

| 文件 | 职责 |
|------|------|
| `source/css/moments.css` | 胶囊切换按钮 + 时间线卡片流（左侧竖线与节点圆点），配色沿用主题 CSS 变量，已覆盖深色模式与移动端 |
| `source/js/moments.js` | 切换显隐、同步 URL hash（`#moments`，用 `replaceState` 不污染前进/后退历史）；通过按钮的 `data-tabs-group` 区分归档页与首页两组，独立切换 |

关键坑：软导航换入 `#board` 后**内联 `<script>` 不会执行**，所以这里用 `document` 级事件委托绑定点击，并监听 `soft-nav.js` 派发的 `softnav:loaded` 事件重新初始化——否则从其他页面软导航进归档页后，切换按钮会失效。

> **红线（2026-10-20 补）**：软导航「只换 `#board.innerHTML`」的假设只在「同类 layout 页面间」成立。本博客 `is_post` 文章页的 `#board` 外层是 `col-lg-8>#board-ctn`（窄列），非文章页是 `.container.nopadding-x-md`（全宽）。从文章页（整页加载）点导航软导航回首页时，只换 innerHTML 会让首页内容残留塞进文章页窄列、整页变窄。因此 `soft-nav.js` 换正文前必须**连 `#board` 的外层父链一起同步**（把 `#board` 节点整体移入目标页外层容器并 `replaceChild` 替换旧外层）。改 `soft-nav.js` 后无需手改版本号，`scripts/asset-version.js` 会按内容 hash 自动更新（见十九）。

### 17.4 资源注入与文案

- CSS / JS 需登记在 `_config.fluid.yml` 的 `custom_css` / `custom_js` 列表里；`?v=N` 只是占位符，**改动后不必手动递增**，`scripts/asset-version.js` 会按文件内容 hash 自动替换（见十九）。
- 统计文案在 `source/_data/languages/zh-CN.yml` 的 `moments.post_total`（「共计 %d 条动态」）。

### 17.5 首页切换与侧栏预览

　　归档页与首页右栏各有一组**居中的胶囊切换按钮**（`文章 / 动态`），视觉与逻辑完全一致：

| 位置 | 面板 ID | 说明 |
|------|---------|------|
| 归档页 `/archives/` | `archive-panel-posts` / `archive-panel-moments` | 按钮文案「文章归档 / 动态」 |
| 首页右栏 `.home-post-list` | `home-panel-posts` / `home-panel-moments` | 按钮文案「文章 / 动态」，动态视图展示**全部**动态 |

　　两处按钮通过 `data-tabs-group`（`archive` / `home`）区分，`moments.js` 按组独立切换，互不干扰；URL hash 统一同步 `#moments`（`replaceState`，不污染前进/后退历史），因此 `/archives/#moments` 与 `/#moments` 都可作为深链分享。

　　首页侧栏（热力图下方）另有 `.home-moment-card`「最新动态」卡片作预览：最近 **3** 条纯文本单行截断，鼠标悬浮（`title`）看全文，底部「查看全部动态 →」指向 `/archives/#moments`。移动端（≤767px）`.home-sidebar` 整体隐藏，该卡片不显示，右栏切换仍在。

- 居中实现：`.archive-tabs`（胶囊底板）是 `inline-flex`，外包一层 `.archive-tabs-wrap { text-align: center }`——**不能**给 `.archive-tabs` 直接设 `margin: 0 auto`（inline 元素水平 auto 无效），也不能改成占满宽度的 flex（胶囊底色会撑满整行）。
- 改动展示条数：编辑 `index.ejs` 顶部的 `sideMomentLimit`（侧栏）。
- 侧栏列表复用既有的 `.home-recent-list` 样式（自带单行 ellipsis），动态过长不会撑破卡片。

> 提醒：`moments.css` 改动后无需手动 bump，但它**必须先登记在 `custom_css` 里**，否则页面根本不会引用这个文件；版本号由构建脚本自动注入（见十九）。

## 十八、隐藏文章（仅归档可见）

　　有些内容（如文献整理、草稿碎片）不想挤占首页，但又希望保留在归档、分类、标签里随时可查。给文章 front-matter 加一行 `home: false` 即可：

```yaml
---
title: 某篇文献整理
date: 2026-10-24 10:00:00
home: false          # ← 加了这行：不进首页 / 侧栏「最近文章」/ RSS，但归档/分类/标签照常
tags:
  - 文献
categories:
  - 技术
---
```

　　效果：

| 位置 | 是否出现 |
|------|----------|
| 首页文章列表 | ❌ 不出现 |
| 侧栏「最近文章」 | ❌ 不出现 |
| RSS / Atom 订阅（`atom.xml`） | ❌ 不出现 |
| 归档页 / 分类页 / 标签页 | ✅ 正常出现 |
| 文章独立页（直接访问 URL） | ✅ 可访问 |

　　实现由两处改动组成，二者配合才完整：

| 文件 | 作用 |
|------|------|
| `scripts/exclude-home.js` | 核心。在 `before_generate` 阶段改写 Fluid 主题提供的 `index_posts`（首页数据源），在**分页之前**剔除 `home: false` 的文章，因此首页不会留空位、页码也不会错位；RSS 生成器在此外包一层同样过滤 |
| `themes/fluid/layout/index.ejs` | 首页侧栏「最近文章」由 `site.posts` 渲染，脚本里额外 `.filter(p => p.home !== false)` 把它也排除 |

> **红线（2026-10-24 定）**：不要把隐藏逻辑写进「替换 index 生成器」——Fluid 主题自己也在 `themes/fluid/scripts/generators/pages.js` 注册了 `index` 生成器，且加载顺序晚于站点 `scripts/`，会覆盖你的注册。正确做法是在 `before_generate` 阶段改写 `index_posts` 这个数据源（优先级用 `20`，晚于主题的 `post-filter` 默认 `10`），让主题的生成器在已被过滤的数据上做分页。
>
> 主题自带的 `archive: true` 标记只隐藏首页、仍会出现在 RSS 与侧栏「最近文章」，与本机制的 `home: false`（全隐藏）不同，别混用。

　　**已知次要泄漏（按需再拓展）**：`home: false` 的文章仍会出现在「另一篇文章页的上一篇/下一篇导航」与本地搜索索引 `local-search.xml` 中——这两处由 Hexo 核心按全部文章顺序生成，不在上述三处过滤范围内。若需要彻底只进归档，再单独处理 post 生成器的 prev/next 与 search 生成器即可。

　　**文件名别用下划线开头**：Hexo 默认把 `_` 开头的文件当私有/include 文件、不参与渲染。隐藏文章用普通文件名（如 `2026-10-24-literature-xxx.md`），只靠 front-matter 的 `home: false` 控制可见性。

## 十九、自动部署与静态资源版本号（2026-11-09）

### 19.1 「改了没生效 / 数据不更新」的四层原因

　　这是排查 2026-11-09 那次「朋友圈停在 10-19、CSS 时灵时不灵」时理清的链路，四层叠加，按这个顺序看：

| 层 | 原因 | 现状 |
|----|------|------|
| 触发 | 旧工作流 `push.paths` 白名单只有 `circle-feeds.json` 等，改文章 / CSS / 主题配置**不会触发自动部署** | 白名单已删除，推送 `main` 即部署 |
| 定时 | 仓库默认分支是 `gh-pages`，`schedule` cron 只在默认分支生效，朋友圈数据 21 天没刷新 | 需在 GitHub 改默认分支，见 19.4 |
| 缓存破坏 | `?v=N` 靠手改，忘 bump 则 URL 不变；Cloudflare 静态资源 `max-age=14400`（4h），浏览器也用旧副本 | 已改为按内容 hash 自动注入，见 19.3 |
| 生效延迟 | Pages 构建 1–2 分钟 + CF 页面 `max-age=600`、CSS `max-age=14400` | 无法消除，验证时给 URL 加随机查询串 |

### 19.2 工作流：推送即部署

　　`.github/workflows/circle.yml` 的三个触发口：

| 触发 | 行为 |
|------|------|
| `push` 到 `main` | 抓 RSS → `npx hexo generate -d` 部署到 `gh-pages` → 写回数据 |
| `schedule` 每天 UTC 22:17 | 同上，保证没推送的日子也刷新朋友圈（**需默认分支为 `main`**） |
| `workflow_dispatch` | Actions 页手动跑一次 |

　　写回 `circle.json` 的提交信息带 `[skip ci]`，job 上还有 `if` 判断兜底，避免「Actions 提交 → 又触发 Actions」的死循环。

> **红线（2026-11-12 实测）：日常发文章只 `git push origin main`，不要本地 `npx hexo deploy`。**
>
> 推送 `main` 会立刻触发 Actions 走完整链路（抓 RSS → `hexo generate -d` → 回写数据），本地再 deploy 一次必然要 `force update` 覆盖它，实测会出现连锁反应：
>
> - `gh-pages` 上出现 `+ xxx...yyy HEAD -> gh-pages (forced update)`，等于把 Actions 刚抓的新鲜 `circle.json` 换成本地几小时前的旧数据。
> - Actions 回写 `[skip ci]` 提交会抢占 `main`，导致紧接着的 `git push origin main` 报 `non-fast-forward`；解法是 `git fetch && git rebase origin/main`（有未提交改动先 `git stash push -- <文件>`）。
>
> 本地 `hexo deploy` 只剩两个正当用途：调试产物、Actions 挂了时的应急。用之前先确认没有正在跑的 workflow。

### 19.3 CSS / JS 版本号自动化

　　`scripts/asset-version.js` 在 `after_render:html` 阶段，把 HTML 里站内 `/css/`、`/js/` 资源的 `?v=任意值` 替换成**该文件内容的 md5 前 10 位**。内容不变则 URL 不变（缓存照常命中），内容一变则 URL 自动变，`_config.fluid.yml` 里的 `?v=19` 从此只是占位符。

> **红线：别改回 `after_generate`。** Hexo 8 的 `generate` 顺序是 `load()` → `_generate()`（其中触发 `before_generate` / `after_generate`）→ `firstGenerate()` **才写盘**。在 `after_generate` 里改 `public/` 的旧 HTML，随后会被重新写盘覆盖，实测「脚本日志显示重写了 85 个文件，但产物依旧是旧版本号」。`after_render:html` 返回的字符串才是最终写盘内容。

> **为什么增量生成也不用删 `db.json`**：`writeFile()` 用渲染结果的 sha1 和 Cache 里的旧 hash 比较。CSS 内容一变，每个页面渲染出的 HTML 里 `?v=` 都跟着变 → hash 不同 → **所有页面自动重写**，因此绕开了「主题配置变化不触发重渲染」的老坑，也不需要 `hexo clean`。

　　边界：只处理 `href` / `src` 属性里以 `/css/`、`/js/` 开头的站内 `.css` / `.js`；CDN 外链、图片 `?v=2`、APK 直链 `?v=48`、头像 `?v=4`、`circle.json` 的按小时破坏符都原样保留；并保留 Hexo `js()` / `css()` helper 生成的 `?v=19.css` 查询串后缀。**新增自定义 CSS / JS 仍需登记进 `custom_css` / `custom_js`**，否则页面不会引用它。

　　验证：

```bash
npx hexo generate
grep -o 'site-motion.css?v=[0-9a-f]*' public/index.html | head -1
# 改动 source/css/ 下任一文件后再跑一次 generate，哈希应当变化；恢复文件后再跑，哈希回到原值
```

### 19.4 一次性设置：把默认分支改回 `main`

　　这一步要在 GitHub 网页操作，本地命令行（无 `gh` CLI / 无 API token）代劳不了：

1. 仓库 → **Settings → Branches → Default branch** 切到 `main`。
2. **Settings → Pages** 保持 `Deploy from a branch` = `gh-pages` / `root`，**不要改**。Pages 源分支与默认分支是两回事，切换后站点照常访问。
3. 次日 UTC 22:17（北京时间 06:17）起，每天自动抓取一次；可在 Actions 页看运行记录的 `event` 是否出现 `schedule`。
4. **改完就保持 `main`，不要再切回 `gh-pages`。** Pages 的「部署分支」和仓库的「默认分支」是两套独立设置：前者决定站点读哪份静态文件，后者决定 clone / PR 基准以及定时任务在哪条分支上跑。切回去不会让站点有任何变化，只会让 `schedule` 再次失效、朋友圈重新停更。
5. 自检：`git ls-remote --symref origin HEAD` 应返回 `ref: refs/heads/main	HEAD`；若仍是 `gh-pages`，说明网页上的修改没保存成功（选完下拉后还要点 **Update** 并在弹窗里确认）。

## 二十、数学公式与 LaTeX（2026-11-12）

　　本站用 `hexo-renderer-marked` 渲染 Markdown，而 marked 不认 LaTeX。直接写 `$...$` / `$$...$$` 会被当成普通 Markdown 处理：`x_1` 变成 `x<em>1</em>`、`\begin{cases}` 里的 `\\` 少一个反斜杠、`*` 被当斜体——等 MathJax 拿到时公式已经碎了。

### 20.1 三层配合，缺一不可

| 层 | 位置 | 作用 |
|----|------|------|
| 保护 | `scripts/math-protect.js` | `before_post_render` 阶段把公式换成纯字母数字占位符（`CMCMATHPROTECT0ENDCMCMATH`），marked 渲染完再换回原始 LaTeX 并把 `< > &` 转义成实体，浏览器解析后 `textContent` 恰好是原公式 |
| 渲染 | `_config.fluid.yml` 的 `post.math` | `enable: true` + `specific: true`，只有在 front-matter 写 `math: true` 的文章才加载 MathJax，旧文章零开销 |
| 开关 | 文章 front-matter | `math: true` |

　　占位符必须纯字母数字——含 `$ \ _ * { }` 任一个都会被 Markdown / Nunjucks 二次处理。

### 20.2 目录锚点红线：别用 GitHub 风格的 slug

　　手写目录 `[标题](#锚点)` 时，锚点必须和 marked 生成的 `id` 完全一致。**marked 的标题 id 会保留中文标点与全角括号，只把空格和 ASCII 标点（`+` `/` 等）换掉**；GitHub 的习惯是删掉所有标点，两者不一致会点了没反应。

| 标题 | marked 生成的 id | GitHub 风格（会失效） |
|------|-----------------|---------------------|
| `## 2. 恒定电流场中，为什么电流不能中断` | `2-恒定电流场中，为什么电流不能中断` | `2-恒定电流场中为什么电流不能中断` |
| `## 7. 能量 & 能量密度：静电场 & 磁场` | `7-能量-能量密度：静电场-磁场` | `7-能量--能量密度静电场--磁场` |

　　可靠做法：先 `npx hexo generate`，再从产物里读真实 id 回填 href（`grep -o '<h2 id="[^"]*"'`），并做一次比对：

```bash
python - <<'EOF'
import re, io
from urllib.parse import unquote
h = io.open(r'public/<路径>/index.html', encoding='utf-8').read()
ids = set(re.findall(r'<h2 id="([^"]+)"', h))
bad = [x for x in re.findall(r'<li><a href="#([^"]+)"', h) if unquote(x) not in ids]
print("失效锚点:", bad or "无")
EOF
```

### 20.3 验收标准

| 检查项 | 期望 |
|--------|------|
| 页面残留 `CMCMATHPROTECT` | 0（有残留说明 after_post_render 没跑到） |
| 正文残留 `$$` 原文 | 0（用浏览器 `innerText` 数，不是数 HTML 源码） |
| `mjx-container` 数量 | 与公式条数一致（MathJax 排版产物） |
| 目录锚点 | 全部能命中 `h2 id` |

## 总结

　　核心就两个文件：

- `_config.yml` 管全局设置
- `_config.fluid.yml` 管主题样式

　　改完配置可以本地执行 `hexo generate -d`，也可以直接 `git push origin main` 交给 Actions 自动部署（见十九）。日常命令见开头「一、常用命令速查」。
