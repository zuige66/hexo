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
})();
