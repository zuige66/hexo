// D1 数据访问层。所有 SQL 集中在这里，handler 只依赖这些方法，便于本地内存测试。

export function createD1Repo(DB) {
  return {
    async list(thread, limit, offset) {
      const { results } = await DB.prepare(
        `SELECT id, parent_id, author, content, avatar, created_at, source
           FROM comments
          WHERE thread = ? AND status = 'approved'
          ORDER BY created_at ASC, id ASC
          LIMIT ? OFFSET ?`
      ).bind(thread, limit, offset).all();
      return (results || []).map(toComment);
    },

    async count(thread) {
      const { results } = await DB.prepare(
        `SELECT COUNT(*) AS n FROM comments
          WHERE thread = ? AND status = 'approved'`
      ).bind(thread).all();
      return Number((results && results[0] && results[0].n) || 0);
    },

    async countRecentByIp(ipHash, sinceIso) {
      const { results } = await DB.prepare(
        `SELECT COUNT(*) AS n FROM comments
          WHERE ip_hash = ? AND created_at >= ? AND status != 'deleted'`
      ).bind(ipHash, sinceIso).all();
      return Number((results && results[0] && results[0].n) || 0);
    },

    async insert(row) {
      const result = await DB.prepare(
        `INSERT INTO comments
           (thread, parent_id, author, email, content, avatar, ip_hash, created_at, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'web')`
      ).bind(
        row.thread, row.parentId, row.author, row.email, row.content,
        row.avatar || '', row.ipHash, row.createdAt
      ).run();
      return Number(result.meta && result.meta.last_row_id) || 0;
    },

    async find(id) {
      const { results } = await DB.prepare(
        `SELECT id, thread, parent_id, author, content, avatar, created_at, status, source
           FROM comments WHERE id = ?`
      ).bind(id).all();
      return (results && results[0]) || null;
    },

    async updateStatus(id, status) {
      await DB.prepare('UPDATE comments SET status = ? WHERE id = ?')
        .bind(status, id).run();
    }
  };
}

function toComment(r) {
  return {
    id: Number(r.id),
    parentId: Number(r.parent_id || 0),
    author: r.author,
    content: r.content,
    avatar: r.avatar || '',
    createdAt: r.created_at,
    source: r.source || 'web'
  };
}
