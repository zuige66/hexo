# 自建评论区部署指南（Cloudflare Workers + D1）

把博客的评论/留言从 Giscus（GitHub Discussions）迁到自建后端：**访客无需 GitHub 账号，填昵称+选填邮箱即可评论**，由 Cloudflare Turnstile 挡机器人。

## 架构

```
浏览器（博客页面）
  │  GET  /api/comments?path=/guestbook/    读评论
  │  POST /api/comments  {昵称,邮箱,内容,Turnstile token}   发评论
  ▼
Cloudflare Worker（zuige-comments）
  │  D1 数据库 comments 表
  ▼
评论数据（留在本仓库之外，属于你自己的 CF 账号）
```

- 后端代码：`src/`（含单元测试 `test/`）
- 前端代码：`source/js/cf-comments.js` + `source/css/cf-comments.css`
- 主题接入：`themes/fluid/layout/_partials/comments/cf_comments.ejs`
- 配置项：`_config.fluid.yml` 的 `cf_comments` 段

## 当前线上状态（2026-11-25 已部署）

| 项目 | 值 |
|------|-----|
| CF 账号 | liruisen0413@gmail.com（account id `7f31d5b3e495c48523c034f0aee831d9`） |
| D1 数据库 | `zuige-comments`，database_id `4be87c1e-e54f-42c0-a71f-92601283690f`，region WNAM |
| Worker | `zuige-comments`，route `comments.zuiges.com/*` |
| 自定义域名 | `https://comments.zuiges.com`（**DNS 待加，见下方**） |
| Turnstile | widget `zuige-blog-comments`，mode `non-interactive`，site key `0x4AAAAAAGR2lGXqAiTKCegi`；secret 已写入 Worker |
| 管理令牌 | 已写入 Worker（`MODERATION_TOKEN`，值见你的密码管理，忘记就 `wrangler secret put` 重设） |
| 历史评论 | 6 条已导入（含旧路径修正），带「历史留言」标记 |

> ✅ **DNS 记录已添加**（2026-11-25 用户手动完成）：CNAME `comments` → `zuige-comments.liruisen0413.workers.dev`，**Proxied（橙色云）**。
>
> 服务端已验证：`https://comments.zuiges.com/api/health` 返回 `{"ok":true,"service":"zuige-comments"}`，`/api/comments?path=/guestbook/` 能读到历史留言。
>
> **排查提示**：教育网 DNS（如 `dns3.gdut.edu.cn`）同步新记录可能滞后数小时，本机暂时解析不到属正常现象，不影响线上访客。验证时可强制指定 IP：
> ```bash
> curl --noproxy '*' --resolve comments.zuiges.com:443:172.67.146.198 \
>   https://comments.zuiges.com/api/health
> ```

> 为什么不用 `*.workers.dev`：国内访问 workers.dev 经常超时（实测 DNS 解析正常但连接被拦）。绑定自有域名走 CF 国内可达线路即可解决。

## 第一步：创建 D1 数据库

需要本机装 Node.js 和 npm（或用 npx）：

```bash
cd cf-worker
npx wrangler login
npx wrangler d1 create zuige-comments
```

命令会输出一个 `database_id`，把它填进 `wrangler.toml` 里 `database_id` 的位置。

然后建表：

```bash
# 本地开发库（可选）
npx wrangler d1 execute zuige-comments --local --file=schema.sql
# 线上库（必须）
npx wrangler d1 execute zuige-comments --remote --file=schema.sql
```

## 第二步：配置 Turnstile（人机验证）

1. 打开 https://dash.cloudflare.com → 选中你的域名 → 安全 → Turnstile → 添加站点
2. 域名填 `blog.zuiges.com`（如用了其他域名按实际填）；可以选「非交互式小部件」
3. 记下两把密钥：
   - **站点密钥 Site Key**：公开，填到 `_config.fluid.yml` 的 `cf_comments.site_key`
   - **密钥 Secret Key**：私密，用命令写入 Worker：

```bash
cd cf-worker
npx wrangler secret put TURNSTILE_SECRET
# 粘贴 Secret Key 后回车
```

> 本地测试可以两把都不填：Worker 在 `TURNSTILE_SECRET` 为空时跳过校验。但**上线前务必配上**，否则会被机器人灌水。

## 第三步：部署 Worker

```bash
cd cf-worker
# 先跑单元测试（可选但建议）
npm test
# 部署
npx wrangler deploy
```

部署成功后会输出 Worker 域名，类似 `https://zuige-comments.<你的账号名>.workers.dev`。

把这个地址填进 `_config.fluid.yml`：

```yaml
cf_comments:
  api: https://zuige-comments.<你的账号名>.workers.dev
  site_key: 上面拿到的 Site Key
  page_size: 20
```

> `wrangler.toml` 里的 `ALLOWED_ORIGINS` 默认只允许 `https://blog.zuiges.com` 跨域调用。如果博客改了域名，记得同步改这一行再 `npx wrangler deploy`。

## 第四步：迁移历史评论（6 条）

我已把你 Giscus 里的 6 条历史留言导出并生成好导入 SQL，在临时目录：

```
D:/Workplace/_tmp_comment_export/giscus.json    （原始导出）
D:/Workplace/_tmp_comment_export/import.sql     （导入 SQL）
```

导入到线上 D1：

```bash
cd cf-worker
npx wrangler d1 execute zuige-comments --remote --file=D:/Workplace/_tmp_comment_export/import.sql
```

导入的 6 条评论会带 Original 昵称、GitHub 头像和原始时间，并显示「历史留言」标记。旧路径 `/hexo/2026/09/04/markdown-guide/` 已在迁移脚本里自动修正为现在的路径。

> 如果以后要重新导出/迁移：用 GitHub PAT 调 GraphQL 导出 Discussions 的 `title/url/comments{body createdAt author}`，再跑 `python tools/import_giscus.py <导出.json> <输出.sql>`。注意：PAT 用完后建议在 GitHub Settings 里撤销。

## 第五步：更新博客并验证

```bash
cd /d/Workplace/hexo
rm -f db.json && npx hexo generate
git add -A && git commit -m "switch to self-hosted comments" && git push origin main
```

等 GitHub Actions 部署完（1-2 分钟），打开博客验证：

- 文章底部、留言页、友链页底部出现新评论区
- 未登录也能看到表单，填昵称即可留言
- 提交后评论立即显示（重新拉第一页）
- 历史 6 条留言带「历史留言」标记
- 切换深色模式，评论区跟随变色

## 管理评论（删垃圾 / 屏蔽 / 恢复）

先设置管理令牌（只需一次）：

```bash
cd cf-worker
npx wrangler secret put MODERATION_TOKEN
# 自己起一个随机字符串
```

然后（把 `TOKEN` 换成你设的值，`ID` 换成评论 id）：

```bash
# 删除（标记为 deleted，前端不可见，但数据库保留）
curl -X DELETE https://zuige-comments.<账号>.workers.dev/api/admin/ID \
  -H "Authorization: Bearer TOKEN"

# 标记垃圾
curl -X PATCH https://zuige-comments.<账号>.workers.dev/api/admin/ID \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"spam"}'

# 恢复
curl -X PATCH https://zuige-comments.<账号>.workers.dev/api/admin/ID \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

也可以直接用 D1 SQL：`npx wrangler d1 execute zuige-comments --remote --command "UPDATE comments SET status='deleted' WHERE id=123"`

## 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comments?path=/guestbook/&page=1&limit=20` | 读评论（只返回 approved） |
| POST | `/api/comments` | 发评论（Turnstile + 蜜罐 + 限流） |
| PATCH | `/api/admin/:id` | 标记 approved / spam |
| DELETE | `/api/admin/:id` | 软删除 |
| GET | `/api/health` | 健康检查 |

## 安全设计

- **Turnstile**：每次发评论必须在 Worker 端校验 token，前端绕过无效
- **蜜罐字段**：隐藏的 `website` 字段，机器人填了就假装成功但不入库
- **限流**：同一 IP 每 10 分钟最多 5 条（IP 只存 SHA-256 哈希，不存原文）
- **输入校验**：昵称 40 字、邮箱格式、内容 2000 字上限，控制字符过滤
- **XSS**：前端渲染先 HTML 转义，再白名单 Markdown（代码块 / 粗体 / 斜体 / 链接）
- **邮箱不公开**：接口从不返回 `email` 字段
- **CORS**：`ALLOWED_ORIGINS` 白名单，只允许博客域名调用

## 用 AI 直接操作 Cloudflare（MCP）

已在 `~/.workbuddy/mcp.json` 加了官方 Cloudflare API MCP：

```json
"cloudflare-api": { "url": "https://mcp.cloudflare.com/mcp" }
```

- 新 MCP 需在 WorkBuddy 左下「+」→ 连接器管理 → 信任后才生效（ OAuth 会在浏览器弹授权页，勾选需要的最小权限）。
- 它用 Code Mode：`search()` 找 API、`execute()` 调 API、`docs()` 查文档，覆盖 DNS / Workers / D1 / R2 全部接口。以后可以直接让 AI 查评论、删垃圾、改 DNS。
- 安全提醒：`execute()` 无内置确认步骤，生产变更（删 Worker、改 DNS）务必人工确认。

## 回退方案

如需临时退回 Giscus：把 `_config.fluid.yml` 里 `post.comments.type` 和 `links.comments.type` 改回 `giscus`，`source/guestbook/index.md` 的 `comment:` 也改回 `giscus`，然后 `rm -f db.json && npx hexo generate`。Giscus 配置段仍保留在 `_config.fluid.yml` 里。
