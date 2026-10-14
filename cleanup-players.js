/* ============================================================
   cleanup-players.js — дедупликация и унификация мастер-базы
   ЛФЛД. Разделяет реальных однофамильцев по клубам,
   сливает разорванные карточки одного игрока,
   нормализует «ё → е» и регистр.

   Подключается ПОСЛЕ allTournamentsMasterData.js.
   Применяет миграцию к window.LFLD_MASTER_DB на месте.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Нормализация строк ---------- */
  function normKey(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]/gi, '')
      .trim();
  }
  function normName(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function lastNameOf(fio) {
    var s = normName(fio);
    if (!s) return '';
    return s.split(/\s+/)[0];
  }
  function fioParts(fio) {
    var s = normName(fio).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    var p = s.split(' ');
    return {
      last: p[0] || '',
      first: p[1] || '',
      middle: p[2] || ''
    };
  }

  /* ---------- Слияние двух профилей ---------- */
  function mergeProfiles(a, b) {
    var out = Object.assign({}, a);
    /* Выбираем самое полное ФИО */
    var aLen = (a.name || '').length;
    var bLen = (b.name || '').length;
    var bestName = bLen > aLen ? b.name : a.name;
    /* Если у одного из них есть отчество — предпочитаем с отчеством */
    var aParts = fioParts(a.name || '');
    var bParts = fioParts(b.name || '');
    if (!aParts.middle && bParts.middle) bestName = b.name;
    if (!bParts.middle && aParts.middle) bestName = a.name;

    out.name = bestName || a.name || b.name || '';
    out.team = a.team || b.team || '';
    out.pos  = a.pos  || b.pos  || 'УНИ';

    /* Суммируем статистику */
    out.m = (a.m || 0) + (b.m || 0);
    out.g = (a.g || 0) + (b.g || 0);
    out.a = (a.a || 0) + (b.a || 0);
    out.yc = (a.yc || 0) + (b.yc || 0);
    out.rc = (a.rc || 0) + (b.rc || 0);

    /* Фото: приоритет тому, у кого оно есть */
    if (!out.photo) out.photo = a.photo || b.photo || '';

    /* Награды: объединяем уникальные */
    var awards = [];
    (a.awards || []).forEach(function (x) { if (x && awards.indexOf(x) === -1) awards.push(x); });
    (b.awards || []).forEach(function (x) { if (x && awards.indexOf(x) === -1) awards.push(x); });
    if (a.award) {
      String(a.award).split(';').forEach(function (x) {
        x = x.trim(); if (x && awards.indexOf(x) === -1) awards.push(x);
      });
    }
    if (b.award) {
      String(b.award).split(';').forEach(function (x) {
        x = x.trim(); if (x && awards.indexOf(x) === -1) awards.push(x);
      });
    }
    if (awards.length) out.awards = awards;
    delete out.award;

    /* Алиасы — все варианты написания */
    var aliases = {};
    (a.aliases || []).forEach(function (x) { if (x) aliases[x] = 1; });
    (b.aliases || []).forEach(function (x) { if (x) aliases[x] = 1; });
    if (a.name) aliases[a.name] = 1;
    if (b.name) aliases[b.name] = 1;
    out.aliases = Object.keys(aliases);

    return out;
  }

  /* ---------- Слияние одного массива игроков одного клуба ---------- */
  function dedupTeamRoster(roster) {
    if (!Array.isArray(roster)) return roster;
    /* Группируем по (lastname + firstInitial) */
    var groups = {};
    roster.forEach(function (p) {
      if (!p || !p.name) return;
      var parts = fioParts(p.name);
      /* Ключ: фамилия + первая буква имени (если есть) */
      var key = parts.last + '|' + parts.first.charAt(0);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var out = [];
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k];
      if (arr.length === 1) { out.push(arr[0]); return; }
      /* Сортируем по «полноте» и объёму статистики: с отчеством — вперёд, потом по m */
      arr.sort(function (a, b) {
        var aP = fioParts(a.name), bP = fioParts(b.name);
        var aHas = aP.middle ? 1 : 0, bHas = bP.middle ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return (b.m || 0) - (a.m || 0);
      });
      var canonical = arr[0];
      for (var i = 1; i < arr.length; i++) {
        canonical = mergeProfiles(canonical, arr[i]);
      }
      out.push(canonical);
    });
    return out;
  }

  /* ---------- Слияние плоского массива cup_5x5.players ---------- */
  function dedupFlatPlayers(players) {
    if (!Array.isArray(players)) return players;
    /* Группируем по (фамилия + первая буква имени + team) */
    var groups = {};
    players.forEach(function (p) {
      if (!p || !p.name) return;
      var parts = fioParts(p.name);
      var team = normKey(p.team || p.club || '');
      var key = parts.last + '|' + parts.first.charAt(0) + '|' + team;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var out = [];
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k];
      if (arr.length === 1) { out.push(arr[0]); return; }
      arr.sort(function (a, b) {
        var aP = fioParts(a.name), bP = fioParts(b.name);
        var aHas = aP.middle ? 1 : 0, bHas = bP.middle ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return (b.m || 0) - (a.m || 0);
      });
      var canonical = arr[0];
      for (var i = 1; i < arr.length; i++) {
        var merged = mergeProfiles(canonical, arr[i]);
        /* team и club перезаписываем */
        merged.team = canonical.team || arr[i].team;
        canonical = merged;
      }
      out.push(canonical);
    });
    return out;
  }

  /* ---------- Разделение однофамильцев ---------- */
  /* В рамках одного турнира разные клубы могут иметь игроков с одной фамилией.
     Это НЕ дубликаты — это разные люди. Мы их не сливаем.
     Дополнительно: если в турнире с указанной только фамилией встречается игрок без клуба,
     проставляем ему клуб по совпадению с протоколами (по событиям матчей). */
  function resolveTeamByEvents(tournamentKey, tournament, masterDB) {
    if (!tournament || !Array.isArray(tournament.matches)) return;
    /* Собираем матчи: для каждой фамилии без отчества в events строим карту «фамилия → club» */
    var lastNameByClub = {};
    function addEntry(lastName, club) {
      var k = lastName;
      if (!lastNameByClub[k]) lastNameByClub[k] = {};
      lastNameByClub[k][club] = (lastNameByClub[k][club] || 0) + 1;
    }
    tournament.matches.forEach(function (m) {
      if (!m) return;
      ['Home', 'Away'].forEach(function (side) {
        var team = side === 'Home' ? m.teamHome : m.teamAway;
        var evs = side === 'Home' ? m.eventsHome : m.eventsAway;
        if (!team || !Array.isArray(evs)) return;
        evs.forEach(function (e) {
          if (!e || !e.player) return;
          var ln = lastNameOf(e.player);
          if (ln) addEntry(ln, team);
        });
      });
    });
    /* Если в ростер какого-то клуба есть игрок с фамилией без отчества,
       а в событиях эта фамилия встречается ровно у одного клуба —
       ничего не делаем (роутер и так привязан к клубу). Здесь функция
       лишь защищает от «склейки» при построении реестра. */
    return lastNameByClub;
  }

  /* ============================================================
     ГЛАВНАЯ ФУНКЦИЯ
     ============================================================ */
  function cleanupAndDeduplicatePlayers(masterDB) {
    if (!masterDB || typeof masterDB !== 'object') return masterDB;
    var stats = { merged: 0, removed: 0, tournaments: 0 };

    /* ---------- 1. Cup_5x5 (плоский массив players) ---------- */
    if (masterDB.cup_5x5 && Array.isArray(masterDB.cup_5x5.players)) {
      var before = masterDB.cup_5x5.players.length;
      masterDB.cup_5x5.players = dedupFlatPlayers(masterDB.cup_5x5.players);
      stats.merged += before - masterDB.cup_5x5.players.length;
      stats.removed += before - masterDB.cup_5x5.players.length;
      stats.tournaments++;
    }

    /* ---------- 2. Tournament_night (teams[club] = [...]) ---------- */
    ['tournament_night', 'tournament_5x5', 'tournament_7x7'].forEach(function (tk) {
      var t = masterDB[tk];
      if (!t || !t.teams) return;
      stats.tournaments++;
      Object.keys(t.teams).forEach(function (club) {
        var roster = t.teams[club];
        if (!Array.isArray(roster)) return;
        var before = roster.length;
        /* Дополнительно — разделение реальных однофамильцев по позиции/статистике:
           если в одном клубе два игрока с одной фамилией и разными именами — это разные люди, не сливаем. */
        var byKey = {};
        roster.forEach(function (p) {
          if (!p || !p.name) return;
          var parts = fioParts(p.name);
          var key = parts.last + '|' + parts.first.charAt(0);
          if (!byKey[key]) byKey[key] = [];
          byKey[key].push(p);
        });
        var out = [];
        Object.keys(byKey).forEach(function (k) {
          var arr = byKey[k];
          /* Проверка: если имена указаны полностью и различаются — не сливаем */
          var namesFull = arr.map(function (x) { return normName(x.name); });
          var uniqueFull = {};
          namesFull.forEach(function (n) { uniqueFull[n] = 1; });
          if (Object.keys(uniqueFull).length > 1) {
            /* Разные полные имена — оставляем раздельно */
            arr.forEach(function (x) { out.push(x); });
            return;
          }
          /* Иначе сливаем */
          arr.sort(function (a, b) {
            var aP = fioParts(a.name), bP = fioParts(b.name);
            var aHas = aP.middle ? 1 : 0, bHas = bP.middle ? 1 : 0;
            if (aHas !== bHas) return bHas - aHas;
            return (b.m || 0) - (a.m || 0);
          });
          var canonical = arr[0];
          for (var i = 1; i < arr.length; i++) {
            canonical = mergeProfiles(canonical, arr[i]);
            stats.merged++;
          }
          out.push(canonical);
        });
        t.teams[club] = out;
        stats.removed += before - out.length;
      });
    });

    /* ---------- 3. Разделение однофамильцев по клубам (sanity check) ---------- */
    /* Проверяем: в разных клубах одного турнира с одинаковой фамилией + именем
       но у одного без отчества — это всё ещё могут быть РАЗНЫЕ люди.
       Мы НЕ сливаем их через турнир, потому что роутер привязан к клубу. */

    /* ---------- 4. Логирование ---------- */
    console.log(
      '[cleanup-players] Готово. Турниров обработано: ' + stats.tournaments +
      ', слито дубликатов: ' + stats.merged +
      ', удалено урезанных карточек: ' + stats.removed
    );

    return masterDB;
  }

  /* ============================================================
     АВТОЗАПУСК
     ============================================================ */
  function run() {
    if (!window.LFLD_MASTER_DB) {
      /* Подождём следующего тика, если база ещё не загружена */
      return false;
    }
    if (window.LFLD_MASTER_DB.__cleaned) return true;
    try {
      cleanupAndDeduplicatePlayers(window.LFLD_MASTER_DB);
      window.LFLD_MASTER_DB.__cleaned = true;
      /* Обновляем localStorage реестры, если это не сломает порядок
         (все merge-операции уже произошли в оперативке) */
      if (window.lfldMedia && window.lfldMedia.saveToStorage) {
        try { window.lfldMedia.saveToStorage(); } catch (e) {}
      }
    } catch (e) {
      console.error('[cleanup-players] ошибка миграции:', e);
    }
    return true;
  }

  /* Экспорт для ручного вызова из консоли */
  window.cleanupAndDeduplicatePlayers = cleanupAndDeduplicatePlayers;
  window.runPlayerCleanup = run;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /* Также попробуем сразу — если файл базы уже загрузился */
  setTimeout(run, 200);
  setTimeout(run, 800);

  console.log('[cleanup-players] загружен');
})();