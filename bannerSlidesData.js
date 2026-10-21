/* ============================================================
   bannerSlidesData.js — автогенерация из админки
   Опубликовано: 2026-10-21T06:49:21.555Z
   ============================================================ */

window.LFLD_BANNER_SLIDES = [
  {
    "id": "slide_mvhqoyeg_zd0w",
    "url": "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80",
    "enabled": true
  },
  {
    "id": "slide_mvhqoyeg_z7hn",
    "url": "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80",
    "enabled": true
  },
  {
    "id": "slide_mvhqoyeg_5jtt",
    "url": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&q=80",
    "enabled": true
  },
  {
    "id": "slide_mvhqoyeg_dhkg",
    "url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80",
    "enabled": true
  }
];

/* ---------- Автосинхронизация в localStorage ---------- */
(function () {
  try {
    if (window.LFLD_BANNER_SLIDES && window.LFLD_BANNER_SLIDES.length) {
      var existing = localStorage.getItem("bannerSlides");
      if (!existing) {
        localStorage.setItem("bannerSlides", JSON.stringify(window.LFLD_BANNER_SLIDES));
      }
    }
  } catch (e) {}
})();
