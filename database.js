/* ============================================================
   database.js — мастер-реестр игроков, заявки, статистика
   v1.2 — унификация клубов (Спринт, МИФИ, СШ Лада)
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'ff_database_v1';
  var MASTER_FLAG = 'ff_master_imported_v3';

  var POSITIONS = { 'ВРТ': 1, 'ЗАЩ': 1, 'ПЗ': 1, 'НАП': 1, 'УНИ': 1 };

  /* ⚡ УНИФИКАЦИЯ: все псевдонимы клубов маппятся в канонические имена */
  var CLUB_ALIASES = {
    // Спринт = Спринт-Кальяри = Спринт-Кальян
    'спринт-кальяри':      'Спринт',
    'спринт-кальян':       'Спринт',
    'спринт кальяри':      'Спринт',
    'спринт-кальяри ':     'Спринт',
    'sprint-кальяри':      'Спринт',
    // МИФИ = ДИТИ НИЯУ МИФИ
    'дити нияу мифи':      'ДИТИ НИЯУ МИФИ',
    'мифи':                'ДИТИ НИЯУ МИФИ',
    'мфи':                 'ДИТИ НИЯУ МИФИ',
    'дити нияу':           'ДИТИ НИЯУ МИФИ',
    // Лада = СШ Лада = ЛАДА
    'лада':                'СШ Лада',
    'сш лада':             'СШ Лада',
    'шсш лада':            'СШ Лада',
    // Нефтчи / Нефтчи
    'нефтчи':              'Нефтчи',
    // Молодёжка
    'фк не молодежка':     'ФК НЕ Молодёжка',
    'фк не молодёжка':     'ФК НЕ Молодёжка'
  };

  var TOURNEY_MAP = {
    'tournament_5x5':   '5x5',
    'tournament_7x7':   '7x7',
    'tournament_night': 'night_league_8x8',
    'cup_5x5':          'cup_5x5'
  };

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9\s\-\.]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function lastName(name) { var n = normalize(name); return n ? n.split(' ')[0] : ''; }
  function initials(name) {
    var n = normalize(name).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    return n.split(' ').slice(1).map(function (p) { return p[0] || ''; }).join('');
  }
  function playerKey(name) {
    var ln = lastName(name); if (!ln) return '';
    var ini = initials(name); return ln + (ini ? '|' + ini : '');
  }
  function fullName(p) { return p ? [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ') : ''; }

  var db = { players: {}, rosters: {}, attendance: {} };

  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {} }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.players) db.players = parsed.players;
        if (parsed.rosters) db.rosters = parsed.rosters;
        if (parsed.attendance) db.attendance = parsed.attendance;
      }
    } catch (e) {}
  }

  var playerCounter = 0;
  function genId() { return 'p_' + Date.now().toString(36) + '_' + (++playerCounter).toString(36); }

  function ensurePlayer(name, club) {
    var key = playerKey(name); if (!key) return null;
    var found = null;
    var keys = Object.keys(db.players);
    for (var i = 0; i < keys.length; i++) {
      var p = db.players[keys[i]];
      if (playerKey(fullName(p)) === key) { found = p; break; }
      if (p.aliases) for (var a = 0; a < p.aliases.length; a++) {
        if (playerKey(p.aliases[a]) === key) { found = p; break; }
      }
      if (found) break;
    }
    var parts = name.split(/\s+/);
    if (!found) {
      var id = genId();
      var np = {
        id: id, lastName: parts[0] || name, firstName: parts[1] || '', middleName: parts[2] || '',
        birthDate: '', photo: '', position: 'УНИ', aliases: [name],
        clubs: club ? [club] : [], tournaments: [], awards: [],
        stats: { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0 }
      };
      db.players[id] = np; return np;
    }
    if (name && found.aliases.indexOf(name) === -1) found.aliases.push(name);
    if (club && found.clubs.indexOf(club) === -1) found.clubs.push(club);
    if (parts[1] && !found.firstName) found.firstName = parts[1];
    if (parts[2] && !found.middleName) found.middleName = parts[2];
    return found;
  }

  function getPlayer(id) { return db.players[id] || null; }

  function findPlayersByName(name, clubHint) {
    name = String(name || '').trim(); if (!name) return [];
    var exactFull = normalize(name);
    var results = []; var seen = {};
    Object.keys(db.players).forEach(function (id) {
      var p = db.players[id];
      if (normalize(fullName(p)) === exactFull) { if (!seen[id]) { results.push(p); seen[id] = 1; } return; }
      for (var a = 0; a < (p.aliases || []).length; a++) {
        if (normalize(p.aliases[a]) === exactFull) { if (!seen[id]) { results.push(p); seen[id] = 1; } return; }
      }
    });
    if (results.length) {
      if (clubHint) {
        var f1 = results.filter(function (p) { return (p.clubs || []).indexOf(clubHint) !== -1; });
        if (f1.length) return f1;
      }
      return results;
    }
    var key = playerKey(name);
    Object.keys(db.players).forEach(function (id) {
      if (seen[id]) return;
      var p = db.players[id];
      if (playerKey(fullName(p)) === key) { results.push(p); seen[id] = 1; return; }
      for (var a = 0; a < (p.aliases || []).length; a++) {
        if (playerKey(p.aliases[a]) === key) { if (!seen[id]) { results.push(p); seen[id] = 1; } return; }
      }
    });
    if (clubHint) {
      var f2 = results.filter(function (p) { return (p.clubs || []).indexOf(clubHint) !== -1; });
      if (f2.length) return f2;
    }
    return results;
  }

  function updatePlayer(id, patch) { if (!db.players[id]) return; Object.assign(db.players[id], patch); save(); }
  function awardPlayer(id, award) {
    if (!db.players[id]) return;
    if (!db.players[id].awards) db.players[id].awards = [];
    if (db.players[id].awards.indexOf(award) === -1) db.players[id].awards.push(award);
    save();
  }

  function rosterKey(tk, club) { return tk + '|' + club; }
  function getRoster(tk, club) {
    var k = rosterKey(tk, club);
    if (!db.rosters[k]) db.rosters[k] = [];
    return db.rosters[k];
  }
  function addToRoster(tk, club, name, opts) {
    opts = opts || {};
    var p = ensurePlayer(name, club); if (!p) return null;
    var r = getRoster(tk, club);
    var ex = r.find(function (x) { return x.playerId === p.id; });
    if (ex) {
      if (opts.num) ex.num = opts.num;
      if (opts.pos) ex.pos = opts.pos;
      if (opts.captain) ex.captain = true;
    } else {
      r.push({ playerId: p.id, num: opts.num || '', pos: opts.pos || p.position || 'УНИ', captain: !!opts.captain,
        matches: 0, goals: 0, assists: 0, yellow: 0, red: 0 });
    }
    if (p.tournaments.indexOf(tk) === -1) p.tournaments.push(tk);
    save(); return p;
  }

  function attKey(tk, matchId) { return tk + '|' + matchId; }
  function getAttendance(tk, matchId) {
    var k = attKey(tk, matchId); if (!db.attendance[k]) db.attendance[k] = [];
    return db.attendance[k];
  }
  function setAttendance(tk, matchId, ids) { db.attendance[attKey(tk, matchId)] = ids.slice(); save(); }

  function parseScorersEvents(scorers, t1, t2) {
    var events = []; if (!scorers) return events;
    scorers.split(';').forEach(function (part) {
      part = part.trim(); if (!part) return;
      var sp = part.split(':'); if (sp.length < 2) return;
      var club = sp[0].trim();
      var rest = sp.slice(1).join(':');
      var redPart = '', yellowPart = '';
      var r = rest.indexOf('КК:'); if (r !== -1) { redPart = rest.slice(r + 3); rest = rest.slice(0, r); }
      var y = rest.indexOf('ЖК:'); if (y !== -1) { yellowPart = rest.slice(y + 3); rest = rest.slice(0, y); }
      rest.split(',').forEach(function (tok) {
        tok = tok.trim(); if (!tok) return;
        if (/автогол|\(аг\)|техническ/i.test(tok)) return;
        var cnt = 1; var mm = tok.match(/\((\d+)\)/);
        if (mm) { cnt = parseInt(mm[1]) || 1; tok = tok.replace(/\((\d+)\)/, '').trim(); }
        var assist = '';
        if (tok.indexOf('/') !== -1) {
          var pp = tok.split('/');
          tok = pp[0].trim();
          assist = (pp[1] || '').trim();
        }
        if (tok) events.push({ name: tok, club: club, type: 'goal', count: cnt, assist: assist });
      });
      yellowPart.split(',').forEach(function (tok) { tok = tok.trim(); if (tok) events.push({ name: tok, club: club, type: 'yellow', count: 1 }); });
      redPart.split(',').forEach(function (tok) { tok = tok.trim(); if (tok) events.push({ name: tok, club: club, type: 'red', count: 1 }); });
    });
    return events;
  }

  /* ⚡ Унификация названия клуба */
  function resolveClubName(name) {
    if (!name) return '';
    var clubs = window.clubsData || [];
    // 1. Точное совпадение с каноническим именем
    for (var i = 0; i < clubs.length; i++) {
      if (clubs[i].name === name) return clubs[i].name;
    }
    // 2. Маппинг через алиасы
    var n = normalize(name);
    if (CLUB_ALIASES[n]) {
      var target = CLUB_ALIASES[n];
      // Проверяем что такой клуб есть в clubsData
      for (var k = 0; k < clubs.length; k++) {
        if (clubs[k].name === target) return target;
      }
      return target;
    }
    // 3. Нечёткое совпадение
    var matches = [];
    for (var j = 0; j < clubs.length; j++) {
      var cn = normalize(clubs[j].name); if (!cn) continue;
      if (cn.indexOf(n) !== -1 || n.indexOf(cn) !== -1) matches.push(clubs[j].name);
    }
    if (matches.length === 1) return matches[0];
    return name;
  }

  function mergeMasterMatches() {
    if (!window.LFLD_MASTER_DB || !window.tournamentsData) return 0;
    var TD = window.tournamentsData; var added = 0;
    Object.keys(TOURNEY_MAP).forEach(function (mk) {
      var tk = TOURNEY_MAP[mk];
      var mt = window.LFLD_MASTER_DB[mk];
      if (!mt || !Array.isArray(mt.matches) || !TD[tk]) return;
      if (!Array.isArray(TD[tk].matches)) TD[tk].matches = [];
      mt.matches.forEach(function (mm) {
        if (!mm || !mm.teamHome || !mm.teamAway) return;
        var t1 = resolveClubName(mm.teamHome);
        var t2 = resolveClubName(mm.teamAway);
        var tour = mm.tour || mm.stage || '1 ТУР';
        var exists = TD[tk].matches.some(function (x) {
          return x && x.t1 === t1 && x.t2 === t2 && x.tour === tour && x.date === (mm.date || '');
        });
        if (exists) return;
        var arr = [];
        function sideText(team, events) {
          if (!events || !events.length) return null;
          var goals = [], yc = [], rc = [];
          events.forEach(function (e) {
            var cnt = e.count || 1;
            if (e.type === 'goal') {
              var g = e.player + (cnt > 1 ? ' (' + cnt + ')' : '');
              if (e.assist) g += '/' + e.assist;
              goals.push(g);
            }
            else if (e.type === 'yellow_card') yc.push(e.player);
            else if (e.type === 'red_card') rc.push(e.player);
          });
          var body = [goals.length ? goals.join(', ') : '—'];
          if (yc.length) body.push('ЖК: ' + yc.join(', '));
          if (rc.length) body.push('КК: ' + rc.join(', '));
          return team + ': ' + body.join(', ');
        }
        var sh = sideText(t1, mm.eventsHome); var sa = sideText(t2, mm.eventsAway);
        if (sh) arr.push(sh); if (sa) arr.push(sa);
        var sp = String(mm.score || '0:0').split(':');
        TD[tk].matches.push({
          tour: tour, date: mm.date || '',
          t1: t1, s1: parseInt(sp[0]) || 0, s2: parseInt(sp[1]) || 0, t2: t2,
          scorers: arr.join('; '), played: true, status: 'finished'
        });
        added++;
      });
    });
    if (added && window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    return added;
  }

  function importFromMasterDatabase(force) {
    if (!window.LFLD_MASTER_DB) return null;
    if (!force && localStorage.getItem(MASTER_FLAG)) return null;
    var M = window.LFLD_MASTER_DB;
    var result = { players: 0, rosters: 0, tournaments: [], matches: 0 };
    var seen = {};

    ['tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (mk) {
      var tk = TOURNEY_MAP[mk]; var t = M[mk];
      if (!t || !t.teams) return;
      result.tournaments.push(tk);
      Object.keys(t.teams).forEach(function (rc) {
        var list = t.teams[rc]; if (!Array.isArray(list)) return;
        var club = resolveClubName(rc);
        list.forEach(function (p) {
          if (!p || !p.name) return;
          var player = ensurePlayer(p.name, club); if (!player) return;
          if (p.birth && p.birth !== '—' && !player.birthDate) player.birthDate = p.birth;
          if (p.pos && p.pos !== 'УНИ' && player.position === 'УНИ') player.position = p.pos;
          if (p.isCaptain) player.isCaptain = true;

          if (p.award) {
            if (!player.awards) player.awards = [];
            String(p.award).split(';').forEach(function (aw) {
              aw = aw.trim();
              if (aw && player.awards.indexOf(aw) === -1) player.awards.push(aw);
            });
          }

          if (player.tournaments.indexOf(tk) === -1) player.tournaments.push(tk);
          var roster = getRoster(tk, club);
          var ex = roster.find(function (x) { return x.playerId === player.id; });
          if (!ex) {
            roster.push({ playerId: player.id, num: '', pos: p.pos || player.position || 'УНИ', captain: !!p.isCaptain,
              matches: p.m || 0, goals: p.g || 0, assists: p.a || 0, yellow: p.yc || 0, red: p.rc || 0 });
            result.rosters++;
          }
          if (!seen[player.id]) {
            player.stats = { matches: p.m || 0, goals: p.g || 0, assists: p.a || 0, yellow: p.yc || 0, red: p.rc || 0 };
            seen[player.id] = true;
          } else {
            player.stats.matches += p.m || 0; player.stats.goals += p.g || 0;
            player.stats.assists += p.a || 0; player.stats.yellow += p.yc || 0; player.stats.red += p.rc || 0;
          }
          result.players++;
        });
      });
    });

    if (M.cup_5x5 && Array.isArray(M.cup_5x5.players)) {
      var tkc = TOURNEY_MAP['cup_5x5'];
      result.tournaments.push(tkc);
      M.cup_5x5.players.forEach(function (p) {
        if (!p || !p.name) return;
        var club = resolveClubName(p.team);
        var player = ensurePlayer(p.name, club); if (!player) return;

        if (Array.isArray(p.career)) {
          if (!player.career) player.career = [];
          p.career.forEach(function (entry) {
            if (player.career.indexOf(entry) === -1) player.career.push(entry);
          });
        }
        if (Array.isArray(p.awards)) {
          if (!player.awards) player.awards = [];
          p.awards.forEach(function (aw) {
            if (aw && player.awards.indexOf(aw) === -1) player.awards.push(aw);
          });
        }
        if (p.award) {
          if (!player.awards) player.awards = [];
          String(p.award).split(';').forEach(function (aw) {
            aw = aw.trim();
            if (aw && player.awards.indexOf(aw) === -1) player.awards.push(aw);
          });
        }
        if (player.tournaments.indexOf(tkc) === -1) player.tournaments.push(tkc);

        var roster = getRoster(tkc, club);
        var ex = roster.find(function (x) { return x.playerId === player.id; });
        if (!ex) {
          roster.push({ playerId: player.id, num: '', pos: player.position || 'УНИ', captain: false,
            matches: p.m || 0, goals: p.g || 0, assists: 0, yellow: p.yc || 0, red: p.rc || 0 });
          result.rosters++;
        }
        if (!seen[player.id]) {
          player.stats = { matches: p.m || 0, goals: p.g || 0, assists: 0, yellow: p.yc || 0, red: p.rc || 0 };
          seen[player.id] = true;
        } else {
          player.stats.matches += p.m || 0; player.stats.goals += p.g || 0;
          player.stats.yellow += p.yc || 0; player.stats.red += p.rc || 0;
        }
        result.players++;
      });
    }

    result.matches = mergeMasterMatches();
    save();
    if (!force) localStorage.setItem(MASTER_FLAG, '1');
    console.log('[database] master импортирован:', result);
    return result;
  }

  function getTournamentClubStats(tk, club) {
    if (!tk || !club) return [];
    var M = window.LFLD_MASTER_DB;
    if (M) {
      var mk = null;
      Object.keys(TOURNEY_MAP).forEach(function (k) { if (TOURNEY_MAP[k] === tk) mk = k; });
      if (mk === 'cup_5x5' && M.cup_5x5 && Array.isArray(M.cup_5x5.players)) {
        var acc = {};
        M.cup_5x5.players.forEach(function (p) {
          if (resolveClubName(p.team) !== club) return;
          var key = playerKey(p.name);
          if (!acc[key]) acc[key] = { name: p.name, pos: 'УНИ', birth: '', m: 0, g: 0, a: 0, yc: 0, rc: 0 };
          acc[key].m += p.m || 0; acc[key].g += p.g || 0; acc[key].yc += p.yc || 0; acc[key].rc += p.rc || 0;
        });
        return Object.keys(acc).map(function (k) { return acc[k]; });
      }
      if (mk && M[mk] && M[mk].teams) {
        var rc = null;
        Object.keys(M[mk].teams).forEach(function (k) { if (!rc && (k === club || resolveClubName(k) === club)) rc = k; });
        if (rc) {
          return M[mk].teams[rc].map(function (p) {
            return { name: p.name, pos: p.pos || 'УНИ', birth: p.birth || '', m: p.m || 0, g: p.g || 0, a: p.a || 0, yc: p.yc || 0, rc: p.rc || 0 };
          });
        }
      }
    }
    var r = getRoster(tk, club);
    return r.map(function (x) {
      var p = getPlayer(x.playerId); if (!p) return null;
      return { name: fullName(p), pos: x.pos || p.position || 'УНИ', birth: p.birthDate || '', m: x.matches || 0, g: x.goals || 0, a: x.assists || 0, yc: x.yellow || 0, rc: x.red || 0 };
    }).filter(Boolean);
  }

  function saveSymbolicTeam(tk, round, players) {
    try {
      var all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}');
      all[tk + '|' + round] = { tourneyKey: tk, round: round, players: players };
      localStorage.setItem('ff_symbolic_teams', JSON.stringify(all));
    } catch(e) {}
  }
  function getSymbolicTeam(tk, round) {
    try {
      var all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}');
      if (round) return all[tk + '|' + round] || null;
      var keys = Object.keys(all).filter(function(k){ return k.indexOf(tk + '|') === 0; });
      if (!keys.length) return null;
      return all[keys[keys.length - 1]];
    } catch(e) { return null; }
  }

  window.database = {
    players: function () { return db.players; },
    getPlayer: getPlayer,
    ensurePlayer: ensurePlayer,
    updatePlayer: updatePlayer,
    findPlayersByName: findPlayersByName,
    awardPlayer: awardPlayer,
    getRoster: getRoster,
    addToRoster: addToRoster,
    getAttendance: getAttendance,
    setAttendance: setAttendance,
    parseScorersEvents: parseScorersEvents,
    importFromMasterDatabase: importFromMasterDatabase,
    mergeMasterMatches: mergeMasterMatches,
    resolveClubName: resolveClubName,
    getTournamentClubStats: getTournamentClubStats,
    saveSymbolicTeam: saveSymbolicTeam,
    getSymbolicTeam: getSymbolicTeam,
    save: save, load: load,
    normalize: normalize, lastName: lastName, playerKey: playerKey, fullName: fullName,
    CLUB_ALIASES: CLUB_ALIASES
  };

  load();
  console.log('[database] загружен, игроков:', Object.keys(db.players).length);
})();