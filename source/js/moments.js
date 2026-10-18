/**
 * 归档页视图切换：文章归档 <-> 动态
 *
 * 两个视图的 DOM 由 themes/fluid/layout/_partials/archive-list.ejs 一次性渲染，
 * 这里只负责显隐切换与 URL hash 同步（#moments）。
 *
 * 注意：软导航（soft-nav）换入 #board 后内联 <script> 不会执行，所以这里用
 * document 级事件委托绑定点击，并监听 soft-nav 派发的 softnav:loaded 重新初始化。
 */
(function () {
  'use strict';

  var TABS = ['posts', 'moments'];
  var BTN_SEL = '.archive-tab';

  function apply(tab) {
    var btns = document.querySelectorAll(BTN_SEL);
    if (!btns.length) return;
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-archive-tab') === tab;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (var j = 0; j < TABS.length; j++) {
      var panel = document.getElementById('archive-panel-' + TABS[j]);
      if (panel) panel.hidden = TABS[j] !== tab;
    }
  }

  function fromHash() {
    var h = (location.hash || '').replace('#', '');
    return TABS.indexOf(h) >= 0 ? h : 'posts';
  }

  function init() {
    apply(fromHash());
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var btn = t.closest(BTN_SEL);
    if (!btn) return;
    var tab = btn.getAttribute('data-archive-tab');
    if (!tab || TABS.indexOf(tab) < 0) return;
    apply(tab);
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
