// 创建侧边栏 HTML
function createSidebarHTML() {
  return `
    <div class="sidebar-card">
      <img src="/images/zuige.jpg" alt="avatar" class="sidebar-avatar">
      <div class="sidebar-name">zuige</div>
      <div class="sidebar-desc">欢迎来到zuige's blog</div>
      <div class="sidebar-icons">
        <a href="https://github.com/zuige66" target="_blank" title="GitHub">
          <i class="iconfont icon-github-fill"></i>
        </a>
        <a href="https://wpa.qq.com/msgrd?v=3&uin=3575053735&site=qq&menu=yes" target="_blank" title="QQ">
          <i class="iconfont icon-qq-fill"></i>
        </a>
      </div>
    </div>
    
    <div class="sidebar-module">
      <div class="module-title">状态</div>
      <ul class="status-list">
        <li class="status-item">
          <div class="status-icon"><i class="iconfont icon-articles"></i></div>
          <div class="status-info">
            <div class="status-label">文章总数</div>
          </div>
          <div class="status-value" id="post-count">7篇</div>
        </li>
        <li class="status-item">
          <div class="status-icon"><i class="iconfont icon-tags"></i></div>
          <div class="status-info">
            <div class="status-label">总标签数</div>
          </div>
          <div class="status-value" id="tag-count">10个</div>
        </li>
        <li class="status-item">
          <div class="status-icon"><i class="iconfont icon-clock-fill"></i></div>
          <div class="status-info">
            <div class="status-label">运行时长</div>
          </div>
          <div class="status-value" id="run-days">3天</div>
        </li>
      </ul>

    </div>
    
    <div class="sidebar-module">
      <div class="module-title">分类</div>
      <ul class="category-list">
        <li class="category-item">
          <span class="category-name">技术</span>
          <span class="category-count">4</span>
        </li>
        <li class="category-item">
          <span class="category-name">笔记</span>
          <span class="category-count">1</span>
        </li>
        <li class="category-item">
          <span class="category-name">杂记</span>
          <span class="category-count">1</span>
        </li>
      </ul>
      <a href="/categories/" class="category-more">...更多</a>
    </div>
  `;
}

// 在首页添加侧边栏
function addIndexSidebar() {
  const board = document.getElementById('board');
  if (!board) return;
  
  // 检查是否已添加
  if (board.querySelector('.sidebar-wrapper')) return;
  
  // 创建 flex 容器
  const flexContainer = document.createElement('div');
  flexContainer.className = 'index-flex';
  
  // 创建侧边栏
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar-wrapper';
  sidebar.innerHTML = createSidebarHTML();
  
  // 创建内容容器
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'index-content';
  
  // 将原有内容移到内容容器
  while (board.firstChild) {
    contentWrapper.appendChild(board.firstChild);
  }
  
  // 组装
  flexContainer.appendChild(sidebar);
  flexContainer.appendChild(contentWrapper);
  board.appendChild(flexContainer);
  
  // 计算运行天数
  calculateRunDays();
}

// 在文章页添加侧边栏
function addPostSidebar() {
  // 找到文章页的左侧边栏容器
  const leftSideCol = document.querySelector('.side-col.d-none.d-lg-block.col-lg-2');
  if (!leftSideCol) return;
  
  // 检查是否已添加
  if (leftSideCol.querySelector('.sidebar-wrapper')) return;
  
  // 创建左侧边栏容器
  const leftColContainer = document.createElement('div');
  leftColContainer.className = 'post-left-col';
  
  // 创建个人信息侧边栏
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar-wrapper';
  sidebar.innerHTML = createSidebarHTML();
  leftColContainer.appendChild(sidebar);
  
  // 找到右侧目录并移动到左侧
  const allSideCols = document.querySelectorAll('.side-col.d-none.d-lg-block.col-lg-2');
  const rightSideCol = allSideCols.length > 1 ? allSideCols[1] : null;
  if (rightSideCol) {
    const tocDiv = rightSideCol.querySelector('#toc');
    if (tocDiv) {
      leftColContainer.appendChild(tocDiv);
      rightSideCol.style.display = 'none';
    }
  }
  
  // 清空左侧栏并添加新内容
  leftSideCol.innerHTML = '';
  leftSideCol.appendChild(leftColContainer);
  
  // 计算运行天数
  calculateRunDays();
}

// 计算博客运行天数
function calculateRunDays() {
  const startDate = new Date('2026-09-03');
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const runDaysElements = document.querySelectorAll('#run-days');
  runDaysElements.forEach(el => {
    el.textContent = diffDays + '天';
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 判断当前页面类型
  const isPost = document.querySelector('.post-content');
  const isIndex = document.getElementById('board') && !isPost;
  
  if (isPost) {
    document.body.classList.add('is-post');
    addPostSidebar();
  } else if (isIndex) {
    addIndexSidebar();
  }
});
