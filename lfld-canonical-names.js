/* ============================================================
   lfld-canonical-names.js v1.0

   ЕДИНЫЙ СЛОВАРЬ КАНОНИЧЕСКИХ ИМЁН + ТОТАЛЬНЫЙ ПАТЧ

   Проблема:
   - В досье (Player Cabinet) — «Васин Егор»
   - В карточках матчей — «Васин Андрей»
   - В бомбардирах — «Самарцев Александр»
   - В протоколах — «Светличный Данил»

   Решение:
   1. LFLD_CANONICAL_NAMES — словарь легаси→канон
   2. canonizeText(str) — замена в scorers-строках
   3. getCanonicalDisplayName(name) — резолв одного имени
   4. Автопатч:
      - LFLD_MASTER_DB (scorers + eventsHome/Away + teams + players)
      - window.tournamentsData
      - localStorage
      - PlayerResolver.resolve (возврат канонического full)
      - parseCardScorers / parseScorersFull (обёртки)
   5. Перерисовка UI после патча
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     1. СЛОВАРЬ КАНОНИЧЕСКИХ ИМЁН
     Ключ — нормализованная строка (нижний регистр, без ё, через _)
     Значение — каноническое отображаемое имя
     ============================================================ */
  window.LFLD_CANONICAL_NAMES = {
    /* ============ ВАСИН (строго ЕГОР!) ============ */
    'васин_андрей':      'Васин Егор',
    'васин_а':           'Васин Егор',
    'васин':             'Васин Егор',

    /* ============ САМАРЦЕВ (строго МАРК!) ============ */
    'самарцев_александр':      'Самарцев Марк',
    'самарцев_александрович':  'Самарцев Марк',
    'самарцев_а':              'Самарцев Марк',
    'самарцев':                'Самарцев Марк',

    /* ============ СВЕТЛИЧНЫЙ (строго НИКИТА!) ============ */
    'светличный_данил':   'Светличный Никита',
    'светличный_даниил':  'Светличный Никита',
    'светличный_данила':  'Светличный Никита',
    'светличный_д':       'Светличный Никита',
    'светличный':         'Светличный Никита',

    /* ============ АСКАРЖОНОВ (не Оскарджонов!) ============ */
    'оскарджонов_абубакир':  'Аскаржонов Абубакир',
    'абубакир_оскарджонов':  'Аскаржонов Абубакир',
    'абубакар_оскарджонов':  'Аскаржонов Абубакир',
    'аскаржанов_абубакир':   'Аскаржонов Абубакир',
    'аскаржонов_абубакир':   'Аскаржонов Абубакир',
    'оскарджонов':           'Аскаржонов Абубакир',
    'абубакир':              'Аскаржонов Абубакир',

    /* ============ ГЕБЕЙДУЛЛОВ (строго ЛИНАР!) ============ */
    'гебейдуллов_рамиль': 'Гебейдуллов Линар',
    'гебейдуллов_рамил':  'Гебейдуллов Линар',
    'гебейдуллов_р':      'Гебейдуллов Линар',

    /* ============ ТИМАКОВ (строго ВЛАДИМИР!) ============ */
    'тимаков_владислав':  'Тимаков Владимир',
    'тимаков_в':          'Тимаков Владимир',

    /* ============ АТАВИН (строго через А!) ============ */
    'отавин_кирилл':      'Атавин Кирилл',
    'отавин_к':           'Атавин Кирилл',
    'отавин':             'Атавин Кирилл',

    /* ============ КАМАЛТДИНОВ ============ */
    'камалтдинов_ильяз':  'Камалтдинов Ильяс',

    /* ============ ДРЯГИН ============ */
    'дрягин_михаил':      'Драгин Михаил',
    'дрягин_м':           'Драгин Михаил'
  };

  /* ============================================================
     2. REGEXP-ПРАВИЛА — для замены в строках scorers
     Работают с многословными именами, с инициалами, с "ё/е"
     ============================================================ */
  var REPLACEMENT_RULES = [
    /* ---- Васин ---- */
    { re: /Васин\s+Андрей(?!\w)/gi,        to: 'Васин Егор' },
    { re: /Васин\s+А\./gi,                 to: 'Васин Егор' },
    { re: /Васин(?!\s+[А-ЯЁ])/gi,          to: 'Васин Егор' },

    /* ---- Самарцев ---- */
    { re: /Самарцев\s+Александрович(?!\w)/gi, to: 'Самарцев Марк' },
    { re: /Самарцев\s+Александр(?!\w)/gi,     to: 'Самарцев Марк' },
    { re: /Самарцев\s+А\./gi,                 to: 'Самарцев Марк' },
    { re: /Самарцев(?!\s+[А-ЯЁ])/gi,          to: 'Самарцев Марк' },

    /* ---- Светличный ---- */
    { re: /Светличный\s+Даниил(?!\w)/gi,   to: 'Светличный Никита' },
    { re: /Светличный\s+Данила(?!\w)/gi,   to: 'Светличный Никита' },
    { re: /Светличный\s+Данил(?!\w)/gi,    to: 'Светличный Никита' },
    { re: /Светличный\s+Д\./gi,            to: 'Светличный Никита' },
    { re: /Светличный(?!\s+[А-ЯЁ])/gi,     to: 'Светличный Никита' },

    /* ---- Аскаржонов / Оскарджонов ---- */
    { re: /Оскарджонов\s+Абубакир(?!\w)/gi, to: 'Аскаржонов Абубакир' },
    { re: /Абубакир\s+Оскарджонов(?!\w)/gi, to: 'Аскаржонов Абубакир' },
    { re: /Абубакар\s+Оскарджонов(?!\w)/gi, to: 'Аскаржонов Абубакир' },
    { re: /Аскаржанов\s+Абубакир(?!\w)/gi,  to: 'Аскаржонов Абубакир' },
    { re: /Оскарджонов(?!\s+[А-ЯЁ])/gi,     to: 'Аскаржонов Абубакир' },
    { re: /Аскаржанов(?!\s+[А-ЯЁ])/gi,      to: 'Аскаржонов Абубакир' },

    /* ---- Гебейдуллов ---- */
    { re: /Гебейдуллов\s+Рамиль(?!\w)/gi,  to: 'Гебейдуллов Линар' },
    { re: /Гебейдуллов\s+Рамил(?!\w)/gi,   to: 'Гебейдуллов Линар' },
    { re: /Гебейдуллов\s+Р\./gi,           to: 'Гебейдуллов Линар' },

    /* ---- Тимаков ---- */
    { re: /Тимаков\s+Владислав(?!\w)/gi,   to: 'Тимаков Владимир' },
    { re: /Тимаков\s+В\./gi,               to: 'Тимаков Владимир' },

    /* ---- Атавин ---- */
    { re: /Отавин\s+Кирилл(?!\w)/gi,       to: 'Атавин Кирилл' },
    { re: /Отавин\s+К\./gi,                to: 'Атавин Кирилл' },
    { re: /Отавин(?!\s+[А-ЯЁ])/gi,         to: 'Атавин Кирилл' },

    /* ---- Камалтдинов ---- */
    { re: /Камалтдинов\s+Ильяз(?!\w)/gi,   to: 'Камалтдинов Ильяс' },

    /* ---- Дрягин / Драгин ---- */
    { re: /Дрягин\s+Михаил(?!\w)/gi,       to: 'Драгин Михаил' },
    { re: /Дрягин\s+М\./gi,                to: 'Драгин Михаил' },
    { re: /Дрягин(?!\s+[А-ЯЁ])/gi,         to: 'Драгин Михаил' }
  ];

  /* ============================================================
     3. УТИЛИТЫ
     ============================================================ */
  function normalizeKey(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Канонизация одного имени.
   * Вход: «Васин Андрей», «Васин А.», «Васин»
   * Выход: «Васин Егор» или исходное, если совпадений нет
   */
  function getCanonicalDisplayName(rawName) {
    if (!rawName) return '';
    var clean = String(rawName).trim();
    if (!clean) return '';

    /* 1. Прямой ключ в словаре */
    var key = normalizeKey(clean);
    if (window.LFLD_CANONICAL_NAMES[key]) {
      return window.LFLD_CANONICAL_NAMES[key];
    }

    /* 2. Ключ по первой фамилии */
    var firstWord = key.split('_')[0];
    if (firstWord && window.LFLD_CANONICAL_NAMES[firstWord]) {
      /* Применяем только если исходник — 1 слово (одна фамилия) */
      if (key.split('_').length === 1) {
        return window.LFLD_CANONICAL_NAMES[firstWord];
      }
    }

    /* 3. Regexp-правила для многословных имён */
    for (var i = 0; i < REPLACEMENT_RULES.length; i++) {
      var r = REPLACEMENT_RULES[i];
      /* Сброс lastIndex для флага g */
      r.re.lastIndex = 0;
      if (r.re.test(clean)) {
        r.re.lastIndex = 0;
        var replaced = clean.replace(r.re, r.to);
        if (replaced !== clean) return replaced;
      }
    }

    return clean;
  }

  /**
   * Канонизация целой строки scorers.
   * Например: "Комета: Васин Андрей (2)/Поляков А.; МИФИ: Васин А. (1)"
   * Превратит: "Комета: Васин Егор (2)/Поляков А.; МИФИ: Васин Егор (1)"
   */
  function canonizeText(str) {
    if (!str || typeof str !== 'string') return str;
    var result = str;
    for (var i = 0; i < REPLACEMENT_RULES.length; i++) {
      var r = REPLACEMENT_RULES[i];
      r.re.lastIndex = 0;
      result = result.replace(r.re, r.to);
    }
    return result;
  }

  window.getCanonicalDisplayName = getCanonicalDisplayName;
  window.canonizeText = canonizeText;

  /* ============================================================
     4. ПАТЧ ОДНОГО ТУРНИРА
     ============================================================ */
  function patchTournament(t) {
    if (!t || typeof t !== 'object') return 0;
    var changed = 0;

    /* --- 4a. matches[].scorers + eventsHome/Away --- */
    if (Array.isArray(t.matches)) {
      t.matches.forEach(function (m) {
        if (!m) return;
        if (typeof m.scorers === 'string' && m.scorers) {
          var fixed = canonizeText(m.scorers);
          if (fixed !== m.scorers) { m.scorers = fixed; changed++; }
        }
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(m[side])) return;
          m[side].forEach(function (ev) {
            if (!ev) return;
            if (ev.player) {
              var cp = getCanonicalDisplayName(ev.player);
              if (cp !== ev.player) { ev.player = cp; changed++; }
            }
            if (ev.assist) {
              var ca = getCanonicalDisplayName(ev.assist);
              if (ca !== ev.assist) { ev.assist = ca; changed++; }
            }
          });
        });
      });
    }

    /* --- 4b. playoff.matches --- */
    if (t.playoff && Array.isArray(t.playoff.matches)) {
      t.playoff.matches.forEach(function (m) {
        if (!m) return;
        if (typeof m.scorers === 'string' && m.scorers) {
          var fixedP = canonizeText(m.scorers);
          if (fixedP !== m.scorers) { m.scorers = fixedP; changed++; }
        }
      });
    }

    /* --- 4c. teams[club][] — список состава --- */
    if (t.teams && typeof t.teams === 'object') {
      Object.keys(t.teams).forEach(function (club) {
        var arr = t.teams[club];
        if (!Array.isArray(arr)) return;
        arr.forEach(function (p) {
          if (!p || !p.name) return;
          var canon = getCanonicalDisplayName(p.name);
          if (canon !== p.name) { p.name = canon; changed++; }
        });
      });
    }

    /* --- 4d. players[] — плоский список --- */
    if (Array.isArray(t.players)) {
      t.players.forEach(function (p) {
        if (!p || !p.name) return;
        var canon = getCanonicalDisplayName(p.name);
        if (canon !== p.name) { p.name = canon; changed++; }
      });
    }

    return changed;
  }

  /* ============================================================
     5. ГЛОБАЛЬНОЕ ПРИМЕНЕНИЕ
     ============================================================ */
  function applyToAll() {
    var total = 0;

    /* 5a. LFLD_MASTER_DB */
    var M = window.LFLD_MASTER_DB;
    if (M) {
      Object.keys(M).forEach(function (key) {
        if (key === 'teamPhotos' || key === 'playerPhotos') return;
        var t = M[key];
        if (t && typeof t === 'object') total += patchTournament(t);
      });
    }

    /* 5b. tournamentsData */
    if (window.tournamentsData) {
      Object.keys(window.tournamentsData).forEach(function (key) {
        var t = window.tournamentsData[key];
        if (t && typeof t === 'object') total += patchTournament(t);
      });
    }

    /* 5c. localStorage */
    try {
      var raw = localStorage.getItem('ff_tournaments');
      if (raw) {
        var data = JSON.parse(raw);
        var localChanged = 0;
        Object.keys(data).forEach(function (key) {
          var t = data[key];
          if (t && typeof t === 'object') localChanged += patchTournament(t);
        });
        if (localChanged) {
          localStorage.setItem('ff_tournaments', JSON.stringify(data));
          total += localChanged;
        }
      }
    } catch (e) {}

    if (total) {
      console.log('[lfld-canonical-names] Исправлено имён:', total);
      /* Принудительная перерисовка */
      try { if (window.renderTourney) window.renderTourney(); } catch (e) {}
      try { if (window.renderHomeUpcoming) window.renderHomeUpcoming(); } catch (e) {}
      try { if (window.renderAffiche) window.renderAffiche(); } catch (e) {}
      try { if (window.updateDynamicTabs) window.updateDynamicTabs(); } catch (e) {}
      try { if (window.saveTournamentsToStorage) window.saveTournamentsToStorage(); } catch (e) {}
    } else {
      console.log('[lfld-canonical-names] Все имена уже канонические');
    }
    return total;
  }

  /* ============================================================
     6. ПАТЧ PlayerResolver.resolve
     Гарантирует канонический full при открытии досье
     ============================================================ */
  function patchPlayerResolver() {
    if (!window.PlayerResolver || !window.PlayerResolver.resolve) return;
    if (window.PlayerResolver.__patchedCanonical) return;

    var orig = window.PlayerResolver.resolve.bind(window.PlayerResolver);
    window.PlayerResolver.resolve = function (ref, clubHint) {
      var result = orig(ref, clubHint);
      if (result && result.full) {
        var canon = getCanonicalDisplayName(result.full);
        if (canon && canon !== result.full) {
          result = Object.assign({}, result, { full: canon });
        }
      }
      return result;
    };
    window.PlayerResolver.__patchedCanonical = true;
    console.log('[lfld-canonical-names] PlayerResolver запатчен');
  }

  /* ============================================================
     7. ПАТЧ parseCardScorers / parseScorersFull
     На случай, если рендер получает свежие объекты
     ============================================================ */
  function patchParseFunctions() {
    /* parseCardScorers */
    if (window.parseCardScorers && !window.parseCardScorers.__patchedCanonical) {
      var origCard = window.parseCardScorers;
      window.parseCardScorers = function (scorersStr, team1, team2) {
        var result = origCard(scorersStr, team1, team2);
        if (result && typeof result === 'object') {
          Object.keys(result).forEach(function (club) {
            var side = result[club];
            if (!side) return;
            (side.goals || []).forEach(function (g) {
              if (g && g.name) g.name = getCanonicalDisplayName(g.name);
              if (g && g.assist) g.assist = getCanonicalDisplayName(g.assist);
            });
            (side.yellow || []).forEach(function (n, i) {
              if (typeof n === 'string') side.yellow[i] = getCanonicalDisplayName(n);
              else if (n && n.name) n.name = getCanonicalDisplayName(n.name);
            });
            (side.red || []).forEach(function (n, i) {
              if (typeof n === 'string') side.red[i] = getCanonicalDisplayName(n);
              else if (n && n.name) n.name = getCanonicalDisplayName(n.name);
            });
          });
        }
        return result;
      };
      window.parseCardScorers.__patchedCanonical = true;
      console.log('[lfld-canonical-names] parseCardScorers запатчен');
    }

    /* parseScorersFull */
    if (window.parseScorersFull && !window.parseScorersFull.__patchedCanonical) {
      var origFull = window.parseScorersFull;
      window.parseScorersFull = function (str, t1, t2) {
        var result = origFull(str, t1, t2);
        if (result && typeof result === 'object') {
          Object.keys(result).forEach(function (club) {
            var side = result[club];
            if (!side) return;
            (side.goals || []).forEach(function (g) {
              if (g && g.name) g.name = getCanonicalDisplayName(g.name);
              if (g && g.assist) g.assist = getCanonicalDisplayName(g.assist);
            });
            (side.yellow || []).forEach(function (n, i) {
              if (typeof n === 'string') side.yellow[i] = getCanonicalDisplayName(n);
              else if (n && n.name) n.name = getCanonicalDisplayName(n.name);
            });
            (side.red || []).forEach(function (n, i) {
              if (typeof n === 'string') side.red[i] = getCanonicalDisplayName(n);
              else if (n && n.name) n.name = getCanonicalDisplayName(n.name);
            });
          });
        }
        return result;
      };
      window.parseScorersFull.__patchedCanonical = true;
      console.log('[lfld-canonical-names] parseScorersFull запатчен');
    }
  }

  /* ============================================================
     8. АВТОЗАПУСК — с несколькими проходами
     (база подгружается динамически с антикэш-параметром)
     ============================================================ */
  function boot() {
    patchPlayerResolver();
    patchParseFunctions();
    applyToAll();

    /* Повторные заходы */
    setTimeout(function () { patchPlayerResolver(); patchParseFunctions(); }, 600);
    setTimeout(function () { applyToAll(); }, 1000);
    setTimeout(function () { applyToAll(); }, 2500);
    setTimeout(function () { applyToAll(); }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ============================================================
     9. ЭКСПОРТ
     ============================================================ */
  window.applyCanonicalNames = applyToAll;
  window.LFLD_CANONICAL_APPLY = applyToAll;

  console.log('[lfld-canonical-names] v1.0 загружен · Васин Егор · Самарцев Марк · Светличный Никита · Аскаржонов Абубакир · Гебейдуллов Линар · Тимаков Владимир · Атавин Кирилл');
})();