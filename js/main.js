(function () {
  'use strict';

  // 滚动渐入
  var reveals = document.querySelectorAll('.reveal');
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  reveals.forEach(function (el) { observer.observe(el); });

  // 首屏元素立即显示
  var heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    requestAnimationFrame(function () {
      heroContent.classList.add('visible');
    });
  }

  // 导航栏滚动效果
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // 平滑锚点偏移（固定导航高度）
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id === '#top') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 52;
      var top = target.getBoundingClientRect().top + window.scrollY - offset - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();
