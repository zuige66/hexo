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
