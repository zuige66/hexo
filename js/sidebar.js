// 热力图数据生成（模拟过去一年的提交记录）
function generateHeatmapData() {
  const data = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // 生成过去一年的数据
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    // 随机生成提交次数（0-10次）
    const count = Math.floor(Math.random() * 11);
    data.push({ date: dateStr, count: count });
  }
  
  return data;
}

// 渲染热力图
function renderHeatmap(container) {
  const data = generateHeatmapData();
  const heatmap = container.querySelector('.heatmap');
  if (!heatmap) return;
  
  heatmap.innerHTML = '';
  
  data.forEach(item => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-date', item.date);
    cell.setAttribute('data-count', item.count);
    
    let level = 0;
    if (item.count > 0) level = 1;
    if (item.count >= 3) level = 2;
    if (item.count >= 6) level = 3;
    if (item.count >= 9) level = 4;
    
    cell.setAttribute('data-level', level);
    cell.title = `${item.date}: ${item.count} 次更新`;
    
    heatmap.appendChild(cell);
  });
}

// 创建侧边栏 HTML
function createSidebarHTML() {
  return `
    <div class="sidebar-card">
      <img src="/images/zuige.jpg" alt="avatar" class="sidebar-avatar">
      <div class="sidebar-name">zuige</div>
      <div class="sidebar-desc">欢迎来到zuige's blog</div>
      <div class="sidebar-about">
        <p>这个博客主要记录：</p>
        <ul>
          <li>技术学习笔记</li>
          <li>项目开发经验</li>
          <li>生活感悟日记</li>
        </ul>
        <p>GitHub: <a href="https://github.com/zuige66" target="_blank">zuige66</a></p>
      </div>
      <div class="sidebar-icons">
        <a href="https://github.com/zuige66" target="_blank" title="GitHub">
          <i class="iconfont icon-github-fill"></i>
        </a>
        <a href="https://wpa.qq.com/msgrd?v=3&uin=3575053735&site=qq&menu=yes" target="_blank" title="QQ">
          <i class="iconfont icon-qq-fill"></i>
        </a>
      </div>
    </div>
    
    <div class="sidebar-card">
      <div class="site-stats">
        <div class="stat-item">
          <span class="stat-number" id="post-count">7</span>
          <span class="stat-label">文章</span>
        </div>
        <div class="stat-item">
          <span class="stat-number" id="category-count">3</span>
          <span class="stat-label">分类</span>
        </div>
        <div class="stat-item">
          <span class="stat-number" id="tag-count">10</span>
          <span class="stat-label">标签</span>
        </div>
        <div class="stat-item">
          <span class="stat-number" id="run-days">100</span>
          <span class="stat-label">运行天数</span>
        </div>
      </div>
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
  
  // 渲染热力图
  const heatmapContainer = sidebar.querySelector('.heatmap-container');
  if (heatmapContainer) {
    renderHeatmap(heatmapContainer);
  }
  
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
  
  // 创建侧边栏
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar-wrapper';
  sidebar.innerHTML = createSidebarHTML();
  
  leftSideCol.appendChild(sidebar);
  
  // 渲染热力图
  const heatmapContainer = sidebar.querySelector('.heatmap-container');
  if (heatmapContainer) {
    renderHeatmap(heatmapContainer);
  }
  
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
    el.textContent = diffDays;
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 判断当前页面类型
  const isPost = document.querySelector('.post-content');
  const isIndex = document.getElementById('board') && !isPost;
  
  if (isIndex) {
    addIndexSidebar();
  } else if (isPost) {
    addPostSidebar();
  }
});
