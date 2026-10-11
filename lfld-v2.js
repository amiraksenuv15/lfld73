/* ============================================================
   lfld-v2.js — Сборная тура + Афиша турниров + Редактор расписания
   v2.1 — СТРОГАЯ ПРИВЯЗКА КЛУБА К КОНТЕКСТУ ТУРНИРА
   
   Ключевое изменение:
   - Клуб игрока для сборной тура определяется ТОЛЬКО из заявки
     конкретного турнира (LFLD_MASTER_DB[mk].teams), а не из общей
     карьеры игрока в database.js.
   - Функция getPlayerTeamInTournament(name, tournamentKey) — единый
     источник истины для «в какой команде игрок играет сейчас».
   ============================================================ */
(function () {
  'use strict';

  /* ================================================================
     HELPERS
     ================================================================ */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) { return String(s == null ? '' : s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  }

  function parseDT(str) {
    var m = String(str || '').match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
    if (!m) return { d: '', t: '' };
    return { d: m[3] + '-' + m[2] + '-' + m[1], t: m[4] || '' };
  }
  function formatDT(d, t) {
    if (!d) return '';
    var p = d.split('-');
    return p[2] + '.' + p[1] + '.' + p[0] + (t ? ' ' + t : '');
  }
  function compressImage(file, maxW, quality, cb) {
    var r = new FileReader();
    r.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, maxW / img.width);
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = function () { cb(e.target.result); };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  }

  /* ================================================================
     СПРАВОЧНИКИ: турниры, формация, цвета
     ================================================================ */

  // tournamentsData key → LFLD_MASTER_DB key
  var TOTW_MASTER_MAP = {
    '5x5':              'tournament_5x5',
    '7x7':              'tournament_7x7',
    'night_league_8x8': 'tournament_night',
    'cup_5x5':          'cup_5x5',
    'veterans_40':      null
  };

  // Формация 8х8
  var TOTW_FORMATION = [
    { slot: 'ST',     pos: 'НАП', x: 50, y: 12 },
    { slot: 'WING_L', pos: 'АТК', x: 22, y: 29 },
    { slot: 'WING_R', pos: 'АТК', x: 78, y: 29 },
    { slot: 'PZ_L',   pos: 'ПЗ',  x: 32, y: 48 },
    { slot: 'PZ_R',   pos: 'ПЗ',  x: 68, y: 48 },
    { slot: 'ZASH_L', pos: 'ЗАЩ', x: 32, y: 67 },
    { slot: 'ZASH_R', pos: 'ЗАЩ', x: 68, y: 67 },
    { slot: 'VRT',    pos: 'ВРТ', x: 50, y: 87 }
  ];

  // Fallback-цвета, если у клуба нет логотипа
  var TOTW_KITS = {
    'ПТИМАШ':         { bg: '#ffffff', fg: '#0b111e', label: 'ПТИ' },
    'ДИТИ НИЯУ МИФИ': { bg: '#1e40af', fg: '#ffffff', label: 'МИФ' },
    'МИФИ':           { bg: '#1e40af', fg: '#ffffff', label: 'МИФ' },
    'Металлист':      { bg: '#111827', fg: '#f5a623', label: 'МЕТ' },
    'Металлист-М':    { bg: '#111827', fg: '#f5a623', label: 'МЕТ' },
    'Спринт':         { bg: '#ea580c', fg: '#ffffff', label: 'СПР' },
    'Нефтчи':         { bg: '#111827', fg: '#ffffff', label: 'НЕФ' },
    'Химмаш':         { bg: '#b91c1c', fg: '#ffffff', label: 'ХИМ' },
    'Нейтрон':        { bg: '#0e7490', fg: '#ffffff', label: 'НЕЙ' },
    'Кабо-Верде':     { bg: '#1d4ed8', fg: '#ffffff', label: 'КБВ' },
    'Комета':         { bg: '#7c3aed', fg: '#ffffff', label: 'КОМ' },
    'Авангард':       { bg: '#065f46', fg: '#ffffff', label: 'АВН' },
    'Автостар':       { bg: '#475569', fg: '#ffffff', label: 'АВТ' },
    'СШ Лада':        { bg: '#0ea5e9', fg: '#ffffff', label: 'ЛАД' },
    'ЛАДА':           { bg: '#0ea5e9', fg: '#ffffff', label: 'ЛАД' },
    'Ак Барс':        { bg: '#166534', fg: '#ffffff', label: 'АКБ' }
  };
  function totwKit(club) {
    return TOTW_KITS[club] || { bg: '#334155', fg: '#f1f5f9', label: (club || '??').slice(0, 3).toUpperCase() };
  }

  function getClubLogoUrl(club) {
    if (!club) return '';
    var list = window.clubsData || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === club) return list[i].logo || '';
    }
    return '';
  }
  function isImageLogo(logo) {
    if (!logo) return false;
    try {
      return (logo.indexOf('data:image') === 0 ||
              logo.indexOf('http') === 0 ||
              logo.indexOf('/') !== -1 ||
              /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(logo));
    } catch (e) { return false; }
  }

  /* ================================================================
     ⚡ ЯДРО ФИКСА: getPlayerTeamInTournament
     Возвращает клуб игрока СТРОГО в рамках указанного турнира.
     Ищет по всем заявкам (teams) этого турнира.
     ================================================================ */
  function getPlayerTeamInTournament(playerIdOrName, tournamentKey) {
    var M = window.LFLD_MASTER_DB;
    if (!M || !tournamentKey) return null;

    var mk = TOTW_MASTER_MAP[tournamentKey];
    if (!mk) return null;

    var t = M[mk];
    if (!t) return null;

    var search = norm(playerIdOrName);
    if (!search) return null;

    // --- Кубок 5х5: плоский массив players, у каждого есть p.team ---
    if (mk === 'cup_5x5' && Array.isArray(t.players)) {
      for (var i = 0; i < t.players.length; i++) {
        var pl = t.players[i];
        if (!pl || !pl.name) continue;
        if (norm(pl.name) === search) {
          return {
            teamName: pl.team || '',
            teamLogo: getClubLogoUrl(pl.team),
            playerData: pl
          };
        }
      }
      return null;
    }

    // --- Обычные турниры: teams[club] = [ roster ] ---
    if (t.teams) {
      var teamNames = Object.keys(t.teams);
      for (var j = 0; j < teamNames.length; j++) {
        var club = teamNames[j];
        var roster = t.teams[club] || [];
        for (var k = 0; k < roster.length; k++) {
          var p = roster[k];
          if (!p || !p.name) continue;
          if (norm(p.name) === search) {
            return {
              teamName: club,
              teamLogo: getClubLogoUrl(club),
              playerData: p
            };
          }
        }
      }
    }
    return null;
  }

  // Обёртка-помощник: если игрок не найден в турнире — падаем на сохранённый клуб
  function resolveClubForTotw(playerName, savedClub, tournamentKey) {
    var found = getPlayerTeamInTournament(playerName, tournamentKey);
    if (found && found.teamName) return found.teamName;
    return savedClub || '';
  }

  /* ================================================================
     TOTW STATE
     ================================================================ */
  var TOTW_KEY = 'lfld_team_of_the_week';

  function totwLoad() {
    try { return JSON.parse(localStorage.getItem(TOTW_KEY) || 'null'); } catch (e) { return null; }
  }
  function totwSave(d) {
    try { localStorage.setItem(TOTW_KEY, JSON.stringify(d)); } catch (e) {}
  }
  function totwNew(tk, title, round) {
    var banner = (title ? '"' + title + '" | ' : '') + 'СИМВОЛИЧЕСКАЯ СБОРНАЯ ' + (round || '1 ТУРА');
    return {
      tournamentKey: tk || '',
      tournamentTitle: title || '',
      round: round || '1 ТУР',
      bannerTitle: banner,
      players: TOTW_FORMATION.map(function (f) {
        return { slot: f.slot, playerId: null, _key: null, name: '', short: '', club: '' };
      }),
      createdAt: Date.now()
    };
  }

  // Уникальный ключ игрока — клуб + ФИО (различает однофамильцев)
  function makePlayerKey(name, club) {
    return norm(club) + '|' + norm(name);
  }

  /* ================================================================
     ПУЛ ИГРОКОВ ДЛЯ АВТОКОМПЛИТА
     Строго по заявке выбранного турнира.
     ================================================================ */
  function totwPlayerPool(tournamentKey) {
    var pool = [];
    var seen = {};

    var M = window.LFLD_MASTER_DB;
    if (!M || !tournamentKey) return pool;

    var mk = TOTW_MASTER_MAP[tournamentKey];
    if (!mk) return pool;

    var t = M[mk];
    if (!t) return pool;

    function push(name, club, source) {
      if (!name || !club) return;
      var key = makePlayerKey(name, club);
      if (seen[key]) return;
      seen[key] = 1;
      var parts = String(name).trim().split(/\s+/);
      pool.push({
        id: null,
        name: name,
        short: parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''),
        lastName: parts[0] || '',
        firstName: parts[1] || '',
        club: club,
        clubs: [club],
        tournamentKey: tournamentKey,
        _key: key,
        _source: source
      });
    }

    // Кубок 5х5 — плоский список
    if (mk === 'cup_5x5' && Array.isArray(t.players)) {
      t.players.forEach(function (p) {
        if (p && p.name && p.team) push(p.name, p.team, 'cup');
      });
    }
    // Обычные турниры — teams[club] = [...]
    else if (t.teams) {
      Object.keys(t.teams).forEach(function (club) {
        (t.teams[club] || []).forEach(function (p) {
          if (p && p.name) push(p.name, club, 'master');
        });
      });
    }

    return pool.sort(function (a, b) {
      return (a.short || a.name || '').localeCompare(b.short || b.name || '');
    });
  }

  /* ================================================================
     РЕНДЕР МАЙКИ — белый круг с логотипом клуба
     ================================================================ */
  function renderShirtHtml(club) {
    var logo = getClubLogoUrl(club);
    if (logo && isImageLogo(logo)) {
      return '<div class="sp-shirt">' +
        '<img src="' + escAttr(logo) + '" alt="" loading="lazy">' +
      '</div>';
    }
    var kit = totwKit(club);
    return '<div class="sp-shirt">' +
      '<div class="sp-shirt-fallback" style="background:' + kit.bg + ';color:' + kit.fg + ';">' +
        esc(kit.label) +
      '</div>' +
    '</div>';
  }

  /* ================================================================
     РЕНДЕР НА ГЛАВНОЙ
     При рендере КЛУБ ПЕРЕСЧИТЫВАЕТСЯ по контексту турнира.
     ================================================================ */
  function totwRenderHome() {
    var section = $('homeSymbolicSection');
    var pitch = $('symbolicPitch');
    var titleEl = $('symbolicTitleRound');
    if (!section || !pitch) return;

    var data = totwLoad();
    var hasAny = data && data.players && data.players.some(function (p) { return p && p.name; });

    if (!hasAny) {
      // Fallback на старый ключ ff_symbolic_teams
      if (window.database && window.database.getSymbolicTeam) {
        var legacy = window.database.getSymbolicTeam('night_league_8x8', '1 ТУР');
        if (legacy && legacy.players && legacy.players.length) {
          section.style.display = 'block';
          if (titleEl) titleEl.textContent = 'СИМВОЛИЧЕСКАЯ СБОРНАЯ ' + (legacy.round || '');
          totwRenderPitchLegacy(pitch, legacy.players);
          return;
        }
      }
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    if (titleEl) titleEl.textContent = data.bannerTitle || ('СИМВОЛИЧЕСКАЯ СБОРНАЯ ' + (data.round || ''));
    pitch.querySelectorAll('.sp-player, .totw-player').forEach(function (el) { el.remove(); });

    data.players.forEach(function (p) {
      if (!p || !p.name) return;
      var f = TOTW_FORMATION.find(function (x) { return x.slot === p.slot; });
      if (!f) return;

      // ⚡ ПЕРЕСЧЁТ КЛУБА ИЗ КОНТЕКСТА ТУРНИРА
      var club = resolveClubForTotw(p.name, p.club, data.tournamentKey);

      var el = document.createElement('div');
      el.className = 'sp-player totw-player';
      el.style.left = f.x + '%';
      el.style.top = f.y + '%';
      el.title = p.name + ' (' + (club || '—') + ')';
      el.onclick = function () {
        if (window.openPlayerCabinet) window.openPlayerCabinet(p.name, club);
        else if (window.openPlayerModal) window.openPlayerModal(p.name, club);
      };
      el.innerHTML =
        renderShirtHtml(club) +
        '<div class="sp-name">' + esc(p.short || p.name) + '</div>' +
        '<div class="sp-pos">' + esc(f.pos) + '</div>';
      pitch.appendChild(el);
    });
  }

  function totwRenderPitchLegacy(pitch, players) {
    pitch.querySelectorAll('.sp-player, .totw-player').forEach(function (el) { el.remove(); });
    var layout = {
      'НАП': [{ x: 50, y: 12 }],
      'АТК': [{ x: 22, y: 29 }, { x: 78, y: 29 }],
      'ПЗ':  [{ x: 32, y: 48 }, { x: 68, y: 48 }],
      'ЗАЩ': [{ x: 32, y: 67 }, { x: 68, y: 67 }],
      'ВРТ': [{ x: 50, y: 87 }]
    };
    var used = { НАП: 0, АТК: 0, ПЗ: 0, ЗАЩ: 0, ВРТ: 0 };
    players.forEach(function (p) {
      var pos = p.pos || 'ПЗ';
      if (pos === 'УНИ') pos = 'ПЗ';
      if (!layout[pos]) pos = 'ПЗ';
      var idx = used[pos] || 0;
      var spot = layout[pos][idx] || layout[pos][0];
      used[pos] = idx + 1;

      // В legacy-режиме клуб берём как есть (нет tournamentKey)
      var el = document.createElement('div');
      el.className = 'sp-player totw-player';
      el.style.left = spot.x + '%';
      el.style.top = spot.y + '%';
      el.onclick = function () { if (window.openPlayerModal) window.openPlayerModal(p.name, p.club); };
      el.innerHTML =
        renderShirtHtml(p.club) +
        '<div class="sp-name">' + esc(p.short || p.name) + '</div>' +
        '<div class="sp-pos">' + esc(pos) + '</div>';
      pitch.appendChild(el);
    });
  }

  /* ================================================================
     КОНСТРУКТОР В АДМИНКЕ
     ================================================================ */
  var totwEditState = { data: null };

  function totwRenderAdmin() {
    var wrap = $('totwAdminWrap');
    if (!wrap) return;

    if (!totwEditState.data) {
      var saved = totwLoad();
      totwEditState.data = saved || totwNew('night_league_8x8', 'Ночная лига 8х8 (2026)', '1 ТУР');
    }
    var d = totwEditState.data;

    // Селект турниров
    var tourneyOpts = Object.keys(window.tournamentsData || {}).map(function (k) {
      var t = window.tournamentsData[k];
      return '<option value="' + escAttr(k) + '"' + (d.tournamentKey === k ? ' selected' : '') + '>' + esc(t.title || k) + '</option>';
    }).join('');

    // Раунды
    var rounds = [];
    var t = (window.tournamentsData || {})[d.tournamentKey];
    if (t && Array.isArray(t.matches)) {
      t.matches.forEach(function (m) { if (m.tour && rounds.indexOf(m.tour) === -1) rounds.push(m.tour); });
    }
    if (!rounds.length) rounds = ['1 ТУР', '2 ТУР', '3 ТУР', '4 ТУР', '5 ТУР'];
    var roundOpts = rounds.map(function (r) {
      return '<option value="' + escAttr(r) + '"' + (d.round === r ? ' selected' : '') + '>' + esc(r) + '</option>';
    }).join('');

    // Слоты
    var slotsHtml = TOTW_FORMATION.map(function (f) {
      var p = d.players.find(function (x) { return x.slot === f.slot; }) || { slot: f.slot, name: '', club: '' };
      var filled = !!p.name;
      var body;
      if (filled) {
        // ⚡ Пересчёт клуба для отображения
        var club = resolveClubForTotw(p.name, p.club, d.tournamentKey);
        var logo = getClubLogoUrl(club);
        var kitHtml;
        if (logo && isImageLogo(logo)) {
          kitHtml = '<div class="totw-chosen-kit"><img src="' + escAttr(logo) + '" alt=""></div>';
        } else {
          var kit = totwKit(club);
          kitHtml = '<div class="totw-chosen-kit" style="background:' + kit.bg + ';"><span style="color:' + kit.fg + ';">' + esc(kit.label) + '</span></div>';
        }
        body =
          '<div class="totw-chosen" data-slot="' + f.slot + '">' +
            kitHtml +
            '<div class="totw-chosen-info">' +
              '<div class="totw-chosen-name">' + esc(p.short || p.name) + '</div>' +
              '<div class="totw-chosen-club">' + esc(club || '—') + '</div>' +
            '</div>' +
            '<button type="button" class="lfld-ac-clear" data-clear="' + f.slot + '" title="Сбросить">✕</button>' +
          '</div>';
      } else {
        body =
          '<div class="lfld-ac">' +
            '<input type="text" class="lfld-ac-input" placeholder="Поиск игрока: фамилия или имя" data-slot-input="' + f.slot + '" autocomplete="off">' +
            '<div class="lfld-ac-drop" data-slot-drop="' + f.slot + '"></div>' +
          '</div>';
      }
      return '<div class="totw-slot' + (filled ? ' filled' : '') + '">' +
        '<div class="totw-slot-pos">' + f.pos + '</div>' +
        '<div class="totw-slot-body">' + body + '</div>' +
      '</div>';
    }).join('');

    wrap.innerHTML =
      '<div class="admin-extras-section">' +
        '<h3>⭐ Конструктор «Символическая сборная тура»</h3>' +
        '<p>Формация 8×8. Игроки в поиске — только те, кто заявлен в выбранном турнире. ' +
        'Клуб и форма берутся из заявки этого турнира (не из общей карьеры).</p>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Турнир</label><select id="totwTourney">' + tourneyOpts + '</select></div>' +
          '<div class="form-group"><label>Тур</label><select id="totwRound">' + roundOpts + '</select></div>' +
        '</div>' +
        '<div class="form-group"><label>Заголовок баннера</label>' +
          '<input type="text" id="totwBanner" value="' + esc(d.bannerTitle) + '">' +
        '</div>' +
        '<div class="totw-admin-grid">' + slotsHtml + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">' +
          '<button type="button" class="btn-success" id="totwPublish">📢 Сохранить и опубликовать</button>' +
          '<button type="button" class="btn-secondary" id="totwReset">Очистить состав</button>' +
        '</div>' +
        '<div class="ai-status" id="totwStatus"></div>' +
      '</div>';

    totwBindAdminEvents();
  }

  function totwUsedKeys(exceptSlot) {
    var used = {};
    totwEditState.data.players.forEach(function (p) {
      if (!p || !p.name) return;
      if (exceptSlot && p.slot === exceptSlot) return;
      var k = p._key || makePlayerKey(p.name, p.club);
      used[k] = true;
    });
    return used;
  }

  function totwBindAdminEvents() {
    var d = totwEditState.data;
    var tSel = $('totwTourney');
    var rSel = $('totwRound');
    var bInp = $('totwBanner');

    // Смена турнира — сброс состава (заявки другие!)
    if (tSel) tSel.onchange = function () {
      d.tournamentKey = this.value;
      var t = (window.tournamentsData || {})[this.value];
      d.tournamentTitle = t ? t.title : '';
      var rounds = [];
      if (t && Array.isArray(t.matches)) t.matches.forEach(function (m) { if (m.tour && rounds.indexOf(m.tour) === -1) rounds.push(m.tour); });
      if (!rounds.length) rounds = ['1 ТУР', '2 ТУР', '3 ТУР'];
      d.round = rounds[0];
      d.bannerTitle = '"' + (d.tournamentTitle || '') + '" | СИМВОЛИЧЕСКАЯ СБОРНАЯ ' + d.round;
      d.players.forEach(function (p) { p.playerId = null; p._key = null; p.name = ''; p.short = ''; p.club = ''; });
      totwRenderAdmin();
    };

    if (rSel) rSel.onchange = function () {
      d.round = this.value;
      d.bannerTitle = '"' + (d.tournamentTitle || '') + '" | СИМВОЛИЧЕСКАЯ СБОРНАЯ ' + d.round;
      if (bInp) bInp.value = d.bannerTitle;
    };

    if (bInp) bInp.oninput = function () { d.bannerTitle = this.value; };

    // ⚡ Пул игроков — только заявленные в выбранном турнире
    var pool = totwPlayerPool(d.tournamentKey);

    document.querySelectorAll('[data-slot-input]').forEach(function (inp) {
      var slot = inp.getAttribute('data-slot-input');
      var drop = document.querySelector('[data-slot-drop="' + slot + '"]');
      if (!drop) return;

      function renderDrop(query) {
        var q = norm(query);
        var list = pool;
        if (q) {
          list = pool.filter(function (p) {
            var hay = norm(p.name + ' ' + (p.firstName || '') + ' ' + (p.lastName || ''));
            return hay.indexOf(q) !== -1;
          });
        }

        var used = totwUsedKeys(slot);
        list = list.map(function (p) {
          var entry = Object.assign({}, p);
          entry._disabled = !!used[p._key];
          return entry;
        });
        list = list.slice(0, 40);

        if (!list.length) {
          drop.innerHTML = '<div class="lfld-ac-empty">Ничего не найдено в этом турнире</div>';
        } else {
          drop.innerHTML = list.map(function (p, i) {
            var logo = getClubLogoUrl(p.club);
            var clubIcon = (logo && isImageLogo(logo))
              ? '<img src="' + escAttr(logo) + '" alt="">'
              : '';
            return '<div class="lfld-ac-item' + (p._disabled ? ' disabled' : '') + '" data-idx="' + i + '" ' +
              'data-name="' + escAttr(p.name) + '" ' +
              'data-short="' + escAttr(p.short || p.name) + '" ' +
              'data-club="' + escAttr(p.club) + '" ' +
              'data-pid="' + escAttr(p.id || '') + '" ' +
              'data-key="' + escAttr(p._key) + '">' +
              '<span class="ac-name"><strong>' + esc(p.lastName || p.name) + '</strong>' +
                (p.firstName ? ' ' + esc(p.firstName) : '') + '</span>' +
              '<span class="ac-club">' + clubIcon + esc(p.club || '—') + '</span>' +
            '</div>';
          }).join('');
        }

        drop.classList.add('open');
        drop.querySelectorAll('.lfld-ac-item').forEach(function (it) {
          it.addEventListener('mousedown', function (e) {
            e.preventDefault();
            if (it.classList.contains('disabled')) return;
            var name  = it.getAttribute('data-name');
            var short = it.getAttribute('data-short');
            var club  = it.getAttribute('data-club');
            var pid   = it.getAttribute('data-pid') || null;
            var key   = it.getAttribute('data-key');
            var slotObj = d.players.find(function (x) { return x.slot === slot; });
            if (slotObj) {
              slotObj.playerId = pid || null;
              slotObj._key = key;
              slotObj.name = name;
              slotObj.short = short;
              slotObj.club = club;   // клуб уже правильный — из заявки турнира
            }
            totwRenderAdmin();
          });
        });
      }

      inp.addEventListener('input', function () { renderDrop(this.value); });
      inp.addEventListener('focus', function () { renderDrop(this.value); });
      inp.addEventListener('blur', function () { setTimeout(function () { drop.classList.remove('open'); }, 200); });
    });

    document.querySelectorAll('[data-clear]').forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var slot = this.getAttribute('data-clear');
        var slotObj = d.players.find(function (x) { return x.slot === slot; });
        if (slotObj) {
          slotObj.playerId = null;
          slotObj._key = null;
          slotObj.name = '';
          slotObj.short = '';
          slotObj.club = '';
        }
        totwRenderAdmin();
      };
    });

    // Публикация
    var pub = $('totwPublish');
    if (pub) pub.onclick = function () {
      d.bannerTitle = $('totwBanner') ? $('totwBanner').value : d.bannerTitle;
      var filled = d.players.filter(function (p) { return p.name; });
      if (!filled.length) return alert('Заполните хотя бы одного игрока');

      // Проверка дублирования
      var keysSeen = {};
      for (var i = 0; i < filled.length; i++) {
        var k = filled[i]._key || makePlayerKey(filled[i].name, filled[i].club);
        if (keysSeen[k]) return alert('Один игрок не может быть выбран дважды: ' + filled[i].name);
        keysSeen[k] = true;
      }

      // ⚡ При сохранении — финальный пересчёт клуба из турнира
      filled.forEach(function (p) {
        var resolved = getPlayerTeamInTournament(p.name, d.tournamentKey);
        if (resolved && resolved.teamName) {
          p.club = resolved.teamName;
          p._key = makePlayerKey(p.name, resolved.teamName);
        }
      });

      d.createdAt = Date.now();
      totwSave(d);

      // Награды
      if (window.database) {
        var awardText = 'В символической сборной ' + d.round + ' (' + (d.tournamentTitle || d.tournamentKey) + ')';
        filled.forEach(function (p) {
          var found = null;
          if (p.playerId && window.database.getPlayer(p.playerId)) found = window.database.getPlayer(p.playerId);
          else if (window.database.findPlayersByName) {
            var arr = window.database.findPlayersByName(p.name, p.club);
            if (arr && arr.length) found = arr[0];
          }
          if (found) window.database.awardPlayer(found.id, awardText);
        });
      }

      var st = $('totwStatus');
      if (st) {
        st.className = 'ai-status show ok';
        st.innerText = 'Опубликовано: ' + filled.length + ' игроков. Сборная обновлена на главной.';
      }
      totwRenderHome();
      if (window.renderHomeSymbolic) window.renderHomeSymbolic();
    };

    var rst = $('totwReset');
    if (rst) rst.onclick = function () {
      if (!confirm('Очистить состав сборной?')) return;
      totwEditState.data = totwNew(d.tournamentKey, d.tournamentTitle, d.round);
      totwRenderAdmin();
    };
  }

  /* ================================================================
     АФИША ТУРНИРОВ
     ================================================================ */
  var AFFICHE_KEY = 'lfld_tournaments_affiche';
  var afficheEditId = null;

  function afficheLoad() {
    try { return JSON.parse(localStorage.getItem(AFFICHE_KEY) || '[]'); } catch (e) { return []; }
  }
  function afficheSaveList(list) {
    try { localStorage.setItem(AFFICHE_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function afficheUid() { return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); }

  var STATUS_LABELS = {
    live: 'Идёт сейчас',
    soon: 'Скоро',
    registration: 'Регистрация открыта',
    finished: 'Завершён'
  };

  function afficheRenderHome() {
    var grid = $('homeAfficheGrid');
    if (!grid) return;
    var list = afficheLoad().slice().sort(function (a, b) {
      var order = { live: 0, registration: 1, soon: 2, finished: 3 };
      var oa = order[a.status] != null ? order[a.status] : 9;
      var ob = order[b.status] != null ? order[b.status] : 9;
      if (oa !== ob) return oa - ob;
      return (a.dateStart || '').localeCompare(b.dateStart || '');
    });
    if (!list.length) {
      grid.innerHTML = '<div class="affiche-tour-empty">Пока нет опубликованных турниров.</div>';
      return;
    }
    grid.innerHTML = list.map(function (t) {
      var badgeCls = 'affiche-tour-badge ' + (t.status || 'soon');
      var badgeTxt = STATUS_LABELS[t.status] || 'Турнир';
      var dates = '';
      if (t.dateStart && t.dateEnd) dates = formatDateShort(t.dateStart) + ' – ' + formatDateShort(t.dateEnd);
      else if (t.dateStart) dates = 'с ' + formatDateShort(t.dateStart);
      var poster = t.poster
        ? '<img src="' + esc(t.poster) + '" alt="">'
        : '<div class="affiche-tour-poster-empty">🏆</div>';
      return '<div class="affiche-tour-card" data-tour-id="' + escAttr(t.id) + '">' +
        '<div class="affiche-tour-poster">' + poster +
          '<span class="' + badgeCls + '">' + esc(badgeTxt) + '</span>' +
        '</div>' +
        '<div class="affiche-tour-body">' +
          '<div class="affiche-tour-name">' + esc(t.name || 'Турнир') + '</div>' +
          '<div class="affiche-tour-meta">' +
            (t.format ? '<span>⚽ ' + esc(t.format) + '</span>' : '') +
            (dates ? '<span>📅 ' + esc(dates) + '</span>' : '') +
            (t.teamsCount ? '<span>👥 ' + esc(t.teamsCount) + ' команд</span>' : '') +
          '</div>' +
          '<button class="affiche-tour-btn" data-tour-btn="' + escAttr(t.id) + '">Подробнее о турнире →</button>' +
        '</div>' +
      '</div>';
    }).join('');

    grid.querySelectorAll('[data-tour-btn]').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = this.getAttribute('data-tour-btn');
        var t = afficheLoad().find(function (x) { return x.id === id; });
        if (t) alert(t.name + '\n\n' + (t.description || 'Регистрация по ссылке ВК.'));
      };
    });
    grid.querySelectorAll('.affiche-tour-card').forEach(function (card) {
      card.onclick = function () { var b = this.querySelector('[data-tour-btn]'); if (b) b.click(); };
    });
  }
  function formatDateShort(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    var months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return p[2] + ' ' + months[parseInt(p[1], 10) - 1];
  }

  function afficheRenderAdmin() {
    var wrap = $('afficheAdminWrap');
    if (!wrap) return;
    var list = afficheLoad();
    var editing = afficheEditId ? list.find(function (x) { return x.id === afficheEditId; }) : null;

    var formHtml =
      '<div class="form-row">' +
        '<div class="form-group"><label>Название турнира</label><input type="text" id="afName" value="' + esc(editing ? editing.name : '') + '" placeholder="Зимний кубок ЛФЛД 2026/2027"></div>' +
        '<div class="form-group"><label>Формат</label><select id="afFormat">' +
          ['5x5', '7x7', '8x8'].map(function (f) {
            var sel = editing && editing.format === f ? ' selected' : '';
            return '<option value="' + f + '"' + sel + '>' + f + '</option>';
          }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Дата старта</label><input type="date" id="afDateStart" value="' + esc(editing ? editing.dateStart : '') + '"></div>' +
        '<div class="form-group"><label>Дата финала</label><input type="date" id="afDateEnd" value="' + esc(editing ? editing.dateEnd : '') + '"></div>' +
        '<div class="form-group"><label>Команд</label><input type="number" id="afTeamsCount" min="0" value="' + esc(editing ? (editing.teamsCount || '') : '') + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Статус</label><select id="afStatus">' +
          Object.keys(STATUS_LABELS).map(function (k) {
            var sel = editing && editing.status === k ? ' selected' : '';
            return '<option value="' + k + '"' + sel + '>' + STATUS_LABELS[k] + '</option>';
          }).join('') +
        '</select></div>' +
        '<div class="form-group"><label>Описание</label><input type="text" id="afDesc" value="' + esc(editing ? (editing.description || '') : '') + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Постер — URL</label><input type="text" id="afPosterUrl" value="' + esc(editing && editing.poster && /^https?:/.test(editing.poster) ? editing.poster : '') + '" placeholder="https://..."></div>' +
        '<div class="form-group"><label>…или файл</label><input type="file" id="afPosterFile" accept="image/*"></div>' +
      '</div>' +
      '<div id="afPosterPreview" style="margin:8px 0 14px;"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button type="button" class="btn-success" id="afSave">' + (editing ? '💾 Сохранить' : '➕ Создать') + '</button>' +
        (editing ? '<button type="button" class="btn-secondary" id="afCancel">Отмена</button>' : '') +
      '</div>';

    var listHtml = '';
    if (list.length) {
      listHtml = '<div class="affiche-admin-list">' + list.map(function (t) {
        var poster = t.poster
          ? '<img src="' + esc(t.poster) + '" alt="">'
          : '<div class="no-poster">🏆</div>';
        return '<div class="affiche-admin-item">' + poster +
          '<div class="affiche-admin-meta">' +
            '<div class="affiche-admin-name">' + esc(t.name) + '</div>' +
            '<div class="affiche-admin-sub">' + esc(t.format || '') + ' • ' +
              esc(STATUS_LABELS[t.status] || '') + ' • ' +
              (t.dateStart ? formatDateShort(t.dateStart) : '—') +
            '</div>' +
          '</div>' +
          '<div class="affiche-admin-actions">' +
            '<button type="button" class="btn-secondary" data-af-edit="' + escAttr(t.id) + '" style="padding:6px 12px!important;font-size:11px!important;">Изменить</button>' +
            '<button type="button" class="btn-danger" data-af-del="' + escAttr(t.id) + '" style="padding:6px 12px!important;font-size:11px!important;">✕</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    } else {
      listHtml = '<p style="color:var(--text-muted);font-style:italic;margin-top:12px;">Пока нет турниров.</p>';
    }

    wrap.innerHTML =
      '<div class="admin-extras-section">' +
        '<h3>📅 Управление турнирами и анонсами</h3>' +
        formHtml +
        '<div class="ai-status" id="afStatus"></div>' +
      '</div>' +
      '<div class="admin-extras-section">' +
        '<h3>Опубликованные турниры (' + list.length + ')</h3>' +
        listHtml +
      '</div>';

    var previewUrl = editing && editing.poster ? editing.poster : '';
    function renderPreview() {
      var p = $('afPosterPreview');
      if (!p) return;
      p.innerHTML = previewUrl
        ? '<img src="' + esc(previewUrl) + '" style="max-width:240px;border-radius:8px;border:1px solid var(--border-mid);display:block;">'
        : '<span style="color:var(--text-muted);font-size:12px;font-style:italic;">Постер не выбран</span>';
    }
    renderPreview();

    var fileInp = $('afPosterFile');
    if (fileInp) fileInp.onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      compressImage(f, 1280, 0.85, function (dataUrl) { previewUrl = dataUrl; renderPreview(); });
    };
    var urlInp = $('afPosterUrl');
    if (urlInp) urlInp.oninput = function () { previewUrl = this.value.trim(); renderPreview(); };

    var save = $('afSave');
    if (save) save.onclick = function () {
      var name = ($('afName').value || '').trim();
      if (!name) return alert('Введите название турнира');
      var data = {
        id: editing ? editing.id : afficheUid(),
        name: name,
        format: $('afFormat').value,
        dateStart: $('afDateStart').value,
        dateEnd: $('afDateEnd').value,
        teamsCount: parseInt($('afTeamsCount').value, 10) || 0,
        status: $('afStatus').value,
        description: ($('afDesc').value || '').trim(),
        poster: previewUrl || (urlInp ? urlInp.value.trim() : ''),
        updatedAt: Date.now()
      };
      var l = afficheLoad();
      if (editing) {
        var i = l.findIndex(function (x) { return x.id === editing.id; });
        if (i !== -1) l[i] = data; else l.push(data);
      } else {
        data.createdAt = Date.now();
        l.push(data);
      }
      afficheSaveList(l);
      afficheEditId = null;
      afficheRenderAdmin();
      afficheRenderHome();
      var st = $('afStatus');
      if (st) { st.className = 'ai-status show ok'; st.innerText = 'Турнир сохранён'; }
    };
    var cancel = $('afCancel');
    if (cancel) cancel.onclick = function () { afficheEditId = null; afficheRenderAdmin(); };

    wrap.querySelectorAll('[data-af-edit]').forEach(function (b) {
      b.onclick = function () { afficheEditId = this.getAttribute('data-af-edit'); afficheRenderAdmin(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    });
    wrap.querySelectorAll('[data-af-del]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Удалить турнир?')) return;
        var id = this.getAttribute('data-af-del');
        var l = afficheLoad().filter(function (x) { return x.id !== id; });
        afficheSaveList(l);
        afficheRenderAdmin();
        afficheRenderHome();
      };
    });
  }

  /* ================================================================
     РЕДАКТОР РАСПИСАНИЯ
     ================================================================ */
  var meCurrentTourney = null;

  function meRenderAdmin() {
    var wrap = $('meAdminWrap');
    if (!wrap) return;
    var tkeys = Object.keys(window.tournamentsData || {});
    if (!tkeys.length) {
      wrap.innerHTML = '<div class="admin-extras-section"><h3>🗓 Редактор расписания</h3><p>Турниры ещё не загружены.</p></div>';
      return;
    }

    var curTk = meCurrentTourney || tkeys[0];
    meCurrentTourney = curTk;
    var t = window.tournamentsData[curTk];
    var matches = (t.matches || []).slice();

    var tourneyOpts = tkeys.map(function (k) {
      return '<option value="' + escAttr(k) + '"' + (k === curTk ? ' selected' : '') + '>' + esc(window.tournamentsData[k].title || k) + '</option>';
    }).join('');

    var rows = matches.map(function (m, i) {
      var dt = parseDT(m.date);
      var status = m.status || (m.played ? 'finished' : 'upcoming');
      var statusOpts = [
        ['upcoming', 'Запланирован'],
        ['live', 'Идёт онлайн'],
        ['finished', 'Завершён'],
        ['postponed', 'Отложен'],
        ['cancelled', 'Отменён']
      ].map(function (s) {
        return '<option value="' + s[0] + '"' + (status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
      }).join('');
      return '<tr data-mi="' + i + '">' +
        '<td style="text-align:left;min-width:130px;"><strong>' + esc(m.tour || '—') + '</strong><br><span style="font-size:10px;color:var(--text-muted);">' + esc(m.t1) + ' — ' + esc(m.t2) + '</span></td>' +
        '<td><input type="date" data-field="date" value="' + esc(dt.d) + '"></td>' +
        '<td><input type="time" data-field="time" value="' + esc(dt.t) + '"></td>' +
        '<td><input type="text" data-field="stadium" value="' + esc(m.stadium || '') + '" placeholder="Манеж Атом"></td>' +
        '<td><select data-field="status">' + statusOpts + '</select></td>' +
        '<td><button type="button" class="me-save-btn" data-me-save="' + i + '">💾</button></td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<div class="admin-extras-section">' +
        '<h3>🗓 Редактор расписания матчей</h3>' +
        '<p>Изменения синхронизируются в блоке «Ближайшие матчи» на главной и во вкладке «Календарь» турнира.</p>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Турнир</label><select id="meTourney">' + tourneyOpts + '</select></div>' +
        '</div>' +
        (matches.length
          ? '<div style="overflow-x:auto;"><table class="me-table"><thead><tr>' +
              '<th style="text-align:left;">Тур / Матч</th><th>Дата</th><th>Время</th><th>Место</th><th>Статус</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<p style="color:var(--text-muted);font-style:italic;">В этом турнире нет матчей.</p>') +
        '<div class="ai-status" id="meStatus"></div>' +
      '</div>';

    var tSel = $('meTourney');
    if (tSel) tSel.onchange = function () { meCurrentTourney = this.value; meRenderAdmin(); };

    wrap.querySelectorAll('[data-me-save]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(this.getAttribute('data-me-save'), 10);
        var tr = wrap.querySelector('tr[data-mi="' + idx + '"]');
        if (!tr) return;
        var m = window.tournamentsData[curTk].matches[idx];
        if (!m) return;
        var d = tr.querySelector('[data-field="date"]').value;
        var tm = tr.querySelector('[data-field="time"]').value;
        var stadium = tr.querySelector('[data-field="stadium"]').value.trim();
        var status = tr.querySelector('[data-field="status"]').value;
        m.date = formatDT(d, tm);
        m.stadium = stadium;
        m.status = status;
        if (status === 'finished') m.played = true;
        if (status === 'upcoming' || status === 'postponed' || status === 'cancelled') m.played = false;
        if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
        if (window.renderTourney) window.renderTourney();
        if (window.renderCalendar) window.renderCalendar();
        if (window.renderAffiche) window.renderAffiche();
        if (window.renderHomeUpcoming) window.renderHomeUpcoming();
        var st = $('meStatus');
        if (st) {
          st.className = 'ai-status show ok';
          st.innerText = 'Матч обновлён: ' + (m.t1 || '') + ' — ' + (m.t2 || '') + ' • ' + m.date;
        }
      };
    });
  }

  /* ================================================================
     ИНТЕГРАЦИЯ В АДМИНКУ
     ================================================================ */
  function renderAllAdmin() {
    totwRenderAdmin();
    afficheRenderAdmin();
    meRenderAdmin();
  }

  var _prevOpen = window.onAdminPanelOpened;
  window.onAdminPanelOpened = function () {
    if (typeof _prevOpen === 'function') { try { _prevOpen(); } catch (e) {} }
    renderAllAdmin();
  };

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.LFLD_V2 = {
    renderHomeTOTW: totwRenderHome,
    renderHomeAffiche: afficheRenderHome,
    renderAllAdmin: renderAllAdmin,

    // ⚡ ГЛАВНАЯ ФУНКЦИЯ ФИКСА — экспортируем для отладки и внешнего использования
    getPlayerTeamInTournament: getPlayerTeamInTournament,

    totw: {
      load: totwLoad,
      save: totwSave,
      new: totwNew,
      formation: TOTW_FORMATION,
      kitFor: totwKit,
      pool: totwPlayerPool,
      playerKey: makePlayerKey,
      resolveClub: resolveClubForTotw,
      masterMap: TOTW_MASTER_MAP
    },
    affiche: { load: afficheLoad, save: afficheSaveList, labels: STATUS_LABELS },
    me: { open: meRenderAdmin }
  };

  window.renderHomeSymbolic = function () { totwRenderHome(); };

  /* ================================================================
     INIT
     ================================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      totwRenderHome();
      afficheRenderHome();
      if ($('view-admin') && $('view-admin').style.display === 'block') renderAllAdmin();
    }, 350);
  });

  console.log('[lfld-v2] v2.1 — Сборная тура с жёсткой привязкой к турниру');
})();