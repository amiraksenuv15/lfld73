/* ============================================================
   admin-extras.js — админка ЛФЛД (v3.0)
   Конструктор символической сборной тура вернули к слотовому виду
   с автопоиском игроков по мастер-реестру турнира.
   ============================================================ */
(function () {
  'use strict';
  if (typeof window.tournamentsData === 'undefined') { console.warn('[admin-extras] основной скрипт не загружен'); return; }

  var clubsData = window.clubsData;
  var tournamentsData = window.tournamentsData;
  var DB = window.database;
  var TR = window.teamRosters;

  var mrState = { matchId: null, tourneyKey: null, t1: '', t2: '', activeTeam: 1, goals1: [], goals2: [], cards: [], attendance1: [], attendance2: [], tab: 'attendance' };
  var playerEditState = { playerId: null };
  var playerSearchQuery = '';
  var playerFilterClub = '';
  var playerRegistryOpen = false;

  /* ============================================================
     ⚡ СИМВОЛИЧЕСКАЯ СБОРНАЯ ТУРА — формация и состояние
     ============================================================ */
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

  var symState = {
    tourneyKey: 'night_league_8x8',
    round: '1 ТУР',
    slots: {} // slot → { name, short, club }
  };

  function symReset() {
    symState.slots = {};
    TOTW_FORMATION.forEach(function (f) {
      symState.slots[f.slot] = { name: '', short: '', club: '' };
    });
  }
  symReset();

  /* ---------- Ключ сохранения (совместим со старым renderHomeSymbolic) ---------- */
  function symKey(tk, round) { return tk + '|' + round; }

  function symLoadFromStorage(tk, round) {
    try {
      var all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}');
      var data = all[symKey(tk, round)];
      if (!data || !Array.isArray(data.players)) { symReset(); return; }
      symReset();
      data.players.forEach(function (p) {
        var f = TOTW_FORMATION.find(function (x) { return x.slot === p.slot; });
        if (!f) return;
        symState.slots[f.slot] = {
          name: p.name || '',
          short: p.short || '',
          club: p.club || ''
        };
      });
    } catch(e) { symReset(); }
  }
  function symSaveToStorage(tk, round) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}'); } catch(e) {}
    var players = [];
    TOTW_FORMATION.forEach(function (f) {
      var s = symState.slots[f.slot];
      if (s && s.name) {
        players.push({
          slot: f.slot,
          name: s.name,
          short: s.short || s.name,
          club: s.club || '',
          pos: f.pos
        });
      }
    });
    all[symKey(tk, round)] = { tourneyKey: tk, round: round, players: players };
    localStorage.setItem('ff_symbolic_teams', JSON.stringify(all));
    // + пробрасываем в database.js (для legacy)
    if (window.database && window.database.saveSymbolicTeam) {
      try { window.database.saveSymbolicTeam(tk, round, players); } catch(e) {}
    }
  }

  /* ---------- Пул игроков турнира из мастер-БД ---------- */
  var TOTW_MASTER_MAP = {
    '5x5':              'tournament_5x5',
    '7x7':              'tournament_7x7',
    'night_league_8x8': 'tournament_night',
    'cup_5x5':          'cup_5x5',
    'veterans_40':      null
  };
  function symPlayerPool(tournamentKey) {
    var out = [];
    var seen = {};
    var M = window.LFLD_MASTER_DB;
    if (!M) return out;
    var mk = TOTW_MASTER_MAP[tournamentKey];
    if (!mk) return out;
    var t = M[mk];
    if (!t) return out;

    function push(name, clubRaw) {
      if (!name || !clubRaw) return;
      var club = (window.canonicalClub ? window.canonicalClub(clubRaw) : clubRaw);
      var k = club + '||' + name.toLowerCase();
      if (seen[k]) return;
      seen[k] = 1;
      var parts = String(name).split(/\s+/);
      out.push({
        name: name,
        short: parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''),
        club: club
      });
    }

    if (mk === 'cup_5x5' && Array.isArray(t.players)) {
      t.players.forEach(function (p) { if (p && p.name && p.team) push(p.name, p.team); });
    } else if (t.teams) {
      Object.keys(t.teams).forEach(function (clubRaw) {
        (t.teams[clubRaw] || []).forEach(function (p) { if (p && p.name) push(p.name, clubRaw); });
      });
    }
    return out.sort(function (a, b) { return (a.short || a.name).localeCompare(b.short || b.name); });
  }

  /* ---------- Уже занятые ключи в других слотах ---------- */
  function symUsedKeys(exceptSlot) {
    var used = {};
    TOTW_FORMATION.forEach(function (f) {
      if (f.slot === exceptSlot) return;
      var s = symState.slots[f.slot];
      if (s && s.name) used[(s.club || '') + '||' + s.name.toLowerCase()] = 1;
    });
    return used;
  }

  /* ---------- Рендер блока в админке ---------- */
  function renderSymbolicBlock() {
    var tkeys = Object.keys(tournamentsData);
    var tourneyOpts = tkeys.map(function (k) {
      var t = tournamentsData[k];
      return '<option value="' + k + '"' + (symState.tourneyKey === k ? ' selected' : '') + '>' + (t.title || k) + '</option>';
    }).join('');

    var rounds = [];
    var curT = tournamentsData[symState.tourneyKey];
    if (curT && Array.isArray(curT.matches)) {
      curT.matches.forEach(function (m) { if (m.tour && rounds.indexOf(m.tour) === -1) rounds.push(m.tour); });
    }
    rounds.sort(function (a, b) { return (parseInt((a||'').replace(/\D/g,''))||0) - (parseInt((b||'').replace(/\D/g,''))||0); });
    if (!rounds.length) rounds = ['1 ТУР', '2 ТУР', '3 ТУР', '4 ТУР', '5 ТУР'];
    var roundOpts = rounds.map(function (r) {
      return '<option value="' + r + '"' + (symState.round === r ? ' selected' : '') + '>' + r + '</option>';
    }).join('');

    // ⚡ Слоты с автопоиском
    var slotsHtml = TOTW_FORMATION.map(function (f) {
      var s = symState.slots[f.slot] || { name: '', club: '' };
      var filled = !!s.name;
      var body;
      if (filled) {
        var logoHtml = (window.getClubLogoMini && s.club) ? window.getClubLogoMini(s.club) : '';
        body =
          '<div class="totw-chosen">' +
            '<span class="totw-chosen-kit">' + logoHtml + '</span>' +
            '<div class="totw-chosen-info">' +
              '<div class="totw-chosen-name">' + escapeHtml(s.short || s.name) + '</div>' +
              '<div class="totw-chosen-club">' + escapeHtml(s.club || '—') + '</div>' +
            '</div>' +
            '<button type="button" class="lfld-ac-clear" onclick="window.__symClearSlot(\'' + f.slot + '\')" title="Сбросить">✕</button>' +
          '</div>';
      } else {
        body =
          '<div class="lfld-ac">' +
            '<input type="text" class="lfld-ac-input" placeholder="Поиск: фамилия или имя" data-slot-input="' + f.slot + '" autocomplete="off">' +
            '<div class="lfld-ac-drop" data-slot-drop="' + f.slot + '"></div>' +
          '</div>';
      }
      return '<div class="totw-slot' + (filled ? ' filled' : '') + '">' +
        '<div class="totw-slot-pos">' + f.pos + '</div>' +
        '<div class="totw-slot-body">' + body + '</div>' +
      '</div>';
    }).join('');

    return '<div class="admin-extras-section">' +
      '<h3>⭐ Конструктор «Символическая сборная тура»</h3>' +
      '<p>Формация 8×8. Игроки ищутся по мастер-реестру выбранного турнира. Клуб подтягивается автоматически.</p>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Турнир:</label>' +
          '<select id="symTourneySelect" onchange="window.__symChangeTourney(this.value)">' + tourneyOpts + '</select>' +
        '</div>' +
        '<div class="form-group"><label>Тур:</label>' +
          '<select id="symRoundSelect" onchange="window.__symChangeRound(this.value)">' + roundOpts + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="totw-admin-grid">' + slotsHtml + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">' +
        '<button type="button" class="btn-success" onclick="window.__symPublish()">📢 Сохранить и опубликовать</button>' +
        '<button type="button" class="btn-danger" onclick="window.__symClear()">Очистить состав</button>' +
      '</div>' +
      '<div class="ai-status" id="symStatus"></div>' +
    '</div>';
  }

  /* ---------- Автопоиск по слотам ---------- */
  function symBindAutocomplete() {
    var pool = symPlayerPool(symState.tourneyKey);

    document.querySelectorAll('[data-slot-input]').forEach(function (inp) {
      var slot = inp.getAttribute('data-slot-input');
      var drop = document.querySelector('[data-slot-drop="' + slot + '"]');
      if (!drop) return;

      function renderDrop(query) {
        var q = (query || '').toLowerCase().replace(/ё/g, 'е').trim();
        var list = pool;
        if (q) {
          list = pool.filter(function (p) {
            return (p.name + ' ' + p.short).toLowerCase().replace(/ё/g, 'е').indexOf(q) !== -1;
          });
        }
        var used = symUsedKeys(slot);
        list = list.map(function (p) {
          var k = (p.club || '') + '||' + p.name.toLowerCase();
          return { p: p, disabled: !!used[k] };
        });
        list = list.slice(0, 30);

        if (!list.length) {
          drop.innerHTML = '<div class="lfld-ac-empty">Ничего не найдено</div>';
        } else {
          drop.innerHTML = list.map(function (x) {
            var p = x.p;
            var logo = (window.getClubLogoMini && p.club) ? window.getClubLogoMini(p.club) : '';
            return '<div class="lfld-ac-item' + (x.disabled ? ' disabled' : '') + '" ' +
              'data-name="' + escapeAttr(p.name) + '" ' +
              'data-short="' + escapeAttr(p.short) + '" ' +
              'data-club="' + escapeAttr(p.club) + '">' +
              '<span class="ac-name"><strong>' + escapeHtml(p.name) + '</strong></span>' +
              '<span class="ac-club">' + logo + escapeHtml(p.club) + '</span>' +
            '</div>';
          }).join('');
        }

        drop.classList.add('open');
        drop.querySelectorAll('.lfld-ac-item').forEach(function (it) {
          it.onmousedown = function (e) {
            e.preventDefault();
            if (it.classList.contains('disabled')) return;
            symState.slots[slot] = {
              name: it.getAttribute('data-name'),
              short: it.getAttribute('data-short'),
              club: it.getAttribute('data-club')
            };
            renderAdminExtras();
          };
        });
      }

      inp.oninput = function () { renderDrop(this.value); };
      inp.onfocus = function () { renderDrop(this.value); };
      inp.onblur = function () { setTimeout(function () { drop.classList.remove('open'); }, 200); };
    });
  }

  /* ---------- Публичные действия ---------- */
  window.__symChangeTourney = function (tk) {
    symState.tourneyKey = tk;
    var t = tournamentsData[tk];
    var rounds = [];
    if (t && Array.isArray(t.matches)) t.matches.forEach(function (m) { if (m.tour && rounds.indexOf(m.tour) === -1) rounds.push(m.tour); });
    rounds.sort(function (a, b) { return (parseInt((a||'').replace(/\D/g,''))||0) - (parseInt((b||'').replace(/\D/g,''))||0); });
    symState.round = rounds[0] || '1 ТУР';
    symLoadFromStorage(tk, symState.round);
    renderAdminExtras();
  };

  window.__symChangeRound = function (r) {
    symState.round = r;
    symLoadFromStorage(symState.tourneyKey, r);
    renderAdminExtras();
  };

  window.__symClearSlot = function (slot) {
    symState.slots[slot] = { name: '', short: '', club: '' };
    renderAdminExtras();
  };

  window.__symPublish = function () {
    var filled = TOTW_FORMATION.filter(function (f) {
      return symState.slots[f.slot] && symState.slots[f.slot].name;
    });
    if (!filled.length) { alert('Заполните хотя бы одного игрока'); return; }
    symSaveToStorage(symState.tourneyKey, symState.round);
    var st = q('symStatus');
    if (st) { st.className = 'ai-status show ok'; st.innerText = 'Опубликовано: ' + filled.length + ' игроков'; }
    if (window.renderHomeSymbolic) { try { window.renderHomeSymbolic(); } catch(e) {} }
  };

  window.__symClear = function () {
    if (!confirm('Очистить состав сборной тура?')) return;
    symReset();
    symSaveToStorage(symState.tourneyKey, symState.round);
    renderAdminExtras();
    if (window.renderHomeSymbolic) { try { window.renderHomeSymbolic(); } catch(e) {} }
  };

  /* ============================================================
     Далее — все остальные модули админки без изменений
     ============================================================ */

  function escapeAttr(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function escapeHtml(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function q(id) { return document.getElementById(id); }
  function val(id) { var e = q(id); return e ? e.value : ''; }

  /* ============ КЛУБЫ ============ */
  function loadCustomClubs() {
    var list = []; try { list = JSON.parse(localStorage.getItem('ff_custom_clubs') || '[]'); } catch (e) {}
    var changed = false;
    list.forEach(function (c) {
      if (!c || !c.name) return;
      if (!clubsData.find(function (x) { return x.name === c.name; })) { clubsData.push({ name: c.name, logo: c.logo || '⚽' }); changed = true; }
    });
    if (changed && window.renderSidebar) window.renderSidebar();
  }
  function persistNewClub(name, logo) {
    var list = []; try { list = JSON.parse(localStorage.getItem('ff_custom_clubs') || '[]'); } catch (e) {}
    if (!list.find(function (c) { return c.name === name; })) { list.push({ name: name, logo: logo }); localStorage.setItem('ff_custom_clubs', JSON.stringify(list)); }
  }
  function applyBackground() { if (window.bannerManager && window.bannerManager.applyBackground) window.bannerManager.applyBackground(); }

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

  /* ============ ГЛАВНОЕ ФОТО КОМАНДЫ ============ */
  function getClubMainPhotoMap() { try { return JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}'); } catch(e) { return {}; } }
  function setClubMainPhoto(club, url) {
    var d = getClubMainPhotoMap();
    if (url) d[club] = url; else delete d[club];
    localStorage.setItem('ff_club_main_photo', JSON.stringify(d));
  }
  function saveClubMainPhotoFromForm() {
    var club = val('cmpClubSelect'); if (!club) return alert('Выберите клуб');
    var fileInput = q('cmpFileInput'); var urlInput = (val('cmpUrlInput') || '').trim();
    function finish(url) { setClubMainPhoto(club, url); alert('Фото команды сохранено!'); renderAdminExtras(); }
    if (fileInput && fileInput.files && fileInput.files[0]) {
      var f = fileInput.files[0];
      if (!/^image\//.test(f.type)) return alert('Это не изображение');
      compressImage(f, 1920, 0.85, finish);
    } else if (urlInput) { finish(urlInput); }
    else alert('Выберите файл или введите URL');
  }
  function clearClubMainPhoto() {
    var club = val('cmpClubSelect'); if (!club) return alert('Выберите клуб');
    if (!confirm('Удалить главное фото клуба «' + club + '»?')) return;
    setClubMainPhoto(club, ''); renderAdminExtras();
  }
  function renderClubMainPhotoBlock() {
    var clubOpts = clubsData.map(function (c) { return '<option value="' + c.name.replace(/"/g, '&quot;') + '">' + c.name + '</option>'; }).join('');
    var map = getClubMainPhotoMap();
    var selected = clubsData[0] ? clubsData[0].name : '';
    var current = map[selected] || '';
    return '<div class="admin-extras-section"><h3>🖼️ Главное командное фото</h3>' +
      '<p>Большая фотография на странице команды.</p>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Клуб:</label><select id="cmpClubSelect" onchange="window.__cmpOnChange()">' + clubOpts + '</select></div>' +
        '<div class="form-group"><label>Текущее фото:</label><div id="cmpCurrentPreview">' +
          (current ? '<img src="' + current + '" style="width:180px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;">' : '<span style="color:#64748b;font-style:italic;font-size:12px;">Не загружено</span>') +
        '</div></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Загрузить файл:</label><input type="file" id="cmpFileInput" accept="image/*"></div>' +
        '<div class="form-group"><label>Или вставить URL:</label><input type="text" id="cmpUrlInput" placeholder="https://..."></div>' +
      '</div>' +
      '<div class="ai-actions"><button type="button" class="btn-success" onclick="window.__cmpSave()">Сохранить фото</button>' +
      '<button type="button" class="btn-danger" onclick="window.__cmpClear()">Удалить фото</button></div>' +
      '</div>';
  }
  window.__cmpOnChange = function () {
    var club = val('cmpClubSelect');
    var map = getClubMainPhotoMap();
    var prev = q('cmpCurrentPreview'); if (!prev) return;
    var url = map[club] || '';
    prev.innerHTML = url ? '<img src="' + url + '" style="width:180px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;">' : '<span style="color:#64748b;font-style:italic;font-size:12px;">Не загружено</span>';
  };
  window.__cmpSave = saveClubMainPhotoFromForm;
  window.__cmpClear = clearClubMainPhoto;

  /* ============ РЕЕСТР ИГРОКОВ (компактный) ============ */
  function renderPlayersRegistryBlock() {
    var total = DB ? Object.keys(DB.players()).length : 0;
    var isOpen = playerRegistryOpen;
    var body = '';
    if (isOpen) {
      body = '<div class="form-row" style="margin-top:14px;">' +
        '<div class="form-group"><label>Поиск:</label><input type="text" id="playerSearchInput" value="' + escapeHtml(playerSearchQuery) + '" placeholder="Санатуллин..." oninput="window.__playerSearch(this.value)"></div>' +
        '<div class="form-group"><label>Фильтр по клубу:</label><select id="playerFilterClubSelect" onchange="window.__playerFilterClub(this.value)">' +
          '<option value="">— все клубы —</option>' +
          clubsData.map(function(c){ return '<option value="' + escapeHtml(c.name) + '"' + (playerFilterClub === c.name ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'; }).join('') +
        '</select></div></div>' +
        '<div id="playersRegistryList">' + renderPlayersList() + '</div>' +
        '<div id="peEditorWrap"></div>';
    }
    return '<div class="admin-extras-section">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<h3 style="margin:0;">👥 Реестр игроков <span style="color:#64748b;font-weight:400;">(' + total + ')</span></h3>' +
        '<button type="button" class="registry-toggle-btn" onclick="window.__togglePlayerRegistry()">' +
          (isOpen ? '▲ Свернуть' : '▼ Развернуть реестр') +
        '</button>' +
      '</div>' +
      (isOpen ? '' : '<p style="margin-top:8px;">Свёрнут. Нажмите «Развернуть реестр», чтобы искать, редактировать и загружать фото игроков.</p>') +
      body + '</div>';
  }
  window.__togglePlayerRegistry = function () { playerRegistryOpen = !playerRegistryOpen; renderAdminExtras(); };
  window.__playerFilterClub = function (v) { playerFilterClub = v || ''; var listEl = q('playersRegistryList'); if (listEl) listEl.innerHTML = renderPlayersList(); };

  function renderPlayersList() {
    if (!DB) return '<p style="color:#64748b">Модуль database.js не загружен</p>';
    var all = DB.players();
    var list = Object.keys(all).map(function (id) { return all[id]; });
    var qq = playerSearchQuery.toLowerCase().replace(/ё/g, 'е').trim();
    if (qq) {
      list = list.filter(function (p) {
        var s = (p.lastName + ' ' + p.firstName + ' ' + p.middleName).toLowerCase().replace(/ё/g, 'е');
        if (s.indexOf(qq) !== -1) return true;
        return (p.aliases || []).some(function (a) { return a.toLowerCase().indexOf(qq) !== -1; });
      });
    }
    if (playerFilterClub) list = list.filter(function (p) { return (p.clubs || []).indexOf(playerFilterClub) !== -1; });
    list.sort(function (a, b) { return (a.lastName || '').localeCompare(b.lastName || ''); });
    if (!list.length) return '<p style="color:#64748b;font-style:italic;padding:20px;">Никого не найдено</p>';
    var html = '<table class="roster-table"><thead><tr>' +
      '<th style="width:50px;">Фото</th><th class="text-left">ФИО</th>' +
      '<th style="width:90px;">Дата рожд.</th><th style="width:70px;">Позиция</th>' +
      '<th style="width:60px;">Голы</th><th style="width:60px;">Игры</th><th style="width:60px;">Нагр.</th>' +
      '<th style="width:200px;"></th></tr></thead><tbody>';
    list.slice(0, 200).forEach(function (p) {
      var fio = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
      var photoHtml = p.photo
        ? '<img src="' + p.photo + '" style="width:36px;height:44px;object-fit:cover;border-radius:4px;">'
        : '<div style="width:36px;height:44px;border-radius:4px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px;opacity:0.5;">👤</div>';
      html += '<tr>' +
        '<td>' + photoHtml + '</td>' +
        '<td class="text-left"><strong>' + escapeHtml(fio) + '</strong></td>' +
        '<td>' + (p.birthDate || '—') + '</td>' +
        '<td><span class="pos-badge pos-' + (p.position || 'УНИ').toLowerCase() + '">' + (p.position || 'УНИ') + '</span></td>' +
        '<td>' + (p.stats.goals || 0) + '</td>' +
        '<td>' + (p.stats.matches || 0) + '</td>' +
        '<td>' + ((p.awards || []).length) + '</td>' +
        '<td><button type="button" onclick="window.__editPlayer(\'' + p.id + '\')">Ред.</button> ' +
        '<button type="button" class="award-give-btn" onclick="window.__giveAward(\'' + p.id + '\')">🏆 Награда</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  window.__playerSearch = function (v) { playerSearchQuery = v || ''; var listEl = q('playersRegistryList'); if (listEl) listEl.innerHTML = renderPlayersList(); };

  window.__giveAward = function (playerId) {
    var p = DB.getPlayer(playerId); if (!p) return;
    var fio = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
    var presets = [
      'Лучший молодой игрок (Первенство 5х5)',
      'Лучший бомбардир (Кубок ЛФЛД 5х5)',
      'Лучший игрок (Первенство 5х5)',
      'Лучший защитник (Первенство 5х5)',
      'Лучший вратарь (Первенство 5х5)',
      'Победитель Кубка ЛФЛД 5х5',
      'Финалист Кубка ЛФЛД 5х5',
      'Символическая сборная тура (Ночная лига 8х8, 1 тур)'
    ];
    var chosen = prompt('Введите награду для ' + fio + ':\n\nПодсказки:\n- ' + presets.join('\n- '), p.awards && p.awards.length ? '' : presets[0]);
    if (!chosen || !chosen.trim()) return;
    DB.awardPlayer(playerId, chosen.trim());
    alert('Награда вручена!');
    var listEl = q('playersRegistryList'); if (listEl) listEl.innerHTML = renderPlayersList();
  };

  window.__editPlayer = function (playerId) {
    var p = DB.getPlayer(playerId); if (!p) return;
    playerEditState.playerId = playerId;
    var fio = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
    var awards = (p.awards || []).map(function (a, i) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:6px 10px;border-radius:6px;margin-bottom:4px;">' +
        '<span>🏆 ' + escapeHtml(a) + '</span>' +
        '<button type="button" class="btn-danger" style="padding:2px 8px!important;font-size:11px;" onclick="window.__removeAward(\'' + escapeAttr(playerId) + '\',' + i + ')">✕</button></div>';
    }).join('') || '<p style="color:#64748b;font-style:italic;font-size:12px;">Наград нет</p>';
    var html = '';
    html += '<div class="form-row"><div class="form-group"><label>Фамилия</label><input type="text" id="peLastName" value="' + escapeHtml(p.lastName) + '"></div>' +
      '<div class="form-group"><label>Имя</label><input type="text" id="peFirstName" value="' + escapeHtml(p.firstName || '') + '"></div>' +
      '<div class="form-group"><label>Отчество</label><input type="text" id="peMiddleName" value="' + escapeHtml(p.middleName || '') + '"></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Дата рождения</label><input type="text" id="peBirth" value="' + escapeHtml(p.birthDate || '') + '"></div>' +
      '<div class="form-group"><label>Позиция</label><select id="pePos">' +
        ['ВРТ','ЗАЩ','ПЗ','НАП','УНИ'].map(function (x) { return '<option value="' + x + '"' + (p.position === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
      '</select></div></div>';
    html += '<div class="form-group"><label>Фото игрока (3:4)</label><div style="display:flex;gap:14px;align-items:center;">' +
      '<div id="pePhotoPreview" style="width:90px;height:120px;border-radius:8px;overflow:hidden;background:#f1f5f9;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;">' +
        (p.photo ? '<img src="' + p.photo + '" style="width:100%;height:100%;object-fit:cover;">' : '<span style="font-size:34px;opacity:0.4;">👤</span>') +
      '</div><div style="flex:1;"><input type="file" id="pePhotoFile" accept="image/*"><button type="button" class="btn-danger" style="margin-top:8px;padding:5px 12px!important;font-size:11px;" onclick="window.__clearPlayerPhoto(\'' + escapeAttr(playerId) + '\')">Удалить фото</button></div></div></div>';
    html += '<div class="form-group"><label>Алиасы (по одному в строке)</label><textarea id="peAliases" rows="3">' + escapeHtml((p.aliases || []).join('\n')) + '</textarea></div>';
    html += '<div class="form-group"><label>Награды</label><div>' + awards + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><input type="text" id="peNewAward" placeholder="Лучший бомбардир">' +
      '<button type="button" class="btn-success" style="white-space:nowrap;" onclick="window.__addAward(\'' + escapeAttr(playerId) + '\')">+ Добавить</button></div></div>';
    html += '<div class="ai-actions" style="margin-top:20px;"><button type="button" class="btn-success" onclick="window.__savePlayer()">💾 Сохранить</button> ' +
      '<button type="button" class="btn-secondary" onclick="window.__closePlayerEditor()">Отмена</button></div>';
    var wrap = q('peEditorWrap'); if (!wrap) return;
    wrap.innerHTML = '<div class="admin-extras-section" style="margin-top:16px;"><h3>✏️ Редактирование: ' + escapeHtml(fio) + '</h3>' + html + '</div>';
    var pf = q('pePhotoFile');
    if (pf) pf.onchange = function () {
      var f = this.files[0]; if (!f) return;
      compressImage(f, 400, 0.85, function (dataUrl) {
        DB.updatePlayer(playerId, { photo: dataUrl });
        var prev = q('pePhotoPreview'); if (prev) prev.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover;">';
      });
    };
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.__closePlayerEditor = function () { var wrap = q('peEditorWrap'); if (wrap) wrap.innerHTML = ''; playerEditState.playerId = null; };
  window.__savePlayer = function () {
    var id = playerEditState.playerId; if (!id || !DB.getPlayer(id)) return;
    var aliases = val('peAliases').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    DB.updatePlayer(id, {
      lastName: val('peLastName').trim(), firstName: val('peFirstName').trim(),
      middleName: val('peMiddleName').trim(), birthDate: val('peBirth').trim(),
      position: val('pePos'), aliases: aliases
    });
    alert('Сохранено'); renderAdminExtras();
  };
  window.__clearPlayerPhoto = function (id) {
    if (!confirm('Удалить фото?')) return;
    DB.updatePlayer(id, { photo: '' });
    var prev = q('pePhotoPreview'); if (prev) prev.innerHTML = '<span style="font-size:34px;opacity:0.4;">👤</span>';
  };
  window.__addAward = function (id) {
    var v = val('peNewAward').trim(); if (!v) return;
    DB.awardPlayer(id, v); window.__editPlayer(id);
  };
  window.__removeAward = function (id, idx) {
    var p = DB.getPlayer(id); if (!p) return;
    p.awards.splice(idx, 1); DB.save(); window.__editPlayer(id);
  };

  /* ============ ФОТО КЛУБОВ ============ */
  function uploadTeamPhotos() {
    var club = val('photoClubSelect'); var tourney = val('photoTourneySelect'); var caption = val('photoCaption');
    var input = q('teamPhotosInput');
    if (!club) return alert('Выберите клуб');
    if (!input || !input.files.length) return alert('Выберите фотографии');
    if (!window.teamPhotos) window.teamPhotos = {};
    if (!window.teamPhotos[club]) window.teamPhotos[club] = [];
    var files = Array.from(input.files); var done = 0, added = 0;
    files.forEach(function (f) {
      if (!/^image\//.test(f.type)) { done++; return; }
      compressImage(f, 1600, 0.8, function (dataUrl) {
        window.teamPhotos[club].push({ url: dataUrl, tourney: tourney, caption: caption });
        added++; done++;
        if (done === files.length) {
          if (window.saveTeamPhotos) window.saveTeamPhotos();
          alert('Загружено фото: ' + added);
          input.value = '';
          var capEl = q('photoCaption'); if (capEl) capEl.value = '';
          renderAdminExtras();
        }
      });
    });
  }
  function deleteTeamPhoto(club, idx) {
    if (!confirm('Удалить фото?')) return;
    if (window.teamPhotos && window.teamPhotos[club]) {
      window.teamPhotos[club].splice(idx, 1);
      if (window.teamPhotos[club].length === 0) delete window.teamPhotos[club];
      if (window.saveTeamPhotos) window.saveTeamPhotos();
      renderAdminExtras();
    }
  }
  window.__deleteTeamPhoto = deleteTeamPhoto;

  /* ============ AI ПАРСИНГ ============ */
  function normalizeName(s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9\s\-]/gi, '').replace(/\s+/g, ' ').trim(); }
  function cleanPlayerName(raw) {
    var s = String(raw || '');
    s = s.replace(/^\s*\d+\s*[.)\-–—:]\s*/, '').replace(/^\s*[\-–—•*·>]+\s*/, '');
    s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
    s = s.replace(/\b(вратарь|защитник|полузащитник|нападающий|капитан|в[рк]|гк|цз|лз|пз|цп|лп|пп|нп|gk|df|mf|fw|к)\b\.?/gi, ' ');
    s = s.replace(/[\-–—:;,.]+$/g, '').replace(/\s+/g, ' ').trim();
    s = s.replace(/[^а-яa-z\s\-]/gi, '').trim();
    if (!s || s.length < 3) return '';
    if (!/[а-яa-z]/i.test(s)) return '';
    return s.split(/\s+/).map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''; }).filter(Boolean).join(' ');
  }
  function findClubInLine(line) {
    var clean = line.trim(); if (!clean) return null;
    var nLine = normalizeName(clean);
    for (var i = 0; i < clubsData.length; i++) {
      var nName = normalizeName(clubsData[i].name); if (!nName) continue;
      var re = new RegExp('(^|[^а-яa-z0-9])' + nName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '([^а-яa-z0-9]|$)', 'i');
      if (re.test(nLine)) return clubsData[i].name;
    }
    var mQ = clean.match(/[«"]([^»"]+)[»"]/); if (mQ) { var c1 = mQ[1].trim(); if (c1 && c1.length >= 2 && c1.length <= 30) return c1; }
    return null;
  }
  function isTitleLine(line) {
    var clean = line.trim(); if (!clean) return false; if (clean.length > 80) return false;
    if (/^(фк|команда|клуб|состав|заявка)\s*[:\-—]/i.test(clean)) return true;
    var nLine = normalizeName(clean);
    for (var i = 0; i < clubsData.length; i++) { if (nLine === normalizeName(clubsData[i].name)) return true; }
    var m = clean.match(/^[«"]([^»"]+)[»"]\s*:?\s*$/); if (m && m[1].trim().length >= 2) return true;
    return false;
  }
  function parseAiRoster(text) {
    var lines = text.split(/\r?\n/); var groups = []; var current = null;
    lines.forEach(function (rawLine) {
      var line = rawLine.trim(); if (!line) return;
      if (isTitleLine(line)) {
        var clubName = findClubInLine(line);
        if (clubName) { current = { club: clubName, players: [] }; groups.push(current); return; }
      }
      if (!current) { current = { club: '— не указано —', players: [] }; groups.push(current); }
      line.split(/[,;]+/).forEach(function (p) { var c = cleanPlayerName(p); if (c && c.length >= 3) current.players.push(c); });
    });
    return groups.filter(function (g) { return g.players.length > 0; });
  }
  function openRosterPreview(tourneyKey, groups) {
    var html = ''; var total = 0;
    groups.forEach(function (g) { total += g.players.length; });
    html += '<div class="rp-stats"><div class="rp-stat">Всего: <strong>' + total + '</strong></div></div>';
    groups.forEach(function (g, gi) {
      html += '<div class="rp-club-block" data-gi="' + gi + '">';
      html += '<div class="rp-club-header"><div class="rp-club-name">' + g.club + '</div><div class="rp-club-count">' + g.players.length + '</div></div>';
      g.players.forEach(function (p, pi) {
        html += '<div class="rp-player-row" data-gi="' + gi + '" data-pi="' + pi + '"><div class="rp-player-num">' + (pi + 1) + '</div><input type="text" class="rp-player-name" value="' + p.replace(/"/g, '&quot;') + '"><button type="button" class="rp-delete-btn" onclick="this.parentElement.remove()">✕</button></div>';
      });
      html += '</div>';
    });
    var bodyEl = q('rpBody'); if (bodyEl) bodyEl.innerHTML = html;
    var subEl = q('rpSubtitle'); if (subEl) subEl.innerText = 'Турнир: ' + tournamentsData[tourneyKey].title;
    var mEl = q('rosterPreviewModal'); if (mEl) mEl.style.display = 'flex';
  }
  function closeRosterPreview() { var m = q('rosterPreviewModal'); if (m) m.style.display = 'none'; }
  function saveRosterPreview() {
    var tk = val('aiTourney');
    var blocks = document.querySelectorAll('#rpBody .rp-club-block');
    var count = 0;
    blocks.forEach(function (b) {
      var clubEl = b.querySelector('.rp-club-name');
      var club = clubEl ? clubEl.innerText.trim() : '';
      if (!club) return;
      b.querySelectorAll('.rp-player-row').forEach(function (r) {
        var inp = r.querySelector('.rp-player-name'); if (!inp) return;
        var name = inp.value.trim(); if (!name) return;
        DB.addToRoster(tk, club, name, {}); count++;
      });
    });
    alert('Сохранено игроков: ' + count); closeRosterPreview();
    if (window.renderTourney) window.renderTourney();
  }
  function runAiParse() {
    var tk = val('aiTourney'); var text = val('aiTextarea').trim();
    var statusEl = q('aiStatus');
    function show(msg, ok) { if (!statusEl) return; statusEl.className = 'ai-status show ' + (ok ? 'ok' : 'err'); statusEl.innerText = msg; }
    if (!tk) return show('Выберите турнир', false);
    if (!text) return show('Вставьте текст', false);
    var groups = parseAiRoster(text);
    if (!groups.length) return show('Не удалось распознать', false);
    var total = groups.reduce(function (s, g) { return s + g.players.length; }, 0);
    groups.forEach(function (g) {
      if (!clubsData.find(function (c) { return c.name === g.club; }) && g.club !== '— не указано —') { clubsData.push({ name: g.club, logo: '⚽' }); persistNewClub(g.club, '⚽'); }
    });
    if (window.renderSidebar) window.renderSidebar();
    show('Распознано: ' + groups.length + ' команд, ' + total + ' игроков', true);
    openRosterPreview(tk, groups);
  }

  /* ============ РОСТЕР ============ */
  function getRosterOfClub(tk, club) {
    if (!club) return [];
    var result = [];
    if (DB) {
      var list = DB.getRoster(tk, club);
      list.forEach(function (r) {
        var p = DB.getPlayer(r.playerId); if (!p) return;
        result.push({
          playerId: p.id,
          name: [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
          short: [p.lastName, p.firstName ? p.firstName[0] + '.' : ''].filter(Boolean).join(' '),
          num: r.num || '', pos: r.pos || 'УНИ'
        });
      });
    }
    if (!result.length && TR) {
      (TR.get(club) || []).forEach(function (p) {
        var name = typeof p === 'string' ? p : p.name; if (!name) return;
        result.push({ playerId: null, name: name, short: name, num: typeof p === 'string' ? '' : (p.num || ''), pos: typeof p === 'string' ? 'УНИ' : (p.pos || 'УНИ') });
      });
    }
    return result.sort(function (a, b) { return (a.short || '').localeCompare(b.short || ''); });
  }

  /* ============ ПРОТОКОЛ МАТЧА ============ */
  function syncGoalsToScore(arr, n) {
    n = Math.max(0, parseInt(n) || 0);
    while (arr.length < n) arr.push({ playerId: null, player: '', assistId: null, assist: '', minute: '', type: 'goal' });
    while (arr.length > n) arr.pop();
  }
  function switchMrTab(tab) {
    mrState.tab = tab;
    var tabA = q('mrTabAttendance'); var tabE = q('mrTabEvents');
    if (tabA) tabA.className = 'mr-tab' + (tab === 'attendance' ? ' active' : '');
    if (tabE) tabE.className = 'mr-tab' + (tab === 'events' ? ' active' : '');
    var pA = q('mrPanelAttendance'); var pE = q('mrPanelEvents');
    if (pA) pA.style.display = tab === 'attendance' ? 'block' : 'none';
    if (pE) pE.style.display = tab === 'events' ? 'block' : 'none';
  }
  function openMatchResult(tk, idx) {
    var t = tournamentsData[tk]; if (!t || !t.matches[idx]) return;
    var m = t.matches[idx];
    mrState.tourneyKey = tk; mrState.matchId = idx;
    mrState.t1 = m.t1; mrState.t2 = m.t2; mrState.activeTeam = 1;
    mrState.goals1 = []; mrState.goals2 = []; mrState.cards = [];
    mrState.tab = 'attendance';
    (m.events || []).forEach(function (e) {
      if (e.type === 'goal') {
        var arr = (e.club === m.t1) ? mrState.goals1 : mrState.goals2;
        arr.push({ playerId: e.playerId || null, player: e.player || '', assistId: e.assistId || null, assist: e.assist || '', minute: e.minute || '', type: e.ownGoal ? 'own' : (e.penalty ? 'penalty' : 'goal') });
      } else {
        mrState.cards.push({ playerId: e.playerId || null, player: e.player || '', club: e.club, type: e.type === 'red' ? 'red' : 'yellow', minute: e.minute || '' });
      }
    });
    var att = DB.getAttendance(tk, m.id || ('match_' + idx));
    mrState.attendance1 = []; mrState.attendance2 = [];
    if (att.length) {
      att.forEach(function (pid) {
        var p = DB.getPlayer(pid); if (!p) return;
        if ((p.clubs || []).indexOf(m.t1) !== -1) mrState.attendance1.push(pid);
        if ((p.clubs || []).indexOf(m.t2) !== -1) mrState.attendance2.push(pid);
      });
    }
    var t1L = q('mrTeam1Label'); if (t1L) t1L.innerText = m.t1;
    var t2L = q('mrTeam2Label'); if (t2L) t2L.innerText = m.t2;
    var t1N = q('mrTab1Name'); if (t1N) t1N.innerText = m.t1;
    var t2N = q('mrTab2Name'); if (t2N) t2N.innerText = m.t2;
    var dEl = q('mrDate'); if (dEl) dEl.value = m.date || '';
    var sEl = q('mrStadium'); if (sEl) sEl.value = m.stadium || '';
    var stEl = q('mrStatus'); if (stEl) stEl.value = m.status || 'finished';
    var sc1 = q('mrScore1'); if (sc1) sc1.value = m.s1 || 0;
    var sc2 = q('mrScore2'); if (sc2) sc2.value = m.s2 || 0;
    syncGoalsToScore(mrState.goals1, m.s1 || 0);
    syncGoalsToScore(mrState.goals2, m.s2 || 0);
    switchMrTab('attendance');
    renderMrAttendance(); renderMrCards(); validateMr();
    var modal = q('matchResultModal'); if (modal) modal.style.display = 'flex';
  }
  function renderMrAttendance() {
    var wrap = q('mrAttendancePanel'); if (!wrap) return;
    var team1 = getRosterOfClub(mrState.tourneyKey, mrState.t1);
    var team2 = getRosterOfClub(mrState.tourneyKey, mrState.t2);
    function renderCol(list, arr, tn) {
      if (!list.length) return '<p style="color:#64748b;font-style:italic;font-size:12px;">В заявке нет игроков.</p>';
      return list.map(function (p) {
        var checked = arr.indexOf(p.playerId) !== -1 ? ' checked' : '';
        return '<label class="attendance-row"><input type="checkbox" data-team="' + (tn === mrState.t1 ? '1' : '2') + '" data-pid="' + escapeAttr(p.playerId || '') + '"' + checked + '><span class="num">' + (p.num ? '#' + p.num : '') + '</span><span class="name">' + escapeHtml(p.short || p.name) + '</span><span class="pos-mini"><span class="pos-badge pos-' + (p.pos || 'УНИ').toLowerCase() + '">' + p.pos + '</span></span></label>';
      }).join('');
    }
    wrap.innerHTML = '<div class="attendance-grid"><div class="attendance-col"><h5>' + escapeHtml(mrState.t1) + '</h5>' + renderCol(team1, mrState.attendance1, mrState.t1) + '</div><div class="attendance-col"><h5>' + escapeHtml(mrState.t2) + '</h5>' + renderCol(team2, mrState.attendance2, mrState.t2) + '</div></div>';
    wrap.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.onchange = function () {
        var pid = cb.getAttribute('data-pid'); var team = cb.getAttribute('data-team');
        if (!pid) return;
        var arr = team === '1' ? mrState.attendance1 : mrState.attendance2;
        var idx2 = arr.indexOf(pid);
        if (cb.checked) { if (idx2 === -1) arr.push(pid); }
        else { if (idx2 !== -1) arr.splice(idx2, 1); }
      };
    });
  }
  function getAttendedPlayers(team) {
    var arr = team === 1 ? mrState.attendance1 : mrState.attendance2;
    var teamName = team === 1 ? mrState.t1 : mrState.t2;
    var all = getRosterOfClub(mrState.tourneyKey, teamName);
    return all.filter(function (p) { return !p.playerId || arr.indexOf(p.playerId) !== -1; });
  }
  function renderMrGoals() {
    var panel = q('mrGoalsPanel'); if (!panel) return;
    var arr = mrState.activeTeam === 1 ? mrState.goals1 : mrState.goals2;
    var roster = getAttendedPlayers(mrState.activeTeam);
    if (!arr.length) { panel.innerHTML = '<div class="mr-empty">Голов нет.</div>'; return; }
    var html = '<div class="mr-goals-panel">';
    arr.forEach(function (g, i) {
      var isOwn = g.type === 'own', isPen = g.type === 'penalty';
      var playerOpts;
      if (isOwn) playerOpts = '<option value="__own__" selected>Автогол соперника</option>';
      else playerOpts = '<option value="">— игрок —</option>' + roster.map(function (p) {
        var v = p.playerId || p.name;
        var sel = (g.playerId === p.playerId || (!g.playerId && g.player === p.name)) ? ' selected' : '';
        return '<option value="' + escapeAttr(v) + '"' + sel + '>' + escapeHtml(p.short || p.name) + '</option>';
      }).join('');
      var assistOpts = '<option value="">— без ассиста —</option>' + roster.map(function (p) {
        var v = p.playerId || p.name;
        var sel = (g.assistId === p.playerId || (!g.assistId && g.assist === p.name)) ? ' selected' : '';
        return '<option value="' + escapeAttr(v) + '"' + sel + '>' + escapeHtml(p.short || p.name) + '</option>';
      }).join('');
      html += '<div class="mr-goal-slot"><div class="mr-goal-num">' + (i + 1) + '</div>' +
        '<select onchange="window.__mrGoalPlayer(' + i + ',this.value)">' + playerOpts + '</select>' +
        '<select onchange="window.__mrGoalAssist(' + i + ',this.value)"' + (isOwn ? ' disabled' : '') + '>' + assistOpts + '</select>' +
        '<select onchange="window.__mrGoalType(' + i + ',this.value)"><option value="goal"' + (g.type === 'goal' ? ' selected' : '') + '>Гол</option><option value="penalty"' + (isPen ? ' selected' : '') + '>Пенальти</option><option value="own"' + (isOwn ? ' selected' : '') + '>Автогол</option></select>' +
        '<input type="text" class="mr-minute" placeholder="мин." value="' + (g.minute || '') + '" oninput="window.__mrGoalMinute(' + i + ',this.value)"></div>';
    });
    html += '</div>';
    panel.innerHTML = html;
  }
  window.__mrGoalPlayer = function (i, v) {
    var arr = mrState.activeTeam === 1 ? mrState.goals1 : mrState.goals2; if (!arr[i]) return;
    var roster = getAttendedPlayers(mrState.activeTeam);
    var found = roster.find(function (p) { return (p.playerId || p.name) === v; });
    if (found) { arr[i].playerId = found.playerId || null; arr[i].player = found.name; }
    else { arr[i].playerId = null; arr[i].player = ''; }
  };
  window.__mrGoalAssist = function (i, v) {
    var arr = mrState.activeTeam === 1 ? mrState.goals1 : mrState.goals2; if (!arr[i]) return;
    var roster = getAttendedPlayers(mrState.activeTeam);
    var found = roster.find(function (p) { return (p.playerId || p.name) === v; });
    if (found) { arr[i].assistId = found.playerId || null; arr[i].assist = found.name; }
    else { arr[i].assistId = null; arr[i].assist = ''; }
  };
  window.__mrGoalType = function (i, v) { var arr = mrState.activeTeam === 1 ? mrState.goals1 : mrState.goals2; if (arr[i]) arr[i].type = v; renderMrGoals(); };
  window.__mrGoalMinute = function (i, v) { var arr = mrState.activeTeam === 1 ? mrState.goals1 : mrState.goals2; if (arr[i]) arr[i].minute = v; };

  function renderMrCards() {
    var container = q('mrCardsList'); if (!container) return;
    if (!mrState.cards.length) { container.innerHTML = '<div class="mr-empty">Карточек нет</div>'; return; }
    var html = '';
    mrState.cards.forEach(function (c, i) {
      var team = (c.club === mrState.t1) ? 1 : 2;
      var roster = getAttendedPlayers(team);
      var playerOpts = '<option value="">— игрок —</option>' + roster.map(function (p) {
        var v = p.playerId || p.name;
        var sel = (c.playerId === p.playerId || (!c.playerId && c.player === p.name)) ? ' selected' : '';
        return '<option value="' + escapeAttr(v) + '"' + sel + '>' + escapeHtml(p.short || p.name) + '</option>';
      }).join('');
      var clubOpts = '<option value="' + mrState.t1 + '"' + (c.club === mrState.t1 ? ' selected' : '') + '>' + mrState.t1 + '</option><option value="' + mrState.t2 + '"' + (c.club === mrState.t2 ? ' selected' : '') + '>' + mrState.t2 + '</option>';
      html += '<div class="mr-card-row"><div class="mr-card-type ' + c.type + '">●</div>' +
        '<select onchange="window.__mrCardClub(' + i + ',this.value)">' + clubOpts + '</select>' +
        '<select onchange="window.__mrCardPlayer(' + i + ',this.value)">' + playerOpts + '</select>' +
        '<input type="text" placeholder="мин." value="' + (c.minute || '') + '" oninput="window.__mrCardMinute(' + i + ',this.value)">' +
        '<button type="button" class="mr-del" onclick="window.__mrCardDelete(' + i + ')">✕</button></div>';
    });
    container.innerHTML = html;
  }
  window.__mrCardClub = function (i, v) { if (mrState.cards[i]) { mrState.cards[i].club = v; mrState.cards[i].playerId = null; mrState.cards[i].player = ''; } renderMrCards(); };
  window.__mrCardPlayer = function (i, v) {
    if (!mrState.cards[i]) return;
    var c = mrState.cards[i];
    var team = (c.club === mrState.t1) ? 1 : 2;
    var roster = getAttendedPlayers(team);
    var found = roster.find(function (p) { return (p.playerId || p.name) === v; });
    if (found) { c.playerId = found.playerId || null; c.player = found.name; }
  };
  window.__mrCardMinute = function (i, v) { if (mrState.cards[i]) mrState.cards[i].minute = v; };
  window.__mrCardDelete = function (i) { mrState.cards.splice(i, 1); renderMrCards(); };
  function addMrCard() { if (!mrState.tourneyKey) return; mrState.cards.push({ playerId: null, player: '', club: mrState.t1, type: 'yellow', minute: '' }); renderMrCards(); }
  function validateMr() {
    var el = q('mrValidation'); if (!el) return true;
    var s1 = parseInt(val('mrScore1')) || 0;
    var s2 = parseInt(val('mrScore2')) || 0;
    var g1 = mrState.goals1.filter(function (g) { return g.player; }).length;
    var g2 = mrState.goals2.filter(function (g) { return g.player; }).length;
    var msg = '', ok = true;
    if (g1 !== s1) { msg += 'Голы ' + mrState.t1 + ': ' + g1 + '/' + s1 + '. '; ok = false; }
    if (g2 !== s2) { msg += 'Голы ' + mrState.t2 + ': ' + g2 + '/' + s2 + '. '; ok = false; }
    if (ok) msg = 'Все голы распределены.';
    el.className = 'mr-validation show ' + (ok ? 'ok' : 'err');
    el.innerText = msg; return ok;
  }
  function buildScorersText() {
    var goals = {}, cards = {};
    function addG(c, n) { if (!n) return; if (!goals[c]) goals[c] = []; goals[c].push(n); }
    mrState.goals1.forEach(function (g) { if (g.type === 'own') addG(mrState.t2, g.player); else addG(mrState.t1, g.player); });
    mrState.goals2.forEach(function (g) { if (g.type === 'own') addG(mrState.t1, g.player); else addG(mrState.t2, g.player); });
    mrState.cards.forEach(function (c) { if (!cards[c.club]) cards[c.club] = { y: [], r: [] }; if (c.type === 'red') cards[c.club].r.push(c.player); else cards[c.club].y.push(c.player); });
    var all = {}; Object.keys(goals).forEach(function (c) { all[c] = 1; }); Object.keys(cards).forEach(function (c) { all[c] = 1; });
    var parts = [];
    Object.keys(all).forEach(function (club) {
      var line = club + ': ';
      var gg = goals[club] || []; var cnt = {};
      gg.forEach(function (p) { if (p) cnt[p] = (cnt[p] || 0) + 1; });
      var gs = Object.keys(cnt).map(function (p) { return cnt[p] > 1 ? p + ' (' + cnt[p] + ')' : p; }).join(', ');
      line += gs || '—';
      if (cards[club]) {
        var cs = [];
        if (cards[club].y.length) cs.push(cards[club].y.join(', '));
        if (cards[club].r.length) cs.push('КК: ' + cards[club].r.join(', '));
        if (cs.length) line += ', ЖК: ' + cs.join(', ');
      }
      parts.push(line);
    });
    return parts.join('; ');
  }
  function saveMatchResult() {
    var tk = mrState.tourneyKey; var idx = mrState.matchId;
    if (!tournamentsData[tk]) return;
    var s1 = parseInt(val('mrScore1')) || 0;
    var s2 = parseInt(val('mrScore2')) || 0;
    syncGoalsToScore(mrState.goals1, s1); syncGoalsToScore(mrState.goals2, s2);
    var m = tournamentsData[tk].matches[idx];
    m.s1 = s1; m.s2 = s2;
    m.date = val('mrDate'); m.stadium = val('mrStadium'); m.status = val('mrStatus');
    m.played = (m.status === 'finished' || s1 > 0 || s2 > 0);
    var events = [];
    mrState.goals1.forEach(function (g) { events.push({ type: 'goal', club: mrState.t1, playerId: g.playerId, player: g.player, assistId: g.assistId, assist: g.assist, minute: g.minute, penalty: g.type === 'penalty', ownGoal: g.type === 'own' }); });
    mrState.goals2.forEach(function (g) { events.push({ type: 'goal', club: mrState.t2, playerId: g.playerId, player: g.player, assistId: g.assistId, assist: g.assist, minute: g.minute, penalty: g.type === 'penalty', ownGoal: g.type === 'own' }); });
    mrState.cards.forEach(function (c) { events.push({ type: c.type, club: c.club, playerId: c.playerId, player: c.player, minute: c.minute }); });
    m.scorers = buildScorersText();
    m.events = events;
    DB.setAttendance(tk, m.id || ('match_' + idx), mrState.attendance1.concat(mrState.attendance2));
    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    if (window.renderTourney) window.renderTourney();
    if (window.updateDynamicTabs) window.updateDynamicTabs();
    var modal = q('matchResultModal'); if (modal) modal.style.display = 'none';
    alert('Протокол сохранён!');
  }

  /* ============ КОНСТРУКТОР РАСПИСАНИЯ ============ */
  function renderFixtureBlock() {
    var opts = Object.keys(tournamentsData).map(function (k) { return '<option value="' + k + '">' + tournamentsData[k].title + '</option>'; }).join('');
    return '<div class="admin-extras-section"><h3>Конструктор расписания</h3>' +
      '<div class="form-row"><div class="form-group"><label>Турнир:</label><select id="fbTourney">' + opts + '</select></div>' +
      '<div class="form-group"><label>Тур:</label><input type="text" id="fbTour" placeholder="1 ТУР"></div>' +
      '<div class="form-group"><label>Дата:</label><input type="text" id="fbDate" placeholder="08.06.2026 19:00"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Команда 1:</label><select id="fbT1"></select></div>' +
      '<div class="form-group"><label>Команда 2:</label><select id="fbT2"></select></div></div>' +
      '<div style="margin-top:14px;"><button type="button" id="fbAddPairBtn" class="btn-success">Назначить</button></div>' +
      '<div class="fixture-list" id="fbList"></div></div>';
  }
  function renderFbList() {
    var tk = val('fbTourney'); var c = q('fbList');
    if (!c || !tournamentsData[tk]) return;
    var matches = (tournamentsData[tk].matches || []).slice().reverse();
    if (!matches.length) { c.innerHTML = '<p style="margin-top:10px;">Матчей пока нет</p>'; return; }
    var html = '';
    matches.forEach(function (m, i) {
      var realIdx = tournamentsData[tk].matches.length - 1 - i;
      var played = m.played !== false && (m.s1 > 0 || m.s2 > 0 || m.played === true);
      html += '<div class="fixture-item"><span class="fixture-pair">[' + m.tour + '] ' + m.t1 + ' — ' + m.t2 + '</span><span class="fixture-status">' + (played ? m.s1 + ':' + m.s2 : 'Не сыгран') + '</span>';
      html += '<button type="button" onclick="window.__fbOpenResult(\'' + tk + '\',' + realIdx + ')" style="padding:5px 10px!important;font-size:11px;">Протокол</button>';
      html += '<button type="button" onclick="window.__fbDelete(\'' + tk + '\',' + realIdx + ')" class="btn-danger" style="padding:5px 10px!important;font-size:11px;">Удалить</button></div>';
    });
    c.innerHTML = html;
  }
  function updateFbTeams() {
    var tk = val('fbTourney');
    var teams = (tournamentsData[tk] && tournamentsData[tk].teams) || [];
    var opts = teams.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');
    if (q('fbT1')) q('fbT1').innerHTML = opts;
    if (q('fbT2')) q('fbT2').innerHTML = opts;
    renderFbList();
  }
  function addFbPair() {
    var tk = val('fbTourney'); var tour = (val('fbTour') || '').trim();
    var date = (val('fbDate') || '').trim();
    var t1 = val('fbT1'), t2 = val('fbT2');
    if (!tour) return alert('Укажите тур');
    if (t1 === t2) return alert('Команды разные');
    tournamentsData[tk].matches.push({ tour: tour, date: date, t1: t1, s1: 0, s2: 0, t2: t2, scorers: '', played: false, status: 'upcoming' });
    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    if (window.renderTourney) window.renderTourney();
    renderFbList(); alert('Матч назначен');
  }

  /* ============ ГАЛЕРЕЯ / БАННЕР ============ */
  function renderTeamPhotosBlock() {
    var clubOpts = clubsData.map(function (c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('');
    var tourneyOpts = '<option value="">— все турниры —</option>' + Object.keys(tournamentsData).map(function (k) { return '<option value="' + k + '">' + tournamentsData[k].title + '</option>'; }).join('');
    return '<div class="admin-extras-section"><h3>📷 Галерея матчей клуба</h3>' +
      '<div class="form-row"><div class="form-group"><label>Клуб:</label><select id="photoClubSelect">' + clubOpts + '</select></div>' +
      '<div class="form-group"><label>Турнир:</label><select id="photoTourneySelect">' + tourneyOpts + '</select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Фото:</label><input type="file" id="teamPhotosInput" accept="image/*" multiple></div>' +
      '<div class="form-group"><label>Подпись:</label><input type="text" id="photoCaption" placeholder="Матч 7 тура"></div></div>' +
      '<button type="button" id="uploadTeamPhotosBtn" class="btn-success">Загрузить</button>' +
      '<div id="existingPhotosPreview" style="margin-top:16px;"></div></div>';
  }
  function renderExistingPhotos() {
    var sel = q('photoClubSelect'); if (!sel) return;
    var club = sel.value; if (!club && sel.options.length) { club = sel.options[0].value; sel.value = club; }
    var cont = q('existingPhotosPreview'); if (!cont || !club) return;
    var photos = (window.teamPhotos && window.teamPhotos[club]) || [];
    if (!photos.length) { cont.innerHTML = '<p style="color:#64748b;font-size:12px;">Нет фото</p>'; return; }
    var html = '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">Фото: ' + photos.length + '</div><div class="admin-photos-grid">';
    photos.forEach(function (p, i) { html += '<div class="admin-photo-thumb"><img src="' + p.url + '" alt=""><button type="button" onclick="window.__deleteTeamPhoto(\'' + club.replace(/'/g, "\\'") + '\',' + i + ')">✕</button></div>'; });
    html += '</div>'; cont.innerHTML = html;
  }
  function renderGalleryAndBannerBlock() {
    var slides = (window.bannerManager && window.bannerManager.getSlides()) || [];
    var interval = (window.bannerManager && window.bannerManager.getInterval()) || 4000;
    var thumbs = '';
    if (slides.length) {
      thumbs = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:14px 0;">';
      slides.forEach(function (s, i) {
        thumbs += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
          '<img src="' + s.url + '" style="width:100%;height:90px;object-fit:cover;display:block;opacity:' + (s.enabled ? 1 : 0.35) + ';">' +
          '<div style="padding:8px;display:flex;flex-direction:column;gap:6px;">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;"><input type="checkbox" ' + (s.enabled ? 'checked' : '') + ' onchange="window.__bannerToggle(' + i + ', this.checked)"> Показ</label>' +
            '<button type="button" class="btn-danger" onclick="window.__bannerRemove(' + i + ')" style="padding:3px 6px!important;font-size:10px;">Удалить</button>' +
          '</div></div>';
      });
      thumbs += '</div>';
    } else thumbs = '<p style="color:#64748b;font-style:italic;margin:12px 0;">Слайдов нет.</p>';
    return '<div class="admin-extras-section"><h3>🖼️ Галерея главной</h3>' +
      '<div class="form-row"><div class="form-group"><label>URL слайда:</label><div style="display:flex;gap:8px;"><input type="text" id="bannerUrlInput" placeholder="https://..." style="flex:1;"><button type="button" id="bannerUrlAddBtn" class="btn-success">+ Добавить</button></div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Или файл:</label><input type="file" id="bannerFileInput" accept="image/*"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Интервал:</label><select id="bannerIntervalSelect">' +
        '<option value="3000"' + (interval === 3000 ? ' selected' : '') + '>3 сек</option>' +
        '<option value="4000"' + (interval === 4000 ? ' selected' : '') + '>4 сек</option>' +
        '<option value="5000"' + (interval === 5000 ? ' selected' : '') + '>5 сек</option>' +
      '</select></div></div>' + thumbs + '</div>';
  }
  window.__bannerToggle = function (i, v) { if (window.bannerManager) window.bannerManager.toggleSlide(i, v); };
  window.__bannerRemove = function (i) { if (!confirm('Удалить слайд?')) return; if (window.bannerManager) window.bannerManager.removeSlide(i); renderAdminExtras(); };

  function renderAiBlock() {
    var opts = Object.keys(tournamentsData).map(function (k) { return '<option value="' + k + '">' + tournamentsData[k].title + '</option>'; }).join('');
    return '<div class="admin-extras-section"><h3>AI-парсинг заявок</h3>' +
      '<div class="form-row"><div class="form-group"><label>Турнир:</label><select id="aiTourney">' + opts + '</select></div></div>' +
      '<div class="form-group"><label>Текст:</label><textarea id="aiTextarea" rows="6"></textarea></div>' +
      '<div class="ai-actions"><button type="button" id="aiParseBtn" class="btn-success">Распознать</button> <button type="button" id="aiClearBtn" class="btn-secondary">Очистить</button></div>' +
      '<div class="ai-status" id="aiStatus"></div></div>';
  }

  function renderOrganizersBlock() {
    var list = (window.organizersData || []).map(function (c, i) {
      return '<div class="fixture-item"><span class="fixture-pair"><strong>' + (c.name || '') + '</strong>' + (c.role ? ' — ' + c.role : '') + '</span><button type="button" onclick="window.__orgRemove(' + i + ')" class="btn-danger" style="padding:5px 10px!important;font-size:11px;">Удалить</button></div>';
    }).join('');
    return '<div class="admin-extras-section"><h3>Контакты организаторов</h3>' +
      '<div class="form-row"><div class="form-group"><label>ФИО:</label><input type="text" id="orgName"></div>' +
      '<div class="form-group"><label>Роль:</label><input type="text" id="orgRole"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Телефон:</label><input type="text" id="orgPhone"></div>' +
      '<div class="form-group"><label>ВК/TG:</label><input type="text" id="orgVk"></div></div>' +
      '<button type="button" id="orgAddBtn" class="btn-success">Добавить</button>' +
      (list ? '<div style="margin-top:14px;">' + list + '</div>' : '') + '</div>';
  }
  function addOrganizer() {
    var name = val('orgName').trim(); if (!name) return alert('Введите ФИО');
    window.organizersData.push({ name: name, role: val('orgRole'), phone: val('orgPhone'), vk: val('orgVk') });
    if (window.saveOrganizers) window.saveOrganizers();
    renderAdminExtras();
  }
  window.__orgRemove = function (i) { if (!confirm('Удалить?')) return; window.organizersData.splice(i, 1); if (window.saveOrganizers) window.saveOrganizers(); renderAdminExtras(); };

  function renderConstructorBlock() {
    var cb = clubsData.map(function (c) { return '<label class="club-checkbox"><input type="checkbox" value="' + c.name.replace(/"/g, '&quot;') + '"><span>' + c.name + '</span></label>'; }).join('');
    return '<div class="admin-extras-section"><h3>Создание турнира</h3>' +
      '<div class="form-row"><div class="form-group"><label>Название:</label><input type="text" id="ntTitle"></div>' +
      '<div class="form-group"><label>Ключ:</label><input type="text" id="ntKey" placeholder="autumn_8x8"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Формат:</label><select id="ntFormat"><option>5x5</option><option>7x7</option><option>8x8</option></select></div>' +
      '<div class="form-group"><label>Статус:</label><select id="ntStatus"><option value="announce">Анонс</option><option value="live">Идёт</option><option value="done">Завершён</option></select></div></div>' +
      '<div class="form-group"><label>Участники:</label><div class="checkbox-list" id="ntClubsList">' + cb + '</div></div>' +
      '<button type="button" id="ntCreateBtn" class="btn-success">Создать</button></div>';
  }
  function createTournament() {
    var title = val('ntTitle').trim(); var key = val('ntKey').trim();
    if (!title || !key) return alert('Заполните название и ключ');
    if (tournamentsData[key]) return alert('Ключ занят');
    var sel = [];
    document.querySelectorAll('#ntClubsList input[type="checkbox"]:checked').forEach(function (cb) { sel.push(cb.value); });
    if (sel.length < 2) return alert('Минимум 2 команды');
    var rosters = {}; sel.forEach(function (c) { rosters[c] = []; });
    tournamentsData[key] = { title: title, teams: sel, rosters: rosters, matches: [], awards: [], status: val('ntStatus') || 'announce' };
    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    if (window.renderSidebar) window.renderSidebar();
    if (window.selectTourney) window.selectTourney(key);
    renderAdminExtras();
  }

  /* ============ BIND EVENTS ============ */
  function bindEvents() {
    var bAdd = q('bannerUrlAddBtn'); if (bAdd) bAdd.onclick = function () {
      var url = val('bannerUrlInput').trim(); if (!url) return alert('Введите URL');
      if (window.bannerManager) window.bannerManager.addSlide(url);
      renderAdminExtras();
    };
    var bFile = q('bannerFileInput'); if (bFile) bFile.onchange = function () {
      var files = Array.from(this.files || []); if (!files.length || !window.bannerManager) return;
      var done = 0;
      files.forEach(function (f) {
        compressImage(f, 1600, 0.85, function (dataUrl) {
          window.bannerManager.addSlide(dataUrl); done++;
          if (done === files.length) { renderAdminExtras(); alert('Добавлено: ' + files.length); }
        });
      });
      this.value = '';
    };
    var bInt = q('bannerIntervalSelect'); if (bInt) bInt.onchange = function () { if (window.bannerManager) window.bannerManager.setInterval(this.value); };

    var uploadBtn = q('uploadTeamPhotosBtn'); if (uploadBtn) uploadBtn.onclick = uploadTeamPhotos;
    var photoClubSel = q('photoClubSelect'); if (photoClubSel) photoClubSel.onchange = renderExistingPhotos;

    var ap = q('aiParseBtn'); if (ap) ap.onclick = runAiParse;
    var ac = q('aiClearBtn'); if (ac) ac.onclick = function () { var ta = q('aiTextarea'); if (ta) ta.value = ''; };

    var rpS = q('rpSaveBtn'); if (rpS) rpS.onclick = saveRosterPreview;
    var rpC = q('rpCancelBtn'); if (rpC) rpC.onclick = closeRosterPreview;
    var rpX = q('rpCloseBtn'); if (rpX) rpX.onclick = closeRosterPreview;

    var ntC = q('ntCreateBtn'); if (ntC) ntC.onclick = createTournament;
    document.querySelectorAll('.club-checkbox input').forEach(function (cb) { cb.onchange = function () { this.parentElement.classList.toggle('checked', this.checked); }; });

    var fbT = q('fbTourney'); if (fbT) fbT.onchange = updateFbTeams;
    var fbA = q('fbAddPairBtn'); if (fbA) fbA.onclick = addFbPair;

    var mrTabA = q('mrTabAttendance'); if (mrTabA) mrTabA.onclick = function () { switchMrTab('attendance'); };
    var mrTabE = q('mrTabEvents'); if (mrTabE) mrTabE.onclick = function () { switchMrTab('events'); };
    var mrT1 = q('mrTab1'); if (mrT1) mrT1.onclick = function () { mrState.activeTeam = 1; mrT1.classList.add('active'); var e2 = q('mrTab2'); if (e2) e2.classList.remove('active'); renderMrGoals(); };
    var mrT2 = q('mrTab2'); if (mrT2) mrT2.onclick = function () { mrState.activeTeam = 2; mrT2.classList.add('active'); var e1 = q('mrTab1'); if (e1) e1.classList.remove('active'); renderMrGoals(); };
    var mrS1 = q('mrScore1'); if (mrS1) mrS1.oninput = function () { syncGoalsToScore(mrState.goals1, this.value); renderMrGoals(); validateMr(); };
    var mrS2 = q('mrScore2'); if (mrS2) mrS2.oninput = function () { syncGoalsToScore(mrState.goals2, this.value); renderMrGoals(); validateMr(); };
    var mrC = q('mrAddCardBtn'); if (mrC) mrC.onclick = addMrCard;
    var mrSv = q('mrSaveBtn'); if (mrSv) mrSv.onclick = saveMatchResult;
    var mrX = q('mrCancelBtn'); if (mrX) mrX.onclick = function () { var m = q('matchResultModal'); if (m) m.style.display = 'none'; };
    var mrCl = q('matchResultCloseBtn'); if (mrCl) mrCl.onclick = function () { var m = q('matchResultModal'); if (m) m.style.display = 'none'; };

    var orgA = q('orgAddBtn'); if (orgA) orgA.onclick = addOrganizer;
    setTimeout(renderExistingPhotos, 50);

    // ⚡ Автопоиск для слотов сборной
    symBindAutocomplete();
  }

  window.__fbDelete = function (tk, idx) {
    if (!confirm('Удалить матч?')) return;
    tournamentsData[tk].matches.splice(idx, 1);
    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    if (window.renderTourney) window.renderTourney();
    renderFbList();
  };
  window.__fbOpenResult = openMatchResult;
  window.onAdminPanelOpened = function () { renderAdminExtras(); };

  function renderAdminExtras() {
    var c = q('adminExtrasContainer'); if (!c) return;
    // ⚡ Подгружаем сохранённую сборную перед рендером
    symLoadFromStorage(symState.tourneyKey, symState.round);
    c.innerHTML =
      renderSymbolicBlock() +
      renderClubMainPhotoBlock() +
      renderPlayersRegistryBlock() +
      renderFixtureBlock() +
      renderGalleryAndBannerBlock() +
      renderTeamPhotosBlock() +
      renderAiBlock() +
      renderOrganizersBlock() +
      renderConstructorBlock();
    bindEvents();
    var fbT = q('fbTourney');
    if (fbT && tournamentsData[fbT.value]) updateFbTeams();
  }

  loadCustomClubs();
  applyBackground();
  if (q('view-admin') && q('view-admin').style.display === 'block') renderAdminExtras();
  console.log('[admin-extras] v3.0 загружен — конструктор сборной вернулся к слотам');
})();