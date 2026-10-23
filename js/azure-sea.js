/**
 * 蓝天白云 · 蓝色波涛 Banner ("Azure Sky / Rolling Sea")
 *
 * 画法移植自 source/js/cloud-sea.js（原作 mdb, Shadertoy Ndc3zl,
 * 单 Pass 移植 Tianxiu (Tyson) Zhou, CC BY-NC-SA 3.0），只把暖色落日渐变
 * 换成蓝色单色系，并保持完全相同的构成方式：
 *
 *   - 每个形体 = 一条 fbm 轮廓 + 一叠硬边色带（`layer(dh)`，dh 递减）
 *   - 轮廓位移 disp 必须足够大，轮廓才会在 x/y 两个方向同时起伏，
 *     从而把色带切成形状各异、互不相连的团块 —— 这是"层层叠叠"的来源。
 *     disp 太小（<0.3）时每条带都会退化成一根平直的横线。
 *   - 云：远（高、慢）到近（低、快）共 6 层；层与层之间留出蓝色间隙
 *   - 海：8 层浪，近大远小，浪尖压白色泡沫
 *   - 结尾统一的四角暗角（原作曝光脉动已移除）
 *
 * 与 cloud-sea.js 行为一致:
 *   reduced-motion / 无 WebGL2 / 纹理失败 → 静态头图；自适应降分辨率；
 *   后台与滚出视口暂停；跨页 sessionStorage 续接动画时刻。
 */
(function () {
  'use strict';

  var banner = document.getElementById('banner');
  if (!banner) return;

  function showStaticFallback() {
    banner.style.backgroundImage = "url('/img/default.png')";
    banner.style.backgroundRepeat = 'no-repeat';
    banner.style.backgroundPosition = 'center center';
    banner.style.backgroundSize = 'cover';
  }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) { showStaticFallback(); return; }

  var MOBILE = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

  var gl = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) { showStaticFallback(); }
  if (!gl) { showStaticFallback(); return; }

  var NOISE_SIZE_STR = '256.0';
  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec3 iResolution;',
    'uniform float iTime;',
    'uniform sampler2D iChannel0;',
    'uniform float uHorizon;',
    'out vec4 outColor;',
    'float noise(vec2 x){',
    '    vec2 f = fract(x);',
    '    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '    vec2 p = floor(x);',
    '    float a = texture(iChannel0, (p+vec2(0.0,0.0))/' + NOISE_SIZE_STR + ').x;',
    '    float b = texture(iChannel0, (p+vec2(1.0,0.0))/' + NOISE_SIZE_STR + ').x;',
    '    float c = texture(iChannel0, (p+vec2(0.0,1.0))/' + NOISE_SIZE_STR + ').x;',
    '    float d = texture(iChannel0, (p+vec2(1.0,1.0))/' + NOISE_SIZE_STR + ').x;',
    '    return a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y;',
    '}',
    'float fbm(vec2 x, int detail){',
    '    float a = 0.0; float b = 1.0; float t = 0.0;',
    '    for(int i = 0; i < detail; i++){',
    '        float n = noise(x);',
    '        a += b*n; t += b; b *= 0.72; x *= 2.0;',
    '    }',
    '    return a/t;',
    '}',
    // ---- 蓝色单色系（对应原作那套暖色单色系）----
    // 注意：站点会在 banner 上叠加 30% 黑色蒙版（_config.fluid.yml 的
    // banner_mask_alpha: 0.3），访客看到的亮度 = 这里 × 0.7。所以这几个"白"要
    // 保持在 1.0 附近，天空蓝也要整体提亮，否则会被蒙版压成灰蓝、失去通透感。
    'const vec3 WHITE = vec3(1.000,1.000,1.000);',
    'const vec3 SNOW  = vec3(0.984,0.992,1.000);',
    'const vec3 PALE  = vec3(0.949,0.973,1.000);',
    'const vec3 SKY0  = vec3(0.878,0.922,1.000);',
    'const vec3 SKY1  = vec3(0.760,0.843,1.000);',
    'const vec3 SKY2  = vec3(0.643,0.761,0.980);',
    'const vec3 SKY3  = vec3(0.510,0.655,0.925);',
    'const vec3 SKY4  = vec3(0.404,0.565,0.851);',
    'const vec3 SKY5  = vec3(0.318,0.486,0.796);',
    'const vec3 SEA0  = vec3(0.847,0.910,1.000);',
    'const vec3 SEA1  = vec3(0.690,0.812,0.957);',
    'const vec3 SEA2  = vec3(0.529,0.690,0.878);',
    'const vec3 SEA3  = vec3(0.396,0.565,0.769);',
    'const vec3 SEA4  = vec3(0.271,0.435,0.647);',
    'const vec3 SEA5  = vec3(0.200,0.345,0.549);',
    'const vec3 DEEP  = vec3(0.184,0.325,0.525);',
    // ---- 柔和多色分层（无分界线）----
    // 目标：仿参考图——多色、层层叠叠、色块之间没有硬边分界线。
    // 做法：不再用 strip() 的 4 档硬切，而把每条云带/浪带内部的颜色改为
    // 在 0..1 深度上连续平滑渐变（piecewise-linear 色板），且带的上沿/下沿
    // 用软 alpha 淡入淡出，避免任何可见的分界线。带的数量多 → "层层叠叠"；
    // 每带扫过至少 6 个色阶 → "颜色多"。
    'vec3 cloudRamp(float f){',
    '    // 顶部白→底部浅蓝，7 档连续渐变',
    '    vec3 c0=WHITE,c1=SNOW,c2=PALE,c3=SKY0,c4=SKY1,c5=SKY2,c6=SKY3;',
    '    float t0=0.00,t1=0.18,t2=0.36,t3=0.52,t4=0.68,t5=0.82,t6=1.00;',
    '    float r;',
    '    if(f<t1){r=(f-t0)/(t1-t0); return mix(c0,c1,r);}',
    '    else if(f<t2){r=(f-t1)/(t2-t1); return mix(c1,c2,r);}',
    '    else if(f<t3){r=(f-t2)/(t3-t2); return mix(c2,c3,r);}',
    '    else if(f<t4){r=(f-t3)/(t4-t3); return mix(c3,c4,r);}',
    '    else if(f<t5){r=(f-t4)/(t5-t4); return mix(c4,c5,r);}',
    '    else {r=(f-t5)/(t6-t5); return mix(c5,c6,r);}',
    '}',
    'vec3 seaRamp(float f){',
    '    // 顶部白泡沫→底部深蓝，7 档连续渐变',
    '    vec3 c0=WHITE,c1=SNOW,c2=SEA0,c3=SEA1,c4=SEA2,c5=SEA3,c6=SEA4;',
    '    float t0=0.00,t1=0.15,t2=0.30,t3=0.48,t4=0.64,t5=0.80,t6=1.00;',
    '    float r;',
    '    if(f<t1){r=(f-t0)/(t1-t0); return mix(c0,c1,r);}',
    '    else if(f<t2){r=(f-t1)/(t2-t1); return mix(c1,c2,r);}',
    '    else if(f<t3){r=(f-t2)/(t3-t2); return mix(c2,c3,r);}',
    '    else if(f<t4){r=(f-t3)/(t4-t3); return mix(c3,c4,r);}',
    '    else if(f<t5){r=(f-t4)/(t5-t4); return mix(c4,c5,r);}',
    '    else {r=(f-t5)/(t6-t5); return mix(c5,c6,r);}',
    '}',
    '// 把一条"云带/浪带"柔和地混入 c：base 是轮廓，thick 是带厚。',
    '// 带内在 0..1 深度上扫过色板，软 alpha 淡入淡出 → 无分界线。',
    'void softband(inout vec3 c, vec2 uv, float base, float thick,',
    '              float hf, float yf, float phase, bool isSea){',
    '    if (thick <= 0.0) return;',
    '    float d = base - uv.y;',   // d≈0 顶(亮)，d≈thick 底
    '    float tfrac = clamp(d / thick, 0.0, 1.0);',
    // 用连续 fbm 轻抖宽度，让带边缘不再是平直线（但保持连续，无硬切）
    '    float wob = (fbm(vec2(uv.x*hf + phase, uv.y*yf), 5) - 0.5)*0.5;',
    '    tfrac = clamp(tfrac + wob*0.12, 0.0, 1.0);',
    '    vec3 col = isSea ? seaRamp(tfrac) : cloudRamp(tfrac);',
    // 软 alpha：上下沿各 0.12 宽区间淡入淡出
    '    float a = clamp(tfrac/0.12, 0.0, 1.0) * clamp((1.0-tfrac)/0.12, 0.0, 1.0);',
    '    c = mix(c, col, a);',
    '}',
    // ---- 唯美感：地平线柔光 ----
    // 像远处的天光从云层缝隙里透出来，缓慢呼吸。这是"唯美"的关键一层：
    // 它同时压住地平线附近的高对比，让天与海在视觉上融成一片。
    'vec3 horizonGlow(vec2 uv, float hz, float t){',
    '    float d = uv.y - hz;',
    '    // 只在地平线上方 0~0.22 的薄层里发光，高斯衰减',
    '    float g = exp(-pow(max(d, 0.0)/0.20, 2.0));',
    '    // 横向再做一处偏亮的"光源感"，缓慢漂移',
    '    float sx = 0.62 + 0.16*sin(t*0.045);',
    '    g *= 0.72 + 0.42*exp(-pow((uv.x-sx)/0.55, 2.0));',
    '    // 呼吸：幅度很小，避免闪烁感',
    '    g *= 0.90 + 0.10*sin(t*0.16);',
    '    return vec3(0.97,0.985,1.0) * g * 0.22;',
    '}',
    // ---- 唯美感：大气透视 ----
    // 越靠近地平线，颜色越被"空气"冲淡（亮度抬升、饱和下降），制造纵深。
    // dist: 到地平线的距离；range: 生效范围。clamp(1-dist/range) 为 1 时最浓。
    // 强度要克制：0.16 会把整片蓝压成灰白，0.09 只做轻微纵深。
    'vec3 aerial(vec3 c, float dist, float range){',
    '    float k = clamp(1.0 - dist/range, 0.0, 1.0);',
    '    return mix(c, vec3(0.88,0.93,0.99), k*0.09);',
    '}',
    // ---- 湍流卷曲：让浪脊翻涌，而不是规整的正弦 ----
    'vec2 churn(vec2 uv, float t, float amp){',
    '    vec2 q = uv;',
    '    q.x += (fbm(vec2(uv.x*2.7 + t*0.055, uv.y*3.1 - t*0.028), 5) - 0.5)*amp;',
    '    q.y += (fbm(vec2(uv.x*2.2 - t*0.046, uv.y*2.7 + 9.3), 5) - 0.5)*amp*0.62;',
    '    return q;',
    '}',
    'vec3 skyCol(vec2 uv, float t, float hz){',
    '    float h01 = clamp((uv.y - hz) / (1.0 - hz), 0.0, 1.0);',
    // 天空也做一次很轻的卷曲，让云的轮廓不是"横着的波浪线"
    '    vec2 quv = churn(uv, t, 0.030);',
    '    float g = h01 + (fbm(vec2(uv.x*0.8 + t*0.002, h01*1.2), 6) - 0.5)*0.10;',
    // 底色：由下往上 天际线浅 → 顶部深，软渐变
    '    vec3 c = SKY0;',
    '    if(g>=0.14)c=SKY0; if(g>=0.26)c=SKY1; if(g>=0.40)c=SKY2;',
    '    if(g>=0.58)c=SKY3; if(g>=0.76)c=SKY4; if(g>=0.90)c=SKY5;',
    // 14 层软云带：高、慢、起伏小 → 低、快、起伏大。层数翻倍 = "云再密集一点"。
    // 关键：disp 必须是层厚的 ~10 倍以上，轮廓才会大幅起伏、把色带切成一团团。
    // 轮廓用 churn 卷曲后的 quv，云的边缘才有翻卷感而不是平滑的波浪线。
    '    float b;',
    '    b = 1.085 + (fbm(vec2(quv.x + t/150.0 + 3.0,  quv.y), 8)-0.5)*0.70; softband(c,quv,b,0.032,1.00,1.00,3.0,false);',
    '    b = 1.055 + (fbm(vec2(quv.x + t/128.0 + 6.0,  quv.y), 8)-0.5)*0.85; softband(c,quv,b,0.040,1.02,1.00,6.0,false);',
    '    b = 1.020 + (fbm(vec2(quv.x + t/110.0 + 9.0,  quv.y), 8)-0.5)*1.00; softband(c,quv,b,0.048,1.04,1.00,9.0,false);',
    '    b = 0.982 + (fbm(vec2(quv.x + t/94.0 + 12.0,  quv.y), 8)-0.5)*1.15; softband(c,quv,b,0.056,1.06,1.01,12.0,false);',
    '    b = 0.941 + (fbm(vec2(quv.x + t/80.0 + 15.0,  quv.y), 8)-0.5)*1.30; softband(c,quv,b,0.065,1.09,1.02,15.0,false);',
    '    b = 0.897 + (fbm(vec2(quv.x + t/68.0 + 18.0,  quv.y), 8)-0.5)*1.45; softband(c,quv,b,0.074,1.12,1.03,18.0,false);',
    '    b = 0.850 + (fbm(vec2(quv.x + t/58.0 + 21.0,  quv.y), 8)-0.5)*1.60; softband(c,quv,b,0.083,1.15,1.04,21.0,false);',
    '    b = 0.800 + (fbm(vec2(quv.x + t/49.0 + 25.0,  quv.y), 8)-0.5)*1.75; softband(c,quv,b,0.092,1.19,1.05,25.0,false);',
    '    b = 0.747 + (fbm(vec2(quv.x + t/41.0 + 29.0,  quv.y), 8)-0.5)*1.90; softband(c,quv,b,0.101,1.23,1.06,29.0,false);',
    '    b = 0.692 + (fbm(vec2(quv.x + t/34.0 + 33.0,  quv.y), 8)-0.5)*2.05; softband(c,quv,b,0.110,1.27,1.07,33.0,false);',
    '    b = 0.634 + (fbm(vec2(quv.x + t/28.0 + 38.0,  quv.y), 8)-0.5)*2.25; softband(c,quv,b,0.120,1.32,1.08,38.0,false);',
    '    b = 0.573 + (fbm(vec2(quv.x + t/23.0 + 43.0,  quv.y), 8)-0.5)*2.45; softband(c,quv,b,0.130,1.38,1.09,43.0,false);',
    '    b = 0.508 + (fbm(vec2(quv.x + t/19.0 + 49.0,  quv.y), 8)-0.5)*2.65; softband(c,quv,b,0.140,1.44,1.10,49.0,false);',
    '    b = 0.440 + (fbm(vec2(quv.x + t/15.5 + 56.0,  quv.y), 8)-0.5)*2.85; softband(c,quv,b,0.150,1.52,1.11,56.0,false);',
    '    return c;',
    '}',
    'vec3 seaCol(vec2 uv, float t, float hz){',
    '    float d01 = clamp((hz - uv.y) / hz, 0.0, 1.0);',
    // 海水底色：远浅近深，软渐变
    '    float g = pow(d01, 0.55) + (fbm(vec2(uv.x*1.2 + t*0.004, d01*2.0), 6)-0.5)*0.12;',
    '    vec3 c = SEA0;',
    '    if(g>=0.08)c=SEA0; if(g>=0.24)c=SEA1; if(g>=0.42)c=SEA2;',
    '    if(g>=0.60)c=SEA3; if(g>=0.80)c=SEA4; if(g>=0.92)c=SEA5;',
    // 12 层浪：波涛汹涌。
    // 三个要素一起上：
    //  1) 层数 9→12，浪一层压一层 → 喧腾感；
    //  2) disp 提到厚度的 4~6 倍，浪脊大幅起伏成峰谷，不再是横条；
    //  3) 坐标过 churn 卷曲（近处卷得比远处狠），浪头翻卷起来才"汹涌"。
    '    vec2 suv = churn(uv, t, 0.055);',
    '    float b;',
    '    b = (hz-0.026) + (fbm(vec2(suv.x*2.60 + t/180.0 + 3.0,  suv.y*1.04), 8)-0.5)*0.120; softband(c,suv,b,0.026,2.60,1.04,3.0,true);',
    '    b = (hz-0.052) + (fbm(vec2(suv.x*2.45 + t/150.0 + 7.0,  suv.y*1.05), 8)-0.5)*0.150; softband(c,suv,b,0.033,2.45,1.05,7.0,true);',
    '    b = (hz-0.082) + (fbm(vec2(suv.x*2.30 + t/125.0 + 11.0,  suv.y*1.06), 8)-0.5)*0.190; softband(c,suv,b,0.042,2.30,1.06,11.0,true);',
    '    b = (hz-0.116) + (fbm(vec2(suv.x*2.16 + t/104.0 + 15.0,  suv.y*1.07), 8)-0.5)*0.235; softband(c,suv,b,0.052,2.16,1.07,15.0,true);',
    '    b = (hz-0.154) + (fbm(vec2(suv.x*2.02 + t/86.0 + 20.0,  suv.y*1.08), 8)-0.5)*0.280; softband(c,suv,b,0.063,2.02,1.08,20.0,true);',
    '    b = (hz-0.196) + (fbm(vec2(suv.x*1.88 + t/71.0 + 25.0,  suv.y*1.09), 8)-0.5)*0.330; softband(c,suv,b,0.075,1.88,1.09,25.0,true);',
    '    b = (hz-0.243) + (fbm(vec2(suv.x*1.74 + t/58.0 + 30.0,  suv.y*1.10), 8)-0.5)*0.390; softband(c,suv,b,0.088,1.74,1.10,30.0,true);',
    '    b = (hz-0.295) + (fbm(vec2(suv.x*1.60 + t/47.0 + 36.0,  suv.y*1.11), 8)-0.5)*0.460; softband(c,suv,b,0.102,1.60,1.11,36.0,true);',
    '    b = (hz-0.353) + (fbm(vec2(suv.x*1.48 + t/38.0 + 42.0,  suv.y*1.12), 8)-0.5)*0.540; softband(c,suv,b,0.118,1.48,1.12,42.0,true);',
    '    b = (hz-0.418) + (fbm(vec2(suv.x*1.37 + t/30.0 + 49.0,  suv.y*1.13), 8)-0.5)*0.640; softband(c,suv,b,0.136,1.37,1.13,49.0,true);',
    '    b = (hz-0.492) + (fbm(vec2(suv.x*1.27 + t/23.0 + 57.0,  suv.y*1.14), 8)-0.5)*0.760; softband(c,suv,b,0.156,1.27,1.14,57.0,true);',
    '    b = (hz-0.578) + (fbm(vec2(suv.x*1.18 + t/17.0 + 66.0,  suv.y*1.15), 8)-0.5)*0.900; softband(c,suv,b,0.178,1.18,1.15,66.0,true);',
    // 浪尖泡沫：在很浅的深度上再提一层白，做出碎浪飞沫
    '    float foamN = fbm(vec2(suv.x*5.5 + t*0.06, suv.y*5.0 - t*0.04), 5);',
    '    float foam = smoothstep(0.66, 0.80, foamN) * clamp(1.0 - d01*0.5, 0.0, 1.0);',
    '    c = mix(c, vec3(1.0,1.0,1.0), foam*0.30);',
    // 近处再压一层深蓝，增加层次与"颜色多"
    '    float near = pow(d01, 0.7);',
    '    c = mix(c, DEEP, near*0.30);',
    // 地平线柔和过渡
    '    float seam = clamp((d01 - 0.04) / 0.09, 0.0, 1.0);',
    '    c = mix(SEA0, c, seam);',
    '    return c;',
    '}',
    'void mainImage(out vec4 fragColor, in vec2 fragCoord){',
    '    vec2 uv = fragCoord/iResolution.y;',
    '    float hz = uHorizon;',
    '    vec3 c = (uv.y >= hz) ? skyCol(uv, iTime, hz) : seaCol(uv, iTime, hz);',
    // 唯美层 1：大气透视 —— 越远越被天光冲淡，形成空气纵深
    '    float far = abs(uv.y - hz);',
    '    c = aerial(c, far, 0.25);',
    // 唯美层 2：地平线柔光，天海在交界处融成一片
    '    c += horizonGlow(uv, hz, iTime);',
    // 四角暗角，与 cloud-sea.js 的 vignettCorrection 一致（无曝光脉动）
    '    vec2 v = fragCoord/iResolution.xy;',
    '    c *= 0.5 + 0.5*pow(16.0*v.x*v.y*(1.0-v.x)*(1.0-v.y), 0.2);',
    '    fragColor = vec4(c, 1.0);',
    '}',
    'void main(){',
    '    vec4 fragColor;',
    '    mainImage(fragColor, gl_FragCoord.xy);',
    '    outColor = fragColor;',
    '}'
  ].join('\n');

  var VERT = [
    '#version 300 es',
    'precision highp float;',
    'const vec2 verts[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));',
    'void main(){ gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0); }'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[azure-sea] shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { showStaticFallback(); return; }
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[azure-sea] link error:', gl.getProgramInfoLog(prog));
    showStaticFallback();
    return;
  }
  gl.useProgram(prog);
  var uRes = gl.getUniformLocation(prog, 'iResolution');
  var uTime = gl.getUniformLocation(prog, 'iTime');
  var uHorizon = gl.getUniformLocation(prog, 'uHorizon');
  gl.uniform1i(gl.getUniformLocation(prog, 'iChannel0'), 0);
  gl.uniform1f(uHorizon, 0.47);

  var texReady = false;
  var noiseImg = new Image();
  noiseImg.onload = function () {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    texReady = true;
    start();
  };
  noiseImg.onerror = function () {
    console.error('[azure-sea] 蓝噪声纹理加载失败，回退静态头图');
    showStaticFallback();
    dispose();
  };
  noiseImg.src = '/img/cloud-sea-noise.png';

  var canvas = gl.canvas;
  canvas.id = 'azure-sea-canvas';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  banner.insertBefore(canvas, banner.firstChild);

  var renderScale = MOBILE ? 0.5 : 0.75;

  var CLOCK_KEY = 'azureSeaElapsed';
  var seed = 0;
  try { seed = parseFloat(sessionStorage.getItem(CLOCK_KEY)) || 0; } catch (e) {}
  var startTime = performance.now() - seed * 1000;
  var rafId = 0;
  var running = false;
  var inView = true;
  var frameCount = 0;
  var frameTimeSum = 0;
  var degradedOnce = false;

  function resize() {
    var w = banner.clientWidth, h = banner.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
    canvas.width = Math.max(2, Math.round(w * dpr * renderScale));
    canvas.height = Math.max(2, Math.round(h * dpr * renderScale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame() {
    rafId = 0;
    if (!running || !texReady) return;
    var t0 = performance.now();
    gl.uniform3f(uRes, canvas.width, canvas.height, 1.0);
    gl.uniform1f(uTime, (t0 - startTime) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if ((frameCount & 15) === 0) {
      try { sessionStorage.setItem(CLOCK_KEY, ((t0 - startTime) / 1000).toString()); } catch (e) {}
    }
    frameCount++;
    frameTimeSum += performance.now() - t0;
    if (frameCount === 120) {
      var avg = frameTimeSum / frameCount;
      if (avg > 24 && !degradedOnce) {
        degradedOnce = true;
        renderScale = 0.5;
        frameCount = 0; frameTimeSum = 0;
        resize();
      } else if (avg > (MOBILE ? 45 : 30)) {
        dispose();
        return;
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !texReady) return;
    running = true;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  function dispose() {
    stop();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (observer) observer.disconnect();
    if (resizeObs) resizeObs.disconnect();
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
  }
  function onVis() { document.hidden ? stop() : (inView && start()); }
  function saveClock() {
    try { sessionStorage.setItem(CLOCK_KEY, ((performance.now() - startTime) / 1000).toString()); } catch (e) {}
  }
  window.addEventListener('pagehide', saveClock);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveClock(); });

  var observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      inView = entries[0].intersectionRatio > 0.02;
      inView && !document.hidden ? start() : stop();
    }, { threshold: [0, 0.02, 0.5] });
    observer.observe(banner);
  }

  var resizeObs = null;
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(function () { resize(); });
    resizeObs.observe(banner);
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVis);
  start();
})();
