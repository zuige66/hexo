/**
 * 视图切换：文章 <-> 动态
 *
 * 用于两处，通过按钮的 data-tabs-group 区分（互不干扰）：
 *   - archive 归档页（/archives/）：文章归档 <-> 动态
 *   - home    首页右栏：文章 <-> 动态
 *
 * DOM 由模板一次性渲染（archive-list.ejs / index.ejs），这里只负责显隐切换与
 * URL hash 同步（#moments，两处通用，便于分享深链）。
 *
 * 注意：软导航（soft-nav）换入 #board 后内联 <script> 不会执行，所以这里用
 * document 级事件委托绑定点击，并监听 soft-nav 派发的 softnav:loaded 重新初始化。
 */
(function () {
  'use strict';

  var TABS = ['posts', 'moments'];
  var GROUPS = ['archive', 'home'];
  var BTN_SEL = '.archive-tab';

  function apply(tab, group) {
    var btns = document.querySelectorAll(BTN_SEL + '[data-tabs-group="' + group + '"]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-archive-tab') === tab;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (var j = 0; j < TABS.length; j++) {
      var panel = document.getElementById(group + '-panel-' + TABS[j]);
      if (panel) panel.hidden = TABS[j] !== tab;
    }
  }

  function fromHash() {
    var h = (location.hash || '').replace('#', '');
    return TABS.indexOf(h) >= 0 ? h : 'posts';
  }

  function init() {
    var tab = fromHash();
    for (var g = 0; g < GROUPS.length; g++) {
      apply(tab, GROUPS[g]);
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var btn = t.closest(BTN_SEL);
    if (!btn) return;
    var tab = btn.getAttribute('data-archive-tab');
    if (!tab || TABS.indexOf(tab) < 0) return;
    var group = btn.getAttribute('data-tabs-group') || 'archive';
    apply(tab, group);
    // 用 replaceState 同步 hash，避免污染浏览器前进/后退历史
    if (history.replaceState) {
      history.replaceState(history.state, '', tab === 'posts'
      ? location.pathname + location.search
        : '#moments');
    }
  });

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('softnav:loaded', init);

  window.MomentsTabs = { init: init, apply: apply };
})();

/**
 * 动态配图轮播 + 点击放大
 *
 * DOM 由 themes/fluid/layout/_partials/moment-carousel.ejs 一次性渲染，
 * 样式在 source/css/moments.css 的「动态配图轮播」段。
 *
 * 三个必须知道的点：
 *   1) 懒加载：Fluid 的 img-lazyload.js 给图片挂 `srcset=loading.gif lazyload`，
 *      靠 IntersectionObserver 等到可见才摘掉。轮播里除第一张外全是 display:none，
 *      永远等不到回调 —— 所以初始化时必须主动摘掉这两个属性，否则切到第 2 张
 *      会一直显示 loading.gif。
 *   2) 事件委托：软导航（soft-nav）换 #board 后内联 <script> 不执行，只有 document
 *      级委托能继续工作；新 DOM 只需要重新跑一遍 stripLazyload。
 *   3) 状态存 DOM（data-index + .is-active），不存 JS 变量，软导航换页后不会串味。
 */
(function () {
  'use strict';

  var ROOT = '.moment-carousel';
  var SWIPE_MIN = 45;

  function slidesOf(box) {
    return box.querySelectorAll('.moment-slide');
  }

  function currentIndex(box) {
    var n = parseInt(box.getAttribute('data-index'), 10);
    return isNaN(n) ? 0 : n;
  }

  function show(box, index) {
    var slides = slidesOf(box);
    if (!slides.length) return;
    var total = slides.length;
    var i = ((index % total) + total) % total;   // 循环取模

    for (var k = 0; k < total; k++) {
      slides[k].classList.toggle('is-active', k === i);
    }
    var dots = box.querySelectorAll('.moment-carousel-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('is-active', d === i);
    }
    var cur = box.querySelector('.moment-carousel-count .cur');
    if (cur) cur.textContent = String(i + 1);

    box.setAttribute('data-index', String(i));
  }

  function stripLazyload(img) {
    if (img.hasAttribute('lazyload')) img.removeAttribute('lazyload');
    if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
  }

  function initCarousels() {
    var boxes = document.querySelectorAll(ROOT);
    for (var i = 0; i < boxes.length; i++) {
      var imgs = boxes[i].querySelectorAll('img');
      for (var j = 0; j < imgs.length; j++) stripLazyload(imgs[j]);
      if (!boxes[i].hasAttribute('data-index')) {
        boxes[i].setAttribute('data-index', '0');
      }
    }
  }

  /* ---------- 灯箱 ---------- */
  var lightbox = null;

  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement('div');
    lightbox.className = 'moment-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.innerHTML = '<button class="moment-lightbox-close" type="button" aria-label="关闭">×</button><img alt="">';
    document.body.appendChild(lightbox);

    lightbox.addEventListener('click', function (e) {
      var t = e.target;
      // 点图片本身不关，点背景或关闭按钮才关
      if (t === lightbox || (t.classList && t.classList.contains('moment-lightbox-close'))) {
        closeLightbox();
      }
    });
    return lightbox;
  }

  function openLightbox(src, alt) {
    if (!src) return;
    var lb = ensureLightbox();
    var img = lb.querySelector('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', alt || '');
    lb.classList.add('is-open');
    document.body.classList.add('moment-lightbox-open');
    var btn = lb.querySelector('.moment-lightbox-close');
    if (btn) btn.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('moment-lightbox-open');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) closeLightbox();
  });

  /* ---------- 点击：委托到 document ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    var box = t.closest(ROOT);
    if (!box) return;

    if (t.closest('.moment-carousel-btn.prev')) {
      show(box, currentIndex(box) - 1);
      return;
    }
    if (t.closest('.moment-carousel-btn.next')) {
      show(box, currentIndex(box) + 1);
      return;
    }
    var dot = t.closest('.moment-carousel-dot');
    if (dot) {
      show(box, parseInt(dot.getAttribute('data-to'), 10) || 0);
      return;
    }
    if (t.tagName === 'IMG' && t.closest('.moment-slide')) {
      openLightbox(t.getAttribute('src'), t.getAttribute('alt'));
    }
  });

  /* ---------- 触屏左右滑动 ---------- */
  var touchStartX = 0;
  var touchStartY = 0;
  var touchBox = null;

  document.addEventListener('touchstart', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var box = t.closest(ROOT);
    if (!box || !e.touches || !e.touches.length) return;
    touchBox = box;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!touchBox || !e.changedTouches || !e.changedTouches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    // 横向位移够大、且明显大于纵向，才算切换（否则是在纵向滚页面）
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(touchBox, currentIndex(touchBox) + (dx < 0 ? 1 : -1));
    }
    touchBox = null;
  }, { passive: true });

  document.addEventListener('DOMContentLoaded', initCarousels);
  document.addEventListener('softnav:loaded', initCarousels);

  window.MomentsCarousel = { init: initCarousels, show: show };
})();
