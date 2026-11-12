/* 友链朋友圈：拉取 /circle/circle.json，一篇文章一张小卡片。
   卡片：标题在上；左下角圆形头像 + 站点名，右下角日期。 */
(function () {
  var box = document.getElementById("circle-feed");
  if (!box) return;

  // 按小时追加缓存破坏符：Cloudflare/浏览器对静态资源缓存最长 4h，
  // 按小时换 URL 可在同一日多次部署时也不命中旧缓存（同时仍保留一小时内缓存）。
  var jsonUrl = "/circle/circle.json?v=2-" + new Date().toISOString().slice(0, 13).replace("T", "-");
  fetch(jsonUrl)
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
    var posts = data.posts || [];
    if (!posts.length) return;
    box.innerHTML = posts
      .map(function (p) {
        var avatar = p.avatar
          ? '<img class="feed-avatar" src="' +
            esc(p.avatar) +
            '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
          : "";
        return (
          '<a class="feed-card" href="' +
          esc(p.url) +
          '" target="_blank" rel="noopener">' +
          '<div class="feed-title">' +
          esc(p.title) +
          "</div>" +
          '<div class="feed-foot">' +
          avatar +
          '<span class="feed-name">' +
          esc(p.name) +
          "</span>" +
          '<span class="feed-date">' +
          fmt(p.date) +
          "</span>" +
          "</div>" +
          "</a>"
        );
      })
      .join("");
    setupToggle(posts.length);
  }

  // 默认收起：多于 9 篇时只显示前 9 张（三行三列），下方出现展开/收起按钮。
  function setupToggle(total) {
    var parent = box.parentNode;
    if (parent) {
      var prev = parent.querySelector(".circle-feed-toggle");
      if (prev) prev.parentNode.removeChild(prev);
    }
    if (total <= 9) {
      box.classList.remove("is-collapsed");
      return;
    }
    var collapsed = true;
    box.classList.add("is-collapsed");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "circle-feed-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "展开";

    btn.addEventListener("click", function () {
      collapsed = !collapsed;
      box.classList.toggle("is-collapsed", collapsed);
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.textContent = collapsed ? "展开" : "收起";
    });

    box.insertAdjacentElement("afterend", btn);
  }
})();
