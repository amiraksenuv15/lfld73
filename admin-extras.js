/* ============================================================
   admin-extras.js — админка ЛФЛД (v6.0)
   - TOTW: 8 фиксированных позиций + автокомплит по текущему турниру
   - Кроппер делегируется в Cropper.js с автосжатием (1000px / 0.75)
   - Галерея клуба: сжатие до 1000px / 0.75
   - Блок «Управление кэшем устройства» с кнопкой сброса
   - AI-парсинг, протоколы, организаторы, конструктор
   ============================================================ */
(function () {
  'use strict';
  if (typeof window.tournamentsData === 'undefined') { console.warn('[admin-extras] основной скрипт не загружен'); return; }

  var clubsData = window.clubsData;
  var tournamentsData = window.tournamentsData;
  var DB = window.database;
  var TR = window.teamRosters;

  /* ---------- Утилиты ---------- */
  function escapeAttr(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function q(id) { return document.getElementById(id); }
  function val(id) { var e = q(id); return e ? e.value : ''; }
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g,'е').trim(); }

  /* ============================================================
     8 ФИКСИРОВАННЫХ ПОЗИЦИЙ СБОРНОЙ ТУРА (формат 8х8)
     ============================================================ */
  var TOTW_POSITIONS = [
    { code: 'ВРТ', label: 'Вратарь',              short: 'ВРТ' },
    { code: 'ЛЗ',  label: 'Левый защитник',       short: 'ЛЗ'  },
    { code: 'ПЗ',  label: 'Правый защитник',      short: 'ПЗ'  },
    { code: 'ОПЗ', label: 'Опорный полузащитник', short: 'ОПЗ' },
    { code: 'ЦПЗ', label: 'Центральный полузащитник', short: 'ЦПЗ' },
    { code: 'ЛВ',  label: 'Атакующий / Левый вингер',  short: 'ЛВ' },
    { code: 'ПВ',  label: 'Атакующий / Правый вингер', short: 'ПВ' },
    { code: 'ЦН',  label: 'Центральный нападающий',    short: 'ЦН' }
  ];

  var mrState = { matchId: null, tourneyKey: null, t1: '', t2: '', activeTeam: 1, goals1: [], goals2: [], cards: [], attendance1: [], attendance2: [], tab: 'attendance' };
  var playerEditState = { playerId: null };
  var playerSearchQuery = '';
  var playerFilterClub = '';
  var playerRegistryOpen = false;

  var symState = {
    tourneyKey: 'night_league_8x8',
    round: '1 ТУР',
    slots: TOTW_POSITIONS.map(function (d) { return { name: '', club: '', pos: d.code, short: '' }; })
  };

  /* ============================================================
     КРОППЕР — делегируется в Cropper.js с автосжатием
     ============================================================ */
  function openCropModal(imageSrc, aspectRatio, onSave, opts) {
    if (typeof window.__openCropModal === 'function') {
      return window.__openCropModal(imageSrc, aspectRatio, onSave, opts);
    }
    console.warn('[admin-extras] Cropper.js недоступен — проверьте подключение CDN в <head>');
    alert('Кроппер недоступен: библиотека Cropper.js не загружена.');
  }

  /* ============================================================
     КЛУБЫ
     ============================================================ */
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

  /* ============================================================
     ГЛАВНОЕ ФОТО КОМАНДЫ — с жёстким сжатием (1000px / 0.75)
     ============================================================ */
  function getClubMainPhotoMap() { try { return JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}'); } catch(e) { return {}; } }
  function setClubMainPhoto(club, url) {
    var d = getClubMainPhotoMap();
    if (url) d[club] = url; else delete d[club];
    try {
      localStorage.setItem('ff_club_main_photo', JSON.stringify(d));
    } catch (e) {
      console.warn('[club-photo] Не удалось сохранить карту фото:', e);
    }
  }
  function saveClubMainPhotoFromForm() {
    var club = val('cmpClubSelect'); if (!club) return alert('Выберите клуб');
    var fileInput = q('cmpFileInput'); var urlInput = (val('cmpUrlInput') || '').trim();

    if (fileInput && fileInput.files && fileInput.files[0]) {
      var f = fileInput.files[0];
      if (!/^image\//.test(f.type)) return alert('Это не изображение');
      var reader = new FileReader();
      reader.onload = function (e) {
        openCropModal(e.target.result, 16 / 7, function (cropped) {
          setClubMainPhoto(club, cropped);
          alert('Фото команды сохранено!');
          renderAdminExtras();
        }, {
          title: 'Кадрирование командного фото (16:7, сжатие до 1000px)',
          outW: 1000,
          quality: 0.75
        });
      };
      reader.readAsDataURL(f);
    } else if (urlInput) {
      setClubMainPhoto(club, urlInput);
      alert('Фото команды сохранено!');
      renderAdminExtras();
    } else {
      alert('Выберите файл или введите URL');
    }
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
      '<p>Фото автоматически сжимается до <strong>1000px по ширине, JPEG 0.75</strong> (80–130 КБ). Переполнение хранилища исключено.</p>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Клуб:</label><select id="cmpClubSelect" onchange="window.__cmpOnChange()">' + clubOpts + '</select></div>' +
        '<div class="form-group"><label>Текущее фото:</label><div id="cmpCurrentPreview">' +
          (current ? '<img src="' + current + '" style="width:180px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #334155;">' : '<span style="color:#64748b;font-style:italic;font-size:12px;">Не загружено</span>') +
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
    prev.innerHTML = url ? '<img src="' + url + '" style="width:180px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #334155;">' : '<span style="color:#64748b;font-style:italic;font-size:12px;">Не загружено</span>';
  };
  window.__cmpSave = saveClubMainPhotoFromForm;
  window.__cmpClear = clearClubMainPhoto;

  /* ============================================================
     ИНДЕКС ИГРОКОВ СТРОГО ПО ТЕКУЩЕМУ ТУРНИРУ
     ============================================================ */
  var TOURNEY_MASTER_MAP = {
    '5x5':               'tournament_5x5',
    '7x7':               'tournament_7x7',
    'night_league_8x8':  'tournament_night',
    'cup_5x5':           'cup_5x5',
    'cup_metallist_2026':'cup_metallist_2026'
  };
  var symPlayerIndexCache = { key: null, list: [] };

  function buildTourneyPlayerIndex(tourneyKey) {
    if (symPlayerIndexCache.key === tourneyKey && symPlayerIndexCache.list.length) {
      return symPlayerIndexCache.list;
    }
    var masterKey = TOURNEY_MASTER_MAP[tourneyKey];
    var M = window.LFLD_MASTER_DB;
    var list = [];

    if (M && masterKey && M[masterKey]) {
      var mt = M[masterKey];
      if (masterKey === 'cup_5x5' && Array.isArray(mt.players)) {
        mt.players.forEach(function (p) {
          if (!p || !p.name) return;
          list.push({ name: p.name, team: p.team || '—', position: p.pos || 'УНИ' });
        });
      } else if (mt.teams && typeof mt.teams === 'object') {
        Object.keys(mt.teams).forEach(function (club) {
          (mt.teams[club] || []).forEach(function (p) {
            if (!p || !p.name) return;
            list.push({ name: p.name, team: club, position: p.pos || 'УНИ' });
          });
        });
      }
    }

    if (!list.length && DB && DB.getRoster) {
      var t = tournamentsData[tourneyKey];
      var teams = (t && t.teams) || [];
      teams.forEach(function (club) {
        var r = DB.getRoster(tourneyKey, club);
        r.forEach(function (item) {
          var p = DB.getPlayer(item.playerId);
          if (!p) return;
          var fio = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
          if (!fio) return;
          list.push({ name: fio, team: club, position: item.pos || p.position || 'УНИ' });
        });
      });
    }

    var seen = {};
    list = list.filter(function (p) {
      var k = norm(p.name) + '|' + norm(p.team);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });

    symPlayerIndexCache.key = tourneyKey;
    symPlayerIndexCache.list = list;
    return list;
  }

  function highlightMatch(name, qStr) {
    if (!qStr) return escapeHtml(name);
    var n = name.toLowerCase().replace(/ё/g,'е');
    var idx = n.indexOf(qStr);
    if (idx === -1) return escapeHtml(name);
    return escapeHtml(name.slice(0, idx)) + '<strong style="color:#fbbf24;">' + escapeHtml(name.slice(idx, idx + qStr.length)) + '</strong>' + escapeHtml(name.slice(idx + qStr.length));
  }

  function renderSymDrop(idx, query, drop) {
    var qn = String(query || '').toLowerCase().replace(/ё/g,'е').trim();
    if (qn.length < 1) { drop.classList.remove('open'); drop.innerHTML = ''; return; }

    var all = buildTourneyPlayerIndex(symState.tourneyKey);
    if (!all.length) {
      drop.innerHTML = '<div class="lfld-ac-empty">Для турнира «' + escapeHtml((tournamentsData[symState.tourneyKey] && tournamentsData[symState.tourneyKey].title) || symState.tourneyKey) + '» нет заявок. Проверьте базу.</div>';
      drop.classList.add('open');
      drop._activeIdx = -1;
      return;
    }

    var matches = all.filter(function (p) {
      return p.name.toLowerCase().replace(/ё/g,'е').indexOf(qn) !== -1;
    });

    matches.sort(function (a, b) {
      var an = a.name.toLowerCase().replace(/ё/g,'е');
      var bn = b.name.toLowerCase().replace(/ё/g,'е');
      var aStart = an.indexOf(qn) === 0;
      var bStart = bn.indexOf(qn) === 0;
      if (aStart !== bStart) return aStart ? -1 : 1;
      return an.localeCompare(bn);
    });
    matches = matches.slice(0, 30);

    if (!matches.length) {
      drop.innerHTML = '<div class="lfld-ac-empty">Совпадений нет. Попробуйте другую букву или проверьте турнир.</div>';
      drop.classList.add('open');
      drop._activeIdx = -1;
      return;
    }

    drop.innerHTML = matches.map(function (p, i) {
      var logoHtml = window.getClubLogoMini ? window.getClubLogoMini(p.team) : '⚽';
      return '<div class="lfld-ac-item" data-i="' + i + '" data-name="' + escapeAttr(p.name) + '" data-team="' + escapeAttr(p.team) + '" data-pos="' + escapeAttr(p.position || 'УНИ') + '">' +
        '<div class="ac-name">' + highlightMatch(p.name, qn) + '</div>' +
        '<div class="ac-club">' + logoHtml + '<span>' + escapeHtml(p.team) + '</span></div>' +
      '</div>';
    }).join('');
    drop.classList.add('open');
    drop._activeIdx = -1;
  }

  function setSymActive(drop, idx) {
    var items = drop.querySelectorAll('.lfld-ac-item');
    items.forEach(function (it, i) { it.classList.toggle('active', i === idx); });
    drop._activeIdx = idx;
    if (items[idx]) { try { items[idx].scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }

  function selectSymPlayer(slotIdx, name, team, pos) {
    var code = TOTW_POSITIONS[slotIdx].code;
    symState.slots[slotIdx] = { name: name, club: team, pos: code, short: (String(name).split(/\s+/)[0] || name) };
    rerenderSymSlot(slotIdx);
  }

  function clearSymSlot(slotIdx) {
    var code = TOTW_POSITIONS[slotIdx].code;
    symState.slots[slotIdx] = { name: '', club: '', pos: code, short: '' };
    rerenderSymSlot(slotIdx);
  }

  function renderSymSlot(slot, idx) {
    var def = TOTW_POSITIONS[idx];
    var player = slot || { name: '', club: '', pos: def.code, short: '' };
    var name = player.name || '';
    var club = player.club || '';
    var hasValue = !!name && !!club;

    var kitHtml = hasValue && window.getClubLogoMini ? window.getClubLogoMini(club) : '⚽';

    var acBlock =
      '<div class="lfld-ac" data-idx="' + idx + '"' + (hasValue ? ' style="display:none;"' : '') + '>' +
        '<input type="text" class="lfld-ac-input" autocomplete="off" placeholder="Начните вводить фамилию...">' +
        '<button type="button" class="lfld-ac-clear" style="display:none;" title="Очистить">✕</button>' +
        '<div class="lfld-ac-drop"></div>' +
      '</div>';

    var chosenBlock =
      '<div class="totw-chosen" style="display:' + (hasValue ? 'flex' : 'none') + ';">' +
        '<span class="totw-chosen-kit">' + kitHtml + '</span>' +
        '<div class="totw-chosen-info">' +
          '<div class="totw-chosen-name">' + escapeHtml(name || '—') + '</div>' +
          '<div class="totw-chosen-club">' + escapeHtml(club || '—') + '</div>' +
        '</div>' +
        '<button type="button" class="totw-chosen-clear" title="Изменить">✕</button>' +
      '</div>';

    return '<div class="totw-slot' + (hasValue ? ' filled' : '') + '" data-idx="' + idx + '" data-pos="' + escapeAttr(def.code) + '">' +
      '<div class="totw-slot-pos" title="' + escapeAttr(def.label) + '">' + escapeHtml(def.short) + '</div>' +
      '<div class="totw-slot-body">' + acBlock + chosenBlock + '</div>' +
    '</div>';
  }

  function rerenderSymSlot(idx) {
    var wrap = q('symSlotsWrap');
    if (!wrap) return;
    var oldSlot = wrap.querySelector('.totw-slot[data-idx="' + idx + '"]');
    if (!oldSlot) return;
    var div = document.createElement('div');
    div.innerHTML = renderSymSlot(symState.slots[idx], idx);
    var newSlot = div.firstChild;
    oldSlot.parentNode.replaceChild(newSlot, oldSlot);
  }

  function renderSymSlotsList() {
    var wrap = q('symSlotsWrap');
    if (!wrap) return;
    var html = '';
    TOTW_POSITIONS.forEach(function (def, i) { html += renderSymSlot(symState.slots[i], i); });
    wrap.innerHTML = html;
  }

  function renderSymbolicBlock() {
    var tourneyOpts = Object.keys(tournamentsData).map(function (k) {
      return '<option value="' + k + '"' + (symState.tourneyKey === k ? ' selected' : '') + '>' + tournamentsData[k].title + '</option>';
    }).join('');
    var tours = [];
    var t = tournamentsData[symState.tourneyKey];
    if (t && Array.isArray(t.matches)) { t.matches.forEach(function(m){ if (m.tour && tours.indexOf(m.tour) === -1) tours.push(m.tour); }); }
    tours.sort(function(a,b){ return (parseInt((a||'').replace(/\D/g,''))||0) - (parseInt((b||'').replace(/\D/g,''))||0); });
    if (!tours.length) tours = ['1 ТУР'];
    var tourOpts = tours.map(function(r){
      return '<option value="' + escapeHtml(r) + '"' + (symState.round === r ? ' selected' : '') + '>' + escapeHtml(r) + '</option>';
    }).join('');

    return '<div class="admin-extras-section">' +
      '<h3>⭐ Символическая сборная тура · 8 фиксированных позиций</h3>' +
      '<p>Вводите фамилию — подсказки показывают только игроков <strong>текущего турнира</strong> с актуальным клубом и эмблемой.</p>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Турнир:</label><select id="symTourneySelect" onchange="window.__symChangeTourney(this.value)">' + tourneyOpts + '</select></div>' +
        '<div class="form-group"><label>Тур:</label><select id="symRoundSelect" onchange="window.__symChangeRound(this.value)">' + tourOpts + '</select></div>' +
      '</div>' +
      '<div class="totw-admin-grid" id="symSlotsWrap"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
        '<button type="button" class="btn-secondary" onclick="window.__symFillEmpty()">Очистить пустые</button>' +
        '<button type="button" class="btn-success" onclick="window.__symPublish()">📢 Опубликовать сборную</button>' +
        '<button type="button" class="btn-danger" onclick="window.__symClear()">Очистить всю</button>' +
      '</div>' +
      '<div class="ai-status" id="symStatus"></div>' +
      '</div>';
  }

  window.__symChangeTourney = function (tk) {
    symState.tourneyKey = tk; symState.round = '1 ТУР';
    symPlayerIndexCache.key = null;
    var loaded = loadSymbolicFromStorage(tk, symState.round);
    symState.slots = loaded ? loaded.slots : TOTW_POSITIONS.map(function (d) { return { name: '', club: '', pos: d.code, short: '' }; });
    normalizeSlotsAgainstIndex();
    renderAdminExtras();
  };
  window.__symChangeRound = function (r) {
    symState.round = r;
    var loaded = loadSymbolicFromStorage(symState.tourneyKey, r);
    symState.slots = loaded ? loaded.slots : TOTW_POSITIONS.map(function (d) { return { name: '', club: '', pos: d.code, short: '' }; });
    normalizeSlotsAgainstIndex();
    renderAdminExtras();
  };
  window.__symFillEmpty = function () {
    symState.slots = symState.slots.map(function (s, i) {
      if (!s || !s.name || !s.club) return { name: '', club: '', pos: TOTW_POSITIONS[i].code, short: '' };
      return s;
    });
    renderAdminExtras();
  };
  window.__symPublish = function () {
    var filled = symState.slots.filter(function (p) { return p.name && p.club; });
    if (!filled.length) {
      var st = q('symStatus');
      if (st) { st.className = 'ai-status show err'; st.innerText = 'Заполните хотя бы одну позицию'; }
      return;
    }
    saveSymbolicToStorage(symState.tourneyKey, symState.round, symState.slots);
    var st = q('symStatus');
    if (st) { st.className = 'ai-status show ok'; st.innerText = 'Опубликовано: ' + filled.length + ' из ' + TOTW_POSITIONS.length + ' позиций'; }
    if (window.renderHomeSymbolic) window.renderHomeSymbolic();
    if (window.LFLD_V2 && window.LFLD_V2.renderHomeTOTW) window.LFLD_V2.renderHomeTOTW();
  };
  window.__symClear = function () {
    if (!confirm('Очистить всю сборную тура?')) return;
    symState.slots = TOTW_POSITIONS.map(function (d) { return { name: '', club: '', pos: d.code, short: '' }; });
    saveSymbolicToStorage(symState.tourneyKey, symState.round, symState.slots);
    renderAdminExtras();
    if (window.renderHomeSymbolic) window.renderHomeSymbolic();
    if (window.LFLD_V2 && window.LFLD_V2.renderHomeTOTW) window.LFLD_V2.renderHomeTOTW();
  };

  function normalizeSlotsAgainstIndex() {
    var index = buildTourneyPlayerIndex(symState.tourneyKey);
    if (!index.length) return;
    symState.slots = symState.slots.map(function (s, i) {
      if (!s || !s.name) return { name: '', club: '', pos: TOTW_POSITIONS[i].code, short: '' };
      var byName = index.filter(function (p) { return norm(p.name) === norm(s.name); });
      if (!byName.length) return s;
      var exact = byName.find(function (p) { return norm(p.team) === norm(s.club); });
      var team = exact ? exact.team : byName[0].team;
      return { name: s.name, club: team, pos: TOTW_POSITIONS[i].code, short: s.short || (s.name.split(/\s+/)[0] || s.name) };
    });
  }

  /* ---------- Делегированные обработчики автокомплита ---------- */
  if (!window.__symAcGlobalBound) {
    window.__symAcGlobalBound = true;

    document.addEventListener('input', function (e) {
      var input = e.target;
      if (!input || !input.classList || !input.classList.contains('lfld-ac-input')) return;
      var ac = input.closest('.lfld-ac'); if (!ac) return;
      var drop = ac.querySelector('.lfld-ac-drop'); if (!drop) return;
      var idx = parseInt(ac.getAttribute('data-idx'), 10) || 0;
      renderSymDrop(idx, input.value, drop);
      var clearBtn = ac.querySelector('.lfld-ac-clear');
      if (clearBtn) clearBtn.style.display = input.value ? 'block' : 'none';
    }, true);

    document.addEventListener('focusin', function (e) {
      var input = e.target;
      if (!input || !input.classList || !input.classList.contains('lfld-ac-input')) return;
      var ac = input.closest('.lfld-ac'); if (!ac) return;
      var drop = ac.querySelector('.lfld-ac-drop'); if (!drop) return;
      var idx = parseInt(ac.getAttribute('data-idx'), 10) || 0;
      renderSymDrop(idx, input.value, drop);
    }, true);

    document.addEventListener('keydown', function (e) {
      var input = e.target;
      if (!input || !input.classList || !input.classList.contains('lfld-ac-input')) return;
      var ac = input.closest('.lfld-ac'); if (!ac) return;
      var drop = ac.querySelector('.lfld-ac-drop');
      if (!drop || !drop.classList.contains('open')) return;
      var items = drop.querySelectorAll('.lfld-ac-item');
      if (!items.length) return;
      var activeIdx = (drop._activeIdx == null) ? -1 : drop._activeIdx;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(items.length - 1, activeIdx + 1);
        setSymActive(drop, activeIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(0, activeIdx - 1);
        setSymActive(drop, activeIdx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx < 0) activeIdx = 0;
        var it = items[activeIdx]; if (!it) return;
        var idx = parseInt(ac.getAttribute('data-idx'), 10) || 0;
        selectSymPlayer(idx, it.getAttribute('data-name'), it.getAttribute('data-team'), it.getAttribute('data-pos'));
      } else if (e.key === 'Escape') {
        drop.classList.remove('open');
      }
    }, true);

    document.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.lfld-ac-item');
      if (item) {
        var ac = item.closest('.lfld-ac');
        var idx = parseInt(ac.getAttribute('data-idx'), 10) || 0;
        selectSymPlayer(idx, item.getAttribute('data-name'), item.getAttribute('data-team'), item.getAttribute('data-pos'));
        e.preventDefault();
        return;
      }
      var acClear = e.target.closest && e.target.closest('.lfld-ac-clear');
      if (acClear) {
        var ac2 = acClear.closest('.lfld-ac');
        var input2 = ac2.querySelector('.lfld-ac-input');
        var drop2 = ac2.querySelector('.lfld-ac-drop');
        if (input2) { input2.value = ''; input2.focus(); }
        if (drop2) { drop2.innerHTML = ''; drop2.classList.remove('open'); }
        acClear.style.display = 'none';
        e.preventDefault();
        return;
      }
      var chosenClear = e.target.closest && e.target.closest('.totw-chosen-clear');
      if (chosenClear) {
        var slot = chosenClear.closest('.totw-slot');
        var idx3 = parseInt(slot.getAttribute('data-idx'), 10) || 0;
        clearSymSlot(idx3);
        e.preventDefault();
        return;
      }
      if (!e.target.closest || !e.target.closest('.lfld-ac')) {
        document.querySelectorAll('.lfld-ac-drop.open').forEach(function (d) { d.classList.remove('open'); });
      }
    }, true);
  }

  /* ---------- Хранилище сборных ---------- */
  function loadSymbolicFromStorage(tk, round) {
    try {
      var all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}');
      var payload = all[tk + '|' + round];
      if (!payload) return null;
      if (!payload.slots && Array.isArray(payload.players)) {
        var slots = TOTW_POSITIONS.map(function (d) { return { name: '', club: '', pos: d.code, short: '' }; });
        payload.players.forEach(function (p, i) {
          if (i < slots.length && p && p.name) {
            slots[i] = { name: p.name, club: p.club || '', pos: slots[i].pos, short: p.short || (String(p.name).split(/\s+/)[0] || '') };
          }
        });
        payload.slots = slots;
      }
      return payload;
    } catch(e) { return null; }
  }
  function saveSymbolicToStorage(tk, round, slots) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}'); } catch(e) {}
    all[tk + '|' + round] = { tourneyKey: tk, round: round, slots: slots };
    try {
      localStorage.setItem('ff_symbolic_teams', JSON.stringify(all));
    } catch (e) {
      console.warn('[symbolic] Ошибка сохранения:', e);
      alert('Ошибка сохранения: переполнено хранилище браузера. Очистите кэш в блоке «Управление кэшем устройства».');
    }
    if (window.database && window.database.saveSymbolicTeam) window.database.saveSymbolicTeam(tk, round, slots);
  }

  /* ============================================================
     ФОТО КЛУБОВ (галерея) — сжатие до 1000px / 0.75
     ============================================================ */
  function uploadTeamPhotos() {
    var club = val('photoClubSelect'); var tourney = val('photoTourneySelect'); var caption = val('photoCaption');
    var input = q('teamPhotosInput');
    if (!club) return alert('Выберите клуб');
    if (!input || !input.files.length) return alert('Выберите фотографии');
    if (!window.teamPhotos) window.teamPhotos = {};
    if (!window.teamPhotos[club]) window.teamPhotos[club] = [];
    var files = Array.from(input.files); var done = 0, added = 0, failed = 0;
    files.forEach(function (f) {
      if (!/^image\//.test(f.type)) { done++; return; }
      compressImage(f, 1000, 0.75, function (dataUrl) {
        try {
          window.teamPhotos[club].push({ url: dataUrl, tourney: tourney, caption: caption });
          added++;
        } catch (e) {
          failed++;
          console.warn('[gallery] Ошибка добавления:', e);
        }
        done++;
        if (done === files.length) {
          try { if (window.saveTeamPhotos) window.saveTeamPhotos(); } catch (e) { failed++; }
          alert('Загружено фото: ' + added + (failed ? ', ошибок: ' + failed : ''));
          input.value = '';
          var capEl = q('photoCaption'); if (capEl) capEl.value = '';
          renderAdminExtras();
        }
      });
    });
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
        try {
          cb(c.toDataURL('image/jpeg', quality));
        } catch (err) {
          console.warn('[compressImage]', err);
          cb(e.target.result);
        }
      };
      img.onerror = function () { cb(e.target.result); };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
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

  /* ============================================================
     AI-ПАРСИНГ ЗАЯВОК
     ============================================================ */
  function normalizeName(s) { return (s || '').toLowerCase().replace(/ё/g,'е').replace(/[^а-яa-z0-9\s\-]/gi,'').replace(/\s+/g,' ').trim(); }
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

  /* ============================================================
     РОСТЕР КЛУБА
     ============================================================ */
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

  /* ============================================================
     ПРОТОКОЛ МАТЧА
     ============================================================ */
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

  /* ============================================================
     КОНСТРУКТОР РАСПИСАНИЯ
     ============================================================ */
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

  /* ============================================================
     ГАЛЕРЕЯ + БАННЕР
     ============================================================ */
  function renderTeamPhotosBlock() {
    var clubOpts = clubsData.map(function (c) { return '<option value="' + c.name + '">' + c.name + '</option>'; }).join('');
    var tourneyOpts = '<option value="">— все турниры —</option>' + Object.keys(tournamentsData).map(function (k) { return '<option value="' + k + '">' + tournamentsData[k].title + '</option>'; }).join('');
    return '<div class="admin-extras-section"><h3>📷 Галерея матчей клуба</h3>' +
      '<p>Фото автоматически сжимаются до <strong>1000px, JPEG 0.75</strong>.</p>' +
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
        thumbs += '<div style="background:#0d1527;border:1px solid #1e293b;border-radius:8px;overflow:hidden;">' +
          '<img src="' + s.url + '" style="width:100%;height:90px;object-fit:cover;display:block;opacity:' + (s.enabled ? 1 : 0.35) + ';">' +
          '<div style="padding:8px;display:flex;flex-direction:column;gap:6px;">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;color:#cbd5e1;"><input type="checkbox" ' + (s.enabled ? 'checked' : '') + ' onchange="window.__bannerToggle(' + i + ', this.checked)"> Показ</label>' +
            '<button type="button" class="btn-danger" onclick="window.__bannerRemove(' + i + ')" style="padding:3px 6px!important;font-size:10px;">Удалить</button>' +
          '</div></div>';
      });
      thumbs += '</div>';
    } else thumbs = '<p style="color:#64748b;font-style:italic;margin:12px 0;">Слайдов нет.</p>';
    return '<div class="admin-extras-section"><h3>🖼️ Галерея главной</h3>' +
      '<div class="form-row"><div class="form-group"><label>URL слайда:</label><div style="display:flex;gap:8px;"><input type="text" id="bannerUrlInput" placeholder="https://..." style="flex:1;"><button type="button" id="bannerUrlAddBtn" class="btn-success">+ Добавить</button></div></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Или файл (Cropper.js 21:9, сжатие 1600px):</label><input type="file" id="bannerFileInput" accept="image/*"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Интервал:</label><select id="bannerIntervalSelect">' +
        '<option value="3000"' + (interval === 3000 ? ' selected' : '') + '>3 сек</option>' +
        '<option value="4000"' + (interval === 4000 ? ' selected' : '') + '>4 сек</option>' +
        '<option value="5000"' + (interval === 5000 ? ' selected' : '') + '>5 сек</option>' +
      '</select></div></div>' + thumbs + '</div>';
  }
  window.__bannerToggle = function (i, v) { if (window.bannerManager) window.bannerManager.toggleSlide(i, v); };
  window.__bannerRemove = function (i) { if (!confirm('Удалить слайд?')) return; if (window.bannerManager) window.bannerManager.removeSlide(i); renderAdminExtras(); };

  /* ============================================================
     УПРАВЛЕНИЕ КЭШЕМ УСТРОЙСТВА — сброс + перезагрузка
     ============================================================ */
  function renderCacheResetBlock() {
    return '<div class="admin-extras-section cache-reset-section">' +
      '<h3>🔄 Управление кэшем устройства</h3>' +
      '<p>Если на телефоне или другом устройстве отображается устаревшая база данных, а на компьютере — свежая, нажмите кнопку ниже. ' +
      'Локальный кэш будет полностью очищен, и сайт загрузит свежую базу с GitHub.</p>' +
      '<button type="button" id="reset-cache-btn" class="btn-danger" style="width:100%; padding:14px 20px !important; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:.05em;">' +
        '🔄 Сбросить кэш устройства и обновить базу с GitHub' +
      '</button>' +
      '<div class="ai-status" id="cache-reset-status" style="margin-top:12px;"></div>' +
      '<p style="margin-top:14px; font-size:11px; color:#94a3b8; font-style:italic;">' +
        'Кнопка очищает <strong>только это устройство</strong>. Другие устройства не затрагиваются.' +
      '</p>' +
      '</div>';
  }

  function resetDeviceCache() {
    var st = q('cache-reset-status');
    var btn = q('reset-cache-btn');
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Сброс...'; }
    if (st) { st.className = 'ai-status show info'; st.innerText = 'Очищаем локальный кэш...'; }

    try {
      if (typeof window.__fullCacheReset === 'function') {
        var n = window.__fullCacheReset();
        if (st) st.innerText = 'Очищено ключей: ' + n + '. Перезагружаем страницу...';
      } else {
        /* Fallback — если lfld-storage.js не подключён */
        var keys = [
          'ff_tournaments','ff_database_v1','ff_master_imported_v3',
          'ff_symbolic_teams','ff_cup_metallist_rosters','ff_club_main_photo',
          'ff_custom_clubs','ff_organizers','hero_slider_photos',
          'ff_welcome_photos','ff_welcome_interval','lfld_site_background',
          'lfld_site_blur_bg','bannerSlides','ff_team_photos',
          'ff_tournament_posters','match_vk_albums','ff_streams','ff_vk_live'
        ];
        keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
        if (st) st.innerText = 'Кэш очищен (fallback). Перезагружаем...';
      }
    } catch (e) {
      console.warn('[cache-reset]', e);
    }

    /* Принудительная перезагрузка с обходом кэша */
    setTimeout(function () {
      try {
        window.location.reload(true);
      } catch (e) {
        window.location.href = window.location.pathname + '?_=' + Date.now();
      }
    }, 400);
  }
  window.__resetDeviceCache = resetDeviceCache;

  /* ============================================================
     AI-БЛОК / ОРГАНИЗАТОРЫ / КОНСТРУКТОР
     ============================================================ */
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

  /* ============================================================
     РЕЕСТР ИГРОКОВ
     ============================================================ */
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
        : '<div style="width:36px;height:44px;border-radius:4px;background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:18px;opacity:0.5;">👤</div>';
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
    var chosen = prompt('Введите награду для ' + fio + ':', (p.awards && p.awards[0]) || '');
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
      return '<div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;padding:6px 10px;border-radius:6px;margin-bottom:4px;">' +
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
    html += '<div class="form-group"><label>Фото игрока (3:4, сжатие до 240px)</label><div style="display:flex;gap:14px;align-items:center;">' +
      '<div id="pePhotoPreview" style="width:90px;height:120px;border-radius:8px;overflow:hidden;background:#0f172a;border:1px solid #334155;display:flex;align-items:center;justify-content:center;">' +
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
      var reader = new FileReader();
      reader.onload = function (e) {
        openCropModal(e.target.result, 3 / 4, function (cropped) {
          DB.updatePlayer(playerId, { photo: cropped });
          var prev = q('pePhotoPreview'); if (prev) prev.innerHTML = '<img src="' + cropped + '" style="width:100%;height:100%;object-fit:cover;">';
        }, {
          title: 'Кадрирование фото игрока (3:4, сжатие до 240px)',
          outW: 240,
          quality: 0.70
        });
      };
      reader.readAsDataURL(f);
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

  /* ============================================================
     БИНДИНГИ
     ============================================================ */
  function bindEvents() {
    var bAdd = q('bannerUrlAddBtn'); if (bAdd) bAdd.onclick = function () {
      var url = val('bannerUrlInput').trim(); if (!url) return alert('Введите URL');
      if (window.bannerManager) window.bannerManager.addSlide(url);
      renderAdminExtras();
    };
    var bFile = q('bannerFileInput'); if (bFile) bFile.onchange = function () {
      var f = this.files && this.files[0];
      if (!f || !window.bannerManager) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        openCropModal(e.target.result, 21 / 9, function (cropped) {
          window.bannerManager.addSlide(cropped);
          renderAdminExtras();
          alert('Баннер добавлен');
        }, {
          title: 'Кадрирование баннера (21:9, сжатие до 1600px)',
          outW: 1600,
          quality: 0.75
        });
      };
      reader.readAsDataURL(f);
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

    /* ⚡ Кнопка сброса кэша устройства */
    var resetBtn = q('reset-cache-btn');
    if (resetBtn) resetBtn.onclick = resetDeviceCache;

    setTimeout(function () {
      renderExistingPhotos();
      renderSymSlotsList();
    }, 60);
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

  /* ============================================================
     RENDER ADMIN
     ============================================================ */
  function renderAdminExtras() {
    var c = q('adminExtrasContainer'); if (!c) return;
    c.innerHTML =
      renderSymbolicBlock() +
      renderClubMainPhotoBlock() +
      renderPlayersRegistryBlock() +
      renderFixtureBlock() +
      renderGalleryAndBannerBlock() +
      renderTeamPhotosBlock() +
      renderAiBlock() +
      renderOrganizersBlock() +
      renderConstructorBlock() +
      renderCacheResetBlock();   /* ⚡ блок в самом низу админки */
    bindEvents();
    var fbT = q('fbTourney');
    if (fbT && tournamentsData[fbT.value]) updateFbTeams();
  }
  window.renderAdminExtras = renderAdminExtras;

  /* ============================================================
     ЗАПУСК
     ============================================================ */
  loadCustomClubs();
  applyBackground();
  if (q('view-admin') && q('view-admin').style.display === 'block') renderAdminExtras();
  console.log('[admin-extras] загружен — автосжатие + сброс кэша устройства');
})();