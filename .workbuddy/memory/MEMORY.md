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
- 友链数据：全部在 `_config.fluid.yml` 的 `links.items`，每项字段 `title` / `link` / `avatar` / `intro`（年华额外有 `rss`，供订阅聚合）。当前共 12 个真实友链（**原 3 条 Fluid 官方示例已于 2026-10-14 删除**）：万象存笺(3z.ink)、楠枝小笺(nanzhiy.cn)、puresky-blog(dpdns.org)、桃之夭夭(taozhiyy.top)、蓝莓小屋(aigene.studio)、冷汐的杂货铺(lengxiqwq.com)、qwwp(qwwp.top)、MmzMing的知识库(tblog.mmzhiku.xyz)、Pasule Blog(pasule.com)、番茄主理人(blog.fqzlr.top)、年华(blog.amamo.top)、x1shang-山与回响(www.x1shang.top，2026-10-19 加)。**互链核实状态**：Pasule Blog 是唯一经 curl 在 `/friends/` 页确认互链的（明确链到 `blog.zuiges.com`、头像 `blog.zuiges.com/img/avatar.jpg`、标题「zuige's blog」）；其余友链的对方站点多路径均未检索到 zuiges，疑为前端渲染或尚未发布，添加时按 zuige 口述已互链先行加入，待逐一确认。
- 导航栏入口：`_config.fluid.yml` 的 `menu` 中 `links` 项，位置在「标签」与「关于」之间。
- 申请友链说明：`links.custom.enable: true`，内容写在 `links.custom.content`（支持 HTML/中文）。注意其中"请在下方留言"是**空指向**（友链页无评论区）。
- **留言板 / 友链页评论（2026-10-19）**：giscus 留言板放两处——① 友链页底部：`source/links/index.md` front-matter `comments: true` + `_config.fluid.yml` links 段 `comments.enable:true, type:giscus`，经 links.ejs 的 `inject_point('linksComments')` 渲染 comments.ejs（**注意：linksComments 注入点仅在 `links.comments.enable` 为 true 时才由 default-injects.js 注册**，且 comments.ejs 还需 `page.comments` 为真）；② 独立留言页 `/guestbook/`：`source/guestbook/index.md`（`layout: guestbook` + `comments:true` + `comment:giscus`），模板 `themes/fluid/layout/guestbook.ejs`（仿 about.ejs，去掉 about-info 大头像，banner 标题取 `page.subtitle`）。导航 menu 在「归档」与「分类」之间加 `{ key: guestbook, name: 留言, link: /guestbook/, icon: nav-icon-guestbook }`。**关于页不加评论**（about/index.md front-matter 无 comments）。均复用已配好的 giscus，`mapping: pathname` 使 `/links/` 与 `/guestbook/` 各自独立 Discussion 线程。前提：repo 开 Discussions + 装 giscus App；留言需 GitHub 账号。
- **iconfont 图标集（2026-10-19）**：本站用阿里 iconfont `//at.alicdn.com/t/c/font_1736178_k526ubmyhba.css`（84 个图标，可 `curl --ssl-no-revoke` 抓取列出）。该套**无通用填充气泡**（`icon-comment` 仅线条版、无 `-fill`；填充类全是社交品牌 logo）。故"留言"菜单图标用自定义类 `.nav-icon-guestbook`（site-motion.css，内联 SVG data-uri + `background:currentColor` + `mask` 做实心对话气泡，颜色跟随导航文字色、dark 自动协调；桌面导航与移动端网格菜单共用）。site-motion.css 当前 `?v=18`（留言气泡尺寸 `1.1em`、`vertical-align:-0.2em` 对齐文字基线）。教训：menu 图标若用 iconfont，先抓该 CSS 确认类存在（曾误用 `icon-comment-fill` 导致无图标）。
- **【Hexo 缓存坑·2026-10-19】改 theme config / front-matter 后增量 generate 不生效**：Hexo 增量生成只按源文件 hash 判断重渲染，**不跟踪 `_config.fluid.yml`（theme config）变化**——改 menu / links.comments 等 theme 配置后，页面 HTML 不会更新（表现：菜单没变、评论没上、新页面不生成），且易误判为"配置没读"。修法：`rm -f db.json`（或 `hexo clean`，但 clean 删 public 会触发沙箱 safe-delete 批量删除阈值，优先删 db.json）后全量 `hexo generate`。本次即因此返工一次。
- 改动流程：`hexo generate` 本地验证 → 提交推送 main → `hexo deploy` 上线（自动推 gh-pages）。

## 友链「朋友圈」动态聚合（2026-10-17 新增，zuige 称为"订阅朋友圈"）

- **作用**：抓取带 `rss` 字段的友链 RSS，在友链页（`/links/`）好友卡片之后展示"友链最新动态"卡片流（一篇一卡：标题 + 左下头像/站名 + 右下日期）。
- **架构**：
  - 源列表 `circle-feeds.json`（仓库根）：仅含带 `rss` 的友链。**现有 10 个源**（2026-10-19 由 3 扩到 10）：年华、冷汐的杂货铺、puresky-blog、Pasule Blog(pasule.com/rss.xml)、番茄主理人(blog.fqzlr.top/rss.xml)、MmzMing的知识库(tblog.mmzhiku.xyz/rss.xml)、楠枝小笺(nanzhiy.cn/rss.xml)、蓝莓小屋(aigene.studio/rss.xml)、qwwp(qwwp.top/feed.xml)、x1shang-山与回响(www.x1shang.top/feed)。**未配 RSS 的友链（不进朋友圈）**：万象存笺(3z.ink，沙箱出网拦 502 未验证)、桃之夭夭(taozhiyy.top，各路径返回 text/html 无 feed)。
  - 抓取脚本 `tools/circle_fetch.py`（纯标准库，无第三方依赖）：GitHub Actions `circle.yml` 定时跑，本地也可 `python tools/circle_fetch.py`。
  - 输出 `source/circle/circle.json`（展示数据，按时间倒序取前 60 条）；累积归档 `circle-archive.json`（仓库根，按 URL 去重合并，每人上限 100 篇）。
  - 上线链路：`hexo generate` 把 `source/circle/circle.json` 拷到 `public/circle/circle.json` → `hexo deploy` 推 gh-pages → 线上 `/circle/circle.json`。**该 JSON 现作为基线提交进 git（2026-10-19 从 .gitignore 移除并 commit），不再被忽略**——保证任何一次 `hexo deploy`（含别的会话的纯页面优化推送、干净检出）都带数据；`circle.yml` 的 Actions 跑完 `circle_fetch.py` 后也会把最新 `circle.json` 写回 main，保持基线新鲜。
  - 前端：`themes/fluid/layout/links.ejs` 在好友卡片后放 `<div id="circle-feed" aria-label="友链最新动态"></div>` + `<script src="/js/circle-feed.js?v=6">`；`source/js/circle-feed.js` 运行时 `fetch('/circle/circle.json?v=2-YYYY-MM-DD-HH')`（**按小时缓存破坏符**，防 Cloudflare/浏览器 4h 缓存拿到旧/空版本，且避免同一日多次部署仍命中旧缓存）渲染 `.feed-card` 卡片。**默认收起**：网格桌面/平板固定 3 列，收起态 `#circle-feed.is-collapsed` 隐藏第 10+ 张（只显示前 9 张 = 三行三列九宫格），卡片流下方有"展开"↔"收起"按钮（`total<=9` 时不折叠无按钮）。
  - 样式：`source/css/site-motion.css` 的 `#circle-feed` / `.feed-card` 段（**不是** moments.css；moments.css 只管"动态/Moments"归档页与首页流）。
- **已知坑（2026-10-19 排查确认）**：
  1. 容器曾**没有可见标题**，只有屏幕阅读器用的 `aria-label`——极易被当成"没了"或忽略。**2026-10-19 已修**：`links.ejs` 在 `#circle-feed` 前加了 `<h2 class="circle-feed-title">订阅朋友圈 <span class="circle-feed-sub">友链最新动态</span></h2>`，样式在 `site-motion.css`（该次改动曾漏 bump `?v=13→?v=14`，导致线上拿到旧 CSS）。
  2. 朋友圈源数量取决于 `circle-feeds.json` 登记（始于仅年华 1 家，2026-10-19 扩到 3 家）。要加新友链进朋友圈：① 在其 `links.items` 项加 `rss` 字段；② 在 `circle-feeds.json` 登记同名源；③ 跑 `circle_fetch.py` 或 `hexo generate` 重新生成 `circle.json` 并 deploy。
  3. 改 `circle-feed.js` 后必须 bump `?v=N`（防 CDN/浏览器缓存）；当前 `circle-feed.js?v=6`、`soft-nav.js?v=5`（2026-10-19 因缓存破坏符 bump v4、按小时 bump v5、文案+软导航修复 bump v6）。
  4. 数据新鲜度依赖 Actions 定时抓取；本地手改 `source/circle/circle.json` 后必须 `hexo generate` + `hexo deploy` 才生效。
  5. **【根因红线·2026-10-19】朋友圈"什么都没有"最常不是 bug，而是 `circle.json` 没被打进部署包**：旧版它被 `.gitignore` 忽略且未提交，任何一次"没跑 `circle_fetch.py` 就 `hexo deploy`"的部署（尤其是别的会话只改页面就推送）都不会生成 `public/circle/circle.json` → 线上 `/circle/circle.json` 404 → 整块朋友圈空白。判定口诀：线上 `links` 页有 `#circle-feed` 容器和"订阅朋友圈"标题、CSS 含 `.feed-card`、JS 与源码一致，但卡片为空 → 99% 是 `circle.json` 缺失/空。**已根治**：把 `circle.json` 基线提交进 git + Actions 写回，从此干净部署也带数据。
  6. **按日缓存破坏符不够**：同日多次部署时，Cloudflare/浏览器对 `circle.json?v=2026-10-19` 的 4h 缓存会让用户一直拿到旧版（例如 12 篇而非 60 篇）。**已改为按小时破坏符** `v=2-YYYY-MM-DD-HH`，且每次 JS 改动仍同步 bump `?v=N`。
  7. **【CSS 坑·2026-10-19】展开后卡片变宽/横向溢出**：grid item `.feed-card` 默认 `min-width:auto`，卡片内不换行的长站点名/标题会撑宽整列，展开 60 张后必炸。修复：`.feed-card`/`.feed-foot`/`.feed-name` 全加 `min-width:0`；`#circle-feed` 加 `margin-left/right:0; max-width:100%` 覆盖 Fluid `.row` 负 margin。`site-motion.css` 当前 `?v=15`。收起/展开列数都固定 `repeat(3,1fr)`，卡片宽度恒定。

## 首页动态 Banner「云间列车」（2026-10-14 新增，v7 / 软导航 2026-10-15 上线）

- 来源：Shadertoy `Ndc3zl`《Up in the Cloud Sea》（原作 mdb，**CC BY-NC-SA 3.0**），用 Tyson Zhou 单 Pass 移植版改写。**署名行在 `_config.fluid.yml` 的 `footer.content`，不可删**（许可证合规）。
- 实现：`source/js/cloud-sea.js`（WebGL2 引擎+shader 内嵌字符串）+ `source/img/cloud-sea-noise.png`（蓝噪声 256x256 灰度图，~160KB）。注入方式走 Fluid `custom_js`（带 `?v=N` 缓存版本号，改 JS 必须同步 bump）。
- **跨页续接**：① v6 起 sessionStorage 存动画时刻（key `cloudSeaElapsed`，每 16 帧节流 + pagehide 精确保存），新页 seed 续接；② **软导航 `source/js/soft-nav.js`**（v2 随 e33b0ff 上线，v1 随 8eeaa16 首次上线）：事件委托拦截站内非文章页链接，fetch+DOMParser 仅替换 `#board`，canvas 不销毁；popstate 对文章页（permalink `/^\/\d{4}\/\d{2}\//`）回退真实导航；异常回退真实导航。换页后同步：`document.title`、subtitle（innerHTML + `data-typed-text` 属性）、`syncBannerChrome()` 的 banner 行内样式、导航高亮。**2026-10-19 修复软导航后 JS 不执行（红线）**：`board.innerHTML = nb.innerHTML` 不会执行新内容里的 `<script>`，导致依赖 JS 的页面（友链朋友圈 `circle-feed.js`）软导航首次进入时只有"订阅朋友圈"标题、无任何卡片，硬刷新才恢复。已加 `rerunScripts()`：替换 innerHTML 后遍历 board 内 `<script>`，用 `createElement` 重建并 `replaceChild` 触发执行（src 外部脚本与内联都支持，`data-softnav-exec` 标记防重复）。`soft-nav.js` 当前 `?v=5`。
- **banner 标题机制（2026-10-15 修复，红线）**：`fun_features.typing.enable: true` 且 scope 为空 → 全站走 typing 分支，`banner.ejs` 渲染 `<span id="subtitle" data-typed-text="标题">标题</span>`（**静态回退文本，2026-10-15 起必须有，勿改回空 span**）；`plugins/typed.ejs` 内联脚本读 `data-typed-text` 调 `Fluid.plugins.typing()`，`plugins.js` 首行 `if (!('Typed' in window)) return;`——typed.js 走 lib.baomitu.com CDN（`static_prefix.typed`，jquery/bootstrap 同 CDN）。**空 span 在两种情况下标题全消失**：CDN 加载失败（typing() 早退不写文本）、软导航拷贝目标页空 innerHTML。静态回退是渐进增强：CDN 正常时 typing() 同步清空重打（先于首屏绘制，无闪烁），失败/软导航后标题保持可见。zuige 反馈的「最上层矩形块凸起少了」即指标题消失，与 banner 高度无关。
- **banner 高度策略**（zuige 2026-10-15 定，当日 01:0x 终版）：index 100vh 全屏沉浸不改；**其余页全部 60vh**（tag 曾 80→60→80→60 反复，最终以友链页高度为准统一 60vh）。软导航时 `syncBannerChrome()` 从目标页同步 banner 行内样式（高度/遮罩/背景图）防残留；cloud-sea.js v7 起 ResizeObserver 监听 banner 尺寸变化重算 canvas 分辨率。**回退教训**：撤高度时勿连带撤这两个机制（纯 revert 会引入未测试的坏组合），只改 `_config.fluid.yml` 配置行即可；zuige 的高度偏好以视觉为准且会反复，改动务必控制在配置行。
- **红线/教训**：① 蓝噪声纹理不能平滑降采样（LANCZOS 抹平方差→云变平色带），必须 NEAREST 抽取；② shader 内噪声查表常量 `/256.0` 必须与纹理尺寸一致；③ JS 拼接 GLSL 浮点字面量要用字符串（JS 数字 256.0 会变 "256" 引发编译错）。
- 降级链：~~<768px~~ **2026-10-14 起手机端也显示**（renderScale 0.5 起步、DPR≤1.5、击杀阈值 45ms）/ reduced-motion / 无 WebGL2 / 编译失败 → 静态头图；帧耗时超标 → renderScale 0.75→0.5 → 仍不行退静态；后台/滚出视口自动暂停。**全站所有页面生效**（每页都有 #banner），不再限首页。
- 调试手段：`hexo server` + playwright-cli 截图对比作者原版页（people.tamu.edu/~choutianxius/csce646/pr01/index.html）。
- **「凸起/相切」感知机制（2026-10-15 诊断，勿再当 bug 查）**：`#board` 恒以 `margin-top: -2rem`（2026-09-07 d6b9417 起）压住 banner 底边 32px，本地/线上渲染完全一致（HTML 一致、main.css 字节级相同）。zuige 感知的「一个卡片头凸起来、一个与背景相切」是 **WebGL 云场景明暗相位**造成的：卡片顶边处是亮云 → 深色卡片"切进"banner 显凸起；是暗云带 → 卡片与暗云糊成一片显"相切"。云相随 shader 时间动画（底部前景云层 dist=1~2，约 1 uv/s 快漂移）与窗口高度（60vh → uv 裁剪不同）而变，**非布局差异**。滚动箭头仅 banner ≥80vh 渲染（`banner_height_limit: 80`，全站仅首页 100vh 够格），其他页 banner 里的小图标是场景内容或截图浮层，不是主题组件。
