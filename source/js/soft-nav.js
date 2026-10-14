/**
 * 无刷新换页（软导航）——让云间列车 banner 的 canvas 跨页面存活，
 * 消除整页刷新导致的「静态头图闪现 + shader 重新编译」卡顿，实现火车画面无缝衔接。
 *
 * 设计:
 *  - 拦截站内「非文章页」链接，fetch 后仅替换 #board 正文区，#banner/canvas 原样保留
 *  - 文章页（/年/月/日/标题/）仍走整页加载（含评论/MathJax，需完整初始化）
 *  - 支持前进/后退（popstate）；任何异常自动回退为真实导航，保证可用性
 *  - 同页链接仅平滑回顶；外链/新标签/下载/锚点/modifier 点击一律放行
 */
(function () {
  'use strict';

  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;

  var board = null;
  var busy = false;
  var POST_RE = /^\/\d{4}\/\d{2}\//; // Hexo permalink: :year/:month/:day/:title/
  var SKIP_RE = /^(mailto:|tel:|javascript:)/i;

  // 注入正文淡入样式（尊重系统减弱动效）
  var style = document.createElement('style');
  style.textContent =
    '#board.softnav-in{animation:softnavFade .22s ease both;}' +
    '@keyframes softnavFade{from{opacity:.15}to{opacity:1}}' +
    '@media (prefers-reduced-motion: reduce){#board.softnav-in{animation:none}}';
  (document.head || document.documentElement).appendChild(style);

  function getPath(href) {
    try { return new URL(href, location.href).pathname.replace(/index\.html$/, ''); }
    catch (e) { return ''; }
  }
  function normPath(p) { return p.length > 1 ? p.replace(/\/$/, '') : p; }

  function updateActiveNav(pathname) {
    var navWrap = document.getElementById('navbarSupportedContent');
    if (!navWrap) return;
    var p = normPath(pathname);
    var links = navWrap.querySelectorAll('a.nav-link');
    for (var i = 0; i < links.length; i++) {
      var lp = normPath(getPath(links[i].getAttribute('href') || ''));
      if (!lp) continue;
      // 精确匹配，或目录型导航（/tags/ /categories/ /archives/）按前缀命中
      var active = (lp === p) || (lp !== '/' && p.indexOf(lp) === 0);
      links[i].classList.toggle('active', active);
    }
  }

  // 同步 banner 外观：不同页面 banner 高度/遮罩/背景图可能不同，
  // 软导航时从目标页文档复制这些行内样式，避免高度残留导致的跳动
  function syncBannerChrome(doc) {
    // banner 高度（.header-inner 的 inline height，如 "80vh"）
    var fromH = doc.querySelector('.header-inner');
    var toH = document.querySelector('.header-inner');
    if (fromH && toH && fromH.style.height) toH.style.height = fromH.style.height;
    // 黑色遮罩透明度
    var fromM = doc.querySelector('#banner .mask');
    var toM = document.querySelector('#banner .mask');
    if (fromM && toM && fromM.style.backgroundColor) toM.style.backgroundColor = fromM.style.backgroundColor;
    // 背景图（各页 banner_img 可能不同）
    var fromB = doc.querySelector('#banner');
    var toB = document.querySelector('#banner');
    if (fromB && toB && fromB.style.backgroundImage) toB.style.backgroundImage = fromB.style.backgroundImage;
  }

  function softLoad(url, push) {
    if (busy) return;
    busy = true;
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nb = doc.getElementById('board');
        if (!nb) throw new Error('no board in response');
        if (!board) throw new Error('no current board');
        // 只换正文；banner 与 WebGL canvas 原样保留，动画不中断
        board.innerHTML = nb.innerHTML;
        if (doc.title) document.title = doc.title;
        var ns = doc.getElementById('subtitle');
        var cs = document.getElementById('subtitle');
        if (ns && cs) {
          cs.innerHTML = ns.innerHTML;
          // 同步打字文本属性，避免 data-typed-text 残留旧页文本
          if (ns.hasAttribute('data-typed-text')) {
            cs.setAttribute('data-typed-text', ns.getAttribute('data-typed-text'));
          }
        }
        syncBannerChrome(doc);
        updateActiveNav(getPath(url));
        window.scrollTo(0, 0);
        board.classList.remove('softnav-in');
        void board.offsetWidth; // 重启动画
        board.classList.add('softnav-in');
        if (push) history.pushState({ softnav: true }, '', url);
        var canvasAlive = document.getElementById('cloud-sea-canvas') ? 'canvas-alive' : 'canvas-gone';
        console.log('[soft-nav] loaded ' + url + ' (' + canvasAlive + ')');
        document.dispatchEvent(new CustomEvent('softnav:loaded', { detail: { url: url } }));
      })
      .catch(function (err) {
        console.warn('[soft-nav] 回退整页导航:', err && err.message);
        window.location.href = url;
      })
      .then(function () { busy = false; });
  }

  function init() {
    board = document.getElementById('board');
    if (!board) return;

    // 事件委托：捕获所有站内非文章页链接点击
    document.addEventListener('click', function (e) {
      if (busy || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      var a = t.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (a.target === '_blank' || a.hasAttribute('download') || SKIP_RE.test(href)) return;
      var url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.hash) return;
      if (POST_RE.test(url.pathname)) return; // 文章页整页加载
      // 同页点击 → 仅平滑回顶
      if (url.pathname === location.pathname && url.search === location.search) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      e.preventDefault();
      softLoad(url.href, true);
    });

    // 前进/后退
    window.addEventListener('popstate', function () {
      if (POST_RE.test(location.pathname)) { window.location.reload(); return; }
      softLoad(location.href, false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
