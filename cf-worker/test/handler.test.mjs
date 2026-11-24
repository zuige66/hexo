import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, normalizePath } from '../src/handler.js';

function memoryRepo() {
  const rows = [];
  let seq = 0;
  return {
    rows,
    async list(thread, limit, offset) {
      return rows.filter(r => r.thread === thread && r.status === 'approved')
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
        .slice(offset, offset + limit).map(r => ({
          id: r.id, parentId: r.parent_id, author: r.author,
          content: r.content, avatar: r.avatar, createdAt: r.created_at, source: r.source
        }));
    },
    async count(thread) {
      return rows.filter(r => r.thread === thread && r.status === 'approved').length;
    },
    async countRecentByIp(ipHash, since) {
      return rows.filter(r => r.ip_hash === ipHash && r.created_at >= since && r.status !== 'deleted').length;
    },
    async insert(row) {
      const id = ++seq;
      rows.push({
        id, thread: row.thread, parent_id: row.parentId, author: row.author,
        email: row.email, content: row.content, avatar: row.avatar,
        ip_hash: row.ipHash, created_at: row.createdAt, status: 'approved', source: 'web'
      });
      return id;
    },
    async find(id) { return rows.find(r => r.id === Number(id)) || null; },
    async updateStatus(id, status) {
      const row = rows.find(r => r.id === Number(id));
      if (row) row.status = status;
    }
  };
}

function req(url, options = {}) {
  return new Request('https://comments.example.com' + url, options);
}

const BASE_ENV = {
  ALLOWED_ORIGINS: 'https://blog.zuiges.com',
  RATE_LIMIT: '5',
  MAX_CONTENT_LENGTH: '2000',
  TURNSTILE_SECRET: '',
  MODERATION_TOKEN: 'test-admin-token'
};

test('normalizePath：路径规范化', () => {
  assert.equal(normalizePath('guestbook/'), '/guestbook');
  assert.equal(normalizePath('/2026/09/04/post/'), '/2026/09/04/post');
  assert.equal(normalizePath('/a%20b/?x=1#y'), '/a b');
  assert.equal(normalizePath('/index.html'), '/');
  assert.equal(normalizePath('/../etc'), '');
  assert.equal(normalizePath(''), '');
});

test('GET /api/comments：空列表与分页字段', async () => {
  const repo = memoryRepo();
  const handler = createHandler({ repo, env: BASE_ENV });
  const res = await handler(req('/api/comments?path=/guestbook/'));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.comments, []);
  assert.equal(data.total, 0);
  assert.equal(data.pages, 1);
});

test('POST /api/comments：正常提交、不返回邮箱、蜜罐拦截', async () => {
  const repo = memoryRepo();
  const handler = createHandler({ repo, env: BASE_ENV });
  const res = await handler(req('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' },
    body: JSON.stringify({
      path: '/guestbook/', author: '访客', email: 'a@b.com',
      content: '你好，这是一条测试留言', website: '', cfToken: ''
    })
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
  assert.equal(repo.rows.length, 1);
  assert.equal(repo.rows[0].email, 'a@b.com');
  assert.equal(repo.rows[0].thread, '/guestbook');

  const list = await (await handler(req('/api/comments?path=/guestbook'))).json();
  assert.equal(list.total, 1);
  assert.equal('email' in list.comments[0], false, '公开接口不能泄露邮箱');

  const bot = await handler(req('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: '/guestbook', author: 'bot', content: 'spam', website: 'http://spam' })
  }));
  assert.equal(bot.status, 200);
  assert.equal(repo.rows.length, 1, '蜜罐命中不应入库');
});

test('POST /api/comments：参数校验', async () => {
  const handler = createHandler({ repo: memoryRepo(), env: BASE_ENV });
  const post = body => handler(req('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }));
  assert.equal((await post({ path: '/x', author: '', content: 'hi' })).status, 400);
  assert.equal((await post({ path: '/x', author: 'a', content: '' })).status, 400);
  assert.equal((await post({ path: '/x', author: 'a', email: 'bad', content: 'hi' })).status, 400);
  assert.equal((await post({ path: '/x', author: 'a', content: 'x'.repeat(2001) })).status, 400);
});

test('POST /api/comments：Turnstile 校验与限流', async () => {
  const repo = memoryRepo();
  let turnstileOk = true;
  const env = { ...BASE_ENV, TURNSTILE_SECRET: 'secret', RATE_LIMIT: '2' };
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ success: turnstileOk })
  });
  const handler = createHandler({ repo, env, fetchImpl });
  const post = (token, ip = '9.9.9.9') => handler(req('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify({ path: '/x', author: 'a', content: 'hi', cfToken: token })
  }));
  assert.equal((await post('')).status, 403, '缺少 token 应拒绝');
  turnstileOk = false;
  assert.equal((await post('bad')).status, 403, '验证失败应拒绝');
  turnstileOk = true;
  assert.equal((await post('good')).status, 200);
  assert.equal((await post('good')).status, 200);
  assert.equal((await post('good')).status, 429, '超过频率限制');
});

test('管理接口：鉴权、删除、标记垃圾', async () => {
  const repo = memoryRepo();
  const handler = createHandler({ repo, env: BASE_ENV });
  await handler(req('/api/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: '/x', author: 'a', content: 'hi' })
  }));
  const unauth = await handler(req('/api/admin/1', { method: 'DELETE' }));
  assert.equal(unauth.status, 401);
  const del = await handler(req('/api/admin/1', {
    method: 'DELETE', headers: { Authorization: 'Bearer test-admin-token' }
  }));
  assert.equal(del.status, 200);
  assert.equal(repo.rows[0].status, 'deleted');
  const restore = await handler(req('/api/admin/1', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer test-admin-token', 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'approved' })
  }));
  assert.equal(restore.status, 200);
  assert.equal(repo.rows[0].status, 'approved');
});

test('CORS：允许白名单来源，拒绝其他来源', async () => {
  const handler = createHandler({ repo: memoryRepo(), env: BASE_ENV });
  const ok = await handler(req('/api/health', { headers: { Origin: 'https://blog.zuiges.com' } }));
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://blog.zuiges.com');
  const bad = await handler(req('/api/health', { headers: { Origin: 'https://evil.com' } }));
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});
