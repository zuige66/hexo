(function () {
  var BANNER_BG = '/img/default.png';

  function LetterGlitch(canvas, options) {
    var defaults = {
      glitchColors: ['#2b4539', '#61dca3', '#61b3dc'],
      glitchSpeed: 50,
      smooth: true,
      characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789'
    };
    var opts = Object.assign({}, defaults, options || {});
    var ctx = canvas.getContext('2d');
    var letters = [];
    var grid = { columns: 0, rows: 0 };
    var lastGlitchTime = Date.now();
    var animFrame = null;
    var fontSize = 16;
    var charWidth = 10;
    var charHeight = 20;
    var chars = Array.from(opts.characters);

    function getRandomChar() { return chars[Math.floor(Math.random() * chars.length)]; }
    function getRandomColor() { return opts.glitchColors[Math.floor(Math.random() * opts.glitchColors.length)]; }

    function hexToRgb(hex) {
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, function (m, r, g, b) { return r + r + g + g + b + b; });
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }

    function interpolateColor(start, end, factor) {
      var r = Math.round(start.r + (end.r - start.r) * factor);
      var g = Math.round(start.g + (end.g - start.g) * factor);
      var b = Math.round(start.b + (end.b - start.b) * factor);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function initLetters(columns, rows) {
      grid = { columns: columns, rows: rows };
      var total = columns * rows;
      letters = [];
      for (var i = 0; i < total; i++) {
        letters.push({ char: getRandomChar(), color: getRandomColor(), targetColor: getRandomColor(), colorProgress: 1 });
      }
    }

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cols = Math.ceil(rect.width / charWidth);
      var rows = Math.ceil(rect.height / charHeight);
      initLetters(cols, rows);
      draw();
    }

    function draw() {
      var w = canvas.width / (window.devicePixelRatio || 1);
      var h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      ctx.font = fontSize + 'px monospace';
      ctx.textBaseline = 'top';
      for (var i = 0; i < letters.length; i++) {
        var x = (i % grid.columns) * charWidth;
        var y = Math.floor(i / grid.columns) * charHeight;
        ctx.fillStyle = letters[i].color;
        ctx.fillText(letters[i].char, x, y);
      }
    }

    function update() {
      var count = Math.max(1, Math.floor(letters.length * 0.05));
      for (var i = 0; i < count; i++) {
        var idx = Math.floor(Math.random() * letters.length);
        letters[idx].char = getRandomChar();
        letters[idx].targetColor = getRandomColor();
        if (!opts.smooth) {
          letters[idx].color = letters[idx].targetColor;
          letters[idx].colorProgress = 1;
        } else {
          letters[idx].colorProgress = 0;
        }
      }
    }

    function handleSmooth() {
      var needsRedraw = false;
      for (var i = 0; i < letters.length; i++) {
        if (letters[i].colorProgress < 1) {
          letters[i].colorProgress += 0.05;
          if (letters[i].colorProgress > 1) letters[i].colorProgress = 1;
          var startRgb = hexToRgb(letters[i].color);
          var endRgb = hexToRgb(letters[i].targetColor);
          if (startRgb && endRgb) {
            letters[i].color = interpolateColor(startRgb, endRgb, letters[i].colorProgress);
            needsRedraw = true;
          }
        }
      }
      if (needsRedraw) draw();
    }

    function animate() {
      var now = Date.now();
      if (now - lastGlitchTime >= opts.glitchSpeed) {
        update();
        draw();
        lastGlitchTime = now;
      }
      if (opts.smooth) handleSmooth();
      animFrame = requestAnimationFrame(animate);
    }

    return {
      start: function () {
        resize();
        animate();
        var resizeTimer;
        window.addEventListener('resize', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            cancelAnimationFrame(animFrame);
            resize();
            animate();
          }, 100);
        });
      },
      stop: function () {
        cancelAnimationFrame(animFrame);
      }
    };
  }

  function getTheme() {
    return localStorage.getItem('banner-theme') || 'glitch';
  }

  function setTheme(theme) {
    localStorage.setItem('banner-theme', theme);
  }

  function applyGlitch(banner) {
    banner.style.background = '#000';
    var existingCanvas = banner.querySelector('canvas');
    if (existingCanvas) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:120%;height:120%;left:-10%;top:-10%;z-index:0;filter:brightness(1.8) contrast(1.1);';
    banner.insertBefore(canvas, banner.firstChild);

    var glitchInstance = LetterGlitch(canvas, {
      glitchColors: ['#2b4539', '#61dca3', '#61b3dc'],
      glitchSpeed: 50,
      smooth: true
    });
    glitchInstance.start();

    var textOverlay = document.createElement('div');
    textOverlay.className = 'banner-text-overlay';
    textOverlay.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60%;height:40%;background:radial-gradient(ellipse at center,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 50%,transparent 80%);pointer-events:none;z-index:1;';
    banner.appendChild(textOverlay);

    var outerVignette = document.createElement('div');
    outerVignette.className = 'banner-outer-vignette';
    outerVignette.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 40%,rgba(0,0,0,0.85) 100%);';
    banner.appendChild(outerVignette);
  }

  function applyImage(banner) {
    var canvas = banner.querySelector('canvas');
    if (canvas) canvas.remove();
    var textOverlay = banner.querySelector('.banner-text-overlay');
    if (textOverlay) textOverlay.remove();
    var outerVignette = banner.querySelector('.banner-outer-vignette');
    if (outerVignette) outerVignette.remove();
    banner.style.background = "url('" + BANNER_BG + "') no-repeat center center";
    banner.style.backgroundSize = 'cover';
  }

  function switchTheme(theme) {
    var banner = document.getElementById('banner');
    if (!banner) return;

    setTheme(theme);
    applyTheme(banner, theme);
    updateActiveState(theme);
  }

  function applyTheme(banner, theme) {
    if (theme === 'glitch') {
      applyGlitch(banner);
    } else {
      applyImage(banner);
    }
  }

  function updateActiveState(theme) {
    var items = document.querySelectorAll('.banner-theme-item');
    items.forEach(function (item) {
      if (item.getAttribute('data-theme') === theme) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function init() {
    var banner = document.getElementById('banner');
    if (!banner) return;

    var mask = banner.querySelector('.mask');
    if (mask) {
      mask.style.position = 'relative';
      mask.style.zIndex = '3';
    }

    var theme = getTheme();
    applyTheme(banner, theme);
    updateActiveState(theme);

    document.addEventListener('click', function (e) {
      var item = e.target.closest('.banner-theme-item');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      var newTheme = item.getAttribute('data-theme');
      if (newTheme) switchTheme(newTheme);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
