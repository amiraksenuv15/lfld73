/* ============================================================
   banner.js — динамический слайдер главной + фон сайта
   ============================================================ */
(function () {
  'use strict';

  var BANNER_KEY = 'bannerSlides';
  var BG_KEY = 'siteBackgroundImage';
  var INTERVAL_KEY = 'bannerInterval';
  var DEFAULT_INTERVAL = 4000;

  var DEFAULT_SLIDES = [
    'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80',
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80',
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&q=80',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80'
  ];

  var bannerState = { slides: [], current: 0, timer: null };

  /* ============ Хранилище слайдов ============ */
  function loadSlides() {
    try {
      var raw = localStorage.getItem(BANNER_KEY);
      if (!raw) return DEFAULT_SLIDES.map(function (url) { return { url: url, enabled: true }; });
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(function (s) {
        if (typeof s === 'string') return { url: s, enabled: true };
        return { url: s.url || '', enabled: s.enabled !== false };
      }).filter(function (s) { return s.url; });
    } catch (e) {
      return DEFAULT_SLIDES.map(function (url) { return { url: url, enabled: true }; });
    }
  }

  function saveSlides(slides) {
    try { localStorage.setItem(BANNER_KEY, JSON.stringify(slides)); } catch (e) {}
  }

  function loadInterval() {
    var n = parseInt(localStorage.getItem(INTERVAL_KEY) || '', 10);
    return n >= 1000 ? n : DEFAULT_INTERVAL;
  }
  function saveInterval(ms) {
    ms = Math.max(1000, parseInt(ms, 10) || DEFAULT_INTERVAL);
    localStorage.setItem(INTERVAL_KEY, String(ms));
  }

  /* ============ Фон сайта ============ */
  function applySiteBackground() {
    var url = localStorage.getItem(BG_KEY);
    if (url) {
      document.body.style.setProperty(
        'background',
        'linear-gradient(rgba(7,12,24,0.88), rgba(7,12,24,0.92)), url(' + url + ') center/cover fixed no-repeat',
        'important'
      );
      document.body.classList.add('has-custom-bg');
    } else {
      document.body.style.removeProperty('background');
      document.body.classList.remove('has-custom-bg');
    }
  }

  function setSiteBackground(url) {
    if (url) localStorage.setItem(BG_KEY, url);
    else localStorage.removeItem(BG_KEY);
    applySiteBackground();
  }
  function clearSiteBackground() { setSiteBackground(''); }

  /* ============ Рендер слайдера ============ */
  function getActiveSlides() {
    return bannerState.slides.filter(function (s) { return s.enabled; });
  }

  function renderBanner() {
    var hero = document.getElementById('welcomeHero');
    var dots = document.getElementById('welcomeDots');
    if (!hero || !dots) return;

    // Чистим слайды
    hero.querySelectorAll('.welcome-slide').forEach(function (el) { el.remove(); });

    var active = getActiveSlides();
    if (!active.length) {
      // Заглушка — оставляем темный фон
      var placeholder = document.createElement('div');
      placeholder.className = 'welcome-slide active welcome-slide-placeholder';
      hero.insertBefore(placeholder, hero.firstChild);
      dots.innerHTML = '';
      return;
    }

    active.forEach(function (slide, i) {
      var el = document.createElement('div');
      el.className = 'welcome-slide' + (i === 0 ? ' active' : '');
      el.style.backgroundImage = 'url(' + slide.url + ')';
      hero.insertBefore(el, hero.firstChild);
    });

    dots.innerHTML = '';
    active.forEach(function (slide, i) {
      var dot = document.createElement('button');
      dot.className = 'welcome-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-index', i);
      dot.onclick = function () { goTo(i); };
      dots.appendChild(dot);
    });

    bannerState.current = 0;
    startTimer();
  }

  function goTo(idx) {
    var active = getActiveSlides();
    if (!active.length) return;
    var total = active.length;
    idx = ((idx % total) + total) % total;

    var slides = document.querySelectorAll('#welcomeHero .welcome-slide');
    var dots = document.querySelectorAll('#welcomeHero ~ * .welcome-dot, #welcomeDots .welcome-dot');
    // Более надёжно:
    dots = document.querySelectorAll('#welcomeDots .welcome-dot');

    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === idx);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === idx);
    });

    bannerState.current = idx;
  }

  function next() { goTo(bannerState.current + 1); }
  function prev() { goTo(bannerState.current - 1); }

  function startTimer() {
    if (bannerState.timer) clearInterval(bannerState.timer);
    var active = getActiveSlides();
    if (active.length > 1) {
      bannerState.timer = setInterval(next, loadInterval());
    }
  }

  function restart() {
    bannerState.slides = loadSlides();
    renderBanner();
  }

  /* ============ Публичный API для админки ============ */
  window.bannerManager = {
    getSlides: function () { return bannerState.slides.slice(); },
    setSlides: function (slides) {
      bannerState.slides = slides.map(function (s) {
        if (typeof s === 'string') return { url: s, enabled: true };
        return { url: s.url || '', enabled: s.enabled !== false };
      }).filter(function (s) { return s.url; });
      saveSlides(bannerState.slides);
      restart();
    },
    addSlide: function (url) {
      if (!url) return;
      var slides = bannerState.slides.slice();
      slides.push({ url: url, enabled: true });
      window.bannerManager.setSlides(slides);
    },
    removeSlide: function (idx) {
      var slides = bannerState.slides.slice();
      slides.splice(idx, 1);
      window.bannerManager.setSlides(slides);
    },
    toggleSlide: function (idx, enabled) {
      var slides = bannerState.slides.slice();
      if (!slides[idx]) return;
      slides[idx].enabled = !!enabled;
      window.bannerManager.setSlides(slides);
    },
    moveSlide: function (idx, dir) {
      var slides = bannerState.slides.slice();
      var newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= slides.length) return;
      var tmp = slides[idx];
      slides[idx] = slides[newIdx];
      slides[newIdx] = tmp;
      window.bannerManager.setSlides(slides);
    },
    getInterval: loadInterval,
    setInterval: function (ms) { saveInterval(ms); restart(); },
    restart: restart,

    // Фон сайта
    getBackground: function () { return localStorage.getItem(BG_KEY) || ''; },
    setBackground: setSiteBackground,
    clearBackground: clearSiteBackground,
    applyBackground: applySiteBackground
  };

  /* ============ Инициализация ============ */
  function init() {
    bannerState.slides = loadSlides();
    applySiteBackground();
    renderBanner();

    var p = document.getElementById('welcomePrev');
    var n = document.getElementById('welcomeNext');
    if (p) p.onclick = prev;
    if (n) n.onclick = next;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Если welcome рендерится из admin-extras, повторно перезапустим
  window.addEventListener('load', function () { setTimeout(restart, 100); });

  console.log('[banner] загружен');
})();