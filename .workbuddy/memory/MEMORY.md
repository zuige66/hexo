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
- 友链数据：全部在 `_config.fluid.yml` 的 `links.items`，每项字段 `title` / `link` / `avatar` / `intro`。当前仅含 10 个真实友链（**原 3 条 Fluid 官方示例已于 2026-10-14 删除**）：万象存笺(3z.ink)、楠枝小笺(nanzhiy.cn)、puresky-blog(dpdns.org)、桃之夭夭(taozhiyy.top)、蓝莓小屋(aigene.studio)、冷汐的杂货铺(lengxiqwq.com)、qwwp(qwwp.top)、MmzMing的知识库(tblog.mmzhiku.xyz)、Pasule Blog(pasule.com)、番茄主理人(blog.fqzlr.top)。**互链核实状态**：Pasule Blog 是唯一经 curl 在 `/friends/` 页确认互链的（明确链到 `blog.zuiges.com`、头像 `blog.zuiges.com/img/avatar.jpg`、标题「zuige's blog」）；其余 9 个真实友链的对方站点多路径均未检索到 zuiges，疑为前端渲染或尚未发布，添加时按 zuige 口述已互链先行加入，待逐一确认。
- 导航栏入口：`_config.fluid.yml` 的 `menu` 中 `links` 项，位置在「标签」与「关于」之间。
- 申请友链说明：`links.custom.enable: true`，内容写在 `links.custom.content`（支持 HTML/中文）。
- 改动流程：`hexo generate` 本地验证 → 提交推送 main → `hexo deploy` 上线（自动推 gh-pages）。

## 首页动态 Banner「云间列车」（2026-10-14 新增，v7 / 软导航 2026-10-15 上线）

- 来源：Shadertoy `Ndc3zl`《Up in the Cloud Sea》（原作 mdb，**CC BY-NC-SA 3.0**），用 Tyson Zhou 单 Pass 移植版改写。**署名行在 `_config.fluid.yml` 的 `footer.content`，不可删**（许可证合规）。
- 实现：`source/js/cloud-sea.js`（WebGL2 引擎+shader 内嵌字符串）+ `source/img/cloud-sea-noise.png`（蓝噪声 256x256 灰度图，~160KB）。注入方式走 Fluid `custom_js`（带 `?v=N` 缓存版本号，改 JS 必须同步 bump）。
- **跨页续接**：① v6 起 sessionStorage 存动画时刻（key `cloudSeaElapsed`，每 16 帧节流 + pagehide 精确保存），新页 seed 续接；② **软导航 `source/js/soft-nav.js`**（v2 随 e33b0ff 上线，v1 随 8eeaa16 首次上线）：事件委托拦截站内非文章页链接，fetch+DOMParser 仅替换 `#board`，canvas 不销毁；popstate 对文章页（permalink `/^\/\d{4}\/\d{2}\//`）回退真实导航；异常回退真实导航。换页后同步：`document.title`、subtitle（innerHTML + `data-typed-text` 属性）、`syncBannerChrome()` 的 banner 行内样式、导航高亮。
- **banner 标题机制（2026-10-15 修复，红线）**：`fun_features.typing.enable: true` 且 scope 为空 → 全站走 typing 分支，`banner.ejs` 渲染 `<span id="subtitle" data-typed-text="标题">标题</span>`（**静态回退文本，2026-10-15 起必须有，勿改回空 span**）；`plugins/typed.ejs` 内联脚本读 `data-typed-text` 调 `Fluid.plugins.typing()`，`plugins.js` 首行 `if (!('Typed' in window)) return;`——typed.js 走 lib.baomitu.com CDN（`static_prefix.typed`，jquery/bootstrap 同 CDN）。**空 span 在两种情况下标题全消失**：CDN 加载失败（typing() 早退不写文本）、软导航拷贝目标页空 innerHTML。静态回退是渐进增强：CDN 正常时 typing() 同步清空重打（先于首屏绘制，无闪烁），失败/软导航后标题保持可见。zuige 反馈的「最上层矩形块凸起少了」即指标题消失，与 banner 高度无关。
- **banner 高度策略**（zuige 2026-10-15 定，当日 01:0x 终版）：index 100vh 全屏沉浸不改；**其余页全部 60vh**（tag 曾 80→60→80→60 反复，最终以友链页高度为准统一 60vh）。软导航时 `syncBannerChrome()` 从目标页同步 banner 行内样式（高度/遮罩/背景图）防残留；cloud-sea.js v7 起 ResizeObserver 监听 banner 尺寸变化重算 canvas 分辨率。**回退教训**：撤高度时勿连带撤这两个机制（纯 revert 会引入未测试的坏组合），只改 `_config.fluid.yml` 配置行即可；zuige 的高度偏好以视觉为准且会反复，改动务必控制在配置行。
- **红线/教训**：① 蓝噪声纹理不能平滑降采样（LANCZOS 抹平方差→云变平色带），必须 NEAREST 抽取；② shader 内噪声查表常量 `/256.0` 必须与纹理尺寸一致；③ JS 拼接 GLSL 浮点字面量要用字符串（JS 数字 256.0 会变 "256" 引发编译错）。
- 降级链：~~<768px~~ **2026-10-14 起手机端也显示**（renderScale 0.5 起步、DPR≤1.5、击杀阈值 45ms）/ reduced-motion / 无 WebGL2 / 编译失败 → 静态头图；帧耗时超标 → renderScale 0.75→0.5 → 仍不行退静态；后台/滚出视口自动暂停。**全站所有页面生效**（每页都有 #banner），不再限首页。
- 调试手段：`hexo server` + playwright-cli 截图对比作者原版页（people.tamu.edu/~choutianxius/csce646/pr01/index.html）。
