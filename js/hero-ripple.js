(function () {
  'use strict';

  var hero = document.getElementById('hero');
  var canvas = document.getElementById('heroWaterCanvas');
  var distortCanvas = document.getElementById('heroDistortCanvas');
  var heroImg = document.getElementById('heroBgImg');
  var storySection = document.getElementById('story');
  if (!hero || !canvas || !distortCanvas || !heroImg || !storySection) return;

  var ctx = canvas.getContext('2d');
  var sources = [];
  var w = 0;
  var h = 0;
  var animating = false;
  var parting = false;
  var revealed = false;
  var imgReady = false;

  var DISP_SCALE = 36;
  var MAX_SOURCES = 14;

  var touch = {
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastRippleAt: 0,
    pointerId: null
  };

  /* ── WebGL 平滑位移渲染 ── */
  var glRenderer = null;
  var use2DFallback = false;
  var dctx = null;

  function setDistorting(active) {
    if (active) hero.classList.add('distorting');
    else hero.classList.remove('distorting');
  }

  function draw2DDistorted(now) {
    if (!dctx) dctx = distortCanvas.getContext('2d');
    if (!dctx || !imgReady) return;

    var crop = computeCrop();
    var scaleX = crop.sw / w;
    var scaleY = crop.sh / h;
    var stepY = 4;
    var y;
    var cy;
    var d;
    var sy;
    var sh;

    dctx.clearRect(0, 0, w, h);
    for (y = 0; y < h; y += stepY) {
      cy = y + stepY * 0.5;
      d = getDisplacementAt(w * 0.5, cy, now);
      sh = crop.sh * (stepY / h);
      sy = crop.sy + (y / h) * crop.sh + d.dy * scaleY;
      sy = Math.max(crop.sy, Math.min(crop.sy + crop.sh - sh, sy));
      dctx.drawImage(
        heroImg,
        crop.sx + d.dx * scaleX, sy, crop.sw, sh,
        0, y, w, stepY
      );
    }
  }

  function createGLRenderer(canvasEl) {
    var gl = canvasEl.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance'
    });
    if (!gl) return null;

    var vs = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}';
    var fs = [
      'precision mediump float;',
      'varying vec2 vUv;',
      'uniform sampler2D uImg;',
      'uniform sampler2D uDisp;',
      'uniform vec2 uDispPx;',
      'void main(){',
      '  vec2 d=(texture2D(uDisp,vUv).rg-0.5)*2.0;',
      '  vec2 uv=vUv+d*uDispPx;',
      '  gl_FragColor=texture2D(uImg,clamp(uv,0.001,0.999));',
      '}'
    ].join('');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }

    var vsh = compile(gl.VERTEX_SHADER, vs);
    var fsh = compile(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var aPos = gl.getAttribLocation(prog, 'aPos');
    var uImg = gl.getUniformLocation(prog, 'uImg');
    var uDisp = gl.getUniformLocation(prog, 'uDisp');
    var uDispPx = gl.getUniformLocation(prog, 'uDispPx');

    var texImg = gl.createTexture();
    var texDisp = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, texDisp);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var dispW = 0;
    var dispH = 0;
    var dispFloat = null;
    var dispRGBA = null;
    var imgCanvas = document.createElement('canvas');
    var imgUploaded = false;

    function resizeDisp() {
      if (w < 1 || h < 1) return;
      dispW = Math.max(48, Math.min(72, Math.floor(w / 5)));
      dispH = Math.max(64, Math.floor(dispW * h / w));
      dispFloat = new Float32Array(dispW * dispH * 2);
      dispRGBA = new Uint8Array(dispW * dispH * 4);
      uploadNeutralDisp();
    }

    function uploadNeutralDisp() {
      if (!dispRGBA || !dispW) return;
      var i;
      for (i = 0; i < dispW * dispH; i++) {
        dispRGBA[i * 4] = 128;
        dispRGBA[i * 4 + 1] = 128;
        dispRGBA[i * 4 + 2] = 0;
        dispRGBA[i * 4 + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texDisp);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dispW, dispH, 0, gl.RGBA, gl.UNSIGNED_BYTE, dispRGBA);
    }

    function uploadImage(crop) {
      if (w < 1 || h < 1) return;
      var iw = Math.min(1024, Math.max(256, Math.floor(w * 1.5)));
      var ih = Math.max(1, Math.floor(iw * h / w));
      imgCanvas.width = iw;
      imgCanvas.height = ih;
      imgCanvas.getContext('2d').drawImage(
        heroImg, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, iw, ih
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texImg);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgCanvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      imgUploaded = true;
    }

    function updateDispField(getDispFn, now, touchActive) {
      if (!dispFloat || !dispW) return;
      var i;
      var j;
      var idx;
      var x;
      var y;
      var d;
      var target;
      var smooth = touchActive ? 0.42 : 0.28;
      var decay = touchActive ? 0.58 : 0.72;

      for (j = 0; j < dispH; j++) {
        for (i = 0; i < dispW; i++) {
          x = (i + 0.5) / dispW * w;
          y = (j + 0.5) / dispH * h;
          d = getDispFn(x, y, now);
          idx = (j * dispW + i) * 2;
          target = d.dx;
          dispFloat[idx] = dispFloat[idx] * decay + target * smooth;
          target = d.dy;
          dispFloat[idx + 1] = dispFloat[idx + 1] * decay + target * smooth;
        }
      }

      for (i = 0; i < dispFloat.length; i += 2) {
        var pi = i / 2;
        dispRGBA[pi * 4] = Math.max(0, Math.min(255, 128 + dispFloat[i] * 1.65));
        dispRGBA[pi * 4 + 1] = Math.max(0, Math.min(255, 128 + dispFloat[i + 1] * 1.65));
        dispRGBA[pi * 4 + 2] = 0;
        dispRGBA[pi * 4 + 3] = 255;
      }

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texDisp);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dispW, dispH, 0, gl.RGBA, gl.UNSIGNED_BYTE, dispRGBA);
    }

    function resetDispField() {
      if (dispFloat) dispFloat.fill(0);
      uploadNeutralDisp();
    }

    function render(dispStrength) {
      if (!imgUploaded || !dispW) return false;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texImg);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texDisp);
      gl.uniform1i(uImg, 0);
      gl.uniform1i(uDisp, 1);
      gl.uniform2f(uDispPx, dispStrength / gl.drawingBufferWidth, dispStrength / gl.drawingBufferHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    }

    function fieldEnergy() {
      if (!dispFloat) return 0;
      var sum = 0;
      var i;
      for (i = 0; i < dispFloat.length; i++) {
        sum += Math.abs(dispFloat[i]);
      }
      return sum;
    }

    return {
      resize: resizeDisp,
      uploadImage: uploadImage,
      updateDispField: updateDispField,
      resetDispField: resetDispField,
      fieldEnergy: fieldEnergy,
      render: render,
      isReady: function () { return imgUploaded && dispW > 0; }
    };
  }

  glRenderer = createGLRenderer(distortCanvas);
  if (!glRenderer) use2DFallback = true;

  function onImgReady() {
    imgReady = true;
    if (glRenderer) {
      glRenderer.resize();
      glRenderer.uploadImage(computeCrop());
      if (!glRenderer.isReady()) use2DFallback = true;
    }
    setDistorting(false);
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    distortCanvas.width = w * dpr;
    distortCanvas.height = h * dpr;
    distortCanvas.style.width = w + 'px';
    distortCanvas.style.height = h + 'px';

    if (!dctx) dctx = distortCanvas.getContext('2d');
    if (dctx) dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (glRenderer) {
      glRenderer.resize();
      if (imgReady) {
        glRenderer.uploadImage(computeCrop());
        if (!glRenderer.isReady()) use2DFallback = true;
      }
      if (!parting && !touch.active && sources.length === 0) {
        setDistorting(false);
      }
    }

    redrawRings(performance.now());
  }

  function trimSources() {
    if (sources.length > MAX_SOURCES) {
      sources = sources.slice(sources.length - MAX_SOURCES);
    }
  }

  function addSource(x, y, opts) {
    opts = opts || {};
    sources.push({
      x: x,
      y: y,
      startTime: performance.now(),
      speed: opts.speed || 5.5,
      wavelength: opts.wavelength || 32,
      amplitude: opts.amplitude || 1,
      maxRadius: opts.maxRadius || Math.max(w, h) * 0.65,
      damping: opts.damping || 0.007,
      ringWidth: opts.ringWidth || 2.2,
      waveCount: opts.waveCount || 7,
      life: opts.life || 4000
    });
    trimSources();
    startLoop();
  }

  function getTouchBulge(x, y) {
    if (!touch.active) return { dx: 0, dy: 0 };

    var dxp = x - touch.lastX;
    var dyp = y - touch.lastY;
    var dist = Math.hypot(dxp, dyp);
    var radius = 130;
    if (dist > radius || dist < 0.5) return { dx: 0, dy: 0 };

    var t = 1 - dist / radius;
    var strength = t * t * t * DISP_SCALE * 0.55;
    var nx = dxp / dist;
    var ny = dyp / dist;
    return { dx: nx * strength, dy: ny * strength };
  }

  /** 连续水波位移（非环状采样，避免分层） */
  function dispFromSource(src, x, y, now) {
    var elapsed = now - src.startTime;
    if (elapsed > src.life) return { dx: 0, dy: 0 };

    var px = x - src.x;
    var py = y - src.y;
    var dist = Math.hypot(px, py);
    if (dist < 1 || dist > src.maxRadius) return { dx: 0, dy: 0 };

    var nx = px / dist;
    var ny = py / dist;
    var tx = -ny;
    var ty = nx;
    var timeFade = 1 - elapsed / src.life;
    var env = src.amplitude * Math.exp(-src.damping * dist) * timeFade;
    var phase = (dist / src.wavelength) * Math.PI * 2 - elapsed * 0.007 * src.speed;
    var wave = Math.sin(phase) * env;
    var slope = Math.cos(phase) * env * (Math.PI * 2 / src.wavelength);

    return {
      dx: nx * slope * DISP_SCALE * 0.9 + tx * wave * DISP_SCALE * 0.38,
      dy: ny * slope * DISP_SCALE * 0.9 + ty * wave * DISP_SCALE * 0.38
    };
  }

  function getDisplacementAt(x, y, now) {
    var dx = 0;
    var dy = 0;
    var b = getTouchBulge(x, y);
    var i;

    dx += b.dx;
    dy += b.dy;

    for (i = 0; i < sources.length; i++) {
      var d = dispFromSource(sources[i], x, y, now);
      dx += d.dx;
      dy += d.dy;
    }

    return { dx: dx, dy: dy };
  }

  function computeCrop() {
    var iw = heroImg.naturalWidth;
    var ih = heroImg.naturalHeight;
    var viewR = w / h;
    var imgR = iw / ih;
    if (imgR > viewR) {
      var sh = ih;
      var sw = ih * viewR;
      return { sx: (iw - sw) * 0.5, sy: (ih - sh) * 0.4, sw: sw, sh: sh };
    }
    var sw = iw;
    var sh = iw / viewR;
    return { sx: 0, sy: (ih - sh) * 0.4, sw: sw, sh: sh };
  }

  function drawDistorted(now) {
    if (!imgReady) return;

    var settling = glRenderer && !use2DFallback && glRenderer.fieldEnergy() > 8;
    var active = sources.length > 0 || touch.active || settling;

    if (!active) {
      setDistorting(false);
      return;
    }

    setDistorting(true);

    if (use2DFallback || !glRenderer) {
      draw2DDistorted(now);
      return;
    }

    glRenderer.updateDispField(getDisplacementAt, now, touch.active);
    var energy = glRenderer.fieldEnergy();
    var strength = (sources.length > 0 || touch.active) ? DISP_SCALE : Math.min(DISP_SCALE, energy * 0.04);
    if (!glRenderer.render(strength)) {
      use2DFallback = true;
      draw2DDistorted(now);
    }
  }

  function drawRing(cx, cy, r, amp, ringWidth) {
    if (amp < 0.025 || r < 2) return;

    var rw = ringWidth * (0.45 + amp * 0.65);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.5, r + 1, r * 0.99 + 1, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(15, 35, 45, ' + (amp * 0.18) + ')';
    ctx.lineWidth = rw * 1.05;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.99, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (amp * 0.65) + ')';
    ctx.lineWidth = rw;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy, r + 0.4, (r + 0.4) * 0.99, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(210, 240, 255, ' + (amp * 0.22) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawSourceRings(src, now) {
    var elapsed = now - src.startTime;
    if (elapsed > src.life) return;

    var front = src.speed * (elapsed / 16);
    var i;

    for (i = 0; i < src.waveCount; i++) {
      var r = front - i * src.wavelength;
      if (r < 3 || r > src.maxRadius) continue;

      var distFade = 1 - Math.pow(r / src.maxRadius, 1.35);
      var timeFade = 1 - elapsed / src.life;
      var amp = src.amplitude * distFade * timeFade * Math.exp(-src.damping * r);
      drawRing(src.x, src.y, r, amp, src.ringWidth);
    }
  }

  function isAlive(src, now) {
    var elapsed = now - src.startTime;
    if (elapsed > src.life) return false;
    var front = src.speed * (elapsed / 16);
    return front < src.maxRadius + src.wavelength * src.waveCount;
  }

  function redrawRings(now) {
    ctx.clearRect(0, 0, w, h);
    sources.forEach(function (src) {
      drawSourceRings(src, now);
    });
  }

  function tick(now) {
    sources = sources.filter(function (src) {
      return isAlive(src, now);
    });
    drawDistorted(now);
    redrawRings(now);

    var settling = !use2DFallback && glRenderer && glRenderer.fieldEnergy() > 8;
    if (sources.length || touch.active || settling) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  function startLoop() {
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  function getPosFromClient(clientX, clientY) {
    var rect = hero.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function touchOnHero(clientY) {
    var rect = hero.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }

  function canRipple() {
    if (parting) return false;
    var rect = hero.getBoundingClientRect();
    return rect.bottom > 80 && rect.top < window.innerHeight;
  }

  function canPartLake() {
    return !parting && !revealed && window.scrollY < 20;
  }

  function splashAt(x, y, kind) {
    var presets = {
      tap: { speed: 5, maxRadius: 200, amplitude: 1.05, wavelength: 30, waveCount: 6, life: 3000, ringWidth: 2.2 },
      touch: { speed: 4, maxRadius: 130, amplitude: 0.95, wavelength: 28, waveCount: 5, life: 2600, ringWidth: 2 },
      drag: { speed: 4.5, maxRadius: 150, amplitude: 0.85, wavelength: 26, waveCount: 5, life: 2700, ringWidth: 1.8 },
      lift: { speed: 4, maxRadius: 140, amplitude: 0.8, wavelength: 28, waveCount: 4, life: 2500, ringWidth: 1.8 }
    };
    addSource(x, y, presets[kind] || presets.touch);
  }

  function spawnTrailRipple(x, y) {
    var t = Date.now();
    if (t - touch.lastRippleAt < 55) return;
    touch.lastRippleAt = t;
    splashAt(x, y, 'drag');
  }

  function partLake(fromX, fromY) {
    if (parting || !canPartLake()) return;
    parting = true;
    hero.classList.add('parting');

    var cx = fromX != null ? fromX : w / 2;
    var cy = fromY != null ? fromY : h * 0.55;
    var maxR = Math.max(w, h) * 1.05;
    var i;

    addSource(cx, cy, {
      speed: 8.5,
      maxRadius: maxR,
      amplitude: 1.2,
      wavelength: 38,
      waveCount: 8,
      damping: 0.005,
      life: 3200,
      ringWidth: 2.6
    });

    for (i = 1; i <= 3; i++) {
      (function (step) {
        setTimeout(function () {
          addSource(cx, cy - step * 40, {
            speed: 7.5 + step * 0.6,
            maxRadius: maxR * 0.85,
            amplitude: 1 - step * 0.1,
            wavelength: 36 - step * 2,
            waveCount: 7,
            damping: 0.006,
            life: 3000,
            ringWidth: 2.2
          });
        }, step * 100);
      })(i);
    }

    setTimeout(function () {
      hero.classList.add('revealed');
      revealed = true;
      scrollToStory();
    }, 950);

    setTimeout(function () {
      parting = false;
    }, 2000);
  }

  function scrollToStory() {
    var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 52;
    var top = storySection.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function onTouchStart(e) {
    if (!canRipple()) return;
    var t = e.touches[0];
    if (!touchOnHero(t.clientY)) return;

    var pos = getPosFromClient(t.clientX, t.clientY);
    touch.active = true;
    touch.pointerId = t.identifier;
    touch.startX = touch.lastX = pos.x;
    touch.startY = touch.lastY = pos.y;
    touch.lastRippleAt = 0;
    splashAt(pos.x, pos.y, 'touch');
    startLoop();
  }

  function onTouchMove(e) {
    if (!touch.active || !canRipple()) return;

    var t = null;
    var i;
    for (i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touch.pointerId) {
        t = e.touches[i];
        break;
      }
    }
    if (!t) return;

    var pos = getPosFromClient(t.clientX, t.clientY);
    touch.lastX = pos.x;
    touch.lastY = pos.y;
    spawnTrailRipple(pos.x, pos.y);
    startLoop();
  }

  function onTouchEnd(e) {
    if (!touch.active) return;

    var t = e.changedTouches[0];
    var pos = getPosFromClient(t.clientX, t.clientY);
    var deltaY = touch.startY - pos.y;
    var deltaX = Math.abs(pos.x - touch.startX);
    var moved = Math.hypot(pos.x - touch.startX, pos.y - touch.startY);

    touch.active = false;
    touch.pointerId = null;

    splashAt(pos.x, pos.y, moved < 18 ? 'tap' : 'lift');

    if (canPartLake() && deltaY > 45 && deltaY > deltaX) {
      partLake(pos.x, pos.y);
    } else {
      startLoop();
    }
  }

  hero.addEventListener('touchstart', onTouchStart, { passive: true });
  hero.addEventListener('touchmove', onTouchMove, { passive: true });
  hero.addEventListener('touchend', onTouchEnd, { passive: true });
  hero.addEventListener('touchcancel', onTouchEnd, { passive: true });

  var mouseDown = false;
  hero.addEventListener('mousedown', function (e) {
    if (!canRipple()) return;
    mouseDown = true;
    touch.active = true;
    var pos = getPosFromClient(e.clientX, e.clientY);
    touch.startX = touch.lastX = pos.x;
    touch.startY = touch.lastY = pos.y;
    touch.lastRippleAt = 0;
    splashAt(pos.x, pos.y, 'touch');
    startLoop();
  });
  window.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var pos = getPosFromClient(e.clientX, e.clientY);
    touch.lastX = pos.x;
    touch.lastY = pos.y;
    spawnTrailRipple(pos.x, pos.y);
    startLoop();
  });
  window.addEventListener('mouseup', function (e) {
    if (!mouseDown) return;
    mouseDown = false;
    var pos = getPosFromClient(e.clientX, e.clientY);
    var deltaY = touch.startY - pos.y;
    var deltaX = Math.abs(pos.x - touch.startX);
    var moved = Math.hypot(pos.x - touch.startX, pos.y - touch.startY);
    touch.active = false;
    splashAt(pos.x, pos.y, moved < 18 ? 'tap' : 'lift');
    if (canPartLake() && deltaY > 45 && deltaY > deltaX) {
      partLake(pos.x, pos.y);
    } else {
      startLoop();
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () {
    if (window.scrollY > 80 && !revealed) {
      hero.classList.add('revealed');
      revealed = true;
      touch.active = false;
    }
    if (window.scrollY < 10 && revealed && !parting) {
      hero.classList.remove('revealed', 'parting');
      revealed = false;
      sources = [];
      ctx.clearRect(0, 0, w, h);
      if (glRenderer) glRenderer.resetDispField();
      setDistorting(false);
    }
  }, { passive: true });

  resize();
  if (heroImg.complete && heroImg.naturalWidth) onImgReady();
  else heroImg.addEventListener('load', onImgReady);
})();
