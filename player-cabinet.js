/* ============================================================
   player-cabinet.js — модальное окно досье игрока
   
   v2.0 — УБРАНЫ ЖК/КК из публичного отображения:
   - Сводная статистика: только Матчи / Голы / Ассисты
   - Таблица карьеры: без колонок ЖК и КК
   - Все данные карточек по-прежнему в database.js,
     но в интерфейсе игрока не показываются.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Утилиты ---------- */
  function posBadge(pos) {
    var map = { 'ВРТ': 'pos-vrt', 'ЗАЩ': 'pos-zas', 'ПЗ': 'pos-pz', 'НАП': 'pos-nap', 'УНИ': 'pos-uni' };
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
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').trim(); }
  function lastName(name) { return norm(name).split(/\s+/)[0]; }

  /* ---------- Карта турниров ---------- */
  var TOURNEY_LABELS = {
    'tournament_5x5':   'Первенство 5х5 (Лето 2026)',
    'tournament_7x7':   'Первенство 7х7 (Весна 2026)',
    'tournament_night': 'Ночная лига 8х8 (2026)',
    'cup_5x5':          'Кубок ЛФЛД 5х5 (2026)'
  };
  function tourneyLabel(key, fallback) {
    return TOURNEY_LABELS[key] || fallback || key;
  }

  /* ---------- Сбор карьеры из мастер-БД ---------- */
  function buildCareerFromMaster(playerName, clubHint) {
    var M = window.LFLD_MASTER_DB;
    if (!M) return [];
    var out = [];
    var key = lastName(playerName);

    ['tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (mk) {
      var t = M[mk];
      if (!t || !t.teams) return;
      Object.keys(t.teams).forEach(function (club) {
        (t.teams[club] || []).forEach(function (p) {
          if (lastName(p.name) !== key) return;
          out.push({
            club: club,
            tournament: tourneyLabel(mk, t.title),
            matches: p.m || 0,
            goals: p.g || 0,
            assists: p.a || 0,
            isCup: false
          });
        });
      });
    });

    // Кубок 5х5 — плоский список players
    if (M.cup_5x5 && Array.isArray(M.cup_5x5.players)) {
      M.cup_5x5.players.forEach(function (p) {
        if (lastName(p.name) !== key) return;
        out.push({
          club: p.team,
          tournament: tourneyLabel('cup_5x5', M.cup_5x5.title),
          matches: p.m || 0,
          goals: p.g || 0,
          assists: 0,
          isCup: true,
          award: p.award || '',
          pastClubs: p.pastClubs || [],
          note: p.note || ''
        });
      });
    }

    return out;
  }

  /* ---------- Награды ---------- */
  function buildAwards(playerName, clubHint, careerFromMaster) {
    var awards = [];

    careerFromMaster.forEach(function (c) {
      if (c.award && awards.indexOf(c.award) === -1) awards.push(c.award);
    });

    var key = lastName(playerName);
    if (window.teamPlayerProfiles) {
      Object.keys(window.teamPlayerProfiles).forEach(function (k) {
        if (lastName(k) !== key) return;
        var prof = window.teamPlayerProfiles[k];
        (prof.awards || []).forEach(function (a) {
          if (awards.indexOf(a) === -1) awards.push(a);
        });
      });
    }

    if (window.database && window.database.findPlayersByName) {
      var found = window.database.findPlayersByName(playerName, clubHint);
      if (found && found.length && found[0].awards) {
        found[0].awards.forEach(function (a) {
          if (awards.indexOf(a) === -1) awards.push(a);
        });
      }
    }

    return awards;
  }

  /* ---------- Основная функция ---------- */
  function openPlayerCabinet(playerIdOrName, clubHint) {
    var player = null;

    if (window.database) {
      if (window.database.getPlayer && window.database.getPlayer(playerIdOrName)) {
        player = window.database.getPlayer(playerIdOrName);
      } else if (window.database.findPlayersByName) {
        var found = window.database.findPlayersByName(playerIdOrName, clubHint);
        if (found && found.length) player = found[0];
      }
    }

    if (!player) {
      player = {
        id: null,
        lastName: playerIdOrName,
        firstName: '', middleName: '',
        birthDate: '', photo: '',
        position: 'УНИ',
        aliases: [playerIdOrName],
        clubs: clubHint ? [clubHint] : [],
        tournaments: [],
        awards: [],
        stats: { matches: 0, goals: 0, assists: 0 }
      };
    }

    var fullName = [player.lastName, player.firstName, player.middleName].filter(Boolean).join(' ') || 'Игрок';

    var career = buildCareerFromMaster(playerIdOrName, clubHint);

    var totalStats = { matches: 0, goals: 0, assists: 0 };
    career.forEach(function (c) {
      totalStats.matches += c.matches;
      totalStats.goals += c.goals;
      totalStats.assists += c.assists;
    });

    if (!career.length && player.stats) {
      totalStats = {
        matches: player.stats.matches || 0,
        goals: player.stats.goals || 0,
        assists: player.stats.assists || 0
      };
    }

    var awards = buildAwards(playerIdOrName, clubHint, career);

    /* --- Рендер --- */
    var photoHtml = player.photo
      ? '<img src="' + player.photo + '" alt="" class="pc-photo-img">'
      : '<div class="pc-photo-placeholder"><span>👤</span></div>';

    /* --- Карьера по клубам --- */
    var careerHtml = '';
    if (career.length) {
      var byClub = {};
      var clubOrder = [];
      career.forEach(function (c) {
        if (!byClub[c.club]) { byClub[c.club] = []; clubOrder.push(c.club); }
        byClub[c.club].push(c);
      });

      careerHtml = '<table class="pc-career-table">' +
        '<thead><tr>' +
          '<th class="text-left">Клуб</th>' +
          '<th class="text-left">Турнир</th>' +
          '<th>М</th><th>Г</th><th>А</th>' +
        '</tr></thead><tbody>';

      clubOrder.forEach(function (club) {
        byClub[club].forEach(function (c, i) {
          var rowspan = byClub[club].length;
          careerHtml += '<tr>';
          if (i === 0) {
            careerHtml += '<td class="text-left" rowspan="' + rowspan + '">' +
              '<span class="pc-club-tag">' + club + '</span></td>';
          }
          careerHtml += '<td class="text-left">' + c.tournament + (c.isCup ? ' 🏆' : '') + '</td>' +
            '<td>' + c.matches + '</td>' +
            '<td class="goals-cell">' + c.goals + '</td>' +
            '<td class="assist-cell">' + c.assists + '</td>' +
            '</tr>';
        });
      });
      careerHtml += '</tbody></table>';

      var transfers = [];
      career.forEach(function (c) {
        (c.pastClubs || []).forEach(function (pc) {
          if (transfers.indexOf(pc) === -1) transfers.push(pc);
        });
      });
      if (transfers.length) {
        careerHtml += '<div class="pc-transfer-note">';
        careerHtml += '<strong>⚽ История переходов:</strong> ';
        careerHtml += transfers.map(function (pc) { return '<span class="pc-club-tag">' + pc + '</span>'; }).join(' → ');
        careerHtml += ' → <span class="pc-club-tag">' + player.clubs.slice(-1)[0] + '</span>';
        careerHtml += '</div>';
      }
    } else {
      careerHtml = '<div class="pc-muted">Нет данных о матчах в мастер-БД</div>';
    }

    /* --- Награды --- */
    var awardsHtml = awards.length
      ? awards.map(function (a) {
          return '<span class="pc-award-badge">🏆 ' + a + '</span>';
        }).join('')
      : '<span class="pc-muted">Пока без награждений</span>';

    /* --- Клубы --- */
    var allClubs = {};
    career.forEach(function (c) { allClubs[c.club] = 1; });
    (player.clubs || []).forEach(function (c) { allClubs[c] = 1; });
    var clubsHtml = Object.keys(allClubs).length
      ? Object.keys(allClubs).map(function (c) { return '<span class="pc-club-tag">' + c + '</span>'; }).join('')
      : '<span class="pc-muted">Не играл в турнирах ЛФЛД</span>';

    /* --- Турниры --- */
    var tourneys = {};
    career.forEach(function (c) { tourneys[c.tournament] = 1; });
    (player.tournaments || []).forEach(function (tk) { tourneys[tourneyLabel(tk, tk)] = 1; });
    var tourneysHtml = Object.keys(tourneys).length
      ? Object.keys(tourneys).map(function (t) { return '<span class="pc-tourney-tag">' + t + '</span>'; }).join('')
      : '<span class="pc-muted">—</span>';

    /* --- Финальный HTML --- */
    var html = '';
    html += '<div class="pc-header">';
    html +=   '<div class="pc-photo">' + photoHtml + '</div>';
    html +=   '<div class="pc-info">';
    html +=     '<h2 class="pc-name">' + fullName + '</h2>';
    html +=     '<div class="pc-pos">' + posBadge(player.position) + '</div>';
    html +=     '<div class="pc-row"><strong>Дата рождения:</strong> ' +
                    (player.birthDate || '—') +
                    (player.birthDate ? ' (' + ageFromDate(player.birthDate) + ')' : '') +
                '</div>';
    html +=   '</div>';
    html += '</div>';

    /* ⚡ Сводная статистика — только Матчи / Голы / Ассисты */
    html += '<h4 class="pc-section-title">📊 Сводная статистика</h4>';
    html += '<div class="pc-stats pc-stats-3">';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.matches + '</div><div class="pc-stat-label">Матчи</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.goals + '</div><div class="pc-stat-label">⚽ Голы</div></div>';
    html +=   '<div class="pc-stat"><div class="pc-stat-value">' + totalStats.assists + '</div><div class="pc-stat-label">👟 Ассисты</div></div>';
    html += '</div>';

    html += '<h4 class="pc-section-title">🏟 Карьера</h4>';
    html += '<div class="pc-tags">' + clubsHtml + '</div>';

    html += '<h4 class="pc-section-title">🏆 Турниры</h4>';
    html += '<div class="pc-tags">' + tourneysHtml + '</div>';

    html += '<h4 class="pc-section-title">📋 Статистика по клубам</h4>';
    html += careerHtml;

    html += '<h4 class="pc-section-title">🎖 Индивидуальные награды</h4>';
    html += '<div class="pc-tags">' + awardsHtml + '</div>';

    var body = document.getElementById('playerCabinetBody');
    var modal = document.getElementById('playerCabinetModal');
    if (body) body.innerHTML = html;
    if (modal) modal.style.display = 'flex';
  }

  function closePlayerCabinet() {
    var m = document.getElementById('playerCabinetModal');
    if (m) m.style.display = 'none';
  }

  window.openPlayerCabinet = openPlayerCabinet;
  window.closePlayerCabinet = closePlayerCabinet;
  window.__openPlayerCabinet = function (idOrName, clubHint) {
    openPlayerCabinet(idOrName, clubHint);
  };

  console.log('[player-cabinet] загружен (без ЖК/КК в публичной части)');
})();