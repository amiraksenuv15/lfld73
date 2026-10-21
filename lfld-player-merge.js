/* ============================================================
   lfld-player-merge.js v1.0

   ЗАДАЧИ:
   1. Объединить раздвоенные профили в database.js:
      - Шинкаренко Данил + Шинкаренко Данил Сергеевич
      - Ломовский Кирилл + Ломовский Кирилл Владиславович
      - Егоров Игнатий + Егоров Игнат Денисович
      - Нагорнов Илья + Нагорнов Илья Александрович
        (НЕ смешивать с Нагорнов Максим из ПТИМАШ!)

   2. Исправить автора голов в матче 2 тура:
      "Алексеев М." → "Алексеев Матвей" (p_alekseev_matvey)
      НЕ путать с Алексеевым Евгением (ЗАЩ)

   3. Нормализовать имена в LFLD_MASTER_DB.teams
      (Егоров Игнатий → Егоров Игнат, и т.д.)

   4. Обновить LFLD_PLAYER_IDS каноническими ID
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     КОНФИГУРАЦИЯ MERGE-ПАР
     ============================================================ */
  var MERGE_CONFIG = [
    {
      canonicalId: 'p_shinkarenko_danil',
      display: 'Шинкаренко Данил',
      data: {
        lastName: 'Шинкаренко',
        firstName: 'Данил',
        middleName: 'Сергеевич',
        birthDate: '23.03.2008',
        position: 'ВРТ'
      },
      /* По каким вариантам искать */
      matchNames: [
        'шинкаренко данил',
        'шинкаренко данил сергеевич'
      ],
      ensureClubs: ['Комета', 'Металлист'],
      ensureAliases: ['Шинкаренко Данил', 'Шинкаренко Данил Сергеевич']
    },
    {
      canonicalId: 'p_lomovskiy_kirill',
      display: 'Ломовский Кирилл',
      data: {
        lastName: 'Ломовский',
        firstName: 'Кирилл',
        middleName: 'Владиславович',
        birthDate: '08.02.1999',
        position: 'НАП'
      },
      matchNames: [
        'ломовский кирилл',
        'ломовский кирилл владиславович'
      ],
      ensureClubs: ['Нейтрон', 'Металлист'],
      ensureAliases: ['Ломовский Кирилл', 'Ломовский Кирилл Владиславович'],
      keepPhoto: true
    },
    {
      canonicalId: 'p_egorov_ignat',
      display: 'Егоров Игнат',
      data: {
        lastName: 'Егоров',
        firstName: 'Игнат',
        middleName: 'Денисович',
        birthDate: '06.05.2010',
        position: 'ПЗ'
      },
      matchNames: [
        'егоров игнат',
        'егоров игнатий',
        'егоров игнат денисович',
        'егоров игнатий денисович'
      ],
      ensureClubs: ['Металлист-М', 'Металлист'],
      ensureAliases: ['Егоров Игнатий', 'Егоров Игнат', 'Егоров Игнат Денисович']
    },
    {
      canonicalId: 'p_nagornov_ilya',
      display: 'Нагорнов Илья',
      data: {
        lastName: 'Нагорнов',
        firstName: 'Илья',
        middleName: 'Александрович',
        birthDate: '02.05.2007',
        position: 'ЗАЩ'
      },
      matchNames: [
        'нагорнов илья',
        'нагорнов илья александрович'
      ],
      ensureClubs: ['Химмаш', 'ДИТИ НИЯУ МИФИ'],
      ensureAliases: ['Нагорнов Илья', 'Нагорнов Илья Александрович']
    }
  ];

  /* ============================================================
     УТИЛИТЫ
     ============================================================ */
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normKey(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]/gi, '')
      .trim();
  }
  function playerFullName(p) {
    if (!p) return '';
    return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ').trim();
  }
  function playerShortName(p) {
    if (!p) return '';
    return [p.lastName, p.firstName].filter(Boolean).join(' ').trim();
  }

  /* ============================================================
     СЛИЯНИЕ ПРОФИЛЕЙ В database.js
     ============================================================ */
  function mergeProfilesInDatabase() {
    if (!window.database || !window.database.players) {
      console.warn('[merge] window.database не загружен');
      return 0;
    }

    var db = window.database.players();
    var mergedCount = 0;

    MERGE_CONFIG.forEach(function (cfg) {
      /* Ищем всех кандидатов по имени */
      var candidates = [];
      Object.keys(db).forEach(function (id) {
        var p = db[id];
        if (!p) return;
        var full = norm(playerFullName(p));
        var short = norm(playerShortName(p));

        var isMatch = cfg.matchNames.some(function (target) {
          var t = norm(target);
          return full === t || short === t;
        });

        if (isMatch) {
          candidates.push({ id: id, p: p });
        }
      });

      if (!candidates.length) {
        console.log('[merge] Кандидаты не найдены для:', cfg.display);
        return;
      }

      /* Суммируем статистику, собираем клубы/аварды/алиасы/фото */
      var totalStats = { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0 };
      var allClubs = {};
      var allAwards = {};
      var allAliases = {};
      var allTournaments = {};
      var bestPhoto = '';

      candidates.forEach(function (c) {
        var s = c.p.stats || {};
        totalStats.matches += s.matches || 0;
        totalStats.goals += s.goals || 0;
        totalStats.assists += s.assists || 0;
        totalStats.yellow += s.yellow || 0;
        totalStats.red += s.red || 0;

        (c.p.clubs || []).forEach(function (cl) { if (cl) allClubs[cl] = 1; });
        (c.p.awards || []).forEach(function (aw) { if (aw) allAwards[aw] = 1; });
        (c.p.aliases || []).forEach(function (al) { if (al) allAliases[al] = 1; });
        (c.p.tournaments || []).forEach(function (tk) { if (tk) allTournaments[tk] = 1; });

        if (c.p.photo && !bestPhoto) bestPhoto = c.p.photo;
      });

      /* Собираем канонический профиль */
      var merged = {
        id: cfg.canonicalId,
        lastName: cfg.data.lastName,
        firstName: cfg.data.firstName,
        middleName: cfg.data.middleName || '',
        birthDate: cfg.data.birthDate,
        position: cfg.data.position,
        photo: bestPhoto || '',
        stats: totalStats,
        clubs: Object.keys(allClubs),
        awards: Object.keys(allAwards),
        aliases: Object.keys(allAliases),
        tournaments: Object.keys(allTournaments)
      };

      /* Добавляем обязательные клубы и алиасы */
      (cfg.ensureClubs || []).forEach(function (cl) {
        if (merged.clubs.indexOf(cl) === -1) merged.clubs.push(cl);
      });
      (cfg.ensureAliases || []).forEach(function (al) {
        if (merged.aliases.indexOf(al) === -1) merged.aliases.push(al);
      });

      /* Удаляем всех кандидатов */
      candidates.forEach(function (c) {
        delete db[c.id];
      });

      /* Добавляем канонический */
      db[cfg.canonicalId] = merged;
      mergedCount++;

      console.log('[merge] ✅ Объединён:', cfg.canonicalId,
        '| записей:', candidates.length,
        '| игр:', totalStats.matches,
        '| голов:', totalStats.goals,
        '| фото:', bestPhoto ? 'есть' : 'нет');
    });

    if (window.database.save) {
      try { window.database.save(); } catch (e) {}
    }

    return mergedCount;
  }

  /* ============================================================
     СИНХРОНИЗАЦИЯ LFLD_PLAYER_IDS
     ============================================================ */
  function syncPlayerIds() {
    window.LFLD_PLAYER_IDS = window.LFLD_PLAYER_IDS || {};

    /* Маппинг всех вариантов имени → канонический ID */
    var idMapping = {
      'шинкаренко_данил': 'p_shinkarenko_danil',
      'шинкаренко_данил_сергеевич': 'p_shinkarenko_danil',

      'ломовский_кирилл': 'p_lomovskiy_kirill',
      'ломовский_кирилл_владиславович': 'p_lomovskiy_kirill',

      'егоров_игнат': 'p_egorov_ignat',
      'егоров_игнатий': 'p_egorov_ignat',
      'егоров_игнат_денисович': 'p_egorov_ignat',
      'егоров_игнатий_денисович': 'p_egorov_ignat',

      'нагорнов_илья': 'p_nagornov_ilya',
      'нагорнов_илья_александрович': 'p_nagornov_ilya',

      /* Нагорнов Максим — отдельный игрок, НЕ трогаем */
      'нагорнов_максим': 'p_nagornov_maksim',

      /* Алексеевы — отдельные профили */
      'алексеев_матвей': 'p_alekseev_matvey',
      'алексеев_матвей_евгеньевич': 'p_alekseev_matvey',
      'алексеев_евгений': 'p_alekseev_evgeniy',
      'алексеев_евгений_владимирович': 'p_alekseev_evgeniy',
      'алексеев_м': 'p_alekseev_matvey',
      'алексеев_е': 'p_alekseev_evgeniy'
    };

    Object.keys(idMapping).forEach(function (k) {
      window.LFLD_PLAYER_IDS[k] = idMapping[k];
    });
  }

  /* ============================================================
     НОРМАЛИЗАЦИЯ ИМЁН В LFLD_MASTER_DB.teams
     Заменяем «Егоров Игнатий» → «Егоров Игнат Денисович»
     и другие короткие формы
     ============================================================ */
  function normalizeMasterTeamNames() {
    var M = window.LFLD_MASTER_DB;
    if (!M) return 0;

    /* Правила замены имён */
    var NAME_FIXES = {
      'егоров игнатий': 'Егоров Игнат Денисович',
      'егоров игнат': 'Егоров Игнат Денисович',
      'шинкаренко данил': 'Шинкаренко Данил Сергеевич',
      'ломовский кирилл': 'Ломовский Кирилл Владиславович',
      'нагорнов илья': 'Нагорнов Илья Александрович'
    };

    var changed = 0;
    var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];

    tourneyKeys.forEach(function (tk) {
      var t = M[tk];
      if (!t) return;

      /* teams */
      if (t.teams && typeof t.teams === 'object') {
        Object.keys(t.teams).forEach(function (club) {
          (t.teams[club] || []).forEach(function (p) {
            if (!p || !p.name) return;
            var norm_name = norm(p.name);
            if (NAME_FIXES[norm_name]) {
              p.name = NAME_FIXES[norm_name];
              changed++;
            }
          });
        });
      }

      /* cup_5x5.players */
      if (Array.isArray(t.players)) {
        t.players.forEach(function (p) {
          if (!p || !p.name) return;
          var norm_name = norm(p.name);
          if (NAME_FIXES[norm_name]) {
            p.name = NAME_FIXES[norm_name];
            changed++;
          }
        });
      }
    });

    if (changed) console.log('[merge] Нормализовано имён в master:', changed);
    return changed;
  }

  /* ============================================================
     ФИКС ПРОТОКОЛА: Алексеев М. → Алексеев Матвей
     в матче "Металлист 3:5 Спринт-Кальяри" (2 ТУР)
     ============================================================ */
  function fixAlekseevScorers() {
    var M = window.LFLD_MASTER_DB;
    if (!M) return 0;

    var changed = 0;
    var tourneyKeys = ['tournament_night', 'tournament_5x5', 'tournament_7x7', 'cup_5x5'];

    tourneyKeys.forEach(function (tk) {
      var t = M[tk];
      if (!t || !Array.isArray(t.matches)) return;

      t.matches.forEach(function (m) {
        if (!m) return;

        /* 1. Строка scorers */
        if (typeof m.scorers === 'string' && m.scorers) {
          var original = m.scorers;
          /* Заменяем "Алексеев М." на "Алексеев Матвей" */
          m.scorers = m.scorers.replace(/Алексеев\s+М\./gi, 'Алексеев Матвей');
          if (m.scorers !== original) changed++;
        }

        /* 2. eventsHome / eventsAway */
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(m[side])) return;
          m[side].forEach(function (ev) {
            if (!ev) return;
            if (ev.player && /^Алексеев\s+М\.?$/i.test(ev.player)) {
              ev.player = 'Алексеев Матвей';
              changed++;
            }
            if (ev.assist && /^Алексеев\s+М\.?$/i.test(ev.assist)) {
              ev.assist = 'Алексеев Матвей';
              changed++;
            }
          });
        });
      });

      /* 3. playoff.matches */
      if (t.playoff && Array.isArray(t.playoff.matches)) {
        t.playoff.matches.forEach(function (m) {
          if (!m) return;
          if (typeof m.scorers === 'string' && m.scorers) {
            var o = m.scorers;
            m.scorers = m.scorers.replace(/Алексеев\s+М\./gi, 'Алексеев Матвей');
            if (m.scorers !== o) changed++;
          }
        });
      }
    });

    /* 4. window.tournamentsData (публичный слой) */
    if (window.tournamentsData) {
      Object.keys(window.tournamentsData).forEach(function (tk) {
        var t = window.tournamentsData[tk];
        if (!t || !Array.isArray(t.matches)) return;
        t.matches.forEach(function (m) {
          if (m && typeof m.scorers === 'string' && m.scorers) {
            var o = m.scorers;
            m.scorers = m.scorers.replace(/Алексеев\s+М\./gi, 'Алексеев Матвей');
            if (m.scorers !== o) changed++;
          }
        });
      });
    }

    if (changed) {
      console.log('[merge] Исправлено упоминаний "Алексеев М." → "Алексеев Матвей":', changed);
      if (window.saveTournamentsToStorage) {
        try { window.saveTournamentsToStorage(); } catch (e) {}
      }
    }
    return changed;
  }

  /* ============================================================
     ОБНОВЛЕНИЕ СТАТИСТИКИ АЛЕКСЕЕВА (пересчёт из протоколов)
     ============================================================ */
  function recalcAlekseevStats() {
    if (!window.database || !window.database.players) return 0;

    var db = window.database.players();
    var matveyId = 'p_alekseev_matvey';
    var evgeniyId = 'p_alekseev_evgeniy';

    /* Ищем обоих */
    var matvey = null;
    var evgeniy = null;

    Object.keys(db).forEach(function (id) {
      var p = db[id];
      if (!p) return;
      var full = norm(playerFullName(p));
      if (full.indexOf('алексеев матвей') === 0) matvey = { id: id, p: p };
      if (full.indexOf('алексеев евгений') === 0) evgeniy = { id: id, p: p };
    });

    if (!matvey) return 0;

    /* Пересчитываем голы Алексеева Матвея из всех протоколов */
    var M = window.LFLD_MASTER_DB;
    if (!M) return 0;

    var goals = 0, assists = 0, yellow = 0, red = 0, matches = 0;
    var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];

    tourneyKeys.forEach(function (tk) {
      var t = M[tk];
      if (!t || !Array.isArray(t.matches)) return;
      t.matches.forEach(function (m) {
        if (!m || typeof m.scorers !== 'string' || !m.scorers) return;
        var hasMatch = false;

        /* Ищем "Алексеев Матвей" в scorers */
        if (m.scorers.indexOf('Алексеев Матвей') !== -1) hasMatch = true;

        m.scorers.split(';').forEach(function (part) {
          part = part.trim();
          if (!part) return;
          var sp = part.split(':');
          if (sp.length < 2) return;
          var club = sp[0].trim();
          var rest = sp.slice(1).join(':');

          /* Пропускаем "Спринт-Кальяри" только если это не тот матч */
          var yellowPart = '', redPart = '';
          var y = rest.indexOf('ЖК:'); if (y !== -1) { yellowPart = rest.slice(y + 3); rest = rest.slice(0, y); }
          var k = rest.indexOf('КК:'); if (k !== -1) { redPart = rest.slice(k + 3); rest = rest.slice(0, k); }

          rest.split(',').forEach(function (token) {
            token = token.trim();
            if (!token) return;
            if (/автогол|техническ/i.test(token)) return;
            var cnt = 1;
            var mm = token.match(/\((\d+)\)/);
            if (mm) { cnt = parseInt(mm[1]) || 1; token = token.replace(/\((\d+)\)/, '').trim(); }
            if (token.indexOf('/') !== -1) token = token.split('/')[0].trim();
            token = token.replace(/^\d+[\.\)]\s*/, '').trim();

            if (norm(token).indexOf('алексеев матвей') === 0) {
              goals += cnt;
              hasMatch = true;
            }
          });

          yellowPart.split(',').forEach(function (t) {
            t = t.trim();
            if (norm(t).indexOf('алексеев матвей') === 0) {
              yellow++;
              hasMatch = true;
            }
          });

          redPart.split(',').forEach(function (t) {
            t = t.trim();
            if (norm(t).indexOf('алексеев матвей') === 0) {
              red++;
              hasMatch = true;
            }
          });
        });

        if (hasMatch) matches++;
      });
    });

    /* Обновляем запись Алексеева Матвея */
    if (matvey && matvey.p) {
      matvey.p.birthDate = matvey.p.birthDate || '27.11.2006';
      matvey.p.middleName = matvey.p.middleName || 'Евгеньевич';
      matvey.p.position = matvey.p.position || 'НАП';
      if (!matvey.p.clubs || !matvey.p.clubs.length) {
        matvey.p.clubs = ['Комета', 'Спринт'];
      } else {
        ['Комета', 'Спринт'].forEach(function (cl) {
          if (matvey.p.clubs.indexOf(cl) === -1) matvey.p.clubs.push(cl);
        });
      }
      matvey.p.stats = matvey.p.stats || {};
      matvey.p.stats.matches = Math.max(matvey.p.stats.matches || 0, matches);
      matvey.p.stats.goals = Math.max(matvey.p.stats.goals || 0, goals);
      matvey.p.stats.yellow = Math.max(matvey.p.stats.yellow || 0, yellow);
      matvey.p.stats.red = Math.max(matvey.p.stats.red || 0, red);

      console.log('[merge] Обновлён Алексеев Матвей:',
        'матчи:', matches, 'голы:', goals, 'ЖК:', yellow);
    }

    if (window.database.save) {
      try { window.database.save(); } catch (e) {}
    }
    return matches;
  }

  /* ============================================================
     ГЛАВНЫЙ ЗАПУСК
     ============================================================ */
  function applyAll() {
    try {
      var merged = mergeProfilesInDatabase();
      syncPlayerIds();
      var norm = normalizeMasterTeamNames();
      var fixed = fixAlekseevScorers();
      recalcAlekseevStats();

      if (merged || norm || fixed) {
        /* Перерисовываем интерфейс */
        try { if (window.renderTourney) window.renderTourney(); } catch (e) {}
        try { if (window.renderSidebar) window.renderSidebar(); } catch (e) {}
        try { if (window.renderHomeUpcoming) window.renderHomeUpcoming(); } catch (e) {}
        try { if (window.updateDynamicTabs) window.updateDynamicTabs(); } catch (e) {}
      }
    } catch (e) {
      console.error('[lfld-player-merge] Ошибка:', e);
    }
  }

  function boot() {
    applyAll();
    setTimeout(applyAll, 1000);
    setTimeout(applyAll, 2500);
    setTimeout(applyAll, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Публичный API — для ручного запуска */
  window.applyPlayerMerge = applyAll;
  window.fixAlekseevScorers = fixAlekseevScorers;

  console.log('[lfld-player-merge] v1.0 загружен · 4 merge-пары + фикс Алексеева');
})();