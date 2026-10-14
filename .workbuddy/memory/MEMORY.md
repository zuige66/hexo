# 项目长期记忆：zuige66/hexo 博客

## 分支策略与红线（2026-10-13 核查）

仓库 `git@github.com:zuige66/hexo.git` 采用 Hexo 标准「源码 / 站点」双分支部署：

- **main（本地 = origin/main）**：源码分支。含 source/ 文章、themes/、_config.yml、DOMAIN.md、.workbuddy/。`.gitignore` 忽略 public/、db.json、node_modules/、_deploy*/。日常在此分支写作、改配置。
- **gh-pages（origin/gh-pages）**：生成的静态站点，GitHub Pages 实际读取它来提供 blog.zuiges.com（origin/HEAD 默认指向它）。
- **source**：**已于 2026-10-13 删除**。原 HEAD aa7a655 "Baseline v1.0.0"，早期双分支策略（source 存源码 + 主分支存站点）遗留，已被 main 完全取代，删除前无 CI/部署引用。

### 红线
- **禁止删除 `gh-pages`**：它是线上站点承载分支，删了博客即下线。
- ~~`source` 分支~~：**已于 2026-10-13 删除**，无需再处理。
- 本地只需保留 main；不要为 gh-pages 建本地跟踪分支（hexo deploy 自行管理）。

### 已知脏数据
- ~~`ource` 误建文件~~：**已于 2026-10-13 删除**。实为单文件（5926 字节），非目录，原被跟踪在 main 中。

## 友链配置（2026-10-14 新增）

- 友链页：`source/links/index.md`（front-matter `layout: links`），渲染模板 `themes/fluid/layout/links.ejs`，路由 `/links/`。
- 友链数据：全部在 `_config.fluid.yml` 的 `links.items`，每项字段 `title` / `link` / `avatar` / `intro`。当前含 3 条 Fluid 官方示例 + 8 个真实友链：万象存笺(3z.ink)、楠枝小笺(nanzhiy.cn)、puresky-blog(dpdns.org)、桃之夭夭(taozhiyy.top)、蓝莓小屋(aigene.studio)、冷汐的杂货铺(lengxiqwq.com)、qwwp(qwwp.top)、MmzMing的知识库(tblog.mmzhiku.xyz)。**互链未核实**：8 个真实友链的对方站点均未能经 curl 检索到 zuiges，疑为前端渲染或尚未发布，添加时按 zuige 口述已互链先行加入，待逐一确认。
- 导航栏入口：`_config.fluid.yml` 的 `menu` 中 `links` 项，位置在「标签」与「关于」之间。
- 申请友链说明：`links.custom.enable: true`，内容写在 `links.custom.content`（支持 HTML/中文）。
- 改动流程：`hexo generate` 本地验证 → 提交推送 main → `hexo deploy` 上线（自动推 gh-pages）。
