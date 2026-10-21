/* ============================================================
   bannerSlidesData.js v1.0

   ОФИЦИАЛЬНЫЕ СЛАЙДЫ ГЛАВНОЙ СТРАНИЦЫ ЛФЛД

   Хранит массив слайдов Hero-баннера. Используется banner.js
   как источник данных по умолчанию (если в localStorage пусто).
   Обновляется через админку → публикуется в GitHub через REST API.

   Формат элемента:
   {
     id: 'slide_1',
     url: 'data:image/jpeg;base64,...' | 'https://...',
     enabled: true
   }
   ============================================================ */

window.LFLD_BANNER_SLIDES = window.LFLD_BANNER_SLIDES || [
  {
    id: 'slide_1',
    url: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80',
    enabled: true
  },
  {
    id: 'slide_2',
    url: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80',
    enabled: true
  },
  {
    id: 'slide_3',
    url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&q=80',
    enabled: true
  },
  {
    id: 'slide_4',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80',
    enabled: true
  }
];

/* ---------- Автосинхронизация в localStorage ---------- */
(function () {
  try {
    var existing = localStorage.getItem('bannerSlides');
    if (!existing && window.LFLD_BANNER_SLIDES && window.LFLD_BANNER_SLIDES.length) {
      localStorage.setItem('bannerSlides', JSON.stringify(window.LFLD_BANNER_SLIDES));
    }
  } catch (e) {}
})();

console.log('[bannerSlidesData] загружено слайдов:', window.LFLD_BANNER_SLIDES.length);