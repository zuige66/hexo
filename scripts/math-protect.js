'use strict';

/*
 * LaTeX 公式保护（配合 Fluid 主题的 MathJax）
 *
 * 背景：本站用的是 hexo-renderer-marked。Fluid 的 MathJax 是在【浏览器端】扫描
 * HTML 里的 `$...$` / `$$...$$` 再做排版，但 marked 会先把公式内容当普通 Markdown
 * 处理：`x_1` 变成 `x<em>1</em>`、`\begin{cases}` 里的 `\\` 被吃掉一个反斜杠、
 * `*` 被当成斜体标记……等 MathJax 拿到时公式已经被破坏，页面上就是一堆乱码。
 *
 * 做法（Hexo 社区标准的「protect & restore」）：
 *   before_post_render：把公式替换成纯字母数字占位符（marked 不会动它）；
 *   marked 渲染成 HTML；
 *   after_post_render：把占位符换回原始 LaTeX，并把 < > & 转成 HTML 实体，
 *   这样浏览器解析后 textContent 恰好是原始公式，MathJax 才能正确 typeset。
 *
 * 为什么可以挂在 data 上传递：Hexo 8 的 hexo/dist/hexo/post.js 里
 * before_post_render 与 after_post_render 用的是同一个 data 对象。
 *
 * 生效范围：只对 front-matter 里写了 `math: true` 的文章、或确实含块级公式的文章
 * 生效；其余 17 篇旧文章的渲染结果完全不变。配合 _config.fluid.yml 的
 * `post.math.specific: true`，MathJax 脚本也只在本文加载，不影响全站性能。
 *
 * 注意：占位符必须是纯字母数字，不能含 $ \ _ * { } 等 Markdown / Nunjucks 敏感字符。
 */

const PREFIX = 'CMCMATHPROTECT';
const SUFFIX = 'ENDCMCMATH';
const PLACEHOLDER_RE = new RegExp(PREFIX + '(\\d+)' + SUFFIX, 'g');

function escapeForHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

hexo.extend.filter.register('before_post_render', function (data) {
  const content = data.content || '';

  // 没开 math 且不含块级公式的文章直接跳过，保证零副作用
  if (data.math !== true && !/\$\$[\s\S]+?\$\$/.test(content)) return data;

  const store = [];

  // 先保护可跨行的块级公式，再保护单行行内公式，避免 $$ 被 $...$ 规则切碎
  let protectedContent = content.replace(/\$\$([\s\S]+?)\$\$/g, function (match) {
    return PREFIX + (store.push(match) - 1) + SUFFIX;
  });

  protectedContent = protectedContent.replace(/\$([^\n$]+?)\$/g, function (match) {
    return PREFIX + (store.push(match) - 1) + SUFFIX;
  });

  data._cmcMathStore = store;
  data.content = protectedContent;
  return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
  const store = data._cmcMathStore;
  if (!store || !store.length) return data;

  data.content = data.content.replace(PLACEHOLDER_RE, function (match, index) {
    const original = store[Number(index)];
    return original === undefined ? match : escapeForHtml(original);
  });

  delete data._cmcMathStore;
  return data;
});
