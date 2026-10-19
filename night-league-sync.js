/* ============================================================
   night-league-sync.js v1.0

   ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ МАТЧЕЙ НОЧНОЙ ЛИГИ

   Проблема:
   - app.js читает старый кэш из localStorage
   - Матчи 2 тура не отображаются

   Решение:
   - После загрузки LFLD_MASTER_DB принудительно перезаписываем
     matches в window.tournamentsData['night_league_8x8']
   - Обновляем teams (для статистики)
   - Сохраняем в localStorage (lfld_tournaments_v3 + ff_tournaments)
   - Перерисовываем UI
   ============================================================ */
(function () {
  'use strict';

  var MASTER_KEY = 'tournament_night';
  var PUBLIC_KEY = 'night_league_8x8';

  var STORAGE_KEYS = [
    'lfld_tournaments_v3',
    'ff_tournaments'
  ];

  function normClub(name) {
    return String(name || '').toLowerCase().replace(/ё/g, 'е').trim();
  }

  /**
   * Получить актуальные данные из мастер-базы.
   */
  function getMasterNight() {
    var M = window.LFLD_MASTER_DB;
    if (!M) return null;
    return M[MASTER_KEY] || M[PUBLIC_KEY] || null;
  }

  /**
   * Принудительная синхронизация матчей и команд.
   */
  function forceSync() {
    var master = getMasterNight();
    if (!master) {
      console.warn('[night-league-sync] LFLD_MASTER_DB.tournament_night не найден');
      return false;
    }

    if (!Array.isArray(master.matches) || !master.matches.length) {
      console.warn('[night-league-sync] В мастер-базе нет matches для tournament_night');
      return false;
    }

    /* 1. Проверяем, что в window.tournamentsData есть нужный ключ */
    if (!window.tournamentsData) {
      console.warn('[night-league-sync] window.tournamentsData ещё не инициализирован');
      return false;
    }

    /* 2. Создаём или обновляем публичный турнир */
    if (!window.tournamentsData[PUBLIC_KEY]) {
      window.tournamentsData[PUBLIC_KEY] = {
        title: master.title || 'Ночная лига 8х8 (2026)',
        format: master.format || '8х8',
        teams: Array.isArray(master.teams)
          ? Object.keys(master.teams)
          : [],
        rosters: {},
        matches: [],
        awards: master.awards || []
      };
    }

    var pub = window.tournamentsData[PUBLIC_KEY];

    /* 3. Принудительно перезаписываем matches */
    var beforeCount = (pub.matches || []).length;
    pub.matches = JSON.parse(JSON.stringify(master.matches));

    /* 4. Принудительно обновляем teams (для команды) */
    if (master.teams && typeof master.teams === 'object') {
      /* Публичный формат: teams — массив названий, rosters — объект */
      var teamNames = Object.keys(master.teams);
      pub.teams = teamNames;

      /* Раскладываем ростеры по клубам в публичный формат */
      if (!pub.rosters) pub.rosters = {};
      teamNames.forEach(function (club) {
        var roster = master.teams[club];
        if (!Array.isArray(roster)) return;
        pub.rosters[club] = roster.map(function (p) {
          return p && p.name ? p.name : '';
        }).filter(Boolean);
      });
    }

    /* 5. Заголовок на случай, если он изменился */
    if (master.title) pub.title = master.title;

    var afterCount = pub.matches.length;

    console.log('[night-league-sync] ✅ Матчи синхронизированы:',
      'было', beforeCount, '→ стало', afterCount,
      '| матчей 2 тура:', pub.matches.filter(function (m) {
        return m && m.tour === '2 ТУР';
      }).length
    );

    /* 6. Сохраняем в localStorage во все известные ключи */
    STORAGE_KEYS.forEach(function (key) {
      try {
        localStorage.setItem(key, JSON.stringify(window.tournamentsData));
      } catch (e) {
        console.warn('[night-league-sync] save ' + key + ' error:', e);
      }
    });

    /* 7. Дополнительно сохраняем через штатный saveTournamentsToStorage */
    try {
      if (typeof window.saveTournamentsToStorage === 'function') {
        window.saveTournamentsToStorage();
      }
    } catch (e) {}

    /* 8. Перерисовываем UI */
    setTimeout(function () {
      try { if (window.renderTourney) window.renderTourney(); } catch (e) {}
      try { if (window.renderHomeUpcoming) window.renderHomeUpcoming(); } catch (e) {}
      try { if (window.updateDynamicTabs) window.updateDynamicTabs(); } catch (e) {}
      try { if (window.renderAffiche) window.renderAffiche(); } catch (e) {}
    }, 50);

    return true;
  }

  /**
   * Поллинг: ждём появления master-базы и tournamentsData.
   */
  function waitAndSync(attempt) {
    attempt = attempt || 0;
    if (attempt > 40) {
      console.warn('[night-league-sync] Превышено время ожидания');
      return;
    }

    var master = getMasterNight();
    var hasPub = !!(window.tournamentsData && window.tournamentsData[PUBLIC_KEY]);

    if (master && master.matches && master.matches.length && hasPub) {
      /* Проверяем, есть ли уже 2 тур — иначе синхронизируем */
      var pub = window.tournamentsData[PUBLIC_KEY];
      var hasSecondRound = (pub.matches || []).some(function (m) {
        return m && m.tour === '2 ТУР';
      });

      if (!hasSecondRound) {
        forceSync();
      } else {
        console.log('[night-league-sync] Матчи 2 тура уже в кэше — проверяем полное совпадение');
        /* Всё равно сверяем по количеству */
        if ((pub.matches || []).length !== master.matches.length) {
          forceSync();
        }
      }
      return;
    }

    /* Ждём дальше */
    setTimeout(function () { waitAndSync(attempt + 1); }, 250);
  }

  /* ============================================================
     ПЕРЕХВАТ __LFLD_AFTER_DB_LOAD__ — если он уже определён,
     оборачиваем его, чтобы синхронизация сработала сразу
     после импорта базы
     ============================================================ */
  (function hookAfterLoad() {
    var orig = window.__LFLD_AFTER_DB_LOAD__;
    window.__LFLD_AFTER_DB_LOAD__ = function () {
      if (typeof orig === 'function') {
        try { orig(); } catch (e) { console.warn('[night-league-sync] orig afterLoad error:', e); }
      }
      /* Ждём чуть-чуть, чтобы остальные модули обновили tournamentsData */
      setTimeout(forceSync, 100);
    };
  })();

  /* ============================================================
     РЕАКЦИЯ НА ИЗМЕНЕНИЯ В localStorage
     (если админка сохранила новые данные — подхватываем)
     ============================================================ */
  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === 'ff_tournaments' || e.key === 'lfld_tournaments_v3') {
      setTimeout(forceSync, 100);
    }
  });

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  function boot() {
    /* Синхронизируем сразу (если база уже загружена) */
    setTimeout(function () { waitAndSync(0); }, 500);
    /* И повторно — на случай поздней инициализации */
    setTimeout(function () { waitAndSync(0); }, 2000);
    setTimeout(function () { waitAndSync(0); }, 4000);

    console.log('[night-league-sync] v1.0 загружен');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Публичный API — на случай ручной синхронизации */
  window.forceNightLeagueSync = forceSync;
  window.getNightLeagueMaster = getMasterNight;

  console.log('[night-league-sync] v1.0 · модуль принудительной синхронизации матчей');
})();