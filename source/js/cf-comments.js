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
  var turnstileToken = '';
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
      // novalidate：禁用浏览器原生气泡（文案是「请填写此字段。」这类通用话术，
      // 且样式是系统 UI，与主题完全不是一套）。校验全部在 submit() 里自己做。
      '<form class="cfc-form" id="cfc-form" autocomplete="on" novalidate>' +
        '<div class="cfc-row">' +
          '<input type="text" id="cfc-author" name="author" maxlength="40" placeholder="昵称 *">' +
          '<input type="email" id="cfc-email" name="email" maxlength="120" placeholder="邮箱（选填，不公开）">' +
        '</div>' +
        '<div class="cfc-reply-hint" id="cfc-reply-hint" hidden>' +
          '正在回复 <b id="cfc-reply-name"></b> ' +
          '<a href="javascript:void(0)" id="cfc-cancel-reply">取消</a>' +
        '</div>' +
        '<div class="cfc-editor">' +
          '<textarea id="cfc-content" name="content" maxlength="2000" rows="4" ' +
            'placeholder="说点什么吧…（支持 **粗体**、`代码`、[链接](https://…)）"></textarea>' +
          '<div class="cfc-editor-bar">' +
            '<span class="cfc-msg" id="cfc-msg"></span>' +
            '<button type="submit" id="cfc-submit">发表评论</button>' +
          '</div>' +
        '</div>' +
        '<div class="cfc-hidden"><label>网站（请留空）<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
        (SITEKEY ? '<div class="cfc-turnstile" id="cfc-turnstile"></div>' : '') +
      '</form>' +
      '<div class="cfc-list" id="cfc-list"></div>' +
      '<div class="cfc-more-wrap"><button class="cfc-more" id="cfc-more" hidden>加载更多</button></div>';

    document.getElementById('cfc-form').addEventListener('submit', submit);
    // 一开始输入就把红框和错误提示撤掉，不等到下次提交
    document.getElementById('cfc-form').addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('cfc-invalid')) {
        t.classList.remove('cfc-invalid');
      }
      if (!document.querySelector('#cf-comments .cfc-invalid')) setMsg('', false);
    });
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
    var authorEl = document.getElementById('cfc-author');
    var emailEl = document.getElementById('cfc-email');
    var contentEl = document.getElementById('cfc-content');
    var author = authorEl.value.trim();
    var email = emailEl.value.trim();
    var content = contentEl.value.trim();

    // 自建校验：按字段顺序逐项检查，提示直接说清是哪个字段（不用「此字段」）
    clearInvalid();
    if (!author) { markInvalid(authorEl, '请填写昵称'); return; }
    if (email && !isEmail(email)) { markInvalid(emailEl, '邮箱格式好像不对'); return; }
    if (!content) { markInvalid(contentEl, '请填写评论内容'); return; }

    btn.disabled = true;
    btn.textContent = '提交中…';
    try {
      // invisible 模式：提交时才触发验证，拿不到 token 不让提交
      var token = SITEKEY ? await requestToken() : '';
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
      if (window.turnstile && turnstileWidget !== null) {
        turnstileToken = '';
        window.turnstile.reset(turnstileWidget);
      }
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

  // 出错字段描红 + 聚焦，同时清掉其它字段的红框
  function clearInvalid() {
    var els = document.querySelectorAll('#cf-comments .cfc-invalid');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('cfc-invalid');
  }
  function markInvalid(input, msg) {
    clearInvalid();
    if (input) {
      input.classList.add('cfc-invalid');
      try { input.focus({ preventScroll: false }); } catch (_) { input.focus(); }
    }
    setMsg(msg, true);
  }

  function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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
    turnstileToken = '';
    turnstileWidget = window.turnstile.render(box, {
      sitekey: SITEKEY,
      theme: document.documentElement.getAttribute('data-user-color-scheme') === 'dark' ? 'dark' : 'light',
      // 组件在 CF 后台已设为 invisible：不渲染任何界面，提交时再 execute
      execution: 'execute',
      callback: function (t) {
        turnstileToken = t || '';
        if (pendingToken && pendingToken.ok) pendingToken.ok(turnstileToken);
        pendingToken = null;
      },
      'error-callback': function () {
        turnstileToken = '';
        if (pendingToken && pendingToken.fail) pendingToken.fail(new Error('人机验证失败，请刷新页面重试'));
        pendingToken = null;
      },
      'expired-callback': function () { turnstileToken = ''; }
    });
  }

  // 提交时触发不可见验证并等待 token（invisible 模式必须显式 execute）
  var pendingToken = null;
  function requestToken(timeoutMs) {
    if (turnstileToken) return Promise.resolve(turnstileToken);
    if (!window.turnstile || turnstileWidget === null) return Promise.resolve('');
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        pendingToken = null;
        reject(new Error('人机验证超时，请重试'));
      }, timeoutMs || 15000);
      pendingToken = {
        ok: function (t) { if (done) return; done = true; clearTimeout(timer); resolve(t); },
        fail: function (e) { if (done) return; done = true; clearTimeout(timer); reject(e); }
      };
      try {
        window.turnstile.execute(turnstileWidget);
      } catch (err) {
        if (!done) { done = true; clearTimeout(timer); pendingToken = null; reject(err); }
      }
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
