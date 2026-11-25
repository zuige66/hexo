/**
 * 自建评论区前端（配合 cf-worker：Cloudflare Workers + D1）
 * - 无需 GitHub 登录，昵称 + 可选邮箱即可留言
 * - Cloudflare Turnstile 人机验证（在 Worker 端校验）
 * - 兼容软导航：监听 softnav:loaded 重新初始化，不依赖页面刷新
 */
(function () {
  'use strict';

  var API = '';
  var SITEKEY = '';
  var PAGE_SIZE = 20;
  var loaded = {};
  var turnstileWidget = null;
  var turnstileReady = false;
  var replyTo = 0;
  var replyName = '';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 轻量 Markdown：先转义，再处理白名单格式，杜绝 XSS
  function renderMD(text) {
    var s = esc(text);
    s = s.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre><code>' + code.replace(/^\n/, '') + '</code></pre>';
    });
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|\s)\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function timeStr(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function pathNow() {
    return location.pathname.replace(/\/index\.html$/, '') || '/';
  }

  function root() { return document.getElementById('cf-comments'); }

  function init() {
    var el = root();
    if (!el) return;
    if (el.dataset.ready === '1') return;
    el.dataset.ready = '1';

    API = (el.dataset.api || '').replace(/\/+$/, '');
    SITEKEY = el.dataset.sitekey || '';
    PAGE_SIZE = parseInt(el.dataset.pageSize, 10) || 20;
    loaded[pathNow()] = false;

    el.innerHTML =
      '<div class="cfc-head">' +
        '<span class="cfc-title">评论</span>' +
        '<span class="cfc-count" id="cfc-count"></span>' +
      '</div>' +
      '<form class="cfc-form" id="cfc-form" autocomplete="on">' +
        '<div class="cfc-row">' +
          '<input type="text" id="cfc-author" name="author" maxlength="40" placeholder="昵称 *" required>' +
          '<input type="email" id="cfc-email" name="email" maxlength="120" placeholder="邮箱（选填，不公开）">' +
        '</div>' +
        '<div class="cfc-reply-hint" id="cfc-reply-hint" hidden>' +
          '正在回复 <b id="cfc-reply-name"></b> ' +
          '<a href="javascript:void(0)" id="cfc-cancel-reply">取消</a>' +
        '</div>' +
        '<textarea id="cfc-content" name="content" maxlength="2000" rows="4" ' +
          'placeholder="说点什么吧…（支持 **粗体**、`代码`、[链接](https://…)）" required></textarea>' +
        '<div class="cfc-hidden"><label>网站（请留空）<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        (SITEKEY ? '<div class="cfc-turnstile" id="cfc-turnstile"></div>' : '') +
        '<div class="cfc-actions">' +
          '<button type="submit" id="cfc-submit">发表评论</button>' +
          '<span class="cfc-msg" id="cfc-msg"></span>' +
        '</div>' +
      '</form>' +
      '<div class="cfc-list" id="cfc-list"></div>' +
      '<div class="cfc-more-wrap"><button class="cfc-more" id="cfc-more" hidden>加载更多</button></div>';

    document.getElementById('cfc-form').addEventListener('submit', submit);
    document.getElementById('cfc-cancel-reply').addEventListener('click', cancelReply);
    load();
    if (SITEKEY) loadTurnstile();
  }

  // API 是 base（如 https://x.workers.dev 或 /api），path 统一以 /api/ 开头。
  // 当 base 本身已含 /api（同域相对路径方案）时去掉重复前缀，避免 /api/api/comments。
  function apiUrl(path) {
    if (/\/api$/.test(API) && path.indexOf('/api/') === 0) {
      return API + path.slice(4); // '/api/comments...' -> '/comments...'
    }
    return API + path;
  }

  async function api(path, options) {
    var res = await fetch(apiUrl(path), options);
    var data;
    try { data = await res.json(); } catch (_) { throw new Error('服务返回异常'); }
    if (!res.ok) throw new Error(data.error || ('请求失败 ' + res.status));
    return data;
  }

  async function load() {
    var path = pathNow();
    if (loaded[path]) return;
    loaded[path] = true;
    var list = document.getElementById('cfc-list');
    if (!list) return;
    list.innerHTML = '<div class="cfc-loading">加载中…</div>';
    try {
      var data = await api('/api/comments?path=' + encodeURIComponent(path) + '&page=1&limit=' + PAGE_SIZE);
      if (pathNow() !== path) return; // 软导航已切走，丢弃旧结果
      renderList(data.comments || []);
      var count = document.getElementById('cfc-count');
      if (count) count.textContent = data.total ? '(' + data.total + ')' : '';
      var more = document.getElementById('cfc-more');
      if (more) {
        more.hidden = data.page >= data.pages;
        more.onclick = function () { loadMore(path, data.page + 1, data.pages); };
      }
    } catch (err) {
      list.innerHTML = '<div class="cfc-error">评论加载失败：' + esc(err.message) + '</div>';
    }
  }

  async function loadMore(path, page, pages) {
    var btn = document.getElementById('cfc-more');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = '加载中…';
    try {
      var data = await api('/api/comments?path=' + encodeURIComponent(path) + '&page=' + page + '&limit=' + PAGE_SIZE);
      if (pathNow() !== path) return;
      var list = document.getElementById('cfc-list');
      var box = document.createElement('div');
      box.innerHTML = renderItems(data.comments || []);
      while (box.firstChild) list.appendChild(box.firstChild);
      btn.hidden = page >= pages;
      btn.onclick = function () { loadMore(path, page + 1, pages); };
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = '加载更多';
    }
  }

  function renderList(items) {
    var list = document.getElementById('cfc-list');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="cfc-empty">还没有评论，来当第一个吧～</div>';
      return;
    }
    // 一层回复：顶层评论 + 其下的回复
    var roots = items.filter(function (c) { return !c.parentId; });
    var children = {};
    items.forEach(function (c) {
      if (c.parentId) (children[c.parentId] = children[c.parentId] || []).push(c);
    });
    list.innerHTML = renderItems(roots, children);
  }

  function renderItems(items, children) {
    children = children || {};
    return items.map(function (c) {
      var replies = (children[c.id] || []).map(function (r) {
        return itemHTML(r, true);
      }).join('');
      return itemHTML(c, false) + (replies ? '<div class="cfc-replies">' + replies + '</div>' : '');
    }).join('');
  }

  function itemHTML(c, isReply) {
    var initial = esc((c.author || '?').slice(0, 1).toUpperCase());
    var badge = c.source === 'giscus' ? '<span class="cfc-badge">历史留言</span>' : '';
    var avatar = c.avatar
      ? '<img class="cfc-avatar" src="' + esc(c.avatar) + '" alt="">'
      : '<span class="cfc-avatar cfc-avatar-letter">' + initial + '</span>';
    return '<article class="cfc-item' + (isReply ? ' cfc-item-reply' : '') + '" data-id="' + c.id + '">' +
      avatar +
      '<div class="cfc-body">' +
        '<div class="cfc-meta"><b>' + esc(c.author) + '</b>' + badge +
          '<time datetime="' + esc(c.createdAt) + '">' + timeStr(c.createdAt) + '</time></div>' +
        '<div class="cfc-text">' + renderMD(c.content) + '</div>' +
        '<a class="cfc-reply" href="javascript:void(0)" data-id="' + c.id + '" data-name="' + esc(c.author) + '">回复</a>' +
      '</div>' +
    '</article>';
  }

  async function submit(e) {
    e.preventDefault();
    var btn = document.getElementById('cfc-submit');
    var author = document.getElementById('cfc-author').value.trim();
    var email = document.getElementById('cfc-email').value.trim();
    var content = document.getElementById('cfc-content').value.trim();
    if (!author || !content) { setMsg('请填写昵称和内容', true); return; }

    var token = '';
    if (SITEKEY && window.turnstile && turnstileWidget !== null) {
      token = window.turnstile.getResponse(turnstileWidget) || '';
    }
    btn.disabled = true;
    btn.textContent = '提交中…';
    try {
      await api('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: pathNow(),
          author: author,
          email: email,
          content: content,
          parentId: replyTo,
          website: document.querySelector('#cfc-form [name="website"]').value,
          cfToken: token
        })
      });
      document.getElementById('cfc-content').value = '';
      cancelReply();
      if (window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
      setMsg('评论已发表，感谢！', false);
      // 重新拉取第一页，保证新评论可见（含回复层级）
      loaded[pathNow()] = false;
      load();
    } catch (err) {
      setMsg(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = '发表评论';
    }
  }

  function setMsg(text, isError) {
    var msg = document.getElementById('cfc-msg');
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'cfc-msg' + (isError ? ' cfc-msg-error' : '');
  }

  function cancelReply() {
    replyTo = 0;
    replyName = '';
    var hint = document.getElementById('cfc-reply-hint');
    if (hint) hint.hidden = true;
  }

  function loadTurnstile() {
    if (turnstileReady) { renderWidget(); return; }
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = function () {
      turnstileReady = true;
      renderWidget();
    };
    document.head.appendChild(s);
  }

  function renderWidget() {
    var box = document.getElementById('cfc-turnstile');
    if (!box || !window.turnstile) return;
    box.innerHTML = '';
    turnstileWidget = window.turnstile.render(box, {
      sitekey: SITEKEY,
      theme: document.documentElement.getAttribute('data-user-color-scheme') === 'dark' ? 'dark' : 'light',
      callback: function () {}
    });
  }

  // 事件委托：回复按钮（列表会被反复重建）
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.cfc-reply');
    if (!a) return;
    e.preventDefault();
    replyTo = parseInt(a.dataset.id, 10) || 0;
    replyName = a.dataset.name || '';
    var hint = document.getElementById('cfc-reply-hint');
    var name = document.getElementById('cfc-reply-name');
    if (hint && name) {
      name.textContent = replyName;
      hint.hidden = false;
    }
    var content = document.getElementById('cfc-content');
    if (content) content.focus();
  });

  function boot() {
    var el = root();
    if (el) { el.dataset.ready = '0'; init(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // 软导航换页后重新初始化（custom_js 不随 innerHTML 重建）
  document.addEventListener('softnav:loaded', boot);
})();
