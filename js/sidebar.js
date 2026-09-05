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
function renderHeatmap() {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;
  
  const data = generateHeatmapData();
  container.innerHTML = '';
  
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
    
    container.appendChild(cell);
  });
}

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
      <div class="activity-heatmap">
        <div class="activity-title">活跃度</div>
        <div class="heatmap-grid" id="heatmap-grid"></div>
      </div>
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
  
  // 渲染热力图
  renderHeatmap();
  
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
  const rightSideCol = document.querySelectorAll('.side-col.d-none.d-lg-block.col-lg-2')[1];
  if (rightSideCol) {
    const tocDiv = rightSideCol.querySelector('#toc');
    if (tocDiv) {
      // 克隆目录到左侧
      const tocClone = tocDiv.cloneNode(true);
      leftColContainer.appendChild(tocClone);
      // 隐藏右侧目录
      rightSideCol.style.display = 'none';
    }
  }
  
  // 清空左侧栏并添加新内容
  leftSideCol.innerHTML = '';
  leftSideCol.appendChild(leftColContainer);
  
  // 渲染热力图
  renderHeatmap();
  
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
  
  if (isIndex) {
    addIndexSidebar();
  } else if (isPost) {
    addPostSidebar();
  }
});
