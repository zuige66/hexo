/**
 * 悬停位移滤波（hover-intent）
 *
 * 背景：纯 CSS 的 `:hover { transform: translateY(-7px) }` 会产生几何反馈环——
 * 鼠标停在卡片下边缘 → 卡片上浮脱离鼠标 → hover 失效下沉 → 鼠标又进入 → 无限抖动。
 *
 * 做法：位移不再由 :hover 直接驱动，改由本脚本加的 `.is-hovered` 类驱动：
 *  1. 事件委托（document 上），软导航换页重建 DOM 后无需重新绑定；
 *  2. 进入延迟 80ms、离开延迟 140ms，滤掉快速掠过造成的闪烁；
 *  3. 离开到期时复查指针是否仍在「扩展命中区」内（四边各放宽 12px，
 *     大于最大 7px 上浮位移）——只要没真正走远就保持悬停态，根治边缘反馈环；
 *  4. 键盘 :focus-visible 仍由 CSS 直接驱动位移，不经过本脚本，保证无障碍可达。
 *
 * 仅在精确指针设备（鼠标）启用；触屏与 reduced-motion 不注入位移类。
 */
(function () {
  'use strict';

  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // 与 site-motion.css / moments.css 里 .is-hovered 的选择器保持一致
  var LIFT_SELECTOR = [
    '.home-post-list .index-card',
    '.list-group-item:not(.category-item):not(.category-subitem)',
    '.category-heading-row',
    '.links .card',
    '.links .card .link-rss',
    '.home-social-links a',
    '.about-icons a',
    '.pagination a',
    '.btn',
    'button',
    '.scroll-down-bar',
    '#scroll-top-button',
    '.home-taxonomy-list a',
    '.home-recent-list a',
    '.tocbot-link',
    '.feed-card',
    '.circle-feed-toggle'
  ].join(', ');

  var ENTER_DELAY = 80;
  var LEAVE_DELAY = 140;
  var EDGE_TOLERANCE = 12; // 大于任何上浮位移（当前最大 3.5px），留足边缘滞后余量

  var active = null;
  var enterTimer = 0;
  var leaveTimer = 0;
  var pointerX = -1;
  var pointerY = -1;

  function liftTarget(node) {
    if (!(node instanceof Element)) return null;
    return node.closest(LIFT_SELECTOR);
  }

  function clearEnter() {
    if (enterTimer) { clearTimeout(enterTimer); enterTimer = 0; }
  }
  function clearLeave() {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; }
  }

  function setActive(el) {
    if (active === el) return;
    if (active) active.classList.remove('is-hovered');
    active = el && el.isConnected ? el : null;
    if (active) active.classList.add('is-hovered');
  }

  // 指针是否仍在元素扩展命中区内（含上浮位移容差）
  function pointerStillNear(el, x, y) {
    if (!el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return x >= r.left - EDGE_TOLERANCE &&
           x <= r.right + EDGE_TOLERANCE &&
           y >= r.top - EDGE_TOLERANCE &&
           y <= r.bottom + EDGE_TOLERANCE;
  }

  document.addEventListener('mousemove', function (e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }, { passive: true });

  document.addEventListener('mouseover', function (e) {
    var t = liftTarget(e.target);
    if (!t) return;
    clearLeave();                 // 进入任何目标：取消离开计划
    if (active === t) return;
    clearEnter();
    var el = t;
    enterTimer = setTimeout(function () {
      enterTimer = 0;
      setActive(el);
    }, ENTER_DELAY);
  });

  document.addEventListener('mouseout', function (e) {
    if (!active) return;
    if (active.contains(e.relatedTarget)) return; // 在元素内部（含子元素）移动，忽略
    clearEnter();
    clearLeave();
    var el = active;
    leaveTimer = setTimeout(function check() {
      leaveTimer = 0;
      // 到期复查：指针没真正走远就保持悬停态，避免卡片上浮/下沉反复横跳
      if (pointerStillNear(el, pointerX, pointerY)) {
        leaveTimer = setTimeout(check, LEAVE_DELAY);
        return;
      }
      if (active === el) setActive(null);
    }, LEAVE_DELAY);
  });

  // 指针离开文档（切窗口/移出浏览器）时立即复位
  document.addEventListener('mouseleave', function () {
    clearEnter();
    clearLeave();
    setActive(null);
  });
})();
