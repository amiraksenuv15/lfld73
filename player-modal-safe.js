/* ============================================================
   player-modal-safe.js v5.0

   КЛЮЧЕВОЕ УЛУЧШЕНИЕ v5.0:
   - Многоуровневый каскад поиска даты рождения:
     1. dbPlayer.birthDate (database.js)
     2. Найти в database.js заново по name/club
     3. player.birth (resolved от PlayerResolver)
     4. window.playerPersonal.getBirthDate(id)
     5. window.LFLD_BIRTH_DATES[id] / [fio] / [фамилия_имя]
     6. window.getBirthDate() helper
     7. Все турниры LFLD_MASTER_DB (teams + cup players)
     8. '—'

   - Аналогично для ФИО и позиции:
     1. dbPlayer (database.js)
     2. playerPersonal
     3. LFLD_MASTER_DB
     4. PlayerResolver

   - Компактные имена в списках, полное ФИО в досье
   - ID скрыт из интерфейса
   ============================================================ */
(function () {
  'use strict';

  function safeStr(v) { return String(v == null ? '' : v); }
  function escapeHtml(s) {
    return safeStr(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function normKey(s) {
    return safeStr(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function normWithSpaces(s) {
    return safeStr(s).toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function compactName(fullName) {
    if (!fullName) return '';
    var words = safeStr(fullName).trim().split(/\s+/).filter(Boolean);
    if (words.length <= 2) return words.join(' ');
    return words.slice(0, 2).join(' ');
  }
  function ageFromBirth(birth) {
    if (!birth || birth === '—') return null;
    var m = String(birth).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) {
      m = String(birth).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        var d2 = new Date(+m[1], +m[2] - 1, +m[3]);
        if (isNaN(d2.getTime())) return null;
        return Math.floor((Date.now() - d2.getTime()) / (365.25 * 24 * 3600 * 1000));
      }
      return null;
    }
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  }
  function posBadgeClass(pos) {
    var map = { 'ВРТ':'pos-vrt','ЗАЩ':'pos-zas','ПЗ':'pos-pz','НАП':'pos-nap','АТК':'pos-nap','УНИ':'pos-uni' };
    return map[pos] || 'pos-uni';
  }

  /* ============================================================
     РАЗБОР АРГУМЕНТОВ
     ============================================================ */
  function parseArgs(arg1, arg2) {
    var result = { id: null, name: '', club: safeStr(arg2).trim(), obj: null };
    try {
      if (arg1 == null) {
        if (arg2 && typeof arg2 === 'object') {
          arg1 = arg2; arg2 = ''; result.club = '';
        } else return result;
      }
      if (typeof arg1 === 'object') {
        result.obj = arg1;
        result.id = arg1.id || null;
        result.name = safeStr(arg1.full || arg1.fullName || arg1.name || '').trim();
        result.club = result.club || safeStr(arg1.club || arg1.team || '').trim();
      } else if (typeof arg1 === 'string') {
        var s = arg1.trim();
        if (!s) return result;
        if (/^p_[a-z0-9_]+$/i.test(s)) result.id = s;
        else result.name = s;
      } else if (typeof arg1 === 'number') {
        result.id = 'p_' + arg1;
      }
    } catch (e) {}
    return result;
  }

  /* ============================================================
     ПОИСК В DATABASE.JS
     ============================================================ */
  function findInDatabase(id, name, clubHint) {
    if (!window.database) return null;

    /* 1. По ID */
    if (id && window.database.getPlayer) {
      try {
        var byId = window.database.getPlayer(id);
        if (byId) return byId;
      } catch (e) {}
    }

    /* 2. Через findPlayersByName */
    if (name && window.database.findPlayersByName) {
      try {
        var found = window.database.findPlayersByName(name, clubHint);
        if (found && found.length) return found[0];
      } catch (e) {}
    }

    /* 3. Ручной обход */
    if (window.database.players) {
      try {
        var all = window.database.players();
        var targetKey = normKey(name);
        if (!targetKey) return null;
        var list = Object.keys(all).map(function (k) { return all[k]; });

        /* 3a. Точное полное ФИО */
        var exact = list.find(function (p) {
          var full = normKey([p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '));
          return full === targetKey;
        });
        if (exact) return exact;

        /* 3b. Фамилия + Имя (без отчества) */
        var shortMatch = list.find(function (p) {
          var short = normKey([p.lastName, p.firstName].filter(Boolean).join(' '));
          return short === targetKey;
        });
        if (shortMatch) return shortMatch;

        /* 3c. Фамилия + первая буква имени */
        var nameParts = normWithSpaces(name).split(' ').filter(Boolean);
        if (nameParts.length >= 1) {
          var surname = nameParts[0];
          var firstInitial = nameParts[1] ? nameParts[1][0] : '';
          var partsMatch = list.find(function (p) {
            if (normKey(p.lastName) !== surname) return false;
            if (!firstInitial) return true;
            var pFirst = normKey(p.firstName);
            return pFirst && pFirst[0] === firstInitial;
          });
          if (partsMatch) return partsMatch;
        }

        /* 3d. Фамилия + клуб */
        if (clubHint) {
          var surname2 = nameParts[0];
          var clubNorm = normKey(clubHint);
          var byClub = list.find(function (p) {
            if (normKey(p.lastName) !== surname2) return false;
            return (p.clubs || []).some(function (c) { return normKey(c) === clubNorm; });
          });
          if (byClub) return byClub;
        }
      } catch (e) {}
    }

    return null;
  }

  function dbFullName(dbPlayer) {
    if (!dbPlayer) return '';
    return [dbPlayer.lastName, dbPlayer.firstName, dbPlayer.middleName]
      .filter(Boolean).join(' ').trim();
  }

  /* ============================================================
     ⚡ КАСКАД: ПОЛНОЕ ФИО
     ============================================================ */
  function cascadeFullName(id, name, clubHint, dbPlayer) {
    /* 1. database.js — приоритет */
    if (dbPlayer) {
      var f = dbFullName(dbPlayer);
      if (f) return f;
    }
    if (!dbPlayer) {
      var db = findInDatabase(id, name, clubHint);
      if (db) {
        var f2 = dbFullName(db);
        if (f2) return f2;
      }
    }

    /* 2. playerPersonal */
    if (window.playerPersonal && window.playerPersonal.getFullName && id) {
      try {
        var pn = window.playerPersonal.getFullName(id);
        if (pn) return pn;
      } catch (e) {}
    }

    /* 3. Обход всех турниров — самое полное ФИО */
    var M = window.LFLD_MASTER_DB;
    if (M && (name || id)) {
      var targetKey = normKey(name);
      var best = '';
      function consider(c) {
        if (!c) return;
        var w = safeStr(c).trim().split(/\s+/).filter(Boolean);
        var bw = best ? best.trim().split(/\s+/).filter(Boolean) : [];
        if (w.length > bw.length) { best = w.join(' '); return; }
        if (w.length === bw.length && c.length > best.length) best = w.join(' ');
      }
      ['tournament_5x5','tournament_7x7','tournament_night','cup_5x5'].forEach(function (tk) {
        var t = M[tk];
        if (!t) return;
        if (t.teams) {
          Object.keys(t.teams).forEach(function (club) {
            (t.teams[club] || []).forEach(function (p) {
              if (p && p.name && normKey(p.name) === targetKey) consider(p.name);
            });
          });
        }
        if (Array.isArray(t.players)) {
          t.players.forEach(function (p) {
            if (p && p.name && normKey(p.name) === targetKey) consider(p.name);
          });
        }
      });
      if (best) return best;
    }

    /* 4. PlayerResolver */
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try {
        var r = window.PlayerResolver.resolve(id || name, clubHint);
        if (r && r.fullOfficial) return r.fullOfficial;
        if (r && r.full) return r.full;
      } catch (e) {}
    }

    return name || '';
  }

  /* ============================================================
     ⚡ КАСКАД: ДАТА РОЖДЕНИЯ
     ============================================================ */
  function cascadeBirthDate(id, name, clubHint, dbPlayer) {
    /* 1. database.js — приоритет */
    if (dbPlayer && dbPlayer.birthDate && dbPlayer.birthDate !== '—' && dbPlayer.birthDate.length >= 4) {
      return dbPlayer.birthDate;
    }
    if (!dbPlayer) {
      var db = findInDatabase(id, name, clubHint);
      if (db && db.birthDate && db.birthDate !== '—' && db.birthDate.length >= 4) {
        return db.birthDate;
      }
    }

    /* 2. playerPersonal */
    if (window.playerPersonal && window.playerPersonal.getBirthDate && id) {
      try {
        var pb = window.playerPersonal.getBirthDate(id);
        if (pb) return pb;
      } catch (e) {}
    }

    /* 3. LFDL_BIRTH_DATES */
    var dates = window.LFLD_BIRTH_DATES || {};
    if (id && dates[id] && dates[id] !== '—') return dates[id];
    var nKey = normKey(name);
    if (nKey && dates[nKey] && dates[nKey] !== '—') return dates[nKey];
    var parts = normWithSpaces(name).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      var shortKey = parts[0] + '_' + parts[1];
      if (dates[shortKey] && dates[shortKey] !== '—') return dates[shortKey];
    }

    /* 4. getBirthDate helper */
    if (window.getBirthDate) {
      try {
        var d = window.getBirthDate({ id: id, full: name, club: clubHint });
        if (d && d !== '—') return d;
      } catch (e) {}
    }

    /* 5. Обход турниров */
    var M = window.LFLD_MASTER_DB;
    if (M && (name || id)) {
      var targetKey = normKey(name);
      var found = '';
      ['tournament_5x5','tournament_7x7','tournament_night','cup_5x5'].forEach(function (tk) {
        if (found) return;
        var t = M[tk];
        if (!t) return;
        if (t.teams) {
          Object.keys(t.teams).forEach(function (club) {
            if (found) return;
            (t.teams[club] || []).forEach(function (p) {
              if (found) return;
              if (!p) return;
              var isMatch = (id && p.id === id) || (p.name && normKey(p.name) === targetKey);
              if (isMatch) {
                var b = p.birth || p.birthDate;
                if (b && b !== '—' && b.length >= 4) found = b;
              }
            });
          });
        }
        if (!found && Array.isArray(t.players)) {
          t.players.forEach(function (p) {
            if (found) return;
            if (!p) return;
            var isMatch = (id && p.id === id) || (p.name && normKey(p.name) === targetKey);
            if (isMatch) {
              var b = p.birth || p.birthDate;
              if (b && b !== '—' && b.length >= 4) found = b;
            }
          });
        }
      });
      if (found) return found;
    }

    return '';
  }

  /* ============================================================
     ⚡ КАСКАД: ПОЗИЦИЯ
     ============================================================ */
  function cascadePosition(dbPlayer, resolved) {
    if (dbPlayer && dbPlayer.position) return dbPlayer.position;
    if (resolved && resolved.pos) return resolved.pos;
    return 'УНИ';
  }

  /* ============================================================
     ФОТО
     ============================================================ */
  function cascadePhoto(id, name, clubHint, dbPlayer) {
    /* 1. database.js */
    if (dbPlayer && dbPlayer.photo) return dbPlayer.photo;

    /* 2. teamMedia */
    if (id && window.teamMedia) {
      var u = window.teamMedia.findPlayerPhotoAnywhere(id);
      if (u) return u;
    }

    /* 3. lfldMedia */
    if (window.lfldMedia && window.lfldMedia.getPlayerPhoto) {
      try {
        var u2 = window.lfldMedia.getPlayerPhoto({ id: id, full: name, club: clubHint });
        if (u2) return u2;
      } catch (e) {}
    }

    /* 4. Legacy */
    var M = window.LFLD_MASTER_DB;
    if (id && M && M.playerPhotos && M.playerPhotos[id]) return M.playerPhotos[id];

    /* 5. localStorage */
    try {
      var local = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      if (id && local[id]) return local[id];
    } catch (e) {}

    return '';
  }

  /* ============================================================
     КАРЬЕРА
     ============================================================ */
  var TOURNEY_LABELS = {
    'tournament_5x5': 'Первенство 5х5 (Лето 2026)',
    'tournament_7x7': 'Первенство 7х7 (Весна 2026)',
    'tournament_night': 'Ночная лига 8х8 (2026)',
    'cup_5x5': 'Кубок ЛФЛД 5х5 (2026)'
  };

  function buildCareer(id, name) {
    var empty = { list: [], total: { m: 0, g: 0, a: 0, yc: 0, rc: 0 }, clubs: [] };
    var M = window.LFLD_MASTER_DB;
    if (!M) return empty;

    var targetKey = normKey(name);
    function matches(p) {
      if (!p) return false;
      if (id && p.id && p.id === id) return true;
      if (p.name && targetKey && normKey(p.name) === targetKey) return true;
      return false;
    }

    var list = [];
    var total = { m: 0, g: 0, a: 0, yc: 0, rc: 0 };
    var clubsMap = {};

    ['cup_5x5','tournament_5x5','tournament_7x7','tournament_night'].forEach(function (tk) {
      var t = M[tk];
      if (!t) return;
      var club = '', m = 0, g = 0, a = 0, yc = 0, rc = 0;

      if (t.teams) {
        Object.keys(t.teams).forEach(function (clubKey) {
          if (club) return;
          (t.teams[clubKey] || []).forEach(function (p) {
            if (club) return;
            if (matches(p)) {
              club = clubKey;
              m = p.m || 0; g = p.g || 0; a = p.a || 0; yc = p.yc || 0; rc = p.rc || 0;
            }
          });
        });
      }

      if (!club && Array.isArray(t.players)) {
        t.players.forEach(function (p) {
          if (club) return;
          if (matches(p)) {
            club = p.team || '';
            m = p.m || 0; g = p.g || 0; yc = p.yc || 0; rc = p.rc || 0;
          }
        });
      }

      if (club) {
        clubsMap[club] = 1;
        list.push({
          tournamentTitle: TOURNEY_LABELS[tk] || tk,
          club: club, m: m, g: g, a: a, yc: yc, rc: rc
        });
        total.m += m; total.g += g; total.a += a; total.yc += yc; total.rc += rc;
      }
    });

    return { list: list, total: total, clubs: Object.keys(clubsMap) };
  }

  /* ============================================================
     РЕНДЕР
     ============================================================ */
  function renderCabinetHTML(profile) {
    var photoUrl = profile.photo || '';
    var displayFull = profile.fullOfficial || profile.displayName || 'Неизвестный игрок';
    var age = ageFromBirth(profile.birth);

    var photoHtml;
    if (photoUrl && photoUrl.length > 30) {
      photoHtml = '<img src="' + escapeHtml(photoUrl) + '" alt="" class="pc-photo-img" ' +
        'onerror="this.onerror=null;this.style.display=\'none\';' +
        'this.parentNode.innerHTML=\'<div class=&quot;pc-photo-placeholder&quot;><span>👤</span></div>\';">';
    } else {
      photoHtml = '<div class="pc-photo-placeholder"><span>👤</span></div>';
    }

    var birthHtml = '';
    if (profile.birth && profile.birth !== '—') {
      birthHtml = '<div class="pc-row">' +
        '<strong>Дата рождения:</strong> ' + escapeHtml(profile.birth) +
        (age !== null ? ' <span style="color:#94a3b8;">(' + age + ' лет)</span>' : '') +
        '</div>';
    } else {
      birthHtml = '<div class="pc-row" style="color:#64748b;">' +
        '<strong>Дата рождения:</strong> —</div>';
    }

    var clubHtml = '';
    if (profile.club && profile.club !== '—') {
      var clubJs = String(profile.club).replace(/'/g, "\\'");
      clubHtml = '<div class="pc-row"><strong>Клуб:</strong> ' +
        '<button type="button" class="pc-club-link" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); ' +
          'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;background:none;border:none;padding:0;' +
          'color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
          escapeHtml(profile.club) + '</button></div>';
    }

    var awardsHtml = '';
    if (profile.awards && profile.awards.length) {
      awardsHtml = '<div class="pc-row" style="margin-top:10px;">' +
        '<strong>Награды:</strong> ' +
        profile.awards.map(function (a) {
          return '<span class="pc-award-badge">🏆 ' + escapeHtml(a) + '</span>';
        }).join(' ') + '</div>';
    }

    var clubsPlaquesHtml = '';
    if (profile.clubs && profile.clubs.length) {
      clubsPlaquesHtml = profile.clubs.map(function (club) {
        var clubJs = String(club).replace(/'/g, "\\'");
        return '<button type="button" class="pc-club-tag pc-club-tag-clickable" ' +
          'data-club="' + escapeHtml(club) + '" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); ' +
          'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;border:none;">' +
          escapeHtml(club) + '</button>';
      }).join('');
    } else {
      clubsPlaquesHtml = '<span class="pc-muted">—</span>';
    }

    var careerTableHtml = '';
    if (profile.statsByTournament && profile.statsByTournament.length) {
      careerTableHtml = '<table class="pc-career-table"><thead><tr>' +
        '<th class="text-left">Клуб</th>' +
        '<th class="text-left">Турнир</th>' +
        '<th>М</th><th>Г</th><th>А</th><th>ЖК</th><th>КК</th>' +
      '</tr></thead><tbody>';
      profile.statsByTournament.forEach(function (s) {
        var clubJs = String(s.club || '').replace(/'/g, "\\'");
        careerTableHtml += '<tr>' +
          '<td class="text-left">' +
            '<button type="button" class="pc-club-link" ' +
              'onclick="event.preventDefault(); event.stopPropagation(); ' +
              'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\');" ' +
              'style="cursor:pointer;background:none;border:none;padding:0;' +
              'color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
              escapeHtml(s.club || '—') + '</button></td>' +
          '<td class="text-left">' + escapeHtml(s.tournamentTitle || '') + '</td>' +
          '<td>' + (s.m || 0) + '</td>' +
          '<td class="goals-cell">' + (s.g || 0) + '</td>' +
          '<td class="assist-cell">' + (s.a || 0) + '</td>' +
          '<td class="yellow-cell">' + (s.yc || 0) + '</td>' +
          '<td class="red-cell">' + (s.rc || 0) + '</td>' +
        '</tr>';
      });
      careerTableHtml += '</tbody></table>';
    } else {
      careerTableHtml = '<div class="pc-muted">Статистика в протоколах пока отсутствует.</div>';
    }

    var totalHtml = '';
    if (profile.totalStats) {
      totalHtml =
        '<h4 class="pc-section-title">📊 Сводная статистика</h4>' +
        '<div class="pc-stats pc-stats-3">' +
          '<div class="pc-stat"><div class="pc-stat-value">' + (profile.totalStats.matches || 0) + '</div><div class="pc-stat-label">Матчи</div></div>' +
          '<div class="pc-stat"><div class="pc-stat-value">' + (profile.totalStats.goals || 0) + '</div><div class="pc-stat-label">⚽ Голы</div></div>' +
          '<div class="pc-stat"><div class="pc-stat-value">' + (profile.totalStats.assists || 0) + '</div><div class="pc-stat-label">👟 Ассисты</div></div>' +
        '</div>';
    }

    var html = '';
    html += '<div class="pc-header">';
    html +=   '<div class="pc-photo">' + photoHtml + '</div>';
    html +=   '<div class="pc-info">';
    html +=     '<h2 class="pc-name">' + escapeHtml(displayFull) + '</h2>';
    html +=     '<div class="pc-pos"><span class="pos-badge ' + posBadgeClass(profile.position) + '">' + escapeHtml(profile.position || 'УНИ') + '</span></div>';
    html +=     birthHtml;
    html +=     clubHtml;
    html +=     awardsHtml;
    html +=   '</div>';
    html += '</div>';
    html += totalHtml;
    html += '<h4 class="pc-section-title">🏟 Карьера · клубы</h4><div class="pc-tags">' + clubsPlaquesHtml + '</div>';
    html += '<h4 class="pc-section-title">📋 Статистика по клубам</h4>' + careerTableHtml;
    return html;
  }

  /* ============================================================
     ГЛАВНАЯ
     ============================================================ */
  function openPlayerModal(playerRef, fallbackClub) {
    try {
      var parsed = parseArgs(playerRef, fallbackClub);
      var targetId = parsed.id;
      var targetName = parsed.name;
      var clubHint = parsed.club;

      if (!targetId && !targetName) {
        console.warn('[openPlayerModal] Нет ни ID, ни имени');
        return null;
      }

      /* 1. Поиск в database.js */
      var dbPlayer = findInDatabase(targetId, targetName, clubHint);

      /* 2. Если нашли в базе и у нас нет ID — берём оттуда */
      if (dbPlayer && dbPlayer.id) {
        targetId = dbPlayer.id;
      }

      /* 3. Через PlayerResolver */
      var resolved = null;
      if (window.PlayerResolver && window.PlayerResolver.resolve) {
        try { resolved = window.PlayerResolver.resolve(targetId || targetName, clubHint); }
        catch (e) {}
      }

      /* 4. Компактное имя */
      var compact = '';
      if (dbPlayer && dbPlayer.lastName && dbPlayer.firstName) {
        compact = dbPlayer.lastName + ' ' + dbPlayer.firstName;
      } else if (resolved && resolved.full) {
        compact = compactName(resolved.full);
      } else {
        compact = compactName(targetName);
      }

      /* 5. ⚡ Каскад: полное ФИО */
      var officialFull = cascadeFullName(targetId, compact, clubHint, dbPlayer);

      /* 6. ⚡ Каскад: позиция */
      var position = cascadePosition(dbPlayer, resolved);

      /* 7. ⚡ Каскад: дата рождения */
      var birth = cascadeBirthDate(targetId, compact, clubHint, dbPlayer);

      /* 8. ⚡ Каскад: фото */
      var photo = cascadePhoto(targetId, compact, clubHint, dbPlayer);

      /* 9. Клуб */
      var club = '';
      if (dbPlayer && dbPlayer.clubs && dbPlayer.clubs.length) {
        club = dbPlayer.clubs[dbPlayer.clubs.length - 1];
      } else if (resolved && resolved.club) {
        club = resolved.club;
      } else {
        club = clubHint || '';
      }

      /* 10. Карьера */
      var career = buildCareer(targetId, compact);

      /* 11. Награды */
      var awards = (dbPlayer && dbPlayer.awards) ? dbPlayer.awards : [];

      /* 12. Профиль */
      var profile = {
        id: targetId,
        displayName: compact,
        fullOfficial: officialFull || compact,
        position: position,
        birth: birth || '',
        photo: photo || '',
        club: club,
        awards: awards,
        clubs: career.clubs,
        statsByTournament: career.list,
        totalStats: {
          matches: career.total.m,
          goals: career.total.g,
          assists: career.total.a
        }
      };

      /* 13. Модалка */
      var modal = document.getElementById('playerCabinetModal') || document.getElementById('playerModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'playerCabinetModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML =
          '<div class="modal-content" style="max-width:640px;position:relative;">' +
            '<button class="modal-close" type="button" ' +
              'onclick="window.closePlayerCabinet && window.closePlayerCabinet();">✕</button>' +
            '<div id="playerCabinetBody"></div>' +
          '</div>';
        document.body.appendChild(modal);
      }

      var body = document.getElementById('playerCabinetBody');
      if (!body) {
        body = document.createElement('div');
        body.id = 'playerCabinetBody';
        var content = modal.querySelector('.modal-content');
        if (content) content.appendChild(body);
        else modal.appendChild(body);
      }

      try {
        body.innerHTML = renderCabinetHTML(profile);
      } catch (renderErr) {
        console.error('[openPlayerModal] render error:', renderErr);
        body.innerHTML = '<div style="padding:30px;text-align:center;color:#fca5a5;">⚠️ Ошибка рендера</div>';
      }

      modal.classList.add('show');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.zIndex = '1000';
      document.body.style.overflow = 'hidden';

      console.log('[openPlayerModal] ✅',
        '| id:', targetId,
        '| full:', officialFull,
        '| pos:', position,
        '| birth:', birth || '—',
        '| dbPlayer:', dbPlayer ? 'ДА' : 'нет');

      return profile;

    } catch (err) {
      console.error('[openPlayerModal] ❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
      return null;
    }
  }

  function closePlayerCabinet() {
    try {
      ['playerCabinetModal','playerModal'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) { m.style.display = 'none'; m.classList.remove('show'); }
      });
      document.body.style.overflow = '';
    } catch (e) {}
  }

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.openPlayerModal = openPlayerModal;
  window.openPlayer = openPlayerModal;
  window.openPlayerDossier = openPlayerModal;
  window.openPlayerCabinet = openPlayerModal;
  window.__openPlayerCabinet = openPlayerModal;
  window.closePlayerCabinet = closePlayerCabinet;
  window.closePlayerModal = closePlayerCabinet;
  window.compactPlayerName = compactName;

  if (!window.__playerClickBound) {
    window.__playerClickBound = true;
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-player]') : null;
      if (!el) return;
      var pRef = el.getAttribute('data-player');
      if (!pRef) return;
      e.preventDefault(); e.stopPropagation();
      window.openPlayerModal(pRef);
    }, true);
  }

  console.log('[player-modal-safe] v5.0 · database.js первичен · каскад дат рождения · 4 merge-пары работают');
})();