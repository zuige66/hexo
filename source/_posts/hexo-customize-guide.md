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
  - `source/circle/circle.json`（**已进 `.gitignore`，不入库**；部署后地址为 `/circle/circle.json`）：展示用扁平数据，取全部文章按时间倒序前 60 条。
- 渲染：`source/js/circle-feed.js` 由 `themes/fluid/layout/links.ejs` 在友链卡片之后引入，拉取 `/circle/circle.json` 后**一篇文章一张小卡片**：标题在上，左下角圆形头像 + 站点名，右下角日期；卡片样式在 `source/css/site-motion.css` 的 `#circle-feed` / `.feed-card` 段（CSS Grid 排布，避免重叠）。
- 自动化：`.github/workflows/circle.yml` 每天 UTC 22:17 定时运行，也可在仓库 Actions 页手动触发；`circle-feeds.json`、`tools/circle_fetch.py` 等变动会触发重新部署。每次运行结束会把最新的 `circle-archive.json` 提交回 `main`，因此归档跨运行持续累积。

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
| `_config.fluid.yml` | `custom_css` 里 `home-sidebar.css` 带版本号（改 CSS 必须 bump） |

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
    我创建了动态板块
```

| 字段 | 说明 |
|------|------|
| `date` | 必填，建议加英文单引号写成字符串，格式 `YYYY-MM-DD HH:mm`（不写时间则只显示日期） |
| `content` | 必填，正文，支持 Markdown 与 HTML |

- 新增一条：复制模板放到列表**最前面**（模板渲染时按 `date` 倒序，新的在上）。
- 选数据文件而非「文章 + `moment: true` 标记」，是为了**不污染文章归档的统计口径与分页**——动态数不计入「共计 N 篇文章」，也不会挤占归档分页。

### 17.2 渲染：复用归档页的 partial

　　渲染逻辑在 `themes/fluid/layout/_partials/archive-list.ejs`。该 partial 同时被归档页 / 分类页 / 标签页复用，因此用 `params.key === 'archive'` 判断，**只在归档页**挂载切换控件与动态时间线。

　　两个视图的 DOM 会一次性渲染（`archive-panel-posts` / `archive-panel-moments`），切换只是显隐，不重新请求数据。

### 17.3 样式与交互

| 文件 | 职责 |
|------|------|
| `source/css/moments.css` | 胶囊切换按钮 + 时间线卡片流（左侧竖线与节点圆点），配色沿用主题 CSS 变量，已覆盖深色模式与移动端 |
| `source/js/moments.js` | 切换显隐、同步 URL hash（`#moments`，用 `replaceState` 不污染前进/后退历史） |

关键坑：软导航换入 `#board` 后**内联 `<script>` 不会执行**，所以这里用 `document` 级事件委托绑定点击，并监听 `soft-nav.js` 派发的 `softnav:loaded` 事件重新初始化——否则从其他页面软导航进归档页后，切换按钮会失效。

### 17.4 资源注入与文案

- CSS / JS 需登记在 `_config.fluid.yml` 的 `custom_css` / `custom_js` 列表里；**改动后记得 bump 版本号**（如 `?v=1` → `?v=2`）以失效浏览器缓存。
- 统计文案在 `source/_data/languages/zh-CN.yml` 的 `moments.post_total`（「共计 %d 条动态」）。

## 总结

　　核心就两个文件：

- `_config.yml` 管全局设置
- `_config.fluid.yml` 管主题样式

　　改完配置执行 `hexo generate -d` 即可生成并部署。日常命令见开头「一、常用命令速查」。
