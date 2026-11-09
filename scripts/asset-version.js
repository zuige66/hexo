'use strict';

/*
 * 静态资源版本号自动化（cache busting）
 *
 * 背景：_config.fluid.yml 的 custom_css / custom_js、links.ejs 里的 circle-feed.js
 * 原本都靠手写 `?v=N`。忘记 bump 时 URL 不变，Cloudflare 对静态资源有
 * Cache-Control: max-age=14400（4 小时），浏览器也会继续用旧副本，表现为「改了没生效」；
 * 而 Hexo 增量生成只按源文件 hash 判重渲染，改主题配置后部分页面甚至不会重新生成。
 *
 * 做法：注册 after_render:html filter（模板渲染完、写盘前的最后一步），
 *   把站内 /css/、/js/ 资源引用里的 `?v=任意值` 统一替换成 `?v=<文件内容 hash>`。
 *
 * 为什么挂这个点（踩过的坑，别改回 after_generate）：
 *   Hexo 8 的 generate 顺序是 load() → _generate()（其中触发 before/after_generate）
 *   → firstGenerate() 才把 route 数据写进 public/。也就是说 after_generate 发生在
 *   【写盘之前】，此时去改 public/ 里的旧 HTML，随后会被重新写盘覆盖，白改。
 *   after_render:html 返回的字符串就是最终写盘内容，天然生效。
 *
 * 为什么增量生成也能覆盖所有页面：
 *   writeFile() 会用渲染结果的 sha1 与 Cache 里的旧 hash 比较。CSS/JS 内容一变，
 *   每个页面渲染出的 HTML 里 ?v= 都跟着变 → hash 不同 → 所有页面自动重写，
 *   不需要删 db.json，也不需要手动 hexo clean。
 *
 * 特性：
 *   - 内容不变 → URL 不变，缓存照常命中；内容一变 → URL 自动变，无需手改任何数字。
 *   - 幂等：重复 generate 结果一致；`?v=N` 现在只是占位符，写几都无所谓。
 *   - 只处理 href/src 属性里以 /css/ 或 /js/ 开头的站内 .css/.js，
 *     不碰 CDN 外链、图片 ?v=、APK 直链 ?v=、circle.json 的按小时破坏符。
 *   - 保留 Hexo js()/css() helper 生成的 `.css` / `.js` 查询串后缀（?v=19.css）。
 *
 * 注意：新增自定义 CSS/JS 仍要登记到 custom_css / custom_js，否则页面不会引用它。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ATTR_RE = /((?:href|src)\s*=\s*["'])([^"']+\.(?:css|js))\?v=([^"']*)(["'])/gi;
const LOCAL_PREFIX = ['/css/', '/js/'];
const hashCache = Object.create(null);
let logged = false;

function versionOf(rel) {
  if (hashCache[rel] !== undefined) return hashCache[rel];
  let hash = null;
  try {
    hash = crypto.createHash('md5')
      .update(fs.readFileSync(path.join(hexo.source_dir, rel)))
      .digest('hex')
      .slice(0, 10);
  } catch (e) {
    hash = null;   // 主题自带资源等：源文件不在 source/ 下，保持原样
  }
  hashCache[rel] = hash;
  return hash;
}

hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || html.indexOf('?v=') === -1) return html;

  let touched = false;
  const next = html.replace(ATTR_RE, function (all, pre, url, query, quote) {
    if (!LOCAL_PREFIX.some(p => url.indexOf(p) === 0)) return all;
    const rel = url.replace(/^\//, '');
    const hash = versionOf(rel);
    if (!hash) return all;
    const tail = query.match(/\.(css|js)$/i);
    const replacement = pre + url + '?v=' + hash + (tail ? tail[0] : '') + quote;
    if (replacement !== all) touched = true;
    return replacement;
  });

  if (touched && !logged) {
    logged = true;
    hexo.log.info('[asset-version] CSS/JS 版本号已按内容 hash 自动注入（无需手动 bump ?v=N）');
  }
  return next;
});
