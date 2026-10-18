/* ============================================================
   player-cabinet.js v8.2
   
   ИСПРАВЛЕНИЯ v8.2:
   - Таблица «Статистика по клубам»: убрано «(ранее: ...)»
   - Точное сопоставление клуб/турнир (без pastClubs в карьере)
   - Единый профиль для всех игроков
   - Фото по ID + даты рождения из мастер-базы
   ============================================================ */
(function () {
  'use strict';

  function posBadge(pos) {
    var map = { 'ВРТ': 'pos-vrt', 'ЗАЩ': 'pos-zas', 'ПЗ': 'pos-pz', 'НАП': 'pos-nap', 'УНИ': 'pos-uni', 'АТК': 'pos-nap' };
    return '<span class="pos-badge ' + (map[pos] || 'pos-uni') + '">' + (pos || 'УНИ') + '</span>';
  }
  function ageFromDate(birth) {
    if (!birth || birth === '—') return '';
    var m = String(birth).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) {
      m = String(birth).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        var d2 = new Date(+m[1], +m[2] - 1, +m[3]);
        var age2 = Math.floor((Date.now() - d2.getTime()) / (365.25 * 24 * 3600 * 1000));
        return age2 + ' лет';
      }
      return '';
    }
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    var age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    return age + ' лет';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function normKey(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function normWithSpaces(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  var TOURNEY_LABELS = {
    'tournament_5x5':   'Первенство 5х5 (Лето 2026)',
    'tournament_7x7':   'Первенство 7х7 (Весна 2026)',
    'tournament_night': 'Ночная лига 8х8 (2026)',
    'cup_5x5':          'Кубок ЛФЛД 5х5 (2026)'
  };

  /* ============================================================
     РЕЗОЛВЕР ФОТО
     ============================================================ */
  function getCabinetPlayerAvatar(player) {
    if (!player) return null;

    var playerId = player.id || null;
    var fullName = player.fullName || player.full || player.name || '';
    var normFio = normKey(fullName);

    if (player.photo && String(player.photo).length > 30) return player.photo;

    var masterPhotos = (window.LFLD_MASTER_DB && window.LFLD_MASTER_DB.playerPhotos) || {};
    if (playerId && masterPhotos[playerId]) return masterPhotos[playerId];
    if (normFio && masterPhotos[normFio]) return masterPhotos[normFio];

    var parts = normWithSpaces(fullName).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      var fioKey = parts[0] + '_' + parts[1];
      if (masterPhotos[fioKey]) return masterPhotos[fioKey];
    }

    var db = window.LFLD_MASTER_DB;
    if (db) {
      var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];
      for (var i = 0; i < tourneyKeys.length; i++) {
        var t = db[tourneyKeys[i]];
        if (!t) continue;
        if (t.teams) {
          var clubs = Object.keys(t.teams);
          for (var ci = 0; ci < clubs.length; ci++) {
            var arr = t.teams[clubs[ci]] || [];
            for (var pi = 0; pi < arr.length; pi++) {
              var p = arr[pi];
              if (!p || !p.name) continue;
              var isMatch = (p.id && playerId && p.id === playerId) || normKey(p.name) === normFio;
              if (isMatch && p.photo) {
                if (playerId) masterPhotos[playerId] = p.photo;
                return p.photo;
              }
            }
          }
        }
      }
    }

    if (playerId && window.database && window.database.getPlayer) {
      try {
        var dbPlayer = window.database.getPlayer(playerId);
        if (dbPlayer && dbPlayer.photo && dbPlayer.photo.length > 30) return dbPlayer.photo;
      } catch (e) {}
    }

    try {
      var local = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      if (playerId && local[playerId]) return local[playerId];
    } catch (e) {}

    if (window.lfldMedia && window.lfldMedia.getPlayerPhoto) {
      try {
        var url = window.lfldMedia.getPlayerPhoto({ id: playerId, full: fullName, club: player.club });
        if (url && url.length > 30) return url;
      } catch (e) {}
    }

    return null;
  }

  window.getCabinetPlayerAvatar = getCabinetPlayerAvatar;

  /* ============================================================
     РЕЗОЛВЕР ДАТЫ РОЖДЕНИЯ
     ============================================================ */
  function resolveBirthDate(player, resolved) {
    if (!player && !resolved) return '';

    if (resolved && resolved.id && window.database && window.database.getPlayer) {
      try {
        var dbPlayer = window.database.getPlayer(resolved.id);
        if (dbPlayer && dbPlayer.birthDate && dbPlayer.birthDate !== '—') {
          return dbPlayer.birthDate;
        }
      } catch (e) {}
    }

    if (window.getBirthDate) {
      try {
        var byRef = window.getBirthDate({
          id: resolved ? resolved.id : null,
          full: (player && player.fullName) || (resolved && resolved.full) || '',
          club: (resolved && resolved.club) || ''
        });
        if (byRef && byRef !== '—') return byRef;
      } catch (e) {}
    }

    if (window.LFLD_BIRTH_DATES) {
      var dates = window.LFLD_BIRTH_DATES;
      var id = (resolved && resolved.id) || null;
      var fullName = (player && player.fullName) || (resolved && resolved.full) || '';

      if (id && dates[id] && dates[id] !== '—') return dates[id];

      var normFio = normKey(fullName);
      if (normFio && dates[normFio] && dates[normFio] !== '—') return dates[normFio];

      var parts = normWithSpaces(fullName).split(' ').filter(Boolean);
      if (parts.length >= 2) {
        var shortKey = parts[0] + '_' + parts[1];
        if (dates[shortKey] && dates[shortKey] !== '—') return dates[shortKey];
      }
    }

    var db = window.LFLD_MASTER_DB;
    if (db && fullName) {
      var normFio2 = normKey(fullName);
      var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];
      for (var i = 0; i < tourneyKeys.length; i++) {
        var t = db[tourneyKeys[i]];
        if (!t || !t.teams) continue;
        var clubs = Object.keys(t.teams);
        for (var ci = 0; ci < clubs.length; ci++) {
          var arr = t.teams[clubs[ci]] || [];
          for (var pi = 0; pi < arr.length; pi++) {
            var p = arr[pi];
            if (!p || !p.name) continue;
            if (normKey(p.name) === normFio2) {
              var birth = p.birth || p.birthDate;
              if (birth && birth !== '—') {
                if (window.LFLD_BIRTH_DATES) {
                  var parts2 = normWithSpaces(p.name).split(' ').filter(Boolean);
                  if (parts2.length >= 2) {
                    window.LFLD_BIRTH_DATES[parts2[0] + '_' + parts2[1]] = birth;
                  }
                  if (p.id) window.LFLD_BIRTH_DATES[p.id] = birth;
                }
                return birth;
              }
            }
          }
        }
      }
    }

    return '';
  }

  /* ============================================================
     АГРЕГАТОР КАРЬЕРЫ (v8.2 — без pastClubs в statsList)
     ============================================================ */
  function getPlayerFullCareer(target) {
    var empty = { clubs: [], statsByTournament: [] };
    if (!target) return empty;
    var db = window.LFLD_MASTER_DB;
    if (!db) return empty;

    var targetName = (target.full || target.fullName || target.name || '').trim();
    if (!targetName) return empty;

    var targetKey = (window.PlayerResolver && window.PlayerResolver.getPersonKey)
      ? window.PlayerResolver.getPersonKey(targetName)
      : (function (n) {
          var parts = String(n).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, '').trim().split(/\s+/).filter(Boolean);
          return parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
        })(targetName);

    if (!targetKey) return empty;

    function matchesName(name) {
      if (!name) return false;
      var k = (window.PlayerResolver && window.PlayerResolver.getPersonKey)
        ? window.PlayerResolver.getPersonKey(name)
        : (function (n) {
            var parts = String(n).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, '').trim().split(/\s+/).filter(Boolean);
            return parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
          })(name);
      return k === targetKey;
    }

    var clubsMap = {};
    var statsList = [];
    var tourneyKeys = ['cup_5x5', 'tournament_5x5', 'tournament_7x7', 'tournament_night'];

    tourneyKeys.forEach(function (tKey) {
      var tourney = db[tKey];
      if (!tourney) return;

      var finalClub = null;
      var m = 0, g = 0, a = 0, yc = 0, rc = 0;

      /* 1. Из teams этого турнира */
      if (tourney.teams && typeof tourney.teams === 'object') {
        var teamClubs = Object.keys(tourney.teams);
        for (var ci = 0; ci < teamClubs.length; ci++) {
          var club = teamClubs[ci];
          var arr = tourney.teams[club] || [];
          for (var pi = 0; pi < arr.length; pi++) {
            var p = arr[pi];
            if (p && p.name && matchesName(p.name)) {
              finalClub = club;
              m = p.m || 0;
              g = p.g || 0;
              a = p.a || 0;
              yc = p.yc || 0;
              rc = p.rc || 0;
              break;
            }
          }
          if (finalClub) break;
        }
      }

      /* 2. Из cup_5x5.players */
      if (!finalClub && Array.isArray(tourney.players)) {
        for (var qi = 0; qi < tourney.players.length; qi++) {
          var q = tourney.players[qi];
          if (q && q.name && matchesName(q.name)) {
            finalClub = q.team || '';
            m = q.m || 0;
            g = q.g || 0;
            a = q.a || 0;
            yc = q.yc || 0;
            rc = q.rc || 0;
            break;
          }
        }
      }

      /* 3. Fallback: считаем из протоколов */
      if (!finalClub && Array.isArray(tourney.matches)) {
        var acc = { goals: 0, assists: 0, yellow: 0, red: 0, clubs: {}, matchIds: {} };
        tourney.matches.forEach(function (match) {
          ['eventsHome', 'eventsAway'].forEach(function (side) {
            if (!Array.isArray(match[side])) return;
            var clubSide = side === 'eventsHome'
              ? (match.teamHome || match.t1 || '')
              : (match.teamAway || match.t2 || '');
            match[side].forEach(function (ev) {
              if (!ev || !ev.player) return;
              if (!matchesName(ev.player)) return;
              if (ev.type === 'goal') acc.goals += (ev.count || 1);
              else if (ev.type === 'yellow_card') acc.yellow += 1;
              else if (ev.type === 'red_card') acc.red += 1;
              if (ev.assist) acc.assists += 1;
              acc.clubs[clubSide] = 1;
              var mid = match.id || (match.date + '_' + clubSide);
              acc.matchIds[mid] = 1;
            });
          });
        });
        var accClubs = Object.keys(acc.clubs);
        if (accClubs.length) {
          finalClub = accClubs[0];
          m = Object.keys(acc.matchIds).length;
          g = acc.goals;
          a = acc.assists;
          yc = acc.yellow;
          rc = acc.red;
        }
      }

      if (finalClub) {
        clubsMap[finalClub] = 1;

        /* Учитываем протоколы, если статистика в teams неполная */
        if (Array.isArray(tourney.matches)) {
          var protocolStats = { goals: 0, assists: 0 };
          var protocolMatchIds = {};
          tourney.matches.forEach(function (match) {
            ['eventsHome', 'eventsAway'].forEach(function (side) {
              if (!Array.isArray(match[side])) return;
              var clubSide = side === 'eventsHome'
                ? (match.teamHome || match.t1 || '')
                : (match.teamAway || match.t2 || '');
              if (clubSide !== finalClub) return;
              match[side].forEach(function (ev) {
                if (!ev || !ev.player) return;
                if (!matchesName(ev.player)) return;
                if (ev.type === 'goal') protocolStats.goals += (ev.count || 1);
                if (ev.assist) protocolStats.assists += 1;
                var mid = match.id || (match.date + '_' + clubSide);
                protocolMatchIds[mid] = 1;
              });
            });
          });
          if (protocolStats.goals > g) g = protocolStats.goals;
          if (protocolStats.assists > a) a = protocolStats.assists;
          var protocolMatches = Object.keys(protocolMatchIds).length;
          if (protocolMatches > m) m = protocolMatches;
        }

        statsList.push({
          tournamentId: tKey,
          tournamentTitle: TOURNEY_LABELS[tKey] || tourney.title || tKey,
          club: finalClub,   /* ⚡ ТОЛЬКО клуб этого турнира, БЕЗ pastClubs */
          m: m, g: g, a: a, yc: yc, rc: rc
        });
      }
    });

    return {
      clubs: Object.keys(clubsMap).filter(function (c) { return c && c !== '—'; }),
      statsByTournament: statsList
    };
  }

  /* ============================================================
     ОТКРЫТИЕ ЛИЧНОГО КАБИНЕТА
     ============================================================ */
  function openPlayerCabinet(playerRef, clubHint) {
    var resolved = null;
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try { resolved = window.PlayerResolver.resolve(playerRef, clubHint); } catch (e) {}
    }
    if (!resolved) {
      var cleanName = '', cleanClub = String(clubHint || '').trim();
      if (typeof playerRef === 'string') cleanName = playerRef.trim();
      else if (playerRef && (playerRef.full || playerRef.fullName)) cleanName = playerRef.full || playerRef.fullName;
      else if (playerRef && playerRef.name) cleanName = playerRef.name;
      resolved = { id: null, full: cleanName || 'Неизвестный игрок', club: cleanClub || '—', pos: 'УНИ', isFallback: true };
    }

    var dbPlayer = null;
    if (resolved.id && window.database && window.database.getPlayer) {
      try { dbPlayer = window.database.getPlayer(resolved.id); } catch (e) {}
    }

    var player = {
      id: resolved.id || null,
      fullName: resolved.full || resolved.fullName || 'Неизвестный игрок',
      position: (dbPlayer && dbPlayer.position) || resolved.pos || 'УНИ',
      birthDate: '',
      photo: '',
      club: resolved.club || '',
      awards: (dbPlayer && dbPlayer.awards) || []
    };

    player.photo = getCabinetPlayerAvatar(player) || '';
    player.birthDate = resolveBirthDate(player, resolved) || '';

    var career = getPlayerFullCareer(resolved);

    var totalStats = { matches: 0, goals: 0, assists: 0 };
    career.statsByTournament.forEach(function (s) {
      totalStats.matches += s.m || 0;
      totalStats.goals += s.g || 0;
      totalStats.assists += s.a || 0;
    });

    if (!career.statsByTournament.length && dbPlayer && dbPlayer.stats) {
      var st = dbPlayer.stats;
      totalStats = { matches: st.matches || 0, goals: st.goals || 0, assists: st.assists || 0 };
    }

    var awards = [];
    if (dbPlayer && dbPlayer.awards) {
      dbPlayer.awards.forEach(function (a) { if (awards.indexOf(a) === -1) awards.push(a); });
    }

    /* Фото */
    var photoHtml;
    if (player.photo && player.photo.length > 30) {
      photoHtml = '<img src="' + escapeHtml(player.photo) + '" alt="" class="pc-photo-img" ' +
        'onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.innerHTML=\'<div class=&quot;pc-photo-placeholder&quot;><span>👤</span></div>\';">';
    } else {
      photoHtml = '<div class="pc-photo-placeholder"><span>👤</span></div>';
    }

    /* Плашки клубов — только общая карьера */
    var clubsPlaquesHtml = '';
    if (career.clubs.length) {
      clubsPlaquesHtml = career.clubs.map(function (club) {
        var clubEsc = escapeHtml(club).replace(/"/g, '&quot;');
        var clubJs = club.replace(/'/g, "\\'");
        return '<button type="button" class="pc-club-tag pc-club-tag-clickable" ' +
          'data-club="' + clubEsc + '" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); window.openClubCabinet && window.openClubCabinet(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;border:none;">' + escapeHtml(club) + '</button>';
      }).join('');
    } else {
      clubsPlaquesHtml = '<span class="pc-muted">—</span>';
    }

    /* ⚡ ТАБЛИЦА СТАТИСТИКИ — БЕЗ «(ранее: ...)» */
    var careerTableHtml = '';
    if (career.statsByTournament.length) {
      careerTableHtml = '<table class="pc-career-table"><thead><tr>' +
        '<th class="text-left">Клуб</th>' +
        '<th class="text-left">Турнир</th>' +
        '<th>М</th><th>Г</th><th>А</th>' +
      '</tr></thead><tbody>';

      career.statsByTournament.forEach(function (s) {
        var clubEsc = escapeHtml(s.club);
        var clubJs = s.club.replace(/'/g, "\\'");

        careerTableHtml += '<tr>' +
          '<td class="text-left">' +
            '<button type="button" class="pc-club-link" ' +
              'data-club="' + clubEsc.replace(/"/g, '&quot;') + '" ' +
              'onclick="event.preventDefault(); event.stopPropagation(); window.openClubCabinet && window.openClubCabinet(\'' + clubJs + '\');" ' +
              'style="cursor:pointer;background:none;border:none;padding:0;color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
              clubEsc +
            '</button>' +
            /* ⚠️ БЕЗ pastClubs — только чистый клуб */
          '</td>' +
          '<td class="text-left">' + escapeHtml(s.tournamentTitle) + '</td>' +
          '<td>' + (s.m || 0) + '</td>' +
          '<td class="goals-cell">' + (s.g || 0) + '</td>' +
          '<td class="assist-cell">' + (s.a || 0) + '</td>' +
        '</tr>';
      });

      careerTableHtml += '</tbody></table>';
    } else {
      careerTableHtml = '<div class="pc-muted">Статистика в протоколах пока отсутствует.</div>';
    }

    var awardsHtml = awards.length
      ? awards.map(function (a) { return '<span class="pc-award-badge">🏆 ' + escapeHtml(a) + '</span>'; }).join('')
      : '<span class="pc-muted">Пока без награждений</span>';

    var tourneySet = {};
    career.statsByTournament.forEach(function (s) { tourneySet[s.tournamentTitle] = 1; });
    var tourneysHtml = Object.keys(tourneySet).length
      ? Object.keys(tourneySet).map(function (t) { return '<span class="pc-tourney-tag">' + escapeHtml(t) + '</span>'; }).join('')
      : '<span class="pc-muted">—</span>';

    /* Рендер */
    var html = '';
    html += '<div class="pc-header">';
    html +=   '<div class="pc-photo">' + photoHtml + '</div>';
    html +=   '<div class="pc-info">';
    html +=     '<h2 class="pc-name">' + escapeHtml(player.fullName) + '</h2>';
    html +=     '<div class="pc-pos">' + posBadge(player.position) + '</div>';
    if (resolved.id) {
      html += '<div class="pc-row"><strong>ID:</strong> <code style="font-size:11px;color:#94a3b8;">' + escapeHtml(resolved.id) + '</code></div>';
    }
    if (resolved.club && resolved.club !== '—') {
      var rcEsc = resolved.club.replace(/'/g, "\\'");
      html += '<div class="pc-row"><strong>Текущий клуб:</strong> ' +
        '<button type="button" class="pc-club-link" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); window.openClubCabinet && window.openClubCabinet(\'' + rcEsc + '\');" ' +
          'style="cursor:pointer;background:none;border:none;padding:0;color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
          escapeHtml(resolved.club) + '</button></div>';
    }
    if (player.birthDate && player.birthDate !== '—') {
      html += '<div class="pc-row"><strong>Дата рождения:</strong> ' + escapeHtml(player.birthDate) +
              (ageFromDate(player.birthDate) ? ' (' + ageFromDate(player.birthDate) + ')' : '') + '</div>';
    } else {
      html += '<div class="pc-row" style="color:#64748b;font-size:12px;"><strong>Дата рождения:</strong> <span style="font-style:italic;">не указана</span></div>';
    }
    html +=   '</div>';
    html += '</div>';

    html += '<h4 class="pc-section-title">📊 Сводная статистика</h4>';
    html += '<div class="pc-stats pc-stats-3">';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.matches + '</div><div class="pc-stat-label">Матчи</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.goals + '</div><div class="pc-stat-label">⚽ Голы</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.assists + '</div><div class="pc-stat-label">👟 Ассисты</div></div>';
    html += '</div>';

    html += '<h4 class="pc-section-title">🏟 Карьера · клубы</h4><div class="pc-tags">' + clubsPlaquesHtml + '</div>';
    html += '<h4 class="pc-section-title">🏆 Турниры</h4><div class="pc-tags">' + tourneysHtml + '</div>';
    html += '<h4 class="pc-section-title">📋 Статистика по клубам</h4>' + careerTableHtml;
    html += '<h4 class="pc-section-title">🎖 Индивидуальные награды</h4><div class="pc-tags">' + awardsHtml + '</div>';

    var body = document.getElementById('playerCabinetBody');
    var modal = document.getElementById('playerCabinetModal');
    if (body) body.innerHTML = html;
    if (modal) modal.style.display = 'flex';

    return resolved;
  }

  function closePlayerCabinet() {
    var m = document.getElementById('playerCabinetModal');
    if (m) m.style.display = 'none';
  }

  window.openPlayerCabinet = openPlayerCabinet;
  window.closePlayerCabinet = closePlayerCabinet;
  window.__openPlayerCabinet = openPlayerCabinet;
  window.getPlayerFullCareer = getPlayerFullCareer;
  window.getCabinetPlayerAvatar = getCabinetPlayerAvatar;
  window.resolveBirthDate = resolveBirthDate;

  console.log('[player-cabinet] v8.2 · таблица без «ранее» · точный клуб/турнир · фото по ID · даты из мастер-базы');
})();