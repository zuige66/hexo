-- 自建评论区 D1 表结构
-- 用法：npx wrangler d1 execute zuige-comments --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  thread      TEXT    NOT NULL,              -- 页面路径，如 /guestbook/
  parent_id   INTEGER NOT NULL DEFAULT 0,    -- 回复的评论 id，0 表示顶层
  author      TEXT    NOT NULL,              -- 昵称（必填）
  email       TEXT    NOT NULL DEFAULT '',   -- 邮箱（选填，永不返回给浏览器）
  content     TEXT    NOT NULL,              -- 评论正文（纯文本 / Markdown 子集）
  avatar      TEXT    NOT NULL DEFAULT '',   -- 头像 URL（迁移的 GitHub 头像）
  ip_hash     TEXT    NOT NULL DEFAULT '',   -- IP 哈希，用于限流，不存原始 IP
  created_at  TEXT    NOT NULL,              -- ISO 8601 UTC
  status      TEXT    NOT NULL DEFAULT 'approved', -- approved / spam / deleted
  source      TEXT    NOT NULL DEFAULT 'web'       -- web / giscus（迁移标记）
);

CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread, status, id);
CREATE INDEX IF NOT EXISTS idx_comments_ip_time ON comments(ip_hash, created_at);
