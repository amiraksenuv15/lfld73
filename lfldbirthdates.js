/* ============================================================
   lfld-birth-dates.js v1.0
   
   ЕДИНЫЙ МАСТЕР-РЕЕСТР ДАТ РОЖДЕНИЯ ИГРОКОВ
   
   Задачи:
   1. Пройти по всем турнирам LFLD_MASTER_DB
   2. Собрать поле birth у всех игроков
   3. Сохранить по ключам:
      - «раджабов_анис» (фамилия_имя — игнорирует отчество)
      - «раджабованисабдурахимович» (полная нормализация)
      - «p_radjabov_anis» (если у игрока есть ID)
   4. Отдать API: getBirthDate(fioOrId) → дата или ''
   ============================================================ */
(function () {
  'use strict';

  window.LFLD_BIRTH_DATES = window.LFLD_BIRTH_DATES || {};

  /* ============================================================
     НОРМАЛИЗАЦИЯ КЛЮЧЕЙ
     ============================================================ */
  function norm(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]/gi, '')
      .trim();
  }
  function normWithSpaces(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function getSurnameFirst(fio) {
    var parts = normWithSpaces(fio).split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return parts[0] + '_' + parts[1];
  }
  function getFullNorm(fio) {
    return norm(fio);
  }

  /* ============================================================
     ГАРВЕСТ ДАТ РОЖДЕНИЯ
     ============================================================ */
  function harvestBirthDates() {
    var M = window.LFLD_MASTER_DB;
    if (!M) return;

    var count = 0;
    var tourneyKeys = Object.keys(M);

    tourneyKeys.forEach(function (tk) {
      var tourney = M[tk];
      if (!tourney || typeof tourney !== 'object') return;

      /* 1. Формат cup_5x5 — плоский players[] */
      if (Array.isArray(tourney.players)) {
        tourney.players.forEach(function (p) {
          if (!p || !p.name) return;
          /* Дата в p.birth или p.birthDate */
          var birth = p.birth || p.birthDate;
          if (!birth || birth === '—' || birth.length < 4) return;

          var keyShort = getSurnameFirst(p.name);
          var keyFull = getFullNorm(p.name);

          if (keyShort && !window.LFLD_BIRTH_DATES[keyShort]) {
            window.LFLD_BIRTH_DATES[keyShort] = birth;
            count++;
          }
          if (keyFull && !window.LFLD_BIRTH_DATES[keyFull]) {
            window.LFLD_BIRTH_DATES[keyFull] = birth;
          }
          if (p.id && !window.LFLD_BIRTH_DATES[p.id]) {
            window.LFLD_BIRTH_DATES[p.id] = birth;
          }
        });
      }

      /* 2. Формат teams: { clubName: [players] } */
      if (tourney.teams && typeof tourney.teams === 'object') {
        Object.keys(tourney.teams).forEach(function (clubName) {
          var roster = tourney.teams[clubName];
          if (!Array.isArray(roster)) return;

          roster.forEach(function (p) {
            if (!p || !p.name) return;
            var birth = p.birth || p.birthDate;
            if (!birth || birth === '—' || birth.length < 4) return;

            var keyShort = getSurnameFirst(p.name);
            var keyFull = getFullNorm(p.name);

            if (keyShort && !window.LFLD_BIRTH_DATES[keyShort]) {
              window.LFLD_BIRTH_DATES[keyShort] = birth;
              count++;
            }
            if (keyFull && !window.LFLD_BIRTH_DATES[keyFull]) {
              window.LFLD_BIRTH_DATES[keyFull] = birth;
            }
            if (p.id && !window.LFLD_BIRTH_DATES[p.id]) {
              window.LFLD_BIRTH_DATES[p.id] = birth;
            }
          });
        });
      }
    });

    console.log('[birth-dates] Собрано дат рождения:', count,
                '· всего ключей:', Object.keys(window.LFLD_BIRTH_DATES).length);
    return count;
  }

  /* ============================================================
     ПОЛУЧЕНИЕ ДАТЫ РОЖДЕНИЯ ПО ИГРОКУ
     ============================================================ */
  function getBirthDate(ref) {
    if (!ref) return '';
    var dates = window.LFLD_BIRTH_DATES || {};

    /* Прямой ID */
    if (typeof ref === 'string' && /^p_[a-z0-9_]+$/i.test(ref)) {
      if (dates[ref]) return dates[ref];
    }

    /* Объект с id */
    if (typeof ref === 'object' && ref.id && dates[ref.id]) {
      return dates[ref.id];
    }

    /* Полное ФИО */
    var str = typeof ref === 'object'
      ? (ref.full || ref.fullName || ref.name || '')
      : String(ref);

    var keyShort = getSurnameFirst(str);
    var keyFull = getFullNorm(str);

    if (keyShort && dates[keyShort]) return dates[keyShort];
    if (keyFull && dates[keyFull]) return dates[keyFull];

    /* Через PlayerResolver → ID → дата */
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try {
        var resolved = window.PlayerResolver.resolve(str,
          (typeof ref === 'object' ? ref.club : null) || null);
        if (resolved && resolved.id && dates[resolved.id]) return dates[resolved.id];
        if (resolved && resolved.full) {
          var rKey = getSurnameFirst(resolved.full);
          if (rKey && dates[rKey]) return dates[rKey];
        }
      } catch (e) {}
    }

    return '';
  }

  /* ============================================================
     АВТОЗАПУСК
     ============================================================ */
  function boot() {
    /* Первый проход */
    harvestBirthDates();
    /* Повторные заходы — база подгружается динамически */
    setTimeout(harvestBirthDates, 800);
    setTimeout(harvestBirthDates, 2000);
    setTimeout(harvestBirthDates, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.harvestBirthDates = harvestBirthDates;
  window.getBirthDate = getBirthDate;

  console.log('[lfld-birth-dates] v1.0 загружен');
})();