'use strict';

/*
 * 隐藏文章（仅归档可见）
 * 在文章 front-matter 加 `home: false` 后，该文章不会出现在
 *   【首页文章列表】、【侧栏「最近文章」】与【RSS/Atom 订阅】，
 * 但仍正常出现在【归档 / 分类 / 标签】页，可直接访问。
 *
 * 实现：
 *   1) 在 before_generate 阶段改写 Fluid 主题提供的 index_posts（首页数据源），
 *      在分页之前剔除带标记的文章；归档 / 分类 / 标签各自独立生成，不受影响，
 *      首页也不会留空位或错位页码。
 *   2) RSS / Atom 生成器外包一层，过滤后再交给原生成器。
 *   3) 首页侧栏「最近文章」在 index.ejs 里过滤（见 themes/fluid/layout/index.ejs）。
 *
 * 用法：
 *   ---
 *   title: 某篇文献整理
 *   home: false
 *   ---
 */

function isHidden(post) {
  return post && post.home === false;
}

// 首页数据源：需晚于 Fluid 主题的 post-filter（默认优先级 10）执行，故用更高优先级
hexo.extend.filter.register('before_generate', function () {
  const allPosts = this.locals.get('all_posts') || this.locals.get('posts');
  if (!allPosts) return;

  // 首页只放：未隐藏(hide)、非归档专用(archive)、且未标记 home:false 的文章
  const indexPost = allPosts.filter(p => !p.hide && !p.archive && !isHidden(p));
  this.locals.set('index_posts', indexPost);
}, 20);

// RSS / Atom 订阅：过滤后交给原生成器（feed 插件在脚本加载前已注册，故此处直接包一层）
['atom', 'rss2', 'feed'].forEach(key => {
  const original = hexo.extend.generator.get(key);
  if (typeof original === 'function') {
    hexo.extend.generator.register(key, function (siteLocals) {
      const data = Object.assign({}, siteLocals, {
        // 返回 Query，后续 composePosts 仍可 .sort/.filter/.limit/.toArray
        posts: siteLocals.posts.sort('-date').filter(p => !isHidden(p))
      });
      return original.call(this, data);
    });
  }
});
