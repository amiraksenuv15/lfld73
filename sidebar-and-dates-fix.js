/* ============================================================
   sidebar-and-dates-fix.js
   1) Хронологический порядок турниров в сайдбаре (свежие сверху)
   2) Скрытие даты и времени в карточках «Ночной лиги 8х8»
   ============================================================ */
(function () {
  'use strict';

  var NIGHT_KEY = 'night_league_8x8';

  /* Порядок турниров в сайдбаре: чем выше значение — тем выше в списке.
     Задаётся строго по ТЗ. */
  var TOURNEY_ORDER = {
    'cup_metallist_2026': 100,  // Кубок Металлиста (осень 2026, анонс)
    'night_league_8x8':    90,  // Ночная лига 8х8 (текущий)
    'cup_5x5':             80,  // Кубок ЛФЛД 5х5 (сентябрь 2026)
    '5x5':                 70,  // Первенство 5х5 (Лето 2026)
    '7x7':                 60,  // Первенство 7х7 (Весна 2026)
    'veterans_40':         50   // Ветераны 40+ (5х5)
  };
  var FALLBACK_ORDER = 10;      // для будущих турниров — уедут вниз

  function getOrder(key) {
    return (TOURNEY_ORDER[key] != null) ? TOURNEY_ORDER[key] : FALLBACK_ORDER;
  }

  /* ============================================================
     1. ХРОНОЛОГИЧЕСКИЙ ПОРЯДОК ТУРНИРОВ
     ============================================================ */
  function reorderSidebar() {
    var list = document.getElementById('sidebarTourneysList');
    if (!list) return;
    var buttons = Array.prototype.slice.call(
      list.querySelectorAll('.dynamic-tourney-btn')
    );
    if (buttons.length < 2) return;

    var sorted = buttons.slice().sort(function (a, b) {
      var ka = a.getAttribute('data-key') || '';
      var kb = b.getAttribute('data-key') || '';
      var oa = getOrder(ka), ob = getOrder(kb);
      if (ob !== oa) return ob - oa;   // сначала самые свежие
      return ka.localeCompare(kb);     // при равенстве — по ключу
    });

    // Проверяем, требуется ли перестановка (защита от лишних DOM-мутаций)
    var needsReorder = false;
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i] !== sorted[i]) { needsReorder = true; break; }
    }
    if (!needsReorder) return;

    sorted.forEach(function (btn) { list.appendChild(btn); });

    // Обновляем активную подсветку
    var cur = (window.getCurrentTourneyKey && window.getCurrentTourneyKey()) || '';
    sorted.forEach(function (btn) {
      var k = btn.getAttribute('data-key');
      btn.classList.toggle('active', k === cur);
    });
  }

  function patchRenderSidebar() {
    var orig = window.renderSidebar;
    if (!orig || orig.__orderPatched) return;
    var patched = function () {
      var r = orig.apply(this, arguments);
      try { reorderSidebar(); } catch (e) { console.warn('[sidebar-order]', e); }
      return r;
    };
    patched.__orderPatched = true;
    window.renderSidebar = patched;
  }

  /* ============================================================
     2. СКРЫТИЕ ДАТЫ/ВРЕМЕНИ В «НОЧНОЙ ЛИГЕ 8х8»
     ============================================================ */

  /* Убираем из текста всё, что похоже на дату/время:
       " | 08.06.2026 19:00", " • 31.10.2026", " 2026-10-07", " 19:00" в конце и т.п. */
  function stripDateFromText(txt) {
    if (!txt) return '';
    return String(txt)
      // "| 08.06.2026 19:00"  или  "• 31.10.2026"
      .replace(/\s*[|•]\s*\d{2}[.\-/]\d{2}[.\-/]\d{2,4}(\s+\d{1,2}:\d{2})?/g, '')
      // "08.06.2026 19:00"  или  "08.06.2026"
      .replace(/\s*\d{2}\.\d{2}\.\d{4}(\s+\d{1,2}:\d{2})?/g, '')
      // ISO: "2026-10-07T19:00"
      .replace(/\s*\d{4}-\d{2}-\d{2}(T?\d{1,2}:\d{2})?/g, '')
      // висящий "19:00" в конце
      .replace(/\s*\d{1,2}:\d{2}\s*$/g, '')
      // двойные пробелы
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function hideDatesInNode(root) {
    if (!root) return;

    // 1. Заголовки карточек: «РЕЗУЛЬТАТ МАТЧА • 1 ТУР»
    root.querySelectorAll('.lfld-match-card-stage').forEach(function (el) {
      var original = el.textContent || '';
      var cleaned = stripDateFromText(original);
      if (cleaned !== original.trim()) {
        el.textContent = cleaned || '—';
      }
    });

    // 2. Заголовки туров в календаре (на всякий случай)
    root.querySelectorAll('.calendar-tour-title').forEach(function (el) {
      var original = el.textContent || '';
      var cleaned = stripDateFromText(original);
      if (cleaned !== original.trim()) el.textContent = cleaned;
    });
  }

  function hideDateForNight() {
    var cur = (window.getCurrentTourneyKey && window.getCurrentTourneyKey()) || '';
    if (cur !== NIGHT_KEY) return;
    hideDatesInNode(document.getElementById('view-tourney'));
    // Матчи Ночной лиги могут быть видны и в кабинете клуба
    hideDatesInNode(document.getElementById('view-club'));
  }

  function patchRenderers() {
    ['renderTourney', 'renderCalendar', 'openClubCabinet', 'showWelcome']
      .forEach(function (name) {
        var orig = window[name];
        if (!orig || orig.__nightDatePatched) return;
        var patched = function () {
          var r = orig.apply(this, arguments);
          try { hideDateForNight(); } catch (e) { console.warn('[night-date]', e); }
          return r;
        };
        patched.__nightDatePatched = true;
        window[name] = patched;
      });
  }

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  function boot() {
    patchRenderSidebar();
    patchRenderers();

    // Первые проходы — после инициализации index.html и патчей
    // (у других модулей — свои setTimeout на 300-400мс)
    setTimeout(function () {
      try { reorderSidebar(); } catch (e) {}
      try { hideDateForNight(); } catch (e) {}
    }, 500);

    setTimeout(function () {
      try { reorderSidebar(); } catch (e) {}
      try { hideDateForNight(); } catch (e) {}
    }, 1200);

    // Реакция на изменения из других вкладок/модулей
    window.addEventListener('storage', function (e) {
      if (e.key === 'ff_tournaments' || e.key === 'fav_tourney') {
        setTimeout(function () {
          try { reorderSidebar(); } catch (err) {}
          try { hideDateForNight(); } catch (err) {}
        }, 100);
      }
    });

    console.log('[sidebar-and-dates-fix] загружен');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();