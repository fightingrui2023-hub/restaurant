import { createRoot } from 'react-dom/client';
import Stack from './components/Stack';

const stackEl = document.getElementById('dish-feature-stack');

if (stackEl) {
  const rawDishes = [
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

  const parseRecommendCount = text => {
    const numeric = (text || '').replace(/[^\d]/g, '');
    return Number(numeric || 0);
  };

  const dishes = [...rawDishes]
    .sort((a, b) => parseRecommendCount(b.recommend) - parseRecommendCount(a.recommend))
    .map((dish, index) => ({
      ...dish,
      rank: index + 1
    }));

  const titleEl = document.getElementById('dish-feature-title');
  const quoteEl = document.getElementById('dish-feature-quote');
  const recommendEl = document.getElementById('dish-feature-recommend');
  const wikiTitleEl = document.getElementById('dish-feature-wiki-title');
  const wikiTextEl = document.getElementById('dish-feature-wiki-text');
  const dotsEl = document.getElementById('dish-feature-dots');

  if (dotsEl) {
    dotsEl.innerHTML = dishes
      .map((_, index) => `<span class="dish-dot" data-index="${index}" aria-hidden="true"></span>`)
      .join('');
  }

  const syncDishText = index => {
    const dish = dishes[index];
    if (!dish) return;
    if (titleEl) titleEl.textContent = dish.title;
    if (quoteEl) quoteEl.textContent = dish.quote;
    if (recommendEl) recommendEl.textContent = dish.recommend;
    if (wikiTitleEl) wikiTitleEl.textContent = dish.wikiTitle;
    if (wikiTextEl) wikiTextEl.textContent = dish.wikiText;
    if (dotsEl) {
      const dots = dotsEl.querySelectorAll('.dish-dot');
      dots.forEach(dot => {
        const isActive = Number(dot.getAttribute('data-index')) === index;
        dot.classList.toggle('active', isActive);
      });
    }
  };

  syncDishText(dishes.length - 1);

  createRoot(stackEl).render(
    <Stack
      randomRotation={true}
      sensitivity={90}
      sendToBackOnClick={true}
      pauseOnHover={true}
      mobileClickOnly={false}
      onActiveIndexChange={syncDishText}
      cards={dishes.map((dish, i) => (
        <div key={i} style={{ width: '100%', height: '100%', position: 'relative' }}>
          <img src={dish.image} alt={dish.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 2,
              background: 'rgba(0, 0, 0, 0.72)',
              color: '#fff',
              fontSize: '12px',
              lineHeight: 1,
              padding: '7px 10px',
              borderRadius: '999px',
              letterSpacing: '0.02em',
              pointerEvents: 'none'
            }}
          >
            {`好评第${dish.rank}`}
          </span>
        </div>
      ))}
    />
  );
}
