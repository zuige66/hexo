(function () {
  'use strict';

  function getScrollableCodeBlock(target) {
    if (!(target instanceof Element)) return null;
    return target.closest('figure.highlight, .code-wrapper pre, .markdown-body > pre');
  }

  document.addEventListener('wheel', function (event) {
    var block = getScrollableCodeBlock(event.target);
    if (!block || block.scrollWidth <= block.clientWidth + 1) return;

    var delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
    if (!delta) return;

    var maxScrollLeft = block.scrollWidth - block.clientWidth;
    var atStart = block.scrollLeft <= 0 && delta < 0;
    var atEnd = block.scrollLeft >= maxScrollLeft - 1 && delta > 0;

    // 到达代码的左右边缘后，不拦截滚轮，让页面继续上下滚动。
    if (atStart || atEnd) return;

    event.preventDefault();
    block.scrollLeft += delta;
  }, { passive: false });

  function isInteractiveTarget(target) {
    return target.closest('a, button, input, select, textarea, summary, [role="button"]');
  }

  function openPostCard(card) {
    var url = card.dataset.postUrl;
    if (url) window.location.assign(url);
  }

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    var card = event.target.closest('.home-post-list .index-card[data-post-url]');
    if (!card || isInteractiveTarget(event.target)) return;
    openPostCard(card);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;
    var card = event.target.closest('.home-post-list .index-card[data-post-url]');
    if (!card || event.target !== card) return;
    event.preventDefault();
    openPostCard(card);
  });
})();
