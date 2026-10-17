/* 首页左侧栏吸顶（sticky sidebar）
   效果：左栏先跟页面一起上滚，等「分类」卡片升到固定导航栏下方时锁住不动，
        之后只有右栏继续滚动。
   实现：CSS position:sticky 负责吸附，JS 只负责算出 top 的取值。
   计算：要让「分类」卡片停在导航栏下方 nav 处，则侧栏 top = nav - d，
        其中 d 是「分类」卡片相对侧栏顶部的距离（d > nav 时 top 为负值，
        表示侧栏要先跟着往上滚一段再锁住）。
   兜底：屏幕高度放不下「分类以下」的内容时，退化为「整体吸顶 + 左栏内部滚动」，
        保证底部内容（最近文章）仍然看得到。 */
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

  function apply() {
    var sidebar = document.querySelector(".home-sidebar");
    if (!sidebar) return;

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
    if (top > vh - h - BOTTOM_GAP) {
      // 高度不够：整体吸顶，并允许左栏内部滚动
      top = nav;
      sidebar.style.maxHeight = Math.max(160, vh - top - BOTTOM_GAP) + "px";
      sidebar.style.overflowY = "auto";
    }

    sidebar.style.position = "sticky";
    sidebar.style.top = top + "px";
  }

  function schedule() {
    if (window.requestAnimationFrame) window.requestAnimationFrame(apply);
    else window.setTimeout(apply, 16);
  }

  var timer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(schedule, 120);
  });
  window.addEventListener("load", schedule);
  // 软导航（soft-nav.js）换页后首页侧栏是新建的，需要重新计算
  document.addEventListener("softnav:loaded", schedule);

  schedule();
})();
