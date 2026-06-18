(function () {
  'use strict';

  function whenIdle(fn) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: 2500 });
    } else {
      setTimeout(fn, 1200);
    }
  }

  function loadScript(src, flag) {
    if (window[flag]) return;
    window[flag] = true;
    if (document.querySelector('script[data-lazy-src="' + src + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute('data-lazy-src', src);
    document.body.appendChild(script);
  }

  function loadHeroRipple() {
    loadScript('js/hero-ripple.js', '__heroRippleLoaded');
  }

  function loadMenuStack() {
    loadScript('js/menu-entry.js', '__menuStackLoaded');
  }

  var hero = document.getElementById('hero');
  if (hero) {
    whenIdle(loadHeroRipple);
    hero.addEventListener('touchstart', loadHeroRipple, { once: true, passive: true });
    hero.addEventListener('mousedown', loadHeroRipple, { once: true });
  }

  var stackEl = document.getElementById('dish-feature-stack');
  if (stackEl && 'IntersectionObserver' in window) {
    var menuObserver = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          menuObserver.disconnect();
          loadMenuStack();
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 }
    );
    menuObserver.observe(stackEl);
  } else if (stackEl) {
    whenIdle(loadMenuStack);
  }
})();
