/* ============================================================
   player-resolver.js v6.0

   ИСПРАВЛЕНИЯ:
   - Васин Андрей + Васин Егор + Васин Егор Евгеньевич → p_vasin_egor
   - Самарцев Александр + Самарцев Марк → p_samartsev_mark
   - Светличный Даниил/Данил + Светличный Никита → p_svetlichnyy_nikita
   - Отображаемые имена фиксированы, отчество хранится отдельно
   ============================================================ */
(function () {
  'use strict';

  var SPECIAL_REGISTRY = [
    /* ⚡ ВАСИН — ЕДИНЫЙ ПРОФИЛЬ */
    {
      id: 'p_vasin_egor',
      full: 'Васин Егор',
      display: 'Васин Егор',
      fullOfficial: 'Васин Егор Евгеньевич',
      club: 'Комета',
      pos: 'НАП',
      birth: '09.08.2007',
      key: 'васин_егор',
      aliases: ['васин_андрей', 'васин_а', 'васин_егор_евгеньевич', 'васин']
    },

    /* ⚡ САМАРЦЕВ — ЕДИНЫЙ ПРОФИЛЬ */
    {
      id: 'p_samartsev_mark',
      full: 'Самарцев Марк',
      display: 'Самарцев Марк',
      club: 'Комета',
      pos: 'НАП',
      key: 'самарцев_марк',
      aliases: ['самарцев_александр', 'самарцев_александрович', 'самарцев_а', 'самарцев']
    },

    /* ⚡ СВЕТЛИЧНЫЙ — ЕДИНЫЙ ПРОФИЛЬ */
    {
      id: 'p_svetlichnyy_nikita',
      full: 'Светличный Никита',
      display: 'Светличный Никита',
      club: 'Комета',
      pos: 'УНИ',
      key: 'светличный_никита',
      aliases: ['светличный_даниил', 'светличный_данил', 'светличный_данила', 'светличный_д', 'светличный']
    },

    /* Нагорновы */
    { id: 'p_nagornov_ilya', full: 'Нагорнов Илья', club: 'Химмаш', pos: 'ЗАЩ', key: 'нагорнов_илья', aliases: ['нагорнов_и'] },
    { id: 'p_nagornov_maksim', full: 'Нагорнов Максим', club: 'ПТИМАШ', pos: 'НАП', key: 'нагорнов_максим', aliases: ['нагорнов_м'] },

    /* Галеевы */
    { id: 'p_galeev_aydar', full: 'Галеев Айдар', club: 'Спринт', pos: 'УНИ', key: 'галеев_айдар', aliases: ['галеев_а'] },
    { id: 'p_galeev_dalil', full: 'Галеев Далил', club: 'Комета', pos: 'УНИ', key: 'галеев_далил', aliases: ['галеев_данил', 'галеев_д', 'галеев'] },

    /* Алексеевы */
    { id: 'p_alekseev_evgeniy', full: 'Алексеев Евгений', club: 'Спринт', pos: 'ЗАЩ', key: 'алексеев_евгений', aliases: ['алексеев_е'] },
    { id: 'p_alekseev_matvey', full: 'Алексеев Матвей', club: 'Спринт', pos: 'УНИ', key: 'алексеев_матвей', aliases: ['алексеев_м'] },
    { id: 'p_alekseev_andrey', full: 'Алексеев Андрей', club: 'Комета', pos: 'НАП', key: 'алексеев_андрей', aliases: ['алексеев_а'] },

    /* Калимуллины */
    { id: 'p_kalimullin_ildar', full: 'Калимуллин Ильдар', club: 'Ак Барс', pos: 'НАП', key: 'калимуллин_ильдар', aliases: ['калимуллин_и'] },
    { id: 'p_kalimullin_rinal', full: 'Калимуллин Риналь', club: 'СШ Лада', pos: 'НАП', key: 'калимуллин_риналь', aliases: ['калимуллин_р'] },

    /* Маноновы */
    { id: 'p_manonov_samandar', full: 'Манонов Самандар Носирджонович', club: 'Металлист', pos: 'ПЗ', key: 'манонов_самандар', aliases: ['манонов_с'] },
    { id: 'p_manonov_rustam', full: 'Манонов Рустам Носирджонович', club: 'Металлист', pos: 'ПЗ', key: 'манонов_рустам', aliases: ['манонов_р'] },

    /* Юсуповы */
    { id: 'p_yusupov_marat', full: 'Юсупов Марат', club: 'Металлист', pos: 'УНИ', key: 'юсупов_марат', aliases: ['юсупов_м'] },
    { id: 'p_yusupov_ruslan', full: 'Юсупов Руслан', club: 'Металлист', pos: 'НАП', key: 'юсупов_руслан', aliases: ['юсупов_р'] },

    /* Аксенов */
    { id: 'p_aksenov_amir', full: 'Аксенов Амир', club: 'Химмаш', pos: 'УНИ', key: 'аксенов_амир', aliases: ['аксёнов_амир'] },

    /* Атавин */
    { id: 'p_atavin_kirill', full: 'Атавин Кирилл', club: 'Комета', pos: 'ПЗ', key: 'атавин_кирилл', aliases: ['отавин_кирилл'] },

    /* Аскаржонов */
    { id: 'p_askarzhonov_abubakir', full: 'Аскаржонов Абубакир', club: 'Спринт', pos: 'УНИ', key: 'аскаржонов_абубакир', aliases: ['абубакир_оскарджонов', 'оскарджонов_абубакир', 'аскаржанов_абубакир', 'абубакир'] },

    /* Кондрашов */
    { id: 'p_kondrashov_maksim', full: 'Кондрашов Максим', club: 'Спринт', pos: 'ВРТ', key: 'кондрашов_максим', aliases: ['кондрашов_м'] },

    /* Гебейдуллов */
    { id: 'p_gebeidullov_linar', full: 'Гебейдуллов Линар', club: 'Спринт', pos: 'УНИ', key: 'гебейдуллов_линар', aliases: ['гебейдуллов_рамиль', 'гебейдуллов_рамил', 'гебейдуллов_р'] },

    /* Тимаков */
    { id: 'p_timakov_vladimir', full: 'Тимаков Владимир', club: 'Спринт', pos: 'УНИ', key: 'тимаков_владимир', aliases: ['тимаков_владислав', 'тимаков_в'] },

    /* Раджабов */
    { id: 'p_radjabov_anis', full: 'Раджабов Анис Абдурахимович', club: 'Химмаш', pos: 'УНИ', key: 'раджабов_анис', aliases: ['раджабов_а'] },

    /* Аряпов */
    { id: 'p_aryapov_daniil', full: 'Аряпов Даниил', club: 'Металлист', pos: 'ПЗ', key: 'аряпов_даниил', aliases: ['аряпов_данил', 'аряпов_д'] },

    /* Власов */
    { id: 'p_vlasov_nikita', full: 'Власов Никита', club: 'Комета', pos: 'УНИ', key: 'власов_никита' },

    /* Королёв */
    { id: 'p_korolev_nikita', full: 'Королёв Никита', club: 'Металлист', pos: 'НАП', key: 'королёв_никита', aliases: ['королев_никита'] },

    /* Шагеев */
    { id: 'p_shageev_artur', full: 'Шагеев Артур', club: 'ПТИМАШ', pos: 'НАП', key: 'шагеев_артур', aliases: ['шагеев_а'] },

    /* Доронин */
    { id: 'p_doronin_kirill', full: 'Доронин Кирилл', club: 'Нейтрон', pos: 'НАП', key: 'доронин_кирилл', aliases: ['доронин_к'] },

    /* Герасимов */
    { id: 'p_gerasimov_vladislav', full: 'Герасимов Владислав', club: 'Нейтрон', pos: 'НАП', key: 'герасимов_владислав', aliases: ['герасимов_в'] },

    /* Трефилов */
    { id: 'p_trefilov_dmitriy', full: 'Трефилов Дмитрий', club: 'Кабо-Верде', pos: 'УНИ', key: 'трефилов_дмитрий', aliases: ['трефилов_д'] },

    /* Абдулганеев */
    { id: 'p_abdulganeev_ruslan', full: 'Абдулганеев Руслан', club: 'Кабо-Верде', pos: 'УНИ', key: 'абдулганеев_руслан', aliases: ['абдулганеев_р'] },

    /* Гладышев */
    { id: 'p_gladyshev_maksim', full: 'Гладышев Максим', club: 'Металлист', pos: 'УНИ', key: 'гладышев_максим', aliases: ['гладышев_м'] },

    /* Абдулманов */
    { id: 'p_abdulmanov_eduard', full: 'Абдулманов Эдуард', club: 'Металлист', pos: 'УНИ', key: 'абдулманов_эдуард', aliases: ['абдулманов_э'] },

    /* Сыч */
    { id: 'p_sych_ruslan', full: 'Сыч Руслан', club: 'Химмаш', pos: 'УНИ', key: 'сыч_руслан', aliases: ['сыч_р'] },

    /* Абдулхаков */
    { id: 'p_abduhlakov_rinat', full: 'Абдулхаков Ринат', club: 'Химмаш', pos: 'НАП', key: 'абдулхаков_ринат', aliases: ['абдулхаков_р'] },

    /* Сафин */
    { id: 'p_safin_ilnar', full: 'Сафин Ильнар', club: 'Спринт', pos: 'УНИ', key: 'сафин_ильнар', aliases: ['сафин_и'] },

    /* Валуйских */
    { id: 'p_valuevskih_egor', full: 'Валуйских Егор', club: 'ПТИМАШ', pos: 'УНИ', key: 'валуйских_егор', aliases: ['валуйских_е'] },

    /* Иванов Андрей */
    { id: 'p_ivanov_andrey', full: 'Иванов Андрей Петрович', club: 'Металлист', pos: 'ЗАЩ', key: 'иванов_андрей' },

    /* Ломовский */
    { id: 'p_lomovskiy_kirill', full: 'Ломовский Кирилл Владиславович', club: 'Нейтрон', pos: 'НАП', key: 'ломовский_кирилл' },

    /* Палёнов */
    { id: 'p_palenov_aleksandr', full: 'Палёнов Александр', club: 'Нейтрон', pos: 'УНИ', key: 'палёнов_александр', aliases: ['паленов_александр'] },

    /* Антонов */
    { id: 'p_antonov_dmitriy', full: 'Антонов Дмитрий', club: 'ПТИМАШ', pos: 'НАП', key: 'антонов_дмитрий', aliases: ['антонов_д'] }
  ];

  /* ============================================================
     Индексы
     ============================================================ */
  var byId = {};
  var byKey = {};
  var byAlias = {};

  function buildIndexes() {
    byId = {};
    byKey = {};
    byAlias = {};
    SPECIAL_REGISTRY.forEach(function (p) {
      if (p.id) byId[p.id] = p;
      if (p.key) byKey[p.key] = p;
      (p.aliases || []).forEach(function (a) { byAlias[a] = p; });
    });
  }
  buildIndexes();

  /* ============================================================
     УТИЛИТЫ
     ============================================================ */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function getPersonKey(name) {
    if (!name) return '';
    var parts = String(name)
      .toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, '')
      .trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    return parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
  }
  function clubsMatch(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na || !nb) return false;
    return na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1 ||
      (na.indexOf('мифи') !== -1 && nb.indexOf('мифи') !== -1) ||
      (na.indexOf('спринт') !== -1 && nb.indexOf('спринт') !== -1) ||
      (na.indexOf('металлист') !== -1 && nb.indexOf('металлист') !== -1);
  }

  /* ============================================================
     ГЛАВНЫЙ РЕЗОЛВЕР
     ============================================================ */
  function resolvePlayer(ref, clubHint) {
    try {
      if (!ref) return null;

      /* 1. Прямой ID */
      if (typeof ref === 'string' && /^p_[a-z0-9_]+$/i.test(ref)) {
        if (byId[ref]) return normalizeResult(byId[ref]);
      }
      if (typeof ref === 'object' && ref.id && byId[ref.id]) {
        return normalizeResult(byId[ref.id]);
      }

      /* 2. По ключу фамилия_имя */
      var name = '';
      if (typeof ref === 'object') {
        name = ref.full || ref.fullName || ref.name || '';
      } else {
        name = String(ref);
      }

      if (!name) return null;

      var key = getPersonKey(name);
      if (key && byKey[key]) return normalizeResult(byKey[key]);
      if (key && byAlias[key]) return normalizeResult(byAlias[key]);

      /* 3. По всем алиасам */
      for (var alias in byAlias) {
        if (byAlias.hasOwnProperty(alias) && getPersonKey(alias) === key) {
          return normalizeResult(byAlias[alias]);
        }
      }

      /* 4. Поиск в базе LFLD_MASTER_DB */
      var db = window.LFLD_MASTER_DB;
      if (db) {
        var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night'];
        for (var ti = 0; ti < tourneyKeys.length; ti++) {
          var t = db[tourneyKeys[ti]];
          if (!t || !t.teams) continue;
          var clubKeys = Object.keys(t.teams);
          for (var ci = 0; ci < clubKeys.length; ci++) {
            if (clubHint && !clubsMatch(clubKeys[ci], clubHint)) continue;
            var arr = t.teams[clubKeys[ci]] || [];
            for (var pi = 0; pi < arr.length; pi++) {
              var p = arr[pi];
              if (!p || !p.name) continue;
              if (getPersonKey(p.name) === key) {
                /* Проверяем, нет ли в спец-реестре */
                if (byAlias[key]) return normalizeResult(byAlias[key]);
                if (byKey[key]) return normalizeResult(byKey[key]);

                return {
                  id: p.id || null,
                  full: p.name,
                  club: clubKeys[ci],
                  pos: p.pos || 'УНИ',
                  source: 'master'
                };
              }
            }
          }
        }
      }

      /* 5. Fallback */
      return {
        id: null,
        full: String(name).trim(),
        club: clubHint || '',
        pos: 'УНИ',
        isFallback: true
      };
    } catch (e) {
      console.error('[player-resolver] resolve error:', e);
      return null;
    }
  }

  function normalizeResult(p) {
    return {
      id: p.id,
      full: p.display || p.full,
      fullOfficial: p.fullOfficial || p.full,
      club: p.club,
      pos: p.pos,
      birth: p.birth || '',
      aliases: p.aliases || [],
      source: 'special'
    };
  }

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.PlayerResolver = {
    resolve: resolvePlayer,
    getPersonKey: getPersonKey,
    byId: function (id) { return byId[id] ? normalizeResult(byId[id]) : null; },
    all: function () { return SPECIAL_REGISTRY.slice(); },
    open: function (ref, clubHint) {
      var p = resolvePlayer(ref, clubHint);
      if (p && window.openPlayerModal) {
        try { window.openPlayerModal(p, clubHint); } catch (e) {}
      }
      return p;
    }
  };

  console.log('[player-resolver] v6.0 · ' + SPECIAL_REGISTRY.length + ' спец-профилей · Васин/Самарцев/Светличный дедуплицированы');
})();