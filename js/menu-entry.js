(function () {
  'use strict';

  var stackEl = document.getElementById('dish-feature-stack');
  if (!stackEl) return;

  var rawDishes = [
    {
      image: 'images/menu/menu-charsiu.webp',
      title: '港式叉烧',
      quote: '「油而不腻，叉烧，精心调制」',
      recommend: '🔥 1973 人推荐',
      wikiTitle: '小百科 · 广府叉烧',
      wikiText: '选用梅花肉，以蜜汁、玫瑰露、南乳低温腌制，高温快烤锁汁。好的叉烧，断面粉嫩、切面亮泽——这是粤菜烧腊档口的基本功，也是西湖春天坚持了二十年的招牌。'
    },
    {
      image: 'images/menu/menu-duck.webp',
      title: '招牌片皮鸭',
      quote: '「皮脆如纸，片下三吃」',
      recommend: '🔥 3174 人推荐',
      wikiTitle: '小百科 · 片皮鸭',
      wikiText: '选鸭、挂炉、片皮讲究火候与刀工。鸭皮香脆、鸭肉细嫩，是经典粤式宴席代表菜。'
    },
    {
      image: 'images/menu/menu-crab.webp',
      title: '粉丝蒸螃蟹',
      quote: '「鲜香浓郁，粉丝入味」',
      recommend: '🔥 962 人推荐',
      wikiTitle: '小百科 · 清蒸海鲜',
      wikiText: '以蒸制保留蟹肉鲜甜，粉丝吸收蟹汁与蒜香，口感层次丰富。'
    },
    {
      image: 'images/menu/menu-fish.webp',
      title: '西湖醋鱼',
      quote: '「酸甜开胃，江南风味」',
      recommend: '🔥 1258 人推荐',
      wikiTitle: '小百科 · 西湖名菜',
      wikiText: '以糖醋汁提鲜，鱼肉嫩滑，突出杭帮菜“清鲜适口”的特色。'
    },
    {
      image: 'images/menu/menu-chicken.webp',
      title: '临沂炒鸡',
      quote: '「锅气十足，香辣下饭」',
      recommend: '🔥 841 人推荐',
      wikiTitle: '小百科 · 鲁式炒鸡',
      wikiText: '大火快炒形成浓郁锅气，鸡肉紧实有嚼劲，香辣风味突出。'
    }
  ];

  function parseRecommendCount(text) {
    var numeric = String(text || '').replace(/[^\d]/g, '');
    return Number(numeric || 0);
  }

  var dishes = rawDishes
    .slice()
    .sort(function (a, b) { return parseRecommendCount(b.recommend) - parseRecommendCount(a.recommend); })
    .map(function (dish, index) {
      var copy = Object.assign({}, dish);
      copy.rank = index + 1;
      return copy;
    });

  var titleEl = document.getElementById('dish-feature-title');
  var quoteEl = document.getElementById('dish-feature-quote');
  var recommendEl = document.getElementById('dish-feature-recommend');
  var wikiTitleEl = document.getElementById('dish-feature-wiki-title');
  var wikiTextEl = document.getElementById('dish-feature-wiki-text');
  var dotsEl = document.getElementById('dish-feature-dots');

  function setActiveDot(index) {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('.dish-dot');
    for (var i = 0; i < dots.length; i++) {
      var isActive = Number(dots[i].getAttribute('data-index')) === index;
      if (isActive) dots[i].classList.add('active');
      else dots[i].classList.remove('active');
    }
  }

  function syncDishText(index) {
    var dish = dishes[index];
    if (!dish) return;
    if (titleEl) titleEl.textContent = dish.title;
    if (quoteEl) quoteEl.textContent = dish.quote;
    if (recommendEl) recommendEl.textContent = dish.recommend;
    if (wikiTitleEl) wikiTitleEl.textContent = dish.wikiTitle;
    if (wikiTextEl) wikiTextEl.textContent = dish.wikiText;
    setActiveDot(index);
  }

  if (dotsEl) {
    dotsEl.innerHTML = dishes
      .map(function (_, index) { return '<span class="dish-dot" data-index=\"' + index + '\" aria-hidden=\"true\"></span>'; })
      .join('');
  }

  // stack UI
  stackEl.innerHTML = '';
  stackEl.classList.add('dish-stack');

  var cards = [];
  for (var k = 0; k < dishes.length; k++) {
    (function (dish, indexFromSorted) {
      var card = document.createElement('div');
      card.className = 'dish-stack-card';
      card.setAttribute('data-index', String(indexFromSorted));

      var img = document.createElement('img');
      img.src = dish.image;
      img.alt = dish.title;
      img.loading = 'lazy';
      img.decoding = 'async';

      var badge = document.createElement('span');
      badge.className = 'dish-stack-badge';
      badge.textContent = '好评第' + dish.rank;

      card.appendChild(img);
      card.appendChild(badge);
      stackEl.appendChild(card);
      cards.push(card);
    })(dishes[k], k);
  }

  // Ensure last item is on top initially (matches旧版 syncDishText(dishes.length - 1))
  var activeIndex = dishes.length - 1;
  function applyStackOrder() {
    // top is last
    for (var i = 0; i < cards.length; i++) {
      var relative = (i - activeIndex + cards.length) % cards.length;
      var z = cards.length - relative;
      var scale = 1 - relative * 0.035;
      var y = relative * 10;
      var rotate = (relative === 0 ? 0 : (relative % 2 ? -1 : 1) * (2 + relative));
      cards[i].style.zIndex = String(z);
      cards[i].style.transform = 'translateY(' + y + 'px) scale(' + scale + ') rotate(' + rotate + 'deg)';
      cards[i].style.opacity = relative > 3 ? '0' : '1';
      cards[i].style.pointerEvents = relative === 0 ? 'auto' : 'none';
    }
  }

  function next() {
    activeIndex = (activeIndex + 1) % dishes.length;
    syncDishText(activeIndex);
    applyStackOrder();
  }

  // click / tap on top card
  stackEl.addEventListener('click', function (e) {
    var topCard = null;
    for (var i = 0; i < cards.length; i++) {
      var rel = (i - activeIndex + cards.length) % cards.length;
      if (rel === 0) { topCard = cards[i]; break; }
    }
    if (topCard && (e.target === topCard || topCard.contains(e.target))) next();
  });

  // simple swipe
  var startX = 0;
  var startY = 0;
  var tracking = false;

  function onStart(clientX, clientY) {
    tracking = true;
    startX = clientX;
    startY = clientY;
  }
  function onEnd(clientX, clientY) {
    if (!tracking) return;
    tracking = false;
    var dx = clientX - startX;
    var dy = clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) next();
  }

  stackEl.addEventListener('touchstart', function (e) {
    if (!e.touches || !e.touches[0]) return;
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  stackEl.addEventListener('touchend', function (e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  });

  stackEl.addEventListener('mousedown', function (e) {
    onStart(e.clientX, e.clientY);
  });
  stackEl.addEventListener('mouseup', function (e) {
    onEnd(e.clientX, e.clientY);
  });

  // dot click jump
  if (dotsEl) {
    dotsEl.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('dish-dot')) return;
      var idx = Number(t.getAttribute('data-index'));
      if (!Number.isFinite(idx)) return;
      activeIndex = idx;
      syncDishText(activeIndex);
      applyStackOrder();
    });
  }

  syncDishText(activeIndex);
  applyStackOrder();
})();

