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
    'const vec3 SEA0  = vec3(0.847,0.910,1.000);',
    'const vec3 SEA1  = vec3(0.690,0.812,0.957);',
    'const vec3 SEA2  = vec3(0.529,0.690,0.878);',
    'const vec3 SEA3  = vec3(0.396,0.565,0.769);',
    'const vec3 SEA4  = vec3(0.271,0.435,0.647);',
    'const vec3 DEEP  = vec3(0.184,0.325,0.525);',
    // ---- 一条云/浪带：轮廓下方 [base-thick, base] 区间内叠 4 级色阶 ----
    // 必须有下边界 (uv.y > base - thick)。原型靠 "先画的云带已被占用" 阻止后续云带
    // 继续向下涂；GLSL 用显式下界等价实现，否则最后一层会涂满整个画面。
    // d = 距轮廓的距离：d≈0 是云的「上沿」（受光，最亮），d≈thick 是「底部」（最暗）。
    'void strip(inout vec3 c, vec2 uv, float base, float thick,',
    '           float d0, float d1, float d2,',
    '           vec3 ca, vec3 cb, vec3 cc, vec3 cd){',
    '    if (uv.y > base || uv.y < base - thick) return;',
    '    float d = base - uv.y;',
    '    if (d <= d0)      { c = ca; return; }',
    '    if (d <= d1)      { c = cb; return; }',
    '    if (d <= d2)      { c = cc; return; }',
    '    c = cd;',
    '}',
    'vec3 skyCol(vec2 uv, float t, float hz){',
    '    float h01 = clamp((uv.y - hz) / (1.0 - hz), 0.0, 1.0);',
    '    float g = h01 + (fbm(vec2(uv.x*0.8 + t*0.002, h01*1.2), 6) - 0.5)*0.10;',
    '    vec3 c = SKY2;',
    '    if (g >= 0.10) c = SKY0;',
    '    if (g >= 0.22) c = SKY1;',
    '    if (g >= 0.38) c = SKY2;',
    '    if (g >= 0.56) c = SKY3;',
    '    if (g >= 0.76) c = SKY4;',
    // 6 层云：高、慢、disp 小 → 低、快、disp 大。disp 必须大才有团块形状。
    // 层厚与轮廓基线都收窄/上移，让蓝天占主导，云是"缀在蓝天上"而不是"盖住蓝天"。
    // 参数：轮廓基线, disp, 层厚, 漂移速度, 三档色阶距离, 四色（上亮→底暗）
    '    float b; float sp;',
    '    sp = 120.0;',
    '    b = 1.030 + (fbm(vec2(uv.x + t/sp + 3.0, uv.y), 8) - 0.5)*0.80;',
    '    strip(c, uv, b, 0.078, 0.026, 0.050, 0.078, PALE, SKY1, SKY2, SKY3);',
    '    sp = 78.0;',
    '    b = 0.980 + (fbm(vec2(uv.x + t/sp + 9.0, uv.y), 8) - 0.5)*1.15;',
    '    strip(c, uv, b, 0.086, 0.028, 0.056, 0.086, WHITE, SKY0, SKY1, SKY2);',
    '    sp = 52.0;',
    '    b = 0.922 + (fbm(vec2(uv.x + t/sp + 16.0, uv.y), 8) - 0.5)*1.55;',
    '    strip(c, uv, b, 0.094, 0.030, 0.062, 0.094, SNOW, SKY1, SKY2, SKY3);',
    '    sp = 36.0;',
    '    b = 0.848 + (fbm(vec2(uv.x + t/sp + 23.0, uv.y), 8) - 0.5)*1.95;',
    '    strip(c, uv, b, 0.102, 0.032, 0.068, 0.102, WHITE, SKY0, SKY1, SKY2);',
    '    sp = 26.0;',
    '    b = 0.760 + (fbm(vec2(uv.x + t/sp + 31.0, uv.y), 8) - 0.5)*2.35;',
    '    strip(c, uv, b, 0.110, 0.034, 0.074, 0.110, PALE, SKY2, SKY3, SKY4);',
    '    sp = 18.5;',
    '    b = 0.662 + (fbm(vec2(uv.x + t/sp + 40.0, uv.y), 8) - 0.5)*2.70;',
    '    strip(c, uv, b, 0.118, 0.036, 0.079, 0.118, SNOW, SKY1, SKY2, SKY3);',
    '    return c;',
    '}',
    // ---- 梵高式旋涡海浪 ----
    // 不直接按屏幕 y 画横带，而是先把坐标绕若干涡心旋转（旋转强度随半径衰减），
    // 再在"扭曲后的深度"上分色阶。这样原本水平的笔触就被卷成螺旋弧线，
    // 与《星月夜》里海浪的圈圈读感一致。
    'vec2 swirlOne(vec2 p, vec2 c, float strength, float radius, float phase, float t){',
    '    vec2 d = p - c;',
    '    float r2 = dot(d, d);',
    '    float w = exp(-r2 / (radius*radius*0.55));',
    '    float a = strength*w + 0.22*t*phase*w;',
    '    float ca = cos(a); float sa = sin(a);',
    '    return c + vec2(d.x*ca - d.y*sa, d.x*sa + d.y*ca);',
    '}',
    'vec2 swirl(vec2 p, float t){',
    '    vec2 q = p;',
    '    q = swirlOne(q, vec2(0.42, 0.16), 3.4, 0.20, 0.30, t);',
    '    q = swirlOne(q, vec2(1.05, 0.22), 2.9, 0.17, -0.42, t);',
    '    q = swirlOne(q, vec2(1.62, 0.15), 3.1, 0.19, 0.25, t);',
    '    q = swirlOne(q, vec2(0.10, 0.30), 2.2, 0.14, -0.30, t);',
    '    q = swirlOne(q, vec2(1.38, 0.32), 2.0, 0.13, 0.36, t);',
    '    return q;',
    '}',
    'vec3 seaCol(vec2 uv, float t, float hz){',
    '    float d01 = clamp((hz - uv.y) / hz, 0.0, 1.0);',
    // 海面底色：远浅近深
    '    float g = pow(d01, 0.55) + (fbm(vec2(uv.x*1.2 + t*0.004, d01*2.0), 6) - 0.5)*0.12;',
    '    vec3 c = SEA1;',
    '    if (g >= 0.08) c = SEA0;',
    '    if (g >= 0.24) c = SEA1;',
    '    if (g >= 0.42) c = SEA2;',
    '    if (g >= 0.60) c = SEA3;',
    '    if (g >= 0.80) c = SEA4;',
    // 旋涡笔触
    '    vec2 q = swirl(uv, t);',
    '    float v = clamp((hz - q.y) / hz, 0.0, 1.0);',
    '    float wob = fbm(vec2(q.x*2.6 + t*0.02, v*3.2), 5) - 0.5;',
    '    float band = pow(v, 0.58)*13.0 + wob*1.55 + t*0.20;',
    '    float f = fract(band);',
    '    vec3 s = SEA2;',
    '    if (f < 0.055)      s = WHITE;',
    '    else if (f < 0.105) s = SNOW;',
    '    else if (f < 0.220) s = SEA0;',
    '    else if (f < 0.400) s = SEA1;',
    '    else if (f < 0.580) s = SEA2;',
    '    else if (f < 0.760) s = SEA3;',
    '    else if (f < 0.900) s = SEA4;',
    '    else                s = DEEP;',
    // 远处淡入、近处保持对比
    '    float fade = clamp(pow(d01, 0.75)*1.55, 0.0, 1.0);',
    '    c = mix(c, s, fade);',
    // 第二层更细的笔触，做笔刷质感
    '    float wob2 = fbm(vec2(q.x*6.0 - t*0.03, v*7.0), 4) - 0.5;',
    '    float band2 = pow(v, 0.58)*30.0 + wob2*2.2 - t*0.32;',
    '    if (fract(band2) < 0.10 && d01 > 0.09) {',
    '        c = (d01 > 0.40) ? SNOW : SEA0;',
    '    }',
    // 地平线处柔和过渡，避免天空与海面之间出现一条硬边
    '    float seam = clamp((d01 - 0.055) / 0.10, 0.0, 1.0);',
    '    c = mix(SEA0, c, seam);',
    '    return c;',
    '}',
    'void mainImage(out vec4 fragColor, in vec2 fragCoord){',
    '    vec2 uv = fragCoord/iResolution.y;',
    '    float hz = uHorizon;',
    '    vec3 c = (uv.y >= hz) ? skyCol(uv, iTime, hz) : seaCol(uv, iTime, hz);',
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
