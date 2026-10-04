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

  function getSearchKeywords() {
    var query = new URLSearchParams(window.location.search).get('q');
    if (!query) return [];
    return query.trim().split(/[\s-]+/).filter(Boolean);
  }

  function findFirstSearchMatch(root, keywords) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent || parent.closest('script, style, noscript, .search-hit')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      var lowerText = text.toLocaleLowerCase();
      var matchIndex = -1;
      var matchLength = 0;
      keywords.forEach(function (keyword) {
        var index = lowerText.indexOf(keyword.toLocaleLowerCase());
        if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
          matchIndex = index;
          matchLength = keyword.length;
        }
      });
      if (matchIndex !== -1) return { node: node, index: matchIndex, length: matchLength };
    }
    return null;
  }

  function highlightSearchMatch() {
    var keywords = getSearchKeywords();
    var article = document.querySelector('.post-content');
    if (!article || keywords.length === 0) return;

    var match = findFirstSearchMatch(article, keywords);
    if (!match) return;

    var text = match.node.nodeValue;
    var before = document.createTextNode(text.slice(0, match.index));
    var hit = document.createElement('mark');
    hit.className = 'search-hit';
    hit.textContent = text.slice(match.index, match.index + match.length);
    hit.setAttribute('tabindex', '-1');
    var after = document.createTextNode(text.slice(match.index + match.length));
    var parent = match.node.parentNode;
    parent.insertBefore(before, match.node);
    parent.insertBefore(hit, match.node);
    parent.insertBefore(after, match.node);
    parent.removeChild(match.node);

    window.requestAnimationFrame(function () {
      var navbar = document.querySelector('#navbar');
      var offset = (navbar ? navbar.getBoundingClientRect().height : 0) + 24;
      var targetTop = hit.getBoundingClientRect().top + window.scrollY - offset;
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: reduceMotion ? 'auto' : 'smooth' });
      hit.focus({ preventScroll: true });
    });
  }

  highlightSearchMatch();
})();
