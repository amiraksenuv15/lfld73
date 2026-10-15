/* ============================================================
   lfld-name-fix.js v1.0
   
   Принудительно исправляет «фантомные» имена на канонические
   во ВСЕХ источниках данных:
   - window.LFLD_MASTER_DB (база турниров)
   - window.tournamentsData (публичный рендер)
   - строки scorers в протоколах матчей
   
   ПРАВКИ:
   - Самарцев Александр → Самарцев Марк
   - Светличный Данил / Даниил → Светличный Никита
   ============================================================ */
(function () {
  'use strict';

  /* Карта «легаси-имя → каноническое имя» */
  var NAME_FIXES = {
    /* Самарцев — только МАРК */
    'самарцев александр':       'Самарцев Марк',
    'самарцев александрович':   'Самарцев Марк',
    'самарцев александр в.':    'Самарцев Марк',
    'самарцев а.':              'Самарцев Марк',

    /* Светличный — только НИКИТА */
    'светличный данил':         'Светличный Никита',
    'светличный даниил':        'Светличный Никита',
    'светличный данила':        'Светличный Никита',
    'светличный д.':            'Светличный Никита'
  };

  function norm(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fixName(rawName) {
    if (!rawName) return rawName;
    var k = norm(rawName);
    if (NAME_FIXES[k]) return NAME_FIXES[k];
    return rawName;
  }

  /* ============================================================
     Проход 1 — LFLD_MASTER_DB (база турниров)
     ============================================================ */
  function walkMasterDB() {
    var db = window.LFLD_MASTER_DB;
    if (!db) return 0;
    var changed = 0;

    /* teams-формат */
    ['tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (tk) {
      var t = db[tk];
      if (!t || !t.teams) return;
      Object.keys(t.teams).forEach(function (club) {
        (t.teams[club] || []).forEach(function (p) {
          if (!p || !p.name) return;
          var fixed = fixName(p.name);
          if (fixed !== p.name) {
            p.name = fixed;
            changed++;
          }
        });
      });
    });

    /* cup_5x5 — плоский players */
    if (db.cup_5x5 && Array.isArray(db.cup_5x5.players)) {
      db.cup_5x5.players.forEach(function (p) {
        if (!p || !p.name) return;
        var fixed = fixName(p.name);
        if (fixed !== p.name) {
          p.name = fixed;
          changed++;
        }
      });
    }

    /* eventsHome / eventsAway во всех протоколах */
    Object.keys(db).forEach(function (tk) {
      var t = db[tk];
      if (!t || !Array.isArray(t.matches)) return;
      t.matches.forEach(function (m) {
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(m[side])) return;
          m[side].forEach(function (ev) {
            if (!ev || !ev.player) return;
            var fixed = fixName(ev.player);
            if (fixed !== ev.player) {
              ev.player = fixed;
              changed++;
            }
          });
        });
      });
    });

    return changed;
  }

  /* ============================================================
     Проход 2 — tournamentsData (публичный рендер)
     ============================================================ */
  function walkTournamentsData() {
    if (!window.tournamentsData) return 0;
    var changed = 0;

    Object.keys(window.tournamentsData).forEach(function (tk) {
      var t = window.tournamentsData[tk];
      if (!t) return;

      /* Протоколы матчей — строки scorers */
      (t.matches || []).forEach(function (m) {
        if (!m || typeof m.scorers !== 'string' || !m.scorers) return;
        var original = m.scorers;
        Object.keys(NAME_FIXES).forEach(function (legacy) {
          /* Регистронезависимая замена с учётом пробелов */
          var words = legacy.split(' ');
          var pattern = words.map(function (w) {
            return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          }).join('\\s+');
          var re = new RegExp(pattern, 'gi');
          m.scorers = m.scorers.replace(re, NAME_FIXES[legacy]);
        });
        if (m.scorers !== original) changed++;
      });

      /* Плей-офф */
      if (t.playoff && Array.isArray(t.playoff.matches)) {
        t.playoff.matches.forEach(function (m) {
          if (!m || typeof m.scorers !== 'string' || !m.scorers) return;
          var original = m.scorers;
          Object.keys(NAME_FIXES).forEach(function (legacy) {
            var words = legacy.split(' ');
            var pattern = words.map(function (w) {
              return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }).join('\\s+');
            var re = new RegExp(pattern, 'gi');
            m.scorers = m.scorers.replace(re, NAME_FIXES[legacy]);
          });
          if (m.scorers !== original) changed++;
        });
      }
    });

    if (changed && window.saveTournamentsToStorage) {
      try { window.saveTournamentsToStorage(); } catch (e) {}
    }
    return changed;
  }

  /* ============================================================
     Проход 3 — localStorage (страховка от кэша)
     ============================================================ */
  function walkLocalStorage() {
    try {
      var raw = localStorage.getItem('ff_tournaments');
      if (!raw) return 0;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return 0;

      var changed = 0;
      Object.keys(data).forEach(function (tk) {
        var t = data[tk];
        if (!t) return;
        (t.matches || []).forEach(function (m) {
          if (!m || typeof m.scorers !== 'string' || !m.scorers) return;
          var original = m.scorers;
          Object.keys(NAME_FIXES).forEach(function (legacy) {
            var words = legacy.split(' ');
            var pattern = words.map(function (w) {
              return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }).join('\\s+');
            var re = new RegExp(pattern, 'gi');
            m.scorers = m.scorers.replace(re, NAME_FIXES[legacy]);
          });
          if (m.scorers !== original) changed++;
        });
      });
      if (changed) {
        localStorage.setItem('ff_tournaments', JSON.stringify(data));
      }
      return changed;
    } catch (e) {
      return 0;
    }
  }

  /* ============================================================
     ГЛАВНЫЙ ЗАПУСК
     ============================================================ */
  function applyAll() {
    var c1 = 0, c2 = 0, c3 = 0;
    try { c1 = walkMasterDB(); }      catch (e) { console.warn('[name-fix] master:', e); }
    try { c2 = walkTournamentsData(); } catch (e) { console.warn('[name-fix] tourney:', e); }
    try { c3 = walkLocalStorage(); }   catch (e) { console.warn('[name-fix] storage:', e); }

    var total = c1 + c2 + c3;
    if (total) {
      console.log('[lfld-name-fix] Исправлено имён: ' + total +
        ' (master: ' + c1 + ', tourney: ' + c2 + ', storage: ' + c3 + ')');
      /* Форсим перерисовку турнира */
      if (window.renderTourney) { try { window.renderTourney(); } catch (e) {} }
      if (window.renderHomeUpcoming) { try { window.renderHomeUpcoming(); } catch (e) {} }
    }
  }

  function boot() {
    /* Первый заход — после загрузки базы */
    setTimeout(applyAll, 1800);
    /* Второй — на случай поздней подгрузки */
    setTimeout(applyAll, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Публичный API для ручного запуска */
  window.applyNameFixes = applyAll;

  console.log('[lfld-name-fix] v1.0 загружен · Самарцев Марк + Светличный Никита');
})();