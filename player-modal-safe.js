/* ============================================================
   player-modal-safe.js v2.0

   КЛАССИЧЕСКИЙ ФОРМАТ ДОСЬЕ:
   - Hero: фото 3:4, ФИО, позиция, ДР + возраст, награды
   - Сводная статистика: М / Г / П / ЖК / КК
   - Таблица «Карьера и статистика» по турнирам

   Единая точка входа: window.openPlayerModal / openPlayer / openPlayerDossier
   Работает ТОЛЬКО через строгий ID резолвера.
   ============================================================ */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function safeStr(v) { return String(v == null ? '' : v); }

  function ageFromBirth(birth) {
    if (!birth || birth === '—') return '';
    var m = String(birth).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) {
      m = String(birth).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        var d2 = new Date(+m[1], +m[2] - 1, +m[3]);
        return Math.floor((Date.now() - d2.getTime()) / (365.25 * 24 * 3600 * 1000));
      }
      return null;
    }
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  }

  function posLabel(pos) {
    var map = {
      'ВРТ': 'Вратарь',
      'ЗАЩ': 'Защитник',
      'ПЗ': 'Полузащитник',
      'НАП': 'Нападающий',
      'АТК': 'Атакующий',
      'УНИ': 'Универсал'
    };
    return map[pos] || 'Универсал';
  }

  function posClass(pos) {
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
     РЕЗОЛВ ФОТО
     ============================================================ */
  function resolvePhoto(player) {
    if (!player) return '';
    var id = player.id;

    /* 1. По ID через teamMedia */
    if (id && window.teamMedia) {
      var u = window.teamMedia.findPlayerPhotoAnywhere(id);
      if (u) return u;
    }

    /* 2. Через lfldMedia */
    if (window.lfldMedia && window.lfldMedia.getPlayerPhoto) {
      try {
        var u2 = window.lfldMedia.getPlayerPhoto({ id: id, full: player.full, club: player.club });
        if (u2) return u2;
      } catch (e) {}
    }

    /* 3. Legacy playerPhotos[id] */
    var M = window.LFLD_MASTER_DB;
    if (id && M && M.playerPhotos && M.playerPhotos[id]) return M.playerPhotos[id];

    return '';
  }

  /* ============================================================
     СБОР КАРЬЕРЫ
     ============================================================ */
  var TOURNEY_LABELS = {
    'tournament_5x5': 'Первенство 5х5 (Лето 2026)',
    'tournament_7x7': 'Первенство 7х7 (Весна 2026)',
    'tournament_night': 'Ночная лига 8х8 (2026)',
    'cup_5x5': 'Кубок ЛФЛД 5х5 (2026)'
  };

  function getCareer(player) {
    var M = window.LFLD_MASTER_DB;
    if (!M || !player) return { list: [], total: { m: 0, g: 0, a: 0, yc: 0, rc: 0 }, clubs: [] };

    var targetKey = (window.PlayerResolver && window.PlayerResolver.getPersonKey)
      ? window.PlayerResolver.getPersonKey(player.full)
      : (function (n) {
          var parts = String(n).toLowerCase().replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9\s]/gi, '').trim().split(/\s+/).filter(Boolean);
          return parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
        })(player.full);

    function matches(name) {
      if (!name) return false;
      var k = (window.PlayerResolver && window.PlayerResolver.getPersonKey)
        ? window.PlayerResolver.getPersonKey(name)
        : (function (n) {
            var parts = String(n).toLowerCase().replace(/ё/g, 'е')
              .replace(/[^a-zа-я0-9\s]/gi, '').trim().split(/\s+/).filter(Boolean);
            return parts.length === 1 ? parts[0] : (parts[0] + '_' + parts[1]);
          })(name);
      return k === targetKey;
    }

    var list = [];
    var total = { m: 0, g: 0, a: 0, yc: 0, rc: 0 };
    var clubsMap = {};

    ['cup_5x5', 'tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (tk) {
      var t = M[tk];
      if (!t) return;

      var club = '';
      var m = 0, g = 0, a = 0, yc = 0, rc = 0;

      /* teams */
      if (t.teams) {
        var clubKeys = Object.keys(t.teams);
        for (var ci = 0; ci < clubKeys.length; ci++) {
          var arr = t.teams[clubKeys[ci]] || [];
          for (var pi = 0; pi < arr.length; pi++) {
            if (arr[pi] && arr[pi].name && matches(arr[pi].name)) {
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

      /* cup_5x5.players */
      if (!club && Array.isArray(t.players)) {
        for (var qi = 0; qi < t.players.length; qi++) {
          if (t.players[qi] && t.players[qi].name && matches(t.players[qi].name)) {
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
     РЕНДЕР HTML
     ============================================================ */
  function renderModalBody(player, career) {
    var photoUrl = resolvePhoto(player);
    var age = ageFromBirth(player.birth || '');

    var photoHtml;
    if (photoUrl && photoUrl.length > 30) {
      photoHtml = '<img src="' + escapeHtml(photoUrl) + '" alt="" ' +
        'style="width:100%;height:100%;object-fit:cover;display:block;" ' +
        'onerror="this.onerror=null;this.style.display=\'none\';' +
        'this.parentNode.innerHTML=\'<div class=&quot;avatar-placeholder&quot;><span>👤</span><span style=&quot;font-size:10px;&quot;>Нет фото</span></div>\';">';
    } else {
      photoHtml = '<div class="avatar-placeholder"><span>👤</span><span style="font-size:10px;">Нет фото</span></div>';
    }

    var birthHtml = '';
    if (player.birth && player.birth !== '—') {
      birthHtml = '<span>📅 ' + escapeHtml(player.birth) +
                  (age !== null ? ' (' + age + ' лет)' : '') + '</span>';
    }

    var html = '';

    /* Hero */
    html += '<div class="player-hero">';
    html += '  <div class="player-photo-3x4">' + photoHtml + '</div>';
    html += '  <div class="player-info">';
    html += '    <h2>' + escapeHtml(player.full) + '</h2>';
    html += '    <div class="player-info-row">';
    html += '      <span class="pos-badge ' + posClass(player.pos) + '">' +
                escapeHtml(player.pos || 'УНИ') + '</span>';
    html +=        birthHtml;
    html += '    </div>';
    html += '    <div class="player-info-row" style="margin-top:14px;gap:20px;flex-wrap:wrap;">';
    html += '      <span><strong>' + career.total.m + '</strong> матчей</span>';
    html += '      <span><strong style="color:#f5a623">' + career.total.g + '</strong> голов</span>';
    html += '      <span><strong style="color:#10b981">' + career.total.a + '</strong> передач</span>';
    html += '      <span><strong style="color:#fbbf24">' + career.total.yc + '</strong> ЖК</span>';
    html += '      <span><strong style="color:#fca5a5">' + career.total.rc + '</strong> КК</span>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    /* Карьера */
    html += '<h3 style="margin-top:24px;">Карьера и статистика</h3>';

    if (!career.list.length) {
      html += '<div style="padding:20px;color:#94a3b8;font-style:italic;text-align:center;">' +
              'Статистика в протоколах пока отсутствует</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;">';
      html += '<thead><tr style="background:rgba(15,23,42,0.6);">';
      html += '<th style="padding:10px 8px;text-align:left;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">Турнир</th>';
      html += '<th style="padding:10px 8px;text-align:left;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">Команда</th>';
      html += '<th style="padding:10px 8px;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">М</th>';
      html += '<th style="padding:10px 8px;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">Г</th>';
      html += '<th style="padding:10px 8px;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">А</th>';
      html += '<th style="padding:10px 8px;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">ЖК</th>';
      html += '<th style="padding:10px 8px;font-size:11px;' +
              'text-transform:uppercase;color:#94a3b8;">КК</th>';
      html += '</tr></thead><tbody>';

      career.list.forEach(function (s) {
        var clubJs = String(s.club).replace(/'/g, "\\'");
        html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">';
        html += '<td style="padding:10px 8px;font-size:13px;">' + escapeHtml(s.tournamentTitle) + '</td>';
        html += '<td style="padding:10px 8px;font-size:13px;">' +
                '<a href="#" onclick="event.preventDefault(); ' +
                'if (window.openClubCabinet) window.openClubCabinet(\'' + clubJs + '\'); ' +
                'return false;" ' +
                'style="color:#93c5fd;text-decoration:underline dotted;">' +
                escapeHtml(s.club) + '</a></td>';
        html += '<td style="padding:10px 8px;text-align:center;font-size:13px;">' + (s.m || 0) + '</td>';
        html += '<td style="padding:10px 8px;text-align:center;font-size:13px;color:#f5a623;font-weight:700;">' + (s.g || 0) + '</td>';
        html += '<td style="padding:10px 8px;text-align:center;font-size:13px;color:#10b981;font-weight:700;">' + (s.a || 0) + '</td>';
        html += '<td style="padding:10px 8px;text-align:center;font-size:13px;color:#fbbf24;">' + (s.yc || 0) + '</td>';
        html += '<td style="padding:10px 8px;text-align:center;font-size:13px;color:#fca5a5;">' + (s.rc || 0) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table>';
    }

    return html;
  }

  /* ============================================================
     ОТКРЫТИЕ МОДАЛКИ
     ============================================================ */
  function openPlayerModal(playerRef, fallbackClub) {
    try {
      /* 1. Разбор аргументов */
      var targetId = null;
      var targetName = null;
      var clubHint = fallbackClub || '';

      if (typeof playerRef === 'string') {
        if (playerRef.startsWith('p_')) targetId = playerRef;
        else targetName = playerRef;
      } else if (typeof playerRef === 'object' && playerRef !== null) {
        targetId = playerRef.id || null;
        targetName = playerRef.full || playerRef.fullName || playerRef.name || null;
        clubHint = clubHint || playerRef.club || '';
      }

      if (!targetId && !targetName) {
        console.warn('[openPlayerModal] Нет ни ID, ни имени');
        return null;
      }

      /* 2. Через PlayerResolver */
      var resolved = null;
      if (window.PlayerResolver && window.PlayerResolver.resolve) {
        try { resolved = window.PlayerResolver.resolve(targetId || targetName, clubHint); }
        catch (e) { console.warn('[openPlayerModal] resolve error:', e); }
      }

      /* 3. Формирование профиля */
      var player = {
        id: (resolved && resolved.id) || targetId,
        full: (resolved && resolved.full) || targetName || 'Неизвестный игрок',
        pos: (resolved && resolved.pos) || 'УНИ',
        birth: (resolved && resolved.birth) || '',
        club: (resolved && resolved.club) || clubHint || ''
      };

      /* 4. Дата рождения — если не из резолвера, из LFDL_BIRTH_DATES */
      if (!player.birth && window.getBirthDate) {
        try {
          var d = window.getBirthDate({
            id: player.id, full: player.full, club: player.club
          });
          if (d && d !== '—') player.birth = d;
        } catch (e) {}
      }

      /* 5. Карьера */
      var career = getCareer(player);

      /* 6. Находим или создаём модалку */
      var modal = document.getElementById('playerModal');
      if (!modal) modal = document.getElementById('playerCabinetModal');

      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'playerModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML =
          '<div class="modal-content" style="max-width:640px;position:relative;">' +
            '<button class="modal-close" type="button" ' +
              'onclick="window.closePlayerCabinet && window.closePlayerCabinet();">✕</button>' +
            '<div id="modalPlayerBody"></div>' +
          '</div>';
        document.body.appendChild(modal);
      }

      /* 7. Тело модалки */
      var body = document.getElementById('modalPlayerBody');
      if (!body) {
        body = document.createElement('div');
        body.id = 'modalPlayerBody';
        var content = modal.querySelector('.modal-content');
        if (content) content.appendChild(body);
        else modal.appendChild(body);
      }

      body.innerHTML = renderModalBody(player, career);

      /* 8. Показать модалку */
      modal.classList.add('show');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.zIndex = '1000';
      document.body.style.overflow = 'hidden';

      console.log('[openPlayerModal] ✅ Открыто:', player.full,
                  '| ID:', player.id,
                  '| ДР:', player.birth || '—',
                  '| М:', career.total.m);

      return player;

    } catch (err) {
      console.error('[openPlayerModal] ❌ КРИТИЧЕСКАЯ ОШИБКА:', err);
      return null;
    }
  }

  function closePlayerCabinet() {
    try {
      ['playerModal', 'playerCabinetModal'].forEach(function (id) {
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

  console.log('[player-modal-safe] v2.0 · классический формат · строгий вход по ID');
})();