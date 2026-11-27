/* 友链页「复制本站信息 / 复制申请模板」按钮。
   内容来源：
     data-copy="self" → 同 section 内 .links-info-row 的「键：值」逐行拼装
     data-copy="tpl"  → 同 section 内 .links-tpl 的纯文本
   软导航（soft-nav.js）换页时会重建 <script> 重跑本文件，
   所以用元素级标记防重复绑定，而不是全局变量。 */
(function () {
  var BOUND = 'data-links-copy-bound';
  var RESET_DELAY = 1600;

  function collectText(btn) {
    var panel = btn.closest('.links-panel');
    if (!panel) return '';
    var mode = btn.getAttribute('data-copy');

    if (mode === 'tpl') {
      var pre = panel.querySelector('.links-tpl');
      return pre ? pre.textContent.replace(/\s+$/, '') : '';
    }

    var rows = panel.querySelectorAll('.links-info-row');
    var lines = [];
    Array.prototype.forEach.call(rows, function (row) {
      var key = row.querySelector('.links-info-key');
      var value = row.querySelector('.links-info-value');
      if (key && value) {
        lines.push(key.textContent.trim() + '：' + value.textContent.trim());
      }
    });
    return lines.join('\n');
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copy(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function flash(btn) {
    var label = btn.querySelector('span');
    if (!label) return;
    if (!btn.hasAttribute('data-label')) {
      btn.setAttribute('data-label', label.textContent);
    }
    if (btn.__resetTimer) clearTimeout(btn.__resetTimer);
    label.textContent = '已复制';
    btn.classList.add('is-copied');
    btn.__resetTimer = setTimeout(function () {
      label.textContent = btn.getAttribute('data-label');
      btn.classList.remove('is-copied');
      btn.__resetTimer = null;
    }, RESET_DELAY);
  }

  function bind(btn) {
    if (btn.hasAttribute(BOUND)) return;
    btn.setAttribute(BOUND, '1');
    btn.addEventListener('click', function () {
      copy(collectText(btn)).then(function (ok) {
        if (ok) flash(btn);
      });
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('.links-copy'),
    bind
  );
})();
