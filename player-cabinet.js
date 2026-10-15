/* ============================================================
   player-cabinet.js v6.0
   
   - Полная агрегация карьеры (все турниры)
   - Кликабельные плашки клубов
   - Таблица «Статистика по клубам» с кликабельными клубами
   - Учтены pastClubs (трансферы)
   - Без alert
   ============================================================ */
(function () {
  'use strict';

  function posBadge(pos) {
    var map = { 'ВРТ': 'pos-vrt', 'ЗАЩ': 'pos-zas', 'ПЗ': 'pos-pz', 'НАП': 'pos-nap', 'УНИ': 'pos-uni', 'АТК': 'pos-nap' };
    return '<span class="pos-badge ' + (map[pos] || 'pos-uni') + '">' + (pos || 'УНИ') + '</span>';
  }
  function ageFromDate(birth) {
    if (!birth) return '';
    var m = String(birth).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) return '';
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    var age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    return age + ' лет';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var TOURNEY_LABELS = {
    'tournament_5x5':   'Первенство 5х5 (Лето 2026)',
    'tournament_7x7':   'Первенство 7х7 (Весна 2026)',
    'tournament_night': 'Ночная лига 8х8 (2026)',
    'cup_5x5':          'Кубок ЛФЛД 5х5 (2026)'
  };

  /* ============================================================
     АГРЕГАТОР ПОЛНОЙ КАРЬЕРЫ
     ============================================================ */
  function getPlayerFullCareer(target) {
    var empty = { clubs: [], statsByTournament: [] };
    if (!target) return empty;

    var db = window.LFLD_MASTER_DB;
    if (!db) return empty;

    var getName = function (t) { return (t.full || t.name || '').trim(); };
    var targetName = getName(target);
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

      var foundInTeams = null;
      var foundInPlayers = null;
      var matchesData = null;

      /* teams */
      if (tourney.teams && typeof tourney.teams === 'object') {
        Object.keys(tourney.teams).forEach(function (club) {
          if (foundInTeams) return;
          var arr = tourney.teams[club] || [];
          arr.forEach(function (p) {
            if (foundInTeams) return;
            if (p && p.name && matchesName(p.name)) {
              foundInTeams = { club: club, entry: p };
            }
          });
        });
      }

      /* cup_5x5.players */
      if (!foundInTeams && Array.isArray(tourney.players)) {
        tourney.players.forEach(function (p) {
          if (foundInPlayers) return;
          if (p && p.name && matchesName(p.name)) {
            foundInPlayers = { club: p.team || '', entry: p };
          }
        });
      }

      /* matches */
      if (Array.isArray(tourney.matches)) {
        var matchSet = {};
        tourney.matches.forEach(function (match) {
          ['eventsHome', 'eventsAway'].forEach(function (side) {
            if (!Array.isArray(match[side])) return;
            var club = side === 'eventsHome'
              ? (match.teamHome || match.t1 || '')
              : (match.teamAway || match.t2 || '');
            match[side].forEach(function (ev) {
              if (!ev || !ev.player) return;
              if (!matchesName(ev.player)) return;
              if (!matchesData) {
                matchesData = { goals: 0, assists: 0, yellow: 0, red: 0, clubs: {}, matchIds: {} };
              }
              if (ev.type === 'goal') matchesData.goals += (ev.count || 1);
              else if (ev.type === 'yellow_card') matchesData.yellow += 1;
              else if (ev.type === 'red_card') matchesData.red += 1;
              if (ev.assist) matchesData.assists += 1;
              matchesData.clubs[club] = 1;
              var mid = match.id || (match.date + '_' + club);
              matchesData.matchIds[mid] = 1;
            });
          });
        });
      }

      var finalClub = null;
      var m = 0, g = 0, a = 0, yc = 0, rc = 0;
      var pastClubs = [];

      if (foundInTeams) {
        finalClub = foundInTeams.club;
        m = foundInTeams.entry.m || 0;
        g = foundInTeams.entry.g || 0;
        a = foundInTeams.entry.a || 0;
        yc = foundInTeams.entry.yc || 0;
        rc = foundInTeams.entry.rc || 0;
        pastClubs = foundInTeams.entry.pastClubs || [];
        if (matchesData) {
          if (matchesData.goals > g) g = matchesData.goals;
          if (matchesData.assists > a) a = matchesData.assists;
        }
      } else if (foundInPlayers) {
        finalClub = foundInPlayers.club;
        m = foundInPlayers.entry.m || 0;
        g = foundInPlayers.entry.g || 0;
        a = foundInPlayers.entry.a || 0;
        yc = foundInPlayers.entry.yc || 0;
        rc = foundInPlayers.entry.rc || 0;
        pastClubs = foundInPlayers.entry.pastClubs || [];
      } else if (matchesData) {
        finalClub = Object.keys(matchesData.clubs)[0] || '';
        m = Object.keys(matchesData.matchIds).length;
        g = matchesData.goals;
        a = matchesData.assists;
        yc = matchesData.yellow;
        rc = matchesData.red;
      }

      if (finalClub) {
        clubsMap[finalClub] = 1;
        /* Добавляем прошлые клубы (трансферы) */
        pastClubs.forEach(function (pc) {
          if (pc && pc !== '—') clubsMap[pc] = 1;
        });
        statsList.push({
          tournamentId: tKey,
          tournamentTitle: TOURNEY_LABELS[tKey] || tourney.title || tKey,
          club: finalClub,
          pastClubs: pastClubs,
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
     ГЛАВНАЯ ФУНКЦИЯ
     ============================================================ */
  function openPlayerCabinet(playerRef, clubHint) {
    var resolved = null;
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try { resolved = window.PlayerResolver.resolve(playerRef, clubHint); } catch (e) {}
    }
    if (!resolved) {
      var cleanName = '', cleanClub = String(clubHint || '').trim();
      if (typeof playerRef === 'string') cleanName = playerRef.trim();
      else if (playerRef && playerRef.full) cleanName = playerRef.full;
      else if (playerRef && playerRef.name) cleanName = playerRef.name;
      resolved = { id: null, full: cleanName || 'Неизвестный игрок', club: cleanClub || '—', pos: 'УНИ', isFallback: true };
    }

    var dbPlayer = null;
    if (resolved.id && window.database && window.database.getPlayer) {
      try { dbPlayer = window.database.getPlayer(resolved.id); } catch (e) {}
    }

    var player = {
      id: resolved.id || null,
      fullName: resolved.full || 'Неизвестный игрок',
      position: (dbPlayer && dbPlayer.position) || resolved.pos || 'УНИ',
      birthDate: (dbPlayer && dbPlayer.birthDate) || '',
      photo: '',
      awards: (dbPlayer && dbPlayer.awards) || []
    };

    /* Фото */
    var photoUrl = '';
    if (window.lfldMedia && window.lfldMedia.getPlayerPhoto) {
      try {
        if (resolved.id) photoUrl = window.lfldMedia.getPlayerPhoto({ id: resolved.id }) || '';
        if (!photoUrl) photoUrl = window.lfldMedia.getPlayerPhoto(resolved.full) || '';
      } catch (e) {}
    }
    if (!photoUrl && dbPlayer && dbPlayer.photo) photoUrl = dbPlayer.photo;
    player.photo = photoUrl;

    /* Карьера */
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

    /* Рендер */
    var photoHtml = player.photo
      ? '<img src="' + player.photo + '" alt="" class="pc-photo-img" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div class=&quot;pc-photo-placeholder&quot;><span>👤</span></div>\'">'
      : '<div class="pc-photo-placeholder"><span>👤</span></div>';

    /* Кликабельные плашки клубов */
    var clubsPlaquesHtml = '';
    if (career.clubs.length) {
      clubsPlaquesHtml = career.clubs.map(function (club) {
        var clubEsc = escapeHtml(club).replace(/"/g, '&quot;');
        var clubJs = club.replace(/'/g, "\\'");
        return '<button type="button" ' +
          'class="pc-club-tag pc-club-tag-clickable" ' +
          'data-club="' + clubEsc + '" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); window.navigateToTeam && window.navigateToTeam(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;border:none;" ' +
          'title="Открыть профиль клуба: ' + clubEsc + '">' +
          escapeHtml(club) +
        '</button>';
      }).join('');
    } else {
      clubsPlaquesHtml = '<span class="pc-muted">—</span>';
    }

    /* Таблица статистики */
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
        var past = (s.pastClubs || []).length
          ? ' <small style="color:#64748b;font-size:10px;">(ранее: ' + s.pastClubs.map(escapeHtml).join(', ') + ')</small>'
          : '';
        careerTableHtml += '<tr>' +
          '<td class="text-left">' +
            '<button type="button" class="pc-club-link" ' +
              'data-club="' + clubEsc.replace(/"/g, '&quot;') + '" ' +
              'onclick="event.preventDefault(); event.stopPropagation(); window.navigateToTeam && window.navigateToTeam(\'' + clubJs + '\');" ' +
              'style="cursor:pointer;background:none;border:none;padding:0;color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
              clubEsc +
            '</button>' + past +
          '</td>' +
          '<td class="text-left">' + escapeHtml(s.tournamentTitle) + '</td>' +
          '<td>' + (s.m || 0) + '</td>' +
          '<td class="goals-cell">' + (s.g || 0) + '</td>' +
          '<td class="assist-cell">' + (s.a || 0) + '</td>' +
        '</tr>';
      });
      careerTableHtml += '</tbody></table>';
    } else {
      careerTableHtml = '<div class="pc-muted">Статистика в протоколах пока отсутствует. Данные появятся по мере добавления матчей.</div>';
    }

    var awardsHtml = awards.length
      ? awards.map(function (a) { return '<span class="pc-award-badge">🏆 ' + escapeHtml(a) + '</span>'; }).join('')
      : '<span class="pc-muted">Пока без награждений</span>';

    var tourneySet = {};
    career.statsByTournament.forEach(function (s) { tourneySet[s.tournamentTitle] = 1; });
    var tourneysHtml = Object.keys(tourneySet).length
      ? Object.keys(tourneySet).map(function (t) { return '<span class="pc-tourney-tag">' + escapeHtml(t) + '</span>'; }).join('')
      : '<span class="pc-muted">—</span>';

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
          'onclick="event.preventDefault(); event.stopPropagation(); window.navigateToTeam && window.navigateToTeam(\'' + rcEsc + '\');" ' +
          'style="cursor:pointer;background:none;border:none;padding:0;color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
          escapeHtml(resolved.club) + '</button></div>';
    }
    if (player.birthDate) {
      html += '<div class="pc-row"><strong>Дата рождения:</strong> ' + escapeHtml(player.birthDate) + ' (' + ageFromDate(player.birthDate) + ')</div>';
    }
    html +=   '</div>';
    html += '</div>';

    html += '<h4 class="pc-section-title">📊 Сводная статистика</h4>';
    html += '<div class="pc-stats pc-stats-3">';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.matches + '</div><div class="pc-stat-label">Матчи</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.goals + '</div><div class="pc-stat-label">⚽ Голы</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.assists + '</div><div class="pc-stat-label">👟 Ассисты</div></div>';
    html += '</div>';

    html += '<h4 class="pc-section-title">🏟 Карьера · клубы</h4>';
    html += '<div class="pc-tags">' + clubsPlaquesHtml + '</div>';

    html += '<h4 class="pc-section-title">🏆 Турниры</h4>';
    html += '<div class="pc-tags">' + tourneysHtml + '</div>';

    html += '<h4 class="pc-section-title">📋 Статистика по клубам</h4>';
    html += careerTableHtml;

    html += '<h4 class="pc-section-title">🎖 Индивидуальные награды</h4>';
    html += '<div class="pc-tags">' + awardsHtml + '</div>';

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

  console.log('[player-cabinet] v6.0 загружен · полная карьера · кликабельные клубы · учтены трансферы');
})();