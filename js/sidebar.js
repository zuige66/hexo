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
function renderHeatmap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const data = generateHeatmapData();
  const heatmap = container.querySelector('.heatmap');
  if (!heatmap) return;
  
  // 清空现有内容
  heatmap.innerHTML = '';
  
  // 渲染每个单元格
  data.forEach(item => {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.setAttribute('data-date', item.date);
    cell.setAttribute('data-count', item.count);
    
    // 根据提交次数设置等级
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

// 动态添加侧边栏内容
function addSidebarContent() {
  // 检查是否已经存在侧边栏
  if (document.querySelector('.sidebar')) return;
  
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
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
        <a href="/about/" title="About">
          <i class="iconfont icon-user-fill"></i>
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
    
    <div class="sidebar-card">
      <div class="heatmap-container">
        <div class="heatmap-title">更新频率</div>
        <div class="heatmap"></div>
        <div class="heatmap-legend">
          <span>少</span>
          <div class="heatmap-cell" data-level="0"></div>
          <div class="heatmap-cell" data-level="1"></div>
          <div class="heatmap-cell" data-level="2"></div>
          <div class="heatmap-cell" data-level="3"></div>
          <div class="heatmap-cell" data-level="4"></div>
          <span>多</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(sidebar);
  
  // 渲染热力图
  renderHeatmap('heatmap-container');
  
  // 计算运行天数
  calculateRunDays();
}

// 计算博客运行天数
function calculateRunDays() {
  const startDate = new Date('2026-09-03'); // 博客创建日期
  const today = new Date();
  const diffTime = Math.abs(today - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const runDaysElement = document.getElementById('run-days');
  if (runDaysElement) {
    runDaysElement.textContent = diffDays;
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  addSidebarContent();
});
