(function () {
  'use strict';

  function whenIdle(fn) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: 2500 });
    } else {
      setTimeout(fn, 1200);
    }
  }

  function loadHeroRipple() {
    if (window.__heroRippleLoaded) return;
    window.__heroRippleLoaded = true;
    import('./hero-ripple.js');
  }

  function loadMenuStack() {
    if (window.__menuStackLoaded) return;
    window.__menuStackLoaded = true;
    import('../src/menu-entry.jsx');
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
