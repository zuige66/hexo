// 评论区 HTTP 逻辑：与具体 D1 实现解耦，便于用内存 repo 做单元测试。

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_AUTHOR = 40;
const MAX_EMAIL = 120;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * @param {object} opts
 * @param {object} opts.repo      数据访问层（list/count/countRecentByIp/insert/find/updateStatus）
 * @param {object} opts.env       Worker 环境变量
 * @param {function} [opts.fetchImpl] 可注入的 fetch（测试用）
 * @param {function} [opts.now]       可注入的时间函数（测试用）
 */
export function createHandler({ repo, env, fetchImpl = fetch, now = () => new Date() }) {
  return async function handle(request) {
    const url = new URL(request.url);

    // 预检
    if (request.method === 'OPTIONS') return preflight(request, env);

    try {
      if (request.method === 'GET' && url.pathname === '/api/comments') {
        return listComments(request, url, repo, env);
      }
      if (request.method === 'POST' && url.pathname === '/api/comments') {
        return postComment(request, repo, env, fetchImpl, now);
      }
      if ((request.method === 'DELETE' || request.method === 'PATCH') &&
          url.pathname.startsWith('/api/admin/')) {
        return moderate(request, url, repo, env);
      }
      if (url.pathname === '/api/health') {
        return json({ ok: true, service: 'zuige-comments' }, 200, request, env);
      }
      return json({ error: 'not found' }, 404, request, env);
    } catch (err) {
      console.error('[comments] error:', err);
      return json({ error: '服务器内部错误' }, 500, request, env);
    }
  };
}

/* ------------------------------ 公开接口 ------------------------------ */

async function listComments(request, url, repo, env) {
  const thread = normalizePath(url.searchParams.get('path') || '');
  if (!thread) return json({ error: '缺少 path 参数' }, 400, request, env);

  const page = clampInt(url.searchParams.get('page'), 1, 1, 100000);
  const limit = clampInt(url.searchParams.get('limit'), 20, 1, 100);
  const [comments, total] = await Promise.all([
    repo.list(thread, limit, (page - 1) * limit),
    repo.count(thread)
  ]);
  return json({
    comments,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit))
  }, 200, request, env);
}

async function postComment(request, repo, env, fetchImpl, now) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: '请求格式错误' }, 400, request, env);
  }

  // 蜜罐：机器人会填这个隐藏字段。假装成功，不入库。
  if (body.website && String(body.website).trim()) {
    return json({ ok: true, id: -1 }, 200, request, env);
  }

  const thread = normalizePath(body.path || '');
  const contentMax = maxContent(env);
  if (String(body.content || '').length > contentMax) {
    return json({ error: `评论内容不能超过 ${contentMax} 字` }, 400, request, env);
  }
  const author = clean(body.author, MAX_AUTHOR);
  const email = clean(body.email, MAX_EMAIL);
  const content = clean(body.content, contentMax);
  const parentId = clampInt(body.parentId, 0, 0, 100000000);

  if (!thread) return json({ error: '页面路径无效' }, 400, request, env);
  if (!author) return json({ error: '请填写昵称（1-40 字）' }, 400, request, env);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: '邮箱格式不正确' }, 400, request, env);
  }
  if (!content) return json({ error: '评论内容不能为空' }, 400, request, env);

  // Turnstile 人机验证：配置了密钥才强制校验（本地开发可不配）
  const secret = String(env.TURNSTILE_SECRET || '');
  if (secret) {
    const ok = await verifyTurnstile(fetchImpl, secret, body.cfToken || '', clientIp(request));
    if (!ok) return json({ error: '人机验证未通过，请重试' }, 403, request, env);
  }

  // 限流：同一 IP 10 分钟内最多 N 条
  const ipHash = await hashIp(clientIp(request), env);
  const since = new Date(now().getTime() - RATE_WINDOW_MS).toISOString();
  const recent = await repo.countRecentByIp(ipHash, since);
  const rateLimit = clampInt(env.RATE_LIMIT, 5, 1, 100);
  if (recent >= rateLimit) {
    return json({ error: '提交太频繁，请 10 分钟后再试' }, 429, request, env);
  }

  const id = await repo.insert({
    thread,
    parentId,
    author,
    email,
    content,
    avatar: '',
    ipHash,
    createdAt: now().toISOString()
  });

  return json({ ok: true, id }, 200, request, env);
}

/* ------------------------------ 管理接口 ------------------------------ */

async function moderate(request, url, repo, env) {
  const token = String(env.MODERATION_TOKEN || '');
  if (!token) return json({ error: '未启用管理接口' }, 503, request, env);
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${token}`) return json({ error: 'unauthorized' }, 401, request, env);

  const id = Number(url.pathname.split('/').pop());
  if (!Number.isInteger(id) || id <= 0) return json({ error: '无效 id' }, 400, request, env);
  const row = await repo.find(id);
  if (!row) return json({ error: '评论不存在' }, 404, request, env);

  if (request.method === 'DELETE') {
    await repo.updateStatus(id, 'deleted');
    return json({ ok: true }, 200, request, env);
  }
  const body = await request.json().catch(() => ({}));
  const status = ['approved', 'spam'].includes(body.status) ? body.status : '';
  if (!status) return json({ error: 'status 只能是 approved 或 spam' }, 400, request, env);
  await repo.updateStatus(id, status);
  return json({ ok: true, status }, 200, request, env);
}

/* ------------------------------ 工具函数 ------------------------------ */

/** 统一路径格式：解码 → 去 query/hash → 前导斜杠 → 去掉 index.html → 去尾部斜杠（根除外） */
export function normalizePath(raw) {
  let p = String(raw || '').trim();
  if (!p) return '';
  try { p = decodeURIComponent(p); } catch (_) { /* 保留原样 */ }
  p = p.split(/[?#]/)[0];
  if (!p.startsWith('/')) p = '/' + p;
  if (/\/index\.html$/.test(p)) p = p.replace(/\/index\.html$/, '') || '/';
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (p.length > 300) return '';
  if (p.includes('..')) return '';
  return p;
}

function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\r\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}

function clampInt(raw, fallback, min, max) {
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function maxContent(env) {
  return clampInt(env.MAX_CONTENT_LENGTH, 2000, 100, 10000);
}

function clientIp(request) {
  return (request.headers.get('cf-connecting-ip') ||
          request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
}

async function hashIp(ip, env) {
  const salt = String(env.TURNSTILE_SECRET || env.MODERATION_TOKEN || 'zuige-comments');
  const data = new TextEncoder().encode(salt + '|' + ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function verifyTurnstile(fetchImpl, secret, token, remoteip) {
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (remoteip) form.set('remoteip', remoteip);
  const res = await fetchImpl(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body: form,
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  if (!data.success) return false;
  const host = String(envHostname() || '');
  if (host && data.hostname && data.hostname !== host) return false;
  return true;
}

function envHostname() { return null; } // 预留：如需校验 hostname 可在此接 env

function preflight(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request, env)
    }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin && (!allowed.length || allowed.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
