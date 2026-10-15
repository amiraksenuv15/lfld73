/* ============================================================
   player-resolver.js v5.1
   
   ПРАВКИ v5.1:
   - Самарцев Александр → Самарцев Марк (алиас)
   - Светличный Данил / Даниил → Светличный Никита (алиас)
   - + все правки v5.0 (Гебейдуллов Линар, Тимаков Владимир,
     Васин Егор, Аскаржонов Абубакир)
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     СПЕЦ-РЕЕСТР ОДНОФАМИЛЬЦЕВ
     ============================================================ */
  var SPECIAL_REGISTRY = [
    /* Нагорновы */
    { id: 'p_nagornov_ilya',     full: 'Нагорнов Илья',     club: 'Химмаш',    pos: 'ЗАЩ', key: 'нагорнов_илья' },
    { id: 'p_nagornov_maksim',   full: 'Нагорнов Максим',   club: 'ПТИМАШ',    pos: 'НАП', key: 'нагорнов_максим' },

    /* Галеевы */
    { id: 'p_galeev_aydar',      full: 'Галеев Айдар',      club: 'Спринт',    pos: 'УНИ', key: 'галеев_айдар' },
    { id: 'p_galeev_dalil',      full: 'Галеев Далил',      club: 'Комета',    pos: 'УНИ', key: 'галеев_далил' },

    /* Алексеевы — 3 независимых профиля */
    { id: 'p_alekseev_evgeniy',  full: 'Алексеев Евгений',  club: 'Спринт',    pos: 'ЗАЩ', key: 'алексеев_евгений' },
    { id: 'p_alekseev_matvey',   full: 'Алексеев Матвей',   club: 'Спринт',    pos: 'УНИ', key: 'алексеев_матвей' },
    { id: 'p_alekseev_andrey',   full: 'Алексеев Андрей',   club: 'Комета',    pos: 'НАП', key: 'алексеев_андрей' },

    /* Калимуллины */
    { id: 'p_kalimullin_ildar',  full: 'Калимуллин Ильдар', club: 'Ак Барс',   pos: 'НАП', key: 'калимуллин_ильдар' },
    { id: 'p_kalimullin_rinal',  full: 'Калимуллин Риналь', club: 'СШ Лада',   pos: 'НАП', key: 'калимуллин_риналь' },

    /* Маноновы */
    { id: 'p_manonov_samandar',  full: 'Манонов Самандар',  club: 'Металлист', pos: 'ПЗ', key: 'манонов_самандар' },
    { id: 'p_manonov_rustam',    full: 'Манонов Рустам',    club: 'Металлист', pos: 'ПЗ', key: 'манонов_рустам' },

    /* Юсуповы */
    { id: 'p_yusupov_marat',     full: 'Юсупов Марат',      club: 'Металлист', pos: 'УНИ', key: 'юсупов_марат' },
    { id: 'p_yusupov_ruslan',    full: 'Юсупов Руслан',     club: 'Металлист', pos: 'НАП', key: 'юсупов_руслан' },

    /* Аксеновы */
    { id: 'p_aksenov_amir',      full: 'Аксенов Амир',      club: 'Химмаш',    pos: 'УНИ', key: 'аксенов_амир' },

    /* Васин Егор — Комета + МИФИ */
    { id: 'p_vasin_egor',        full: 'Васин Егор',        club: 'Комета',    pos: 'УНИ', key: 'васин_егор' },

    /* Атавин Кирилл — Комета + Металлист */
    { id: 'p_atavin_kirill',     full: 'Атавин Кирилл',     club: 'Комета',    pos: 'ПЗ', key: 'атавин_кирилл' },

    /* Аскаржонов Абубакир — Комета + Спринт */
    { id: 'p_askarzhonov_abubakir', full: 'Аскаржонов Абубакир', club: 'Спринт', pos: 'УНИ', key: 'аскаржонов_абубакир' },

    /* Кондрашов Максим — Нейтрон + Спринт */
    { id: 'p_kondrashov_maksim', full: 'Кондрашов Максим',  club: 'Спринт',    pos: 'ВРТ', key: 'кондрашов_максим' },

    /* Гебейдуллов Линар — Спринт (не Рамиль!) */
    { id: 'p_gebeidullov_linar', full: 'Гебейдуллов Линар', club: 'Спринт',    pos: 'УНИ', key: 'гебейдуллов_линар' },

    /* Тимаков Владимир — Спринт (не Владислав!) */
    { id: 'p_timakov_vladimir',  full: 'Тимаков Владимир',  club: 'Спринт',    pos: 'УНИ', key: 'тимаков_владимир' },

    /* ⚡ Самарцев — канонически МАРК (не Александр!) */
    { id: 'p_samartsev_mark',    full: 'Самарцев Марк',     club: 'Комета',    pos: 'НАП', key: 'самарцев_марк' },

    /* ⚡ Светличный — канонически НИКИТА (не Данил/Даниил!) */
    { id: 'p_svetlichnyy_nikita', full: 'Светличный Никита', club: 'Комета',   pos: 'УНИ', key: 'светличный_никита' },

    /* Прочие канонические */
    { id: 'p_vlasov_nikita',     full: 'Власов Никита',     club: 'Комета',    pos: 'УНИ', key: 'власов_никита' },
    { id: 'p_korolev_nikita',    full: 'Королёв Никита',    club: 'Металлист', pos: 'НАП', key: 'королёв_никита' }
  ];

  /* ============================================================
     КАРТА АЛИАСОВ (легаси → канонический ключ)
     ============================================================ */
  var ALIAS_MAP = {
    /* Абубакир */
    'абубакир_оскарджонов':   'аскаржонов_абубакир',
    'абубакар_оскарджонов':   'аскаржонов_абубакир',
    'оскарджонов_абубакир':   'аскаржонов_абубакир',
    'аскаржонов_абубакир':    'аскаржонов_абубакир',
    'абубакир':               'аскаржонов_абубакир',

    /* Атавин */
    'отавин_кирилл':          'атавин_кирилл',
    'атавин_кирилл':          'атавин_кирилл',

    /* Аксеновы */
    'аксёнов_амир':           'аксенов_амир',

    /* Васин Егор (не Андрей) */
    'васин_андрей':           'васин_егор',

    /* Гебейдуллов Линар (не Рамиль) */
    'гебейдуллов_рамиль':     'гебейдуллов_линар',
    'гебейдуллов_рамил':      'гебейдуллов_линар',

    /* Тимаков Владимир (не Владислав) */
    'тимаков_владислав':      'тимаков_владимир',

    /* Камалтдинов Ильяс */
    'камалтдинов_ильяз':      'камалтдинов_ильяс',

    /* ⚡ Самарцев — нормализуем к МАРКУ */
    'самарцев_александр':     'самарцев_марк',
    'самарцев_александрович': 'самарцев_марк',
    'самарцев_александр_в':   'самарцев_марк',
    'самарцев_а':             'самарцев_марк',

    /* ⚡ Светличный — нормализуем к НИКИТЕ */
    'светличный_данил':       'светличный_никита',
    'светличный_даниил':      'светличный_никита',
    'светличный_данила':      'светличный_никита',
    'светличный_д':           'светличный_никита',

    /* Нормализация ё/е */
    'дрягин_михаил':          'драгин_михаил',
    'пономарев_максим':       'пономарёв_максим',
    'королев_никита':         'королёв_никита',
    'паленов_александр':      'палёнов_александр',
    'федоров_максим':         'фёдоров_максим'
  };

  /* ============================================================
     УТИЛИТЫ
     ============================================================ */
  function getPersonKey(fullName) {
    if (!fullName) return '';
    var parts = String(fullName)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '';
    var key = parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
    if (ALIAS_MAP[key]) return ALIAS_MAP[key];
    return key;
  }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function normWithSpaces(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function getSurname(s) { return normWithSpaces(s).split(' ')[0] || ''; }
  function clubsMatch(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return true;
    if (na.indexOf('мифи') !== -1 && nb.indexOf('мифи') !== -1) return true;
    if (na.indexOf('спринт') !== -1 && nb.indexOf('спринт') !== -1) return true;
    if (na.indexOf('металлист') !== -1 && nb.indexOf('металлист') !== -1) return true;
    return false;
  }

  /* ============================================================
     ШАГ 1 — СПЕЦ-РЕЕСТР
     ============================================================ */
  function resolveFromSpecial(name, clubHint) {
    if (!name) return null;
    var key = getPersonKey(name);
    if (!key) return null;
    var candidates = SPECIAL_REGISTRY.filter(function (p) { return p.key === key; });
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    if (clubHint) {
      var withClub = candidates.filter(function (p) { return clubsMatch(p.club, clubHint); });
      if (withClub.length) return withClub[0];
    }
    return candidates[0];
  }

  /* ============================================================
     ШАГ 2-3 — ТЕКУЩИЙ ТУРНИР
     ============================================================ */
  function resolveFromCurrentTournament(name, clubHint) {
    if (!window.LFLD_MASTER_DB) return null;
    var targetKey = getPersonKey(name);
    if (!targetKey) return null;

    var tourneyKey = (window.getCurrentTourneyKey && window.getCurrentTourneyKey()) || null;
    var map = {
      '5x5': 'tournament_5x5', '7x7': 'tournament_7x7',
      'night_league_8x8': 'tournament_night', 'cup_5x5': 'cup_5x5'
    };
    var tourney = tourneyKey ? window.LFLD_MASTER_DB[map[tourneyKey] || tourneyKey] : null;

    function searchTeams(t) {
      if (!t || !t.teams) return null;
      var teamKeys = Object.keys(t.teams);

      for (var i = 0; i < teamKeys.length; i++) {
        if (clubHint && !clubsMatch(teamKeys[i], clubHint)) continue;
        var arr = t.teams[teamKeys[i]] || [];
        for (var j = 0; j < arr.length; j++) {
          if (getPersonKey(arr[j].name) === targetKey) return { player: arr[j], club: teamKeys[i] };
        }
      }
      for (var k = 0; k < teamKeys.length; k++) {
        var arr2 = t.teams[teamKeys[k]] || [];
        for (var l = 0; l < arr2.length; l++) {
          if (getPersonKey(arr2[l].name) === targetKey) return { player: arr2[l], club: teamKeys[k] };
        }
      }
      var surname = getSurname(name);
      if (surname) {
        for (var m = 0; m < teamKeys.length; m++) {
          if (clubHint && !clubsMatch(teamKeys[m], clubHint)) continue;
          var arr3 = t.teams[teamKeys[m]] || [];
          for (var n = 0; n < arr3.length; n++) {
            if (getSurname(arr3[n].name) === surname) return { player: arr3[n], club: teamKeys[m] };
          }
        }
      }
      return null;
    }

    if (tourney) {
      var r = searchTeams(tourney);
      if (r) return r;
    }

    var cup = window.LFLD_MASTER_DB.cup_5x5;
    if (cup && Array.isArray(cup.players)) {
      for (var ci = 0; ci < cup.players.length; ci++) {
        if (getPersonKey(cup.players[ci].name) === targetKey) {
          return { player: cup.players[ci], club: cup.players[ci].team || '' };
        }
      }
    }
    return null;
  }

  /* ============================================================
     ШАГ 4 — ГЛОБАЛЬНЫЙ ПОИСК
     ============================================================ */
  function resolveGlobal(name, clubHint) {
    if (!window.LFLD_MASTER_DB) return null;
    var targetKey = getPersonKey(name);
    if (!targetKey) return null;

    var masters = ['tournament_5x5', 'tournament_7x7', 'tournament_night'];

    for (var mi = 0; mi < masters.length; mi++) {
      var t = window.LFLD_MASTER_DB[masters[mi]];
      if (!t || !t.teams) continue;
      var teamKeys = Object.keys(t.teams);
      for (var ti = 0; ti < teamKeys.length; ti++) {
        var arr = t.teams[teamKeys[ti]] || [];
        for (var pi = 0; pi < arr.length; pi++) {
          if (getPersonKey(arr[pi].name) === targetKey) {
            return { player: arr[pi], club: teamKeys[ti], source: 'teams_global' };
          }
        }
      }
    }

    var surname = getSurname(name);
    var acc = null;

    masters.forEach(function (mk) {
      var tourney = window.LFLD_MASTER_DB[mk];
      if (!tourney || !Array.isArray(tourney.matches)) return;
      tourney.matches.forEach(function (match) {
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(match[side])) return;
          var club = side === 'eventsHome' ? (match.teamHome || match.t1 || '') : (match.teamAway || match.t2 || '');
          match[side].forEach(function (ev) {
            if (!ev || !ev.player) return;
            var evKey = getPersonKey(ev.player);
            var isMatch = evKey === targetKey
                       || (surname && getSurname(ev.player) === surname && targetKey.indexOf('_') === -1);
            if (!isMatch) return;
            if (!acc) acc = { name: ev.player, goals: 0, assists: 0, yellow: 0, red: 0, clubs: {}, _m: {} };
            if (ev.type === 'goal') acc.goals += (ev.count || 1);
            else if (ev.type === 'yellow_card') acc.yellow += 1;
            else if (ev.type === 'red_card') acc.red += 1;
            if (ev.assist) acc.assists += 1;
            acc.clubs[club] = 1;
            var mid = match.id || (match.date + '_' + club);
            acc._m[mid] = 1;
            if (ev.player.length > acc.name.length) acc.name = ev.player;
          });
        });
      });
    });

    if (acc) {
      return {
        player: {
          name: acc.name, pos: 'УНИ',
          m: Object.keys(acc._m).length,
          g: acc.goals, a: acc.assists, yc: acc.yellow, rc: acc.red
        },
        club: Object.keys(acc.clubs)[0] || '',
        clubs: Object.keys(acc.clubs),
        source: 'protocols_global'
      };
    }
    return null;
  }

  /* ============================================================
     FALLBACK
     ============================================================ */
  function buildFallback(name, clubHint) {
    return {
      id: null,
      full: String(name || '').trim() || 'Неизвестный игрок',
      club: String(clubHint || '').trim() || '—',
      pos: 'УНИ',
      isFallback: true
    };
  }

  /* ============================================================
     ГЛАВНЫЙ РЕЗОЛВЕР
     ============================================================ */
  function resolvePlayer(ref, clubHint) {
    if (!ref) return buildFallback('', clubHint);

    if (typeof ref === 'object') {
      if (ref.id) {
        var found = SPECIAL_REGISTRY.find(function (p) { return p.id === ref.id; });
        if (found) return found;
      }
      if (ref.full || ref.name) return resolvePlayer(ref.full || ref.name, ref.club || clubHint);
    }

    var str = String(ref).trim();
    if (!str) return buildFallback('', clubHint);
    var club = String(clubHint || '').trim();

    var r1 = resolveFromSpecial(str, club);
    if (r1) return { id: r1.id, full: r1.full, club: r1.club, pos: r1.pos, source: 'special' };

    var r2 = resolveFromCurrentTournament(str, club);
    if (r2) {
      return {
        id: null, full: r2.player.name, club: r2.club || club,
        pos: r2.player.pos || 'УНИ', player: r2.player, source: 'current_tourney'
      };
    }

    var r4 = resolveGlobal(str, club);
    if (r4) {
      return {
        id: null, full: r4.player.name, club: r4.club || club,
        clubs: r4.clubs || [r4.club], pos: r4.player.pos || 'УНИ',
        player: r4.player, source: 'global'
      };
    }

    return buildFallback(str, club);
  }

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.PlayerResolver = {
    resolve: resolvePlayer,
    getPersonKey: getPersonKey,
    byId: function (id) { return SPECIAL_REGISTRY.find(function (p) { return p.id === id; }) || null; },
    all: function () { return SPECIAL_REGISTRY.slice(); },
    open: function (ref, clubHint) {
      var p = resolvePlayer(ref, clubHint);
      if (window.openPlayerCabinet) {
        try { window.openPlayerCabinet(p, clubHint); } catch (e) {}
      }
      return p;
    }
  };

  console.log('[player-resolver] v5.1 загружен · ' + SPECIAL_REGISTRY.length + ' спец-профилей · Самарцев Марк ✅ · Светличный Никита ✅');
})();