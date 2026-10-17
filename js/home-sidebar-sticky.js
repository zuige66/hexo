/* 首页左侧栏吸顶（sticky sidebar）
   效果：左栏先跟页面一起上滚，等「分类」卡片升到固定导航栏下方时锁住不动，
        之后只有右栏继续滚动；往回滚到页面顶部时左栏恢复原位。
   实现：CSS position:sticky 负责吸附，JS 只负责算出 top 的取值：
        top = nav - d（d 是「分类」卡片相对侧栏顶部的距离，
        d > nav 时 top 为负，表示侧栏要先跟滚一段再锁住）。
   兜底：展开「展开全部」后侧栏可能比屏幕还高，「分类以下」放不下，
        此时改为把侧栏底部对齐屏幕底部（top = vh - BOTTOM_GAP - h），
        保证刚展开的标签和最近文章可见。
   红线：绝不给侧栏加内部滚动条（maxHeight + overflow）——内部滚动位置
        残留会让顶部卡片「看起来消失」（2026-10-18 踩过的坑）。
   侧栏高度变化（展开/收起标签）时通过 ResizeObserver 重新计算。 */
(function () {
  var TOP_GAP = 20; // 锁定后与固定导航栏之间的距离
  var BOTTOM_GAP = 20; // 锁定后与屏幕底部预留的距离
  var MOBILE_MAX = 767; // 与 home-sidebar.css 中隐藏左栏的断点保持一致

  function navHeight() {
    var nav = document.querySelector(".navbar");
    if (!nav) return 0;
    var pos = window.getComputedStyle(nav).position;
    return pos === "fixed" || pos === "sticky" ? nav.offsetHeight : 0;
  }

  var ro = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
  var observedEl = null;

  function apply() {
    var sidebar = document.querySelector(".home-sidebar");
    if (!sidebar) return;

    // 侧栏是新建的（软导航换页）或尚未观察过时，重新绑定高度监听
    if (ro && observedEl !== sidebar) {
      ro.disconnect();
      ro.observe(sidebar);
      observedEl = sidebar;
    }

    // 先清掉内联样式，保证测量到的是侧栏的自然高度
    sidebar.style.position = "";
    sidebar.style.top = "";
    sidebar.style.maxHeight = "";
    sidebar.style.overflowY = "";

    // 手机端左栏本来就是隐藏的，不做处理
    if (window.innerWidth <= MOBILE_MAX) return;

    var nav = navHeight() + TOP_GAP;
    var anchor = sidebar.querySelector(".home-sticky-anchor");
    var d = anchor
      ? anchor.getBoundingClientRect().top -
        sidebar.getBoundingClientRect().top
      : 0;
    var h = sidebar.offsetHeight;
    var vh = window.innerHeight;

    var top = nav - d; // 让「分类」卡片正好停在导航栏下方
    if (top + h > vh - BOTTOM_GAP) {
      // 屏幕装不下「分类以下」的内容：改为底部对齐屏幕底部
      top = vh - BOTTOM_GAP - h;
    }

    sidebar.style.position = "sticky";
    sidebar.style.top = top + "px";
  }

  function schedule() {
    if (window.requestAnimationFrame) window.requestAnimationFrame(apply);
    else window.setTimeout(apply, 16);
  }

  window.addEventListener("resize", function () {
    window.clearTimeout(apply._t);
    apply._t = window.setTimeout(schedule, 120);
  });
  window.addEventListener("load", schedule);
  // 软导航（soft-nav.js）换页后首页侧栏是新建的，需要重新计算并重新观察
  document.addEventListener("softnav:loaded", schedule);

  schedule();
})();
