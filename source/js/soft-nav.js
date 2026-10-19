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
    // 滚动箭头：仅 banner ≥80vh 的页面（首页）由 banner.ejs 渲染该元素，
    // 软导航后残留会让 60vh 页面在 banner 底部露出箭头；按目标页有无进行增删
    var fromArrow = doc.querySelector('#banner .scroll-down-bar');
    var toArrow = document.querySelector('#banner .scroll-down-bar');
    if (!fromArrow && toArrow) {
      toArrow.remove();
    } else if (fromArrow && !toArrow) {
      var mask = document.querySelector('#banner .mask');
      if (mask) {
        var arrow = document.importNode(fromArrow, true);
        mask.appendChild(arrow);
        // events.js 仅在整页加载时绑定点击，克隆出的箭头需补绑
        // （行为对齐 registerScrollDownArrowEvent：滚动到 board 顶部并避开导航栏）
        arrow.addEventListener('click', function () {
          var target = document.getElementById('board');
          if (!target) return;
          var navbar = document.getElementById('navbar');
          var offset = navbar ? navbar.getBoundingClientRect().height : 0;
          var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
      }
    }
  }

  // 软导航只替换 #board 的 innerHTML，而 img-lazyload.js 只在整页加载时扫描一次
  // img[lazyload]，不会处理换入的节点。换入内容里的图片（如友链头像、其他页面配图）
  // 仍带着 srcset=loading.gif + lazyload，真图藏在 src 中无法显示。这里复用 Fluid 的
  // 懒加载逻辑对换入的图片重新登记，使其在可见时移除 srcset、露出真图。
  function processLazyImages(root) {
    if (!root) return;
    var imgs = root.querySelectorAll('img[lazyload]');
    if (!imgs.length) return;
    var factor = (window.CONFIG && CONFIG.lazyload && typeof CONFIG.lazyload.offset_factor === 'number')
      ? CONFIG.lazyload.offset_factor : 0;
    for (var i = 0; i < imgs.length; i++) {
      (function (el) {
        if (window.Fluid && Fluid.utils && typeof Fluid.utils.waitElementVisible === 'function') {
          Fluid.utils.waitElementVisible(el, function () {
            el.removeAttribute('srcset');
            el.removeAttribute('lazyload');
          }, factor);
        } else {
          // Fluid 不可用时的兜底：直接露出真图
          el.removeAttribute('srcset');
          el.removeAttribute('lazyload');
        }
      })(imgs[i]);
    }
  }

  // innerHTML 替换后，新内容里的 <script> 不会自动执行（浏览器行为）。
  // 软导航进入友链页时 circle-feed.js 不跑 → 只有标题没卡片，必须硬刷新才恢复。
  // 这里重建 script 节点触发执行（src 外部脚本与内联脚本都支持）。
  function rerunScripts(root) {
    if (!root) return;
    var scripts = root.querySelectorAll('script');
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      if (old.hasAttribute('data-softnav-exec')) continue;
      var s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        var a = old.attributes[j];
        if (a.name === 'data-softnav-exec') continue;
        s.setAttribute(a.name, a.value);
      }
      s.textContent = old.textContent;
      old.setAttribute('data-softnav-exec', '1');
      old.parentNode.replaceChild(s, old);
    }
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
        // innerHTML 不会执行新内容里的 <script>，重建执行，否则依赖 JS 的页面
        // （如友链朋友圈 circle-feed.js）软导航进入时是空的，须硬刷新才恢复
        rerunScripts(board);
        // 换入的新内容里的图片需重新登记懒加载（见 processLazyImages 注释），
        // 否则友链头像等会永远停在 loading.gif
        processLazyImages(board);
        // 同步 board 行内 margin：首页（100vh + parallax）由 layout.ejs 渲染
        // style="margin-top: 0"，只换 innerHTML 会把它残留到 60vh 页面，
        // 导致内容卡片不凸起、与 banner 呈上下拼接
        if (nb.style.marginTop) {
          board.style.marginTop = nb.style.marginTop;
        } else {
          board.style.removeProperty('margin-top');
        }
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
