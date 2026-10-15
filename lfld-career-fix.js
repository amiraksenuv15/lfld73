/* ============================================================
   lfld-career-fix.js v1.0
   
   ТРИ ЗАДАЧИ:
   1. Патч трансферов — добавляет игроков во все клубы,
      где они фактически выступали (см. список ниже).
   2. navigateToTeam(clubName) — универсальный переход в клуб
      из любой части сайта (закрывает модалки автоматически).
   3. Глобальное делегирование кликов по клубам во всех
      компонентах (карточки, таблицы, протоколы, плашки).
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     ЧАСТЬ 1. ПАТЧ ТРАНСФЕРОВ
     Добавляем записи в заявки турниров, если игрока там нет.
     Формат: { tourney, team, player: { name, pos, m, g, a, yc, rc } }
     ============================================================ */
  var TRANSFER_PATCHES = [
    /* --- Шагеев Артур: Комета (7х7) + Химмаш (5х5) + ПТИМАШ (8х8) --- */
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Шагеев Артур', pos: 'НАП', m: 7, g: 4, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Химмаш',
      player: { name: 'Шагеев Артур', pos: 'УНИ', m: 7, g: 5, a: 4, yc: 4, rc: 1 } },
    { tourney: 'tournament_night', team: 'ПТИМАШ',
      player: { name: 'Шагеев Артур', pos: 'НАП', m: 1, g: 1, a: 0, yc: 0, rc: 0 } },

    /* --- Кондрашов Максим: Нейтрон (5х5) + Спринт (8х8) --- */
    { tourney: 'tournament_night', team: 'Спринт-Кальяри',
      player: { name: 'Кондрашов Максим', pos: 'ВРТ', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },

    /* --- Аскаржанов Абубакир: Комета (7х7, 5х5) + Спринт (8х8) --- */
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Аскаржанов Абубакир', pos: 'ПЗ', m: 7, g: 1, a: 1, yc: 1, rc: 1 } },

    /* --- Раджабов Анис: Авангард (7х7) + Химмаш (5х5, Кубок) --- */
    { tourney: 'tournament_7x7', team: 'Авангард',
      player: { name: 'Раджабов Анис', pos: 'УНИ', m: 7, g: 3, a: 2, yc: 1, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Химмаш',
      player: { name: 'Раджабов Анис', pos: 'УНИ', m: 1, g: 4, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Химмаш',
      player: { name: 'Раджабов Анис', pos: 'УНИ', m: 6, g: 10, a: 3, yc: 3, rc: 1 } },

    /* --- Алексеев Матвей: Комета (7х7) + Спринт (8х8) --- */
    { tourney: 'tournament_night', team: 'Спринт-Кальяри',
      player: { name: 'Алексеев Матвей', pos: 'УНИ', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Алексеев Матвей', pos: 'НАП', m: 8, g: 3, a: 2, yc: 2, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Алексеев Матвей', pos: 'НАП', m: 7, g: 5, a: 2, yc: 2, rc: 1 } },

    /* --- Атавин Кирилл: Комета (7х7) + Металлист (8х8) --- */
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Атавин Кирилл', pos: 'ПЗ', m: 8, g: 0, a: 1, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Атавин Кирилл', pos: 'ПЗ', m: 7, g: 0, a: 1, yc: 0, rc: 0 } },
    { tourney: 'tournament_night', team: 'Металлист',
      player: { name: 'Атавин Кирилл', pos: 'ПЗ', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },

    /* --- Васин Егор: Комета (7х7, 5х5) + МИФИ (8х8) --- */
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Васин Егор', pos: 'УНИ', m: 8, g: 2, a: 2, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Васин Егор', pos: 'НАП', m: 7, g: 5, a: 8, yc: 8, rc: 1 } },
    { tourney: 'tournament_night', team: 'ДИТИ НИЯУ МИФИ',
      player: { name: 'Васин Егор', pos: 'НАП', m: 1, g: 1, a: 0, yc: 0, rc: 0 } },

    /* --- Аряпов Даниил: Комета (7х7, 5х5) + Металлист (Кубок, 8х8) --- */
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Аряпов Даниил', pos: 'ПЗ', m: 8, g: 2, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Аряпов Даниил', pos: 'ПЗ', m: 7, g: 3, a: 0, yc: 0, rc: 1 } },

    /* --- Драгин Михаил: Комета (7х7, 5х5) + Металлист (Кубок 5х5) --- */
    { tourney: 'tournament_7x7', team: 'Комета',
      player: { name: 'Драгин Михаил', pos: 'ЗАЩ', m: 7, g: 0, a: 3, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Драгин Михаил', pos: 'ЗАЩ', m: 7, g: 1, a: 4, yc: 4, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Металлист',
      player: { name: 'Драгин Михаил', pos: 'УНИ', m: 3, g: 1, a: 0, yc: 0, rc: 0 } },

    /* --- Герасимов Владислав: Спринт (7х7) + Нейтрон (Кубок 5х5, 5х5) --- */
    { tourney: 'tournament_7x7', team: 'Спринт',
      player: { name: 'Герасимов Владислав', pos: 'НАП', m: 5, g: 5, a: 3, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Нейтрон',
      player: { name: 'Герасимов Владислав', pos: 'УНИ', m: 2, g: 2, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Нейтрон',
      player: { name: 'Герасимов Владислав', pos: 'НАП', m: 7, g: 10, a: 2, yc: 2, rc: 1 } },

    /* --- Доронин Кирилл: Спринт (7х7) + Нейтрон (Кубок 5х5) + ПТИМАШ (8х8) --- */
    { tourney: 'tournament_7x7', team: 'Спринт',
      player: { name: 'Доронин Кирилл', pos: 'НАП', m: 5, g: 5, a: 2, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Нейтрон',
      player: { name: 'Доронин Кирилл', pos: 'НАП', m: 2, g: 4, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_night', team: 'ПТИМАШ',
      player: { name: 'Доронин Кирилл', pos: 'НАП', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },

    /* --- Абдулганеев Руслан: Кабо-Верде (Кубок 5х5, 5х5) + ПТИМАШ (8х8) --- */
    { tourney: 'tournament_night', team: 'ПТИМАШ',
      player: { name: 'Абдулганеев Руслан', pos: 'УНИ', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Кабо-Верде',
      player: { name: 'Абдулганеев Руслан', pos: 'УНИ', m: 3, g: 1, a: 0, yc: 1, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'Кабо-Верде',
      player: { name: 'Абдулганеев Руслан', pos: 'УНИ', m: 7, g: 11, a: 3, yc: 3, rc: 2 } },

    /* --- Антонов Дмитрий: Металлист (7х7) + Автостар (8х8) + ПТИМАШ (Кубок 5х5, 8х8) --- */
    { tourney: 'tournament_7x7', team: 'Металлист',
      player: { name: 'Антонов Дмитрий', pos: 'НАП', m: 3, g: 0, a: 2, yc: 1, rc: 0 } },
    { tourney: 'tournament_night', team: 'Автостар',
      player: { name: 'Антонов Дмитрий', pos: 'НАП', m: 1, g: 0, a: 0, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'ПТИМАШ',
      player: { name: 'Антонов Дмитрий', pos: 'НАП', m: 2, g: 4, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_5x5', team: 'ПТИМАШ',
      player: { name: 'Антонов Дмитрий', pos: 'НАП', m: 7, g: 21, a: 20, yc: 20, rc: 1 } },

    /* --- Трефилов Дмитрий: Кабо-Верде (Кубок, 5х5) + Автостар (8х8) --- */
    { tourney: 'tournament_night', team: 'Автостар',
      player: { name: 'Трефилов Дмитрий', pos: 'УНИ', m: 1, g: 0, a: 1, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Кабо-Верде',
      player: { name: 'Трефилов Дмитрий', pos: 'НАП', m: 3, g: 2, a: 0, yc: 0, rc: 1 } },
    { tourney: 'tournament_5x5', team: 'Кабо-Верде',
      player: { name: 'Трефилов Дмитрий', pos: 'НАП', m: 7, g: 6, a: 10, yc: 10, rc: 2 } },

    /* --- Абдулхаков Ринат: Комета (5х5) + Химмаш (Кубок 5х5) --- */
    { tourney: 'tournament_5x5', team: 'Комета',
      player: { name: 'Абдулхаков Ринат', pos: 'НАП', m: 7, g: 6, a: 0, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Химмаш',
      player: { name: 'Абдулхаков Ринат', pos: 'НАП', m: 1, g: 2, a: 0, yc: 0, rc: 0 } },

    /* --- Аксенов Амир: Химмаш (Кубок 5х5, 5х5) + Ак Барс (7х7) --- */
    { tourney: 'tournament_7x7', team: 'Ак Барс',
      player: { name: 'Аксенов Амир', pos: 'УНИ', m: 5, g: 2, a: 0, yc: 0, rc: 0 } },
    { tourney: 'cup_5x5', team: 'Химмаш',
      player: { name: 'Аксенов Амир', pos: 'УНИ', m: 1, g: 0, a: 0, yc: 0, rc: 1 } },
    { tourney: 'tournament_5x5', team: 'Химмаш',
      player: { name: 'Аксенов Амир', pos: 'УНИ', m: 7, g: 15, a: 4, yc: 4, rc: 1 } },

    /* --- Гладышев Максим: Металлист-М (5х5) + Металлист (8х8) --- */
    { tourney: 'tournament_5x5', team: 'Металлист-М',
      player: { name: 'Гладышев Максим', pos: 'УНИ', m: 7, g: 7, a: 2, yc: 2, rc: 1 } },
    { tourney: 'tournament_night', team: 'Металлист',
      player: { name: 'Гладышев Максим', pos: 'ПЗ', m: 1, g: 0, a: 1, yc: 0, rc: 0 } },

    /* --- Абдулманов Эдуард: Металлист-М (5х5) + Металлист (Кубок, 8х8) --- */
    { tourney: 'tournament_5x5', team: 'Металлист-М',
      player: { name: 'Абдулманов Эдуард', pos: 'УНИ', m: 7, g: 0, a: 1, yc: 1, rc: 1 } },
    { tourney: 'cup_5x5', team: 'Металлист',
      player: { name: 'Абдулманов Эдуард', pos: 'УНИ', m: 3, g: 1, a: 0, yc: 0, rc: 0 } },
    { tourney: 'tournament_night', team: 'Металлист',
      player: { name: 'Абдулманов Эдуард', pos: 'ПЗ', m: 1, g: 0, a: 0, yc: 0, rc: 0 } }
  ];

  /* ---------- Применение патча ---------- */
  function applyTransferPatches() {
    var db = window.LFLD_MASTER_DB;
    if (!db) return;

    var applied = 0;

    TRANSFER_PATCHES.forEach(function (patch) {
      var tourney = db[patch.tourney];
      if (!tourney) return;

      /* cup_5x5 — плоский список players */
      if (patch.tourney === 'cup_5x5') {
        if (!Array.isArray(tourney.players)) tourney.players = [];
        var exists = tourney.players.some(function (p) {
          return p && p.name === patch.player.name && p.team === patch.team;
        });
        if (!exists) {
          tourney.players.push(Object.assign({ team: patch.team }, patch.player));
          applied++;
        }
        return;
      }

      /* teams-based турниры */
      if (!tourney.teams) tourney.teams = {};
      if (!tourney.teams[patch.team]) tourney.teams[patch.team] = [];

      var arr = tourney.teams[patch.team];
      var already = arr.some(function (p) {
        return p && p.name && p.name.indexOf(patch.player.name.split(' ')[0]) === 0;
      });
      if (!already) {
        arr.push(patch.player);
        applied++;
      }
    });

    if (applied) {
      console.log('[lfld-career-fix] Трансферов применено:', applied);
      if (window.saveTournamentsToStorage) {
        try { window.saveTournamentsToStorage(); } catch (e) {}
      }
    }
  }

  /* ============================================================
     ЧАСТЬ 2. navigateToTeam(clubName)
     Универсальный переход из любой точки сайта в профиль клуба.
     ============================================================ */
  window.navigateToTeam = function (clubName) {
    if (!clubName) return;

    /* Закрываем ВСЕ модалки */
    document.querySelectorAll('.modal-overlay').forEach(function (m) {
      m.style.display = 'none';
      m.classList.remove('show');
    });

    /* Открываем кабинет клуба */
    if (typeof window.openClubCabinet === 'function') {
      try { window.openClubCabinet(clubName); }
      catch (e) { console.warn('[navigateToTeam] openClubCabinet error:', e); }
    } else {
      console.warn('[navigateToTeam] openClubCabinet не найден');
    }
  };

  /* ============================================================
     ЧАСТЬ 3. ДЕЛЕГИРОВАНИЕ КЛИКОВ ПО КЛУБАМ
     Ловит клики по:
     - .club-link с data-club
     - элементам с data-club
     - плашкам .pc-club-tag (в досье игрока)
     - логотипам клубов внутри протоколов
     ============================================================ */
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    /* 1. Явный data-club */
    var withData = target.closest('[data-club]');
    if (withData) {
      var clubName = withData.getAttribute('data-club');
      if (clubName) {
        e.preventDefault();
        e.stopPropagation();
        window.navigateToTeam(clubName);
        return;
      }
    }

    /* 2. Плашка клуба в досье игрока */
    var plaque = target.closest('.pc-club-tag[data-club]');
    if (plaque) {
      e.preventDefault();
      e.stopPropagation();
      window.navigateToTeam(plaque.getAttribute('data-club'));
      return;
    }

    /* 3. Клик по клубу в таблице бомбардиров/ассистентов */
    var linkInTable = target.closest('.club-link');
    if (linkInTable && !linkInTable.hasAttribute('onclick')) {
      var clubText = linkInTable.getAttribute('data-club')
                   || (linkInTable.querySelector('.club-name') ? linkInTable.querySelector('.club-name').innerText : '')
                   || linkInTable.innerText.trim();
      if (clubText) {
        e.preventDefault();
        e.stopPropagation();
        window.navigateToTeam(clubText);
      }
    }
  }, true);

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  function boot() {
    /* Применяем патч после загрузки базы (база подгружается с антикэшем) */
    var tryApply = function () {
      if (window.LFLD_MASTER_DB) {
        applyTransferPatches();
      } else {
        setTimeout(tryApply, 300);
      }
    };
    setTimeout(tryApply, 500);
    setTimeout(tryApply, 1500);

    console.log('[lfld-career-fix] v1.0 загружен · трансферы + navigateToTeam + делегирование');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();