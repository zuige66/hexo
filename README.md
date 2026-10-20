# Hexo 博客模板

基于 [Hexo](https://hexo.io/) + [Fluid 主题](https://github.com/fluid-dev/hexo-theme-fluid) 的个人博客模板，在原生 Fluid 基础上增加了一批定制功能。**本仓库已移除原站点的全部文章与个人信息，开箱即可改成你自己的博客。**

## 定制功能一览

| 功能 | 说明 |
|---|---|
| 云间列车 Banner | 全站 WebGL 动态头图（云海中的列车），自动降级 / 自动暂停 |
| 订阅朋友圈 | 友链页展示带 RSS 友链的最新文章卡片流，GitHub Actions 每日自动抓取 |
| 动态（Moments） | 短句 / 牢骚，与文章共用归档页，顶部按钮切换 |
| 留言板 | 独立留言页 + 友链页评论，基于 giscus（GitHub Discussions） |
| 软导航 | 站内非文章页切换不重载页面，Banner 动画跨页续接 |
| 明暗双模式 | Fluid 自带，已调好配色 |

定制代码集中在：

- `source/js/` —— `cloud-sea.js`（Banner）、`soft-nav.js`（软导航）、`moments.js`（动态）、`site-interactions.js`
- `source/css/` —— `site-motion.css`（Banner/友链/朋友圈样式）、`moments.css`、`home-sidebar.css`
- `themes/fluid/layout/` —— `links.ejs` / `guestbook.ejs` 等定制模板
- `tools/circle_fetch.py` + `.github/workflows/circle.yml` —— 朋友圈抓取

## 快速开始

```bash
git clone -b template <仓库地址>
cd <仓库目录>
pnpm install        # 安装依赖
hexo server         # 本地预览 http://localhost:4000
```

## 使用前必改（占位值清单）

仓库里所有 `Your Name` / `example.com` 都是占位值，按下表替换：

| 文件 | 配置项 | 说明 |
|---|---|---|
| `_config.yml` | `title` / `author` | 站点名与作者名 |
| `_config.yml` | `url` | 你的站点域名 |
| `_config.yml` | `deploy.repo` | 部署仓库，如 `git@github.com:<用户名>/<用户名>.github.io.git` |
| `_config.fluid.yml` | `navbar.blog_title` | 导航栏标题 |
| `_config.fluid.yml` | `index.slogan.text` | 首页副标题（打字机效果显示） |
| `_config.fluid.yml` | `about.*` | 关于页头像 / 昵称 / 简介 / 社交图标 |
| `_config.fluid.yml` | `links.items` | 友链列表（示例有两条，格式照抄） |
| `_config.fluid.yml` | `links.custom.content` | 友链页底部「申请友链」文案 |
| `source/about/index.md` | 正文 | 关于页内容 |
| `source/_posts/hello-world.md` | —— | 示例文章，学会后删除 |

## 启用评论（giscus）

评论基于 GitHub Discussions，模板中参数为空时**评论框不渲染、不报错**，但留言功能不工作。启用步骤：

1. 你的仓库设为公开、开启 **Discussions**、安装 [giscus App](https://github.com/apps/giscus)；
2. 到 [giscus.app](https://giscus.app/) 生成 `repo` / `repo-id` / `category` / `category-id` 四个参数；
3. 填入 `_config.fluid.yml` 的 `giscus` 段。留言板页（`source/guestbook/index.md`）与友链页会自动生效。

## 启用「订阅朋友圈」

1. 在 `_config.fluid.yml` 的 `links.items` 给目标友链加 `rss` 字段；
2. 在仓库根目录 `circle-feeds.json` 登记该源（`name` / `link` / `rss` / `avatar` 与友链项保持一致）；
3. 运行 `python tools/circle_fetch.py` 生成 `source/circle/circle.json`；
4. GitHub 仓库开启 Actions 后，`.github/workflows/circle.yml` 会每日自动抓取并写回最新数据。

只想用友链、不用朋友圈：`circle-feeds.json` 保持空数组 `[]` 即可，友链页只显示标题不显示卡片，属正常现象。

## 常用命令与缓存坑

```bash
hexo new "标题"      # 新建文章
hexo generate        # 生成静态文件
hexo server          # 本地预览
hexo deploy          # 部署到 GitHub Pages
```

**缓存坑（重要）**：Hexo 增量生成只跟踪源文件变化，**不跟踪 `_config.fluid.yml` 等主题配置**。改了主题配置（菜单、友链、评论开关等）后页面不更新，不是配置写错了，执行：

```bash
rm -f db.json && hexo generate
```

同理，改了 `source/js/`、`source/css/` 里的文件，记得同步 bump `_config.fluid.yml` 中 `custom_js` / `custom_css` 的 `?v=N` 版本号，防止浏览器缓存旧文件。

## 部署到 GitHub Pages

1. `_config.yml` 的 `deploy.repo` 填你的仓库；
2. `hexo generate && hexo deploy` 推送到 `gh-pages` 分支；
3. 仓库 Settings → Pages → Source 选 `gh-pages` 分支；
4. 自定义域名：把域名 CNAME 到 `<用户名>.github.io`，并在 `source/` 放 `CNAME` 文件（内容为你的域名，原站的 CNAME 已随模板移除）。

## 目录结构

```
├── _config.yml            # Hexo 主配置（标题/作者/域名/部署）
├── _config.fluid.yml      # Fluid 主题配置（含大量占位注释）
├── scaffolds/             # 文章模板
├── source/
│   ├── _posts/            # 文章（模板仅含 1 篇示例）
│   ├── _data/moments.yml  # 动态数据
│   ├── about/             # 关于页
│   ├── guestbook/         # 留言板页
│   ├── links/             # 友链页
│   ├── js/                # 定制 JS
│   ├── css/               # 定制 CSS
│   ├── img/               # 图片（头像 default.png 等由主题提供）
│   └── circle/            # 朋友圈数据（由脚本生成）
├── tools/circle_fetch.py  # 朋友圈抓取脚本
└── themes/fluid/          # Fluid 主题（含本站定制，非 submodule）
```

## 许可证与署名

- **Fluid 主题**：[MIT License](https://github.com/fluid-dev/hexo-theme-fluid/blob/main/LICENSE)，© Fluid-dev；
- **云间列车 Banner**：改编自 Shadertoy 作品 [Up in the Cloud Sea](https://www.shadertoy.com/view/Ndc3zl)（原作 mdb，单 Pass 移植 Tyson Zhou，**CC BY-NC-SA 3.0**）。该 Banner 的使用/修改/再分发必须保留页脚署名（`_config.fluid.yml` 的 `footer.content`，请勿删除）、不得商用、衍生作品需以相同协议共享；
- 模板中的其余定制代码可自由使用。

## 常见问题

**Q：改了配置没生效？**
A：见上文「缓存坑」，`rm -f db.json && hexo generate`。

**Q：Banner 是静态图？**
A：说明浏览器不支持 WebGL2 或开启了「减弱动效」，脚本已自动回退静态头图，属预期行为。

**Q：手机端效果？**
A：Banner 已对移动端降分辨率优化；朋友圈卡片固定三列布局。

**Q：想删掉某个定制功能？**
A：删 `_config.fluid.yml` 中对应的 `custom_js` / `custom_css` 行即可（菜单项在 `navbar.menu` 中增删）。
