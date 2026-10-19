/* ============================================================
   player-modal-safe.js v3.1

   ПРАВКИ:
   v3.0:
   - Компактные имена в списках, полное ФИО в досье
   - ID скрыт из интерфейса
   - Сквозной поиск даты рождения

   v3.1:
   - Интеграция с window.playerPersonal (playerPersonalData.js)
   - Приоритет: playerPersonal → LFDL_BIRTH_DATES → master DB
   - Гарантированное открытие модалки без ошибок
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     УТИЛИТЫ
     ============================================================ */
  function safeStr(v) { return String(v == null ? '' : v); }

  function escapeHtml(s) {
    return safeStr(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normKey(s) {
    return safeStr(s)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]/gi, '')
      .trim();
  }

  function normWithSpaces(s) {
    return safeStr(s)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Компактное имя: «Фамилия Имя» (2 слова, без отчества).
   */
  function compactName(fullName) {
    if (!fullName) return '';
    var words = safeStr(fullName).trim().split(/\s+/).filter(Boolean);
    if (words.length <= 2) return words.join(' ');
    return words.slice(0, 2).join(' ');
  }

  /**
   * Полное имя: «Фамилия Имя Отчество» (если есть отчество).
   */
  function fullName(fullName, officialFullName) {
    var src = officialFullName || fullName || '';
    var words = safeStr(src).trim().split(/\s+/).filter(Boolean);
    return words.join(' ');
  }

  /**
   * Возраст из даты рождения.
   */
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
    var map = {
      'ВРТ': 'pos-vrt',
      'ЗАЩ': 'pos-zas',
      'ПЗ': 'pos-pz',
      'НАП': 'pos-nap',
      'АТК': 'pos-nap',
      'УНИ': 'pos-uni'
    };
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
          arg1 = arg2;
          arg2 = '';
          result.club = '';
        } else {
          return result;
        }
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
    } catch (e) {
      console.warn('[openPlayerModal] parseArgs:', e);
    }

    return result;
  }

  /* ============================================================
     ПОИСК ПОЛНОГО ФИО С ОТЧЕСТВОМ
     Приоритет:
     1) playerPersonal.getFullName(id)
     2) Обход всех турниров (самое полное имя)
     3) PlayerResolver.fullOfficial
     4) database.js
     ============================================================ */
  function findFullOfficialName(id, name, clubHint) {
    /* 1. ⚡ Из реестра playerPersonal */
    if (window.playerPersonal && window.playerPersonal.getFullName && id) {
      try {
        var pName = window.playerPersonal.getFullName(id);
        if (pName) return pName;
      } catch (e) {}
    }

    /* 2. Обход всех турниров — берём самое длинное ФИО */
    var M = window.LFLD_MASTER_DB;
    if (M && (name || id)) {
      var targetKey = normKey(name);
      var best = '';

      function consider(candidate) {
        if (!candidate) return;
        var candidateWords = safeStr(candidate).trim().split(/\s+/).filter(Boolean);
        var bestWords = best ? best.trim().split(/\s+/).filter(Boolean) : [];
        if (candidateWords.length > bestWords.length) {
          best = candidateWords.join(' ');
          return;
        }
        if (candidateWords.length === bestWords.length && candidate.length > best.length) {
          best = candidateWords.join(' ');
        }
      }

      var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];
      for (var ti = 0; ti < tourneyKeys.length; ti++) {
        var t = M[tourneyKeys[ti]];
        if (!t) continue;

        if (t.teams) {
          var clubKeys = Object.keys(t.teams);
          for (var ci = 0; ci < clubKeys.length; ci++) {
            var arr = t.teams[clubKeys[ci]] || [];
            for (var pi = 0; pi < arr.length; pi++) {
              var p = arr[pi];
              if (!p || !p.name) continue;
              var pKey = normKey(p.name);
              if (pKey === targetKey) consider(p.name);
              /* Мягкое: совпадает фамилия + первая буква имени */
              var pParts = normWithSpaces(p.name).split(' ');
              var tParts = normWithSpaces(name).split(' ');
              if (pParts[0] === tParts[0] && pParts[1] && tParts[1] && pParts[1][0] === tParts[1][0]) {
                consider(p.name);
              }
            }
          }
        }

        if (Array.isArray(t.players)) {
          for (var qi = 0; qi < t.players.length; qi++) {
            var q = t.players[qi];
            if (!q || !q.name) continue;
            if (normKey(q.name) === targetKey) consider(q.name);
          }
        }
      }

      if (best) return best;
    }

    /* 3. Через PlayerResolver */
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try {
        var r = window.PlayerResolver.resolve(id || name, clubHint);
        if (r && r.fullOfficial) return r.fullOfficial;
        if (r && r.full) return r.full;
      } catch (e) {}
    }

    /* 4. Из database.js */
    if (id && window.database && window.database.getPlayer) {
      try {
        var dbP = window.database.getPlayer(id);
        if (dbP) {
          var fullDb = [dbP.lastName, dbP.firstName, dbP.middleName].filter(Boolean).join(' ');
          if (fullDb) return fullDb;
        }
      } catch (e) {}
    }

    return name || '';
  }

  /* ============================================================
     ПОИСК ДАТЫ РОЖДЕНИЯ — СКВОЗНОЙ
     Приоритет:
     1) playerPersonal.getBirthDate(id)
     2) LFDL_BIRTH_DATES
     3) getBirthDate()
     4) Обход всех турниров
     5) database.js
     ============================================================ */
  function findBirthDate(id, name, clubHint) {
    /* 1. ⚡ Из реестра playerPersonal */
    if (window.playerPersonal && window.playerPersonal.getBirthDate && id) {
      try {
        var pBirth = window.playerPersonal.getBirthDate(id);
        if (pBirth) return pBirth;
      } catch (e) {}
    }

    /* 2. LFDL_BIRTH_DATES */
    var dates = window.LFLD_BIRTH_DATES || {};
    if (id && dates[id]) return dates[id];
    var nKey = normKey(name);
    if (nKey && dates[nKey]) return dates[nKey];
    var parts = normWithSpaces(name).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      var shortKey = parts[0] + '_' + parts[1];
      if (dates[shortKey]) return dates[shortKey];
    }

    /* 3. getBirthDate */
    if (window.getBirthDate) {
      try {
        var d = window.getBirthDate({ id: id, full: name, club: clubHint });
        if (d && d !== '—') return d;
      } catch (e) {}
    }

    /* 4. Обход турниров */
    var M = window.LFLD_MASTER_DB;
    if (M && (name || id)) {
      var targetKey = normKey(name);
      var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night', 'cup_5x5'];

      for (var ti = 0; ti < tourneyKeys.length; ti++) {
        var t = M[tourneyKeys[ti]];
        if (!t) continue;

        if (t.teams) {
          var clubKeys = Object.keys(t.teams);
          for (var ci = 0; ci < clubKeys.length; ci++) {
            var arr = t.teams[clubKeys[ci]] || [];
            for (var pi = 0; pi < arr.length; pi++) {
              var p = arr[pi];
              if (!p) continue;
              var isMatch = (id && p.id && p.id === id)
                         || (p.name && normKey(p.name) === targetKey);
              if (isMatch) {
                var b = p.birth || p.birthDate;
                if (b && b !== '—') return b;
              }
            }
          }
        }

        if (Array.isArray(t.players)) {
          for (var qi = 0; qi < t.players.length; qi++) {
            var q = t.players[qi];
            if (!q) continue;
            var isMatchQ = (id && q.id && q.id === id)
                        || (q.name && normKey(q.name) === targetKey);
            if (isMatchQ) {
              var bq = q.birth || q.birthDate;
              if (bq && bq !== '—') return bq;
            }
          }
        }
      }
    }

    /* 5. database.js */
    if (id && window.database && window.database.getPlayer) {
      try {
        var dbP = window.database.getPlayer(id);
        if (dbP && dbP.birthDate && dbP.birthDate !== '—') return dbP.birthDate;
      } catch (e) {}
    }

    return '';
  }

  /* ============================================================
     РЕЗОЛВ ФОТО
     ============================================================ */
  function findPhoto(id, name, clubHint) {
    /* 1. Модульное хранилище — по ID */
    if (id && window.teamMedia) {
      var u = window.teamMedia.findPlayerPhotoAnywhere(id);
      if (u) return u;
    }

    /* 2. Через lfldMedia */
    if (window.lfldMedia && window.lfldMedia.getPlayerPhoto) {
      try {
        var u2 = window.lfldMedia.getPlayerPhoto({ id: id, full: name, club: clubHint });
        if (u2) return u2;
      } catch (e) {}
    }

    /* 3. Legacy LFLD_MASTER_DB.playerPhotos */
    var M = window.LFLD_MASTER_DB;
    if (id && M && M.playerPhotos && M.playerPhotos[id]) return M.playerPhotos[id];

    /* 4. localStorage */
    try {
      var local = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      if (id && local[id]) return local[id];
    } catch (e) {}

    /* 5. database.js */
    if (id && window.database && window.database.getPlayer) {
      try {
        var dbP = window.database.getPlayer(id);
        if (dbP && dbP.photo) return dbP.photo;
      } catch (e) {}
    }

    return '';
  }

  /* ============================================================
     АГРЕГАЦИЯ КАРЬЕРЫ
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
      if (p.name && name) {
        var c1 = compactName(p.name);
        var c2 = compactName(name);
        if (c1 && c2 && normKey(c1) === normKey(c2)) return true;
      }
      return false;
    }

    var list = [];
    var total = { m: 0, g: 0, a: 0, yc: 0, rc: 0 };
    var clubsMap = {};

    ['cup_5x5', 'tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (tk) {
      var t = M[tk];
      if (!t) return;

      var club = '';
      var m = 0, g = 0, a = 0, yc = 0, rc = 0;

      if (t.teams) {
        var clubKeys = Object.keys(t.teams);
        for (var ci = 0; ci < clubKeys.length; ci++) {
          var arr = t.teams[clubKeys[ci]] || [];
          for (var pi = 0; pi < arr.length; pi++) {
            if (matches(arr[pi])) {
              club = clubKeys[ci];
              m = arr[pi].m || 0;
              g = arr[pi].g || 0;
              a = arr[pi].a || 0;
              yc = arr[pi].yc || 0;
              rc = arr[pi].rc || 0;
              break;
            }
          }
          if (club) break;
        }
      }

      if (!club && Array.isArray(t.players)) {
        for (var qi = 0; qi < t.players.length; qi++) {
          if (matches(t.players[qi])) {
            club = t.players[qi].team || '';
            m = t.players[qi].m || 0;
            g = t.players[qi].g || 0;
            yc = t.players[qi].yc || 0;
            rc = t.players[qi].rc || 0;
            break;
          }
        }
      }

      if (club) {
        clubsMap[club] = 1;
        list.push({
          tournamentTitle: TOURNEY_LABELS[tk] || tk,
          club: club,
          m: m, g: g, a: a, yc: yc, rc: rc
        });
        total.m += m; total.g += g; total.a += a; total.yc += yc; total.rc += rc;
      }
    });

    return {
      list: list,
      total: total,
      clubs: Object.keys(clubsMap)
    };
  }

  /* ============================================================
     РЕНДЕР HTML ДОСЬЕ
     ============================================================ */
  function renderCabinetHTML(profile) {
    var photoUrl = profile.photo || '';
    var displayFull = profile.fullOfficial || profile.displayName || 'Неизвестный игрок';
    var age = ageFromBirth(profile.birth);

    /* Фото */
    var photoHtml;
    if (photoUrl && photoUrl.length > 30) {
      photoHtml = '<img src="' + escapeHtml(photoUrl) + '" alt="" class="pc-photo-img" ' +
        'onerror="this.onerror=null;this.style.display=\'none\';' +
        'this.parentNode.innerHTML=\'<div class=&quot;pc-photo-placeholder&quot;><span>👤</span></div>\';">';
    } else {
      photoHtml = '<div class="pc-photo-placeholder"><span>👤</span></div>';
    }

    /* Дата рождения */
    var birthHtml = '';
    if (profile.birth && profile.birth !== '—') {
      birthHtml = '<div class="pc-row">' +
        '<strong>Дата рождения:</strong> ' +
        escapeHtml(profile.birth) +
        (age !== null ? ' <span style="color:#94a3b8;">(' + age + ' лет)</span>' : '') +
        '</div>';
    } else {
      birthHtml = '<div class="pc-row" style="color:#64748b;">' +
        '<strong>Дата рождения:</strong> —' +
        '</div>';
    }

    /* Клуб */
    var clubHtml = '';
    if (profile.club && profile.club !== '—') {
      var clubJs = String(profile.club).replace(/'/g, "\\'");
      clubHtml = '<div class="pc-row"><strong>Клуб:</strong> ' +
        '<button type="button" class="pc-club-link" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); ' +
          'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;background:none;border:none;padding:0;' +
          'color:#93c5fd;font:inherit;text-decoration:underline dotted;">' +
          escapeHtml(profile.club) +
        '</button></div>';
    }

    /* Награды */
    var awardsHtml = '';
    if (profile.awards && profile.awards.length) {
      awardsHtml = '<div class="pc-row" style="margin-top:10px;">' +
        '<strong>Награды:</strong> ' +
        profile.awards.map(function (a) {
          return '<span class="pc-award-badge">🏆 ' + escapeHtml(a) + '</span>';
        }).join(' ') +
        '</div>';
    }

    /* Плашки клубов */
    var clubsPlaquesHtml = '';
    if (profile.clubs && profile.clubs.length) {
      clubsPlaquesHtml = profile.clubs.map(function (club) {
        var clubJs = String(club).replace(/'/g, "\\'");
        return '<button type="button" class="pc-club-tag pc-club-tag-clickable" ' +
          'data-club="' + escapeHtml(club) + '" ' +
          'onclick="event.preventDefault(); event.stopPropagation(); ' +
          'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\');" ' +
          'style="cursor:pointer;border:none;">' +
          escapeHtml(club) +
        '</button>';
      }).join('');
    } else {
      clubsPlaquesHtml = '<span class="pc-muted">—</span>';
    }

    /* Таблица статистики */
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
              escapeHtml(s.club || '—') +
            '</button>' +
          '</td>' +
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

    /* Сводная статистика */
    var totalHtml = '';
    if (profile.totalStats) {
      totalHtml =
        '<h4 class="pc-section-title">📊 Сводная статистика</h4>' +
        '<div class="pc-stats pc-stats-3">' +
          '<div class="pc-stat">' +
            '<div class="pc-stat-value">' + (profile.totalStats.matches || 0) + '</div>' +
            '<div class="pc-stat-label">Матчи</div>' +
          '</div>' +
          '<div class="pc-stat">' +
            '<div class="pc-stat-value">' + (profile.totalStats.goals || 0) + '</div>' +
            '<div class="pc-stat-label">⚽ Голы</div>' +
          '</div>' +
          '<div class="pc-stat">' +
            '<div class="pc-stat-value">' + (profile.totalStats.assists || 0) + '</div>' +
            '<div class="pc-stat-label">👟 Ассисты</div>' +
          '</div>' +
        '</div>';
    }

    /* ИТОГОВАЯ РАЗМЕТКА */
    var html = '';

    html += '<div class="pc-header">';
    html +=   '<div class="pc-photo">' + photoHtml + '</div>';
    html +=   '<div class="pc-info">';
    html +=     '<h2 class="pc-name">' + escapeHtml(displayFull) + '</h2>';
    html +=     '<div class="pc-pos">' +
                  '<span class="pos-badge ' + posBadgeClass(profile.position) + '">' +
                    escapeHtml(profile.position || 'УНИ') +
                  '</span>' +
                '</div>';
    /* ⚠️ БЕЗ строки с ID */
    html +=     birthHtml;
    html +=     clubHtml;
    html +=     awardsHtml;
    html +=   '</div>';
    html += '</div>';

    html += totalHtml;

    html += '<h4 class="pc-section-title">🏟 Карьера · клубы</h4>';
    html += '<div class="pc-tags">' + clubsPlaquesHtml + '</div>';

    html += '<h4 class="pc-section-title">📋 Статистика по клубам</h4>';
    html += careerTableHtml;

    return html;
  }

  /* ============================================================
     ГЛАВНАЯ ФУНКЦИЯ — открыть досье
     ============================================================ */
  function openPlayerModal(playerRef, fallbackClub) {
    try {
      /* 1. Разбор аргументов */
      var parsed = parseArgs(playerRef, fallbackClub);
      var targetId = parsed.id;
      var targetName = parsed.name;
      var clubHint = parsed.club;

      if (!targetId && !targetName) {
        console.warn('[openPlayerModal] Нет ни ID, ни имени');
        return null;
      }

      console.log('[openPlayerModal] Открытие досье:',
                  { id: targetId, name: targetName, club: clubHint });

      /* 2. Через PlayerResolver */
      var resolved = null;
      if (window.PlayerResolver && window.PlayerResolver.resolve) {
        try {
          resolved = window.PlayerResolver.resolve(targetId || targetName, clubHint);
        } catch (e) {
          console.warn('[openPlayerModal] resolve error:', e);
        }
      }

      /* 3. Компактное имя */
      var compact = (resolved && resolved.full) || targetName || 'Неизвестный игрок';
      compact = compactName(compact);

      /* 4. ID */
      var finalId = targetId || (resolved && resolved.id) || null;

      /* 5. ⚡ Полное официальное ФИО — через playerPersonal */
      var officialFull = findFullOfficialName(
        finalId,
        compact,
        clubHint || (resolved && resolved.club) || ''
      );

      /* 6. Позиция */
      var position = (resolved && resolved.pos) ||
                     (parsed.obj && parsed.obj.pos) ||
                     'УНИ';

      /* 7. ⚡ Дата рождения — сквозной поиск через playerPersonal */
      var birth = findBirthDate(finalId, compact, clubHint);
      if (!birth && resolved && resolved.birth) birth = resolved.birth;

      /* 8. Фото */
      var photo = findPhoto(finalId, compact, clubHint);

      /* 9. Клуб */
      var club = (resolved && resolved.club) || clubHint || '';

      /* 10. Карьера */
      var career = buildCareer(finalId, compact);

      /* 11. Награды */
      var awards = [];
      if (finalId && window.database && window.database.getPlayer) {
        try {
          var dbP = window.database.getPlayer(finalId);
          if (dbP && dbP.awards) awards = dbP.awards;
        } catch (e) {}
      }

      /* 12. Профиль */
      var profile = {
        id: finalId,
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
          assists: career.total.a,
          yellow: career.total.yc,
          red: career.total.rc
        }
      };

      /* 13. Модалка */
      var modal = document.getElementById('playerCabinetModal') ||
                  document.getElementById('playerModal');

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

      /* 14. Body */
      var body = document.getElementById('playerCabinetBody');
      if (!body) {
        body = document.createElement('div');
        body.id = 'playerCabinetBody';
        var content = modal.querySelector('.modal-content');
        if (content) content.appendChild(body);
        else modal.appendChild(body);
      }

      /* 15. Рендер */
      try {
        body.innerHTML = renderCabinetHTML(profile);
      } catch (renderErr) {
        console.error('[openPlayerModal] render error:', renderErr);
        body.innerHTML =
          '<div style="padding:30px;text-align:center;color:#fca5a5;">' +
            '⚠️ Не удалось отобразить профиль<br>' +
            '<small style="color:#94a3b8;">' + escapeHtml(compact) + '</small>' +
          '</div>';
      }

      /* 16. Показать */
      modal.classList.add('show');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.zIndex = '1000';
      document.body.style.overflow = 'hidden';

      console.log('[openPlayerModal] ✅ Открыто:',
                  '| компакт:', compact,
                  '| официально:', officialFull,
                  '| ДР:', birth || '—',
                  '| фото:', photo ? 'есть' : 'нет',
                  '| клубов:', career.clubs.length);

      return profile;

    } catch (err) {
      console.error('[openPlayerModal] ❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
      return null;
    }
  }

  function closePlayerCabinet() {
    try {
      ['playerCabinetModal', 'playerModal'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) {
          m.style.display = 'none';
          m.classList.remove('show');
        }
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

  /* Утилиты */
  window.compactPlayerName = compactName;
  window.fullPlayerName = function (fio) { return fullName(fio); };

  /* Делегирование кликов */
  if (!window.__playerClickBound) {
    window.__playerClickBound = true;
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-player]') : null;
      if (!el) return;
      var pRef = el.getAttribute('data-player');
      if (!pRef) return;
      e.preventDefault();
      e.stopPropagation();
      window.openPlayerModal(pRef);
    }, true);
  }

  console.log('[player-modal-safe] v3.1 · playerPersonal + teamMedia + компакт/полное ФИО + ДР');
})();