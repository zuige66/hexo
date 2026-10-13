# 项目长期记忆：zuige66/hexo 博客

## 分支策略与红线（2026-10-13 核查）

仓库 `git@github.com:zuige66/hexo.git` 采用 Hexo 标准「源码 / 站点」双分支部署：

- **main（本地 = origin/main，HEAD 89119c0）**：源码分支。含 source/ 文章、themes/、_config.yml、DOMAIN.md、.workbuddy/。`.gitignore` 忽略 public/、db.json、node_modules/、_deploy*/。日常在此分支写作、改配置。
- **gh-pages（origin/gh-pages，HEAD 3a43536 "add /download/ page for Hyper MeloLock"）**：生成的静态站点，GitHub Pages 实际读取它来提供 blog.zuiges.com。`_config.yml` 的 `deploy.branch: gh-pages`，由 `hexo deploy` 自动推送（内部临时 clone，无需本地建该分支）。
- **source（origin/source，HEAD aa7a655 "Baseline v1.0.0"）**：**已废弃**的早期源码分支，停留在一个早期基线提交，已被 main 完全取代（diff main vs source：242 文件、删 14484 行）。早期双分支策略（source 存源码 + 主分支存站点）遗留，迁移到 gh-pages 方案后未清理。

### 红线
- **禁止删除 `gh-pages`**：它是线上站点承载分支，删了博客即下线。
- **`source` 分支可清理**（删除属外部动作，需 zuige 确认后再执行），目前无 CI/部署引用。
- 本地只需保留 main；不要为 gh-pages 建本地跟踪分支（hexo deploy 自行管理）。

### 已知脏数据
- 仓库根目录有个误建的 `ource` 目录（少了 s，是 source 的拼写错误残留），可安全删除。
