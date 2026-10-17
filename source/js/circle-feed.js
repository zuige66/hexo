/* 友链朋友圈：拉取 /circle/circle.json，把每位友链的最新文章渲染成卡片。
   卡片复用主题 .links .card 样式，自动融入友链页网格。 */
(function () {
  var box = document.getElementById("circle-feed");
  if (!box) return;

  fetch("/circle/circle.json")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(render)
    .catch(function (e) {
      console.error("[circle-feed] 加载失败：", e);
    });

  function esc(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmt(d) {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("zh-CN");
    } catch (e) {
      return "";
    }
  }

  function render(data) {
    var friends = (data.friends || []).filter(function (f) {
      return f.posts && f.posts.length;
    });
    if (!friends.length) return;

    box.innerHTML = friends
      .map(function (f) {
        var posts = f.posts
          .map(function (p) {
            return (
              '<li class="feed-post"><a href="' +
              esc(p.url) +
              '" target="_blank" rel="noopener">' +
              esc(p.title) +
              '</a><span class="feed-date">' +
              fmt(p.date) +
              "</span></li>"
            );
          })
          .join("");
        var avatar = f.avatar
          ? '<div class="link-avatar my-auto"><img src="' +
            esc(f.avatar) +
            '" alt="' +
            esc(f.name) +
            '" onerror="this.style.display=\'none\'"></div>'
          : "";
        return (
          '<div class="card col-lg-4 col-md-6 col-sm-12">' +
          '<div class="card-body hover-with-bg">' +
          '<div class="card-content">' +
          avatar +
          '<div class="link-text">' +
          '<div class="link-title">' +
          esc(f.name) +
          "</div>" +
          '<ul class="feed-posts">' +
          posts +
          "</ul>" +
          "</div></div></div></div>"
        );
      })
      .join("");
  }
})();
