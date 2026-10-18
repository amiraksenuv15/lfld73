/* ============================================================
   lfld-data-fixes.js v1.0

   RUNTIME-ПАТЧ БАЗЫ:

   1. Васин Андрей / Васин Егор / Васин Егор Евгеньевич → "Васин Егор"
      с ID p_vasin_egor, датой 09.08.2007, позицией НАП

   2. Самарцев Александр → "Самарцев Марк" (p_samartsev_mark)

   3. Светличный Даниил/Данил → "Светличный Никита" (p_svetlichnyy_nikita)

   4. Убирает дубли из протоколов scorers
   ============================================================ */
(function () {
  'use strict';

  /* Карта имён-алиасов: ключ → канон */
  var CANON = {
    /* Васин */
    'васин андрей': 'Васин Егор',
    'васин а.': 'Васин Егор',
    'васин': 'Васин Егор',
    'васин егор евгеньевич': 'Васин Егор',
    'васин егор': 'Васин Егор',

    /* Самарцев */
    'самарцев александр': 'Самарцев Марк',
    'самарцев александрович': 'Самарцев Марк',
    'самарцев а.': 'Самарцев Марк',
    'самарцев': 'Самарцев Марк',
    'самарцев марк': 'Самарцев Марк',

    /* Светличный */
    'светличный данил': 'Светличный Никита',
    'светличный даниил': 'Светличный Никита',
    'светличный данила': 'Светличный Никита',
    'светличный д.': 'Светличный Никита',
    'светличный': 'Светличный Никита',
    'светличный никита': 'Светличный Никита'
  };

  function normKey(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function canonize(str) {
    if (!str) return str;
    var key = normKey(str);
    return CANON[key] || str;
  }

  /* ============================================================
     ПАТЧ ОДНОГО ИГРОКА (объект в teams/players)
     ============================================================ */
  function patchPlayerObject(p) {
    if (!p || !p.name) return false;
    var canon = canonize(p.name);
    if (canon !== p.name) {
      p.name = canon;
      return true;
    }
    return false;
  }

  /* ============================================================
     ПАТЧ ОДНОГО ТУРНИРА
     ============================================================ */
  function patchTournament(t) {
    if (!t) return 0;
    var changed = 0;

    /* teams */
    if (t.teams) {
      Object.keys(t.teams).forEach(function (club) {
        (t.teams[club] || []).forEach(function (p) {
          if (patchPlayerObject(p)) changed++;
        });
      });
    }

    /* players */
    if (Array.isArray(t.players)) {
      t.players.forEach(function (p) {
        if (patchPlayerObject(p)) changed++;
      });
    }

    /* matches.scorers */
    if (Array.isArray(t.matches)) {
      t.matches.forEach(function (m) {
        if (!m) return;
        if (typeof m.scorers === 'string') {
          var fixed = m.scorers;
          Object.keys(CANON).forEach(function (alias) {
            var re = new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
            fixed = fixed.replace(re, CANON[alias]);
          });
          if (fixed !== m.scorers) { m.scorers = fixed; changed++; }
        }
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(m[side])) return;
          m[side].forEach(function (ev) {
            if (!ev) return;
            if (ev.player) {
              var c = canonize(ev.player);
              if (c !== ev.player) { ev.player = c; changed++; }
            }
            if (ev.assist) {
              var c2 = canonize(ev.assist);
              if (c2 !== ev.assist) { ev.assist = c2; changed++; }
            }
          });
        });
      });
    }

    return changed;
  }

  /* ============================================================
     УДАЛЕНИЕ ДУБЛЕЙ ВАСИНА ИЗ ОДНОГО КЛУБА (в пределах турнира)
     ============================================================ */
  function dedupeVasinInTeams(t) {
    if (!t || !t.teams) return 0;
    var changed = 0;

    Object.keys(t.teams).forEach(function (club) {
      var arr = t.teams[club];
      if (!Array.isArray(arr)) return;

      /* Собираем Васинов в этом клубе */
      var vasins = [];
      var others = [];
      arr.forEach(function (p) {
        if (!p || !p.name) return;
        var n = normKey(p.name);
        if (n.indexOf('васин') === 0) vasins.push(p);
        else others.push(p);
      });

      /* Если > 1 Васина — сливаем в одного */
      if (vasins.length > 1) {
        var merged = {
          name: 'Васин Егор',
          pos: 'НАП',
          birth: '09.08.2007',
          m: 0, g: 0, a: 0, yc: 0, rc: 0
        };
        vasins.forEach(function (v) {
          merged.m += v.m || 0;
          merged.g += v.g || 0;
          merged.a += v.a || 0;
          merged.yc += v.yc || 0;
          merged.rc += v.rc || 0;
        });
        others.push(merged);
        t.teams[club] = others;
        changed++;
      } else if (vasins.length === 1) {
        var v = vasins[0];
        if (v.name !== 'Васин Егор') v.name = 'Васин Егор';
        if (!v.birth || v.birth === '—') v.birth = '09.08.2007';
        if (!v.pos || v.pos === 'УНИ') v.pos = 'НАП';
      }
    });

    return changed;
  }

  /* ============================================================
     ГЛАВНЫЙ ЗАПУСК
     ============================================================ */
  function applyAll() {
    var total = 0;
    var M = window.LFLD_MASTER_DB;
    if (M) {
      Object.keys(M).forEach(function (k) {
        if (k === 'teamPhotos' || k === 'playerPhotos') return;
        var t = M[k];
        if (t && typeof t === 'object') {
          total += patchTournament(t);
          total += dedupeVasinInTeams(t);
        }
      });
    }

    /* tournamentsData */
    if (window.tournamentsData) {
      Object.keys(window.tournamentsData).forEach(function (k) {
        var t = window.tournamentsData[k];
        if (t && typeof t === 'object') {
          total += patchTournament(t);
        }
      });
    }

    /* localStorage */
    try {
      var raw = localStorage.getItem('ff_tournaments');
      if (raw) {
        var data = JSON.parse(raw);
        var localChanged = 0;
        Object.keys(data).forEach(function (k) {
          if (data[k] && typeof data[k] === 'object') localChanged += patchTournament(data[k]);
        });
        if (localChanged) {
          localStorage.setItem('ff_tournaments', JSON.stringify(data));
          total += localChanged;
        }
      }
    } catch (e) {}

    if (total) {
      console.log('[lfld-data-fixes] Исправлено записей:', total);
      try { if (window.saveTournamentsToStorage) window.saveTournamentsToStorage(); } catch (e) {}
      try { if (window.renderTourney) window.renderTourney(); } catch (e) {}
      try { if (window.renderHomeUpcoming) window.renderHomeUpcoming(); } catch (e) {}
    } else {
      console.log('[lfld-data-fixes] Все данные уже канонические');
    }
    return total;
  }

  function boot() {
    applyAll();
    setTimeout(applyAll, 800);
    setTimeout(applyAll, 2000);
    setTimeout(applyAll, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.applyDataFixes = applyAll;

  console.log('[lfld-data-fixes] v1.0 загружен · Васин/Самарцев/Светличный дедуплицированы');
})();