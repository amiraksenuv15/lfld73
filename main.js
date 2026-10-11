/* ============================================================
   main.js — вся логика ЛФЛД
   ============================================================ */
(function () {
  'use strict';

  /* ============ Ссылки на базу ============ */
  var FED_LOGO = window.FED_LOGO || "logos/lfld.png";
  var VK_COMMUNITY_URL = window.VK_COMMUNITY_URL || "https://vk.ru/lfldd";
  var clubsData = window.clubsData || [];
  var CUP_START_MATCHES = window.CUP_START_MATCHES || [];
  var DEFAULT_TOURNAMENTS = window.DEFAULT_TOURNAMENTS || {};
  var ASSISTS_BASE_5X5 = window.ASSISTS_BASE_5X5 || [];

  /* Подставляем матчи кубка */
  if (DEFAULT_TOURNAMENTS['cup_5x5'] && DEFAULT_TOURNAMENTS['cup_5x5'].playoff) {
    DEFAULT_TOURNAMENTS['cup_5x5'].playoff.matches = CUP_START_MATCHES;
  }

  /* ============ Утилиты ============ */
  function normalizeTournament(t) {
    if (!t || typeof t !== 'object') t = {};
    if (!t.title) t.title = 'Турнир';
    if (!Array.isArray(t.teams)) t.teams = [];
    if (!Array.isArray(t.matches)) t.matches = [];
    if (!Array.isArray(t.awards)) t.awards = [];
    if (!t.rosters || typeof t.rosters !== 'object') t.rosters = {};
    return t;
  }
  function cleanName(n) {
    n = (n || '').trim();
    if (n === "Нагорнов И." || n === "Нагорнов И") return "Нагорнов Илья";
    return n;
  }
  function escapeAttr(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function makeMatchId(tk, m) {
    return (tk || '') + '_' + (m.tour || m.round || '') + '_' + (m.t1 || '') + '_' + (m.t2 || '');
  }
  function playerKey(name) {
    var n = String(name || '').toLowerCase().replace(/ё/g,'е').split(/\s+/)[0];
    return n.replace(/[^а-яa-z0-9]/gi, '');
  }
  function playerKeyFromFull(name) {
    var n = String(name || '').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
    var parts = n.split(' ');
    var last = parts[0];
    var init = (parts[1] && parts[1].length >= 1) ? parts[1][0] : '';
    return last + (init ? '|' + init : '');
  }

  /* ============ Хранилище ============ */
  function loadTournaments() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('ff_tournaments') || 'null'); } catch(e) { saved = null; }
    var data = {};
    Object.keys(DEFAULT_TOURNAMENTS).forEach(function (k) {
      data[k] = normalizeTournament(JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS[k])));
    });
    if (saved && typeof saved === 'object') {
      Object.keys(saved).forEach(function (k) {
        if (!data[k]) { data[k] = normalizeTournament(saved[k]); return; }
        var u = saved[k], d = data[k];
        if (u.title) d.title = u.title;
        if (Array.isArray(u.teams) && u.teams.length) d.teams = u.teams;
        if (Array.isArray(u.matches) && u.matches.length) d.matches = u.matches;
        if (Array.isArray(u.awards) && u.awards.length) d.awards = u.awards;
        if (u.rosters && typeof u.rosters === 'object') d.rosters = u.rosters;
        if (u.playoff) d.playoff = u.playoff;
        if (u.isCup) d.isCup = u.isCup;
      });
    }
    Object.keys(data).forEach(function (k) { data[k] = normalizeTournament(data[k]); });
    return data;
  }

  var tournamentsData = loadTournaments();

  function saveTournamentsToStorage() {
    try { localStorage.setItem('ff_tournaments', JSON.stringify(tournamentsData)); } catch (e) {}
  }

  var currentTourneyKey = (function () {
    var saved = localStorage.getItem('fav_tourney') || '5x5';
    if (tournamentsData[saved]) return saved;
    var first = Object.keys(tournamentsData)[0];
    return first || '5x5';
  })();
  function ensureCurrentTourney() {
    if (!tournamentsData[currentTourneyKey]) {
      var first = Object.keys(tournamentsData)[0];
      if (first) currentTourneyKey = first;
      else {
        tournamentsData['5x5'] = normalizeTournament(JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS['5x5'])));
        currentTourneyKey = '5x5';
      }
    }
    return currentTourneyKey;
  }

  var favoriteClub = localStorage.getItem("fav_club") || "Химмаш";
  var matchAlbums = (function () { try { return JSON.parse(localStorage.getItem('match_vk_albums') || '{}'); } catch(e) { return {}; } })();
  var organizersData = (function () { try { return JSON.parse(localStorage.getItem('ff_organizers') || '[]'); } catch(e) { return []; } })();
  var streamLinks = (function () { try { return JSON.parse(localStorage.getItem('ff_streams') || '{}'); } catch(e) { return {}; } })();
  var vkLiveLinks = (function () { try { return JSON.parse(localStorage.getItem('ff_vk_live') || '{}'); } catch(e) { return {}; } })();
  var teamPhotos = (function () { try { return JSON.parse(localStorage.getItem('ff_team_photos') || '{}'); } catch(e) { return {}; } })();

  function saveOrganizers() { try { localStorage.setItem('ff_organizers', JSON.stringify(organizersData)); } catch (e) {} }
  function saveStreamLinks() { try { localStorage.setItem('ff_streams', JSON.stringify(streamLinks)); } catch (e) {} }
  function saveMatchAlbums() { try { localStorage.setItem('match_vk_albums', JSON.stringify(matchAlbums)); } catch (e) {} }
  function saveVkLiveLinks() { try { localStorage.setItem('ff_vk_live', JSON.stringify(vkLiveLinks)); } catch (e) {} }
  function saveTeamPhotos() { try { localStorage.setItem('ff_team_photos', JSON.stringify(teamPhotos)); } catch (e) {} }

  /* ============ Логотипы ============ */
  function renderLogoHtml(logo, cls, bigSize) {
    logo = logo || '⚽';
    var isImage = false;
    try { isImage = (logo.indexOf("data:image") === 0 || logo.indexOf("http") === 0 || logo.indexOf("/") !== -1 || /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(logo)); } catch (e) {}
    if (isImage) return '<img src="' + logo + '" class="' + cls + '" alt="" loading="lazy">';
    var fs = bigSize ? '48px' : '20px';
    return '<span class="' + cls + '" style="display:inline-flex;align-items:center;justify-content:center;font-size:' + fs + ';">' + logo + '</span>';
  }
  function getClubLogoHtml(clubName, isLarge) {
    var c = clubsData.find(function (x) { return x.name === clubName; });
    return renderLogoHtml(c ? c.logo : "⚽", isLarge ? "badge-large" : "badge-icon", isLarge);
  }
  function getFedLogoHtml() { return renderLogoHtml(FED_LOGO, "badge-icon", false); }
  function getClubLogoForCard(clubName) {
    if (!clubName) return '<span class="badge-icon" style="font-size:22px;">⚽</span>';
    var c = clubsData.find(function (x) { return x.name === clubName; });
    var logo = c ? c.logo : '⚽';
    var isImage = false;
    try {
      isImage = (logo.indexOf('data:image') === 0 || logo.indexOf('http') === 0 ||
                 logo.indexOf('/') !== -1 || /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(logo));
    } catch (e) {}
    if (isImage) return '<img src="' + logo + '" alt="" class="badge-icon" loading="lazy" style="width:100%;height:100%;object-fit:contain;display:block;">';
    return '<span class="badge-icon" style="font-size:22px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">' + logo + '</span>';
  }

  /* ============ Статистика ============ */
  function calculateStandings(tKey) {
    var t = tournamentsData[tKey];
    if (!t) return { stats: [], players: [] };
    t = normalizeTournament(t);
    var stats = t.teams.map(function (name) { return { name: name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    var playerList = [];
    function getPlayer(name, club) {
      var p = playerList.find(function (x) { return x.name === name && x.club === club; });
      if (!p) { p = { name: name, club: club, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matches: [] }; playerList.push(p); }
      return p;
    }
    function parseScorersForPlayers(m) {
      if (!m || !m.scorers) return;
      String(m.scorers).split(';').forEach(function (part) {
        part = part.trim(); if (!part) return;
        var sp = part.split(':'); if (sp.length < 2) return;
        var club = sp[0].trim();
        var rest = sp.slice(1).join(':');
        var redPart = '';
        var kkIdx = rest.indexOf('КК:');
        if (kkIdx !== -1) { redPart = rest.slice(kkIdx + 3); rest = rest.slice(0, kkIdx); }
        var yellowPart = '';
        var zhkIdx = rest.indexOf('ЖК:');
        if (zhkIdx !== -1) { yellowPart = rest.slice(zhkIdx + 3); rest = rest.slice(0, zhkIdx); }
        rest.split(',').forEach(function (token) {
          token = token.trim().replace(/[\s,]+$/, ''); if (!token) return;
          if (/автогол|\(аг\)|техническ/i.test(token)) return;
          var cnt = 1; var mm = token.match(/\((\d+)\)/);
          if (mm) { cnt = parseInt(mm[1]) || 1; token = token.replace(/\((\d+)\)/, '').trim(); }
          var assistName = '';
          if (token.indexOf('/') !== -1) { var pp = token.split('/'); token = pp[0].trim(); assistName = (pp[1] || '').trim(); }
          var name = cleanName(token); if (!name) return;
          var p = getPlayer(name, club);
          p.goals += cnt;
          p.matches.push({ tour: m.tour || m.round || '', t1: m.t1, s1: m.s1, s2: m.s2, t2: m.t2, scored: cnt });
          if (assistName) { var aName = cleanName(assistName); if (aName) getPlayer(aName, club).assists += cnt; }
        });
        yellowPart.split(',').forEach(function (token) {
          token = token.trim().replace(/[\s,]+$/, ''); if (!token) return;
          var name = cleanName(token); if (!name) return;
          getPlayer(name, club).yellowCards++;
        });
        redPart.split(',').forEach(function (token) {
          token = token.trim().replace(/[\s,]+$/, ''); if (!token) return;
          var name = cleanName(token); if (!name) return;
          getPlayer(name, club).redCards++;
        });
      });
    }
    (t.matches || []).forEach(function (m) {
      if (!m || m.played === false) return;
      if (m.status === 'upcoming' || m.status === 'postponed' || m.status === 'cancelled') return;
      var c1 = stats.find(function (x) { return x.name === m.t1; });
      var c2 = stats.find(function (x) { return x.name === m.t2; });
      if (c1 && c2) {
        c1.p++; c2.p++;
        c1.gf += (m.s1 || 0); c1.ga += (m.s2 || 0);
        c2.gf += (m.s2 || 0); c2.ga += (m.s1 || 0);
        if (m.s1 > m.s2) { c1.w++; c1.pts += 3; c2.l++; }
        else if (m.s1 < m.s2) { c2.w++; c2.pts += 3; c1.l++; }
        else { c1.d++; c1.pts++; c2.d++; c2.pts++; }
      }
      parseScorersForPlayers(m);
    });
    if (t.playoff && Array.isArray(t.playoff.matches)) t.playoff.matches.forEach(parseScorersForPlayers);
    stats.sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      var d = t.matches.find(function (m) { return m && ((m.t1 === a.name && m.t2 === b.name) || (m.t2 === a.name && m.t1 === b.name)); });
      if (d) { if (d.t1 === a.name) return d.s1 > d.s2 ? -1 : 1; return d.s2 > d.s1 ? -1 : 1; }
      return (b.gf - b.ga) - (a.gf - a.ga);
    });
    return { stats: stats, players: playerList };
  }

  function getAssists(tKey) {
    var map = {};
    function add(name, club, count) {
      if (!name) return;
      var key = name + '|' + club;
      if (!map[key]) map[key] = { name: name, club: club, assists: 0 };
      map[key].assists += count;
    }
    if (tKey === '5x5' || tKey === 'cup_5x5') { ASSISTS_BASE_5X5.forEach(function (a) { add(a.name, a.club, a.assists); }); }
    var t = tournamentsData[tKey];
    if (t && t.matches) t.matches.forEach(function (m) {
      (m.events || []).forEach(function (e) { if (e.type === 'goal' && e.assist) add(e.assist, e.club, 1); });
    });
    if (t && t.playoff && t.playoff.matches) t.playoff.matches.forEach(function (m) {
      (m.events || []).forEach(function (e) { if (e.type === 'goal' && e.assist) add(e.assist, e.club, 1); });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.assists - a.assists; });
  }

  /* ============ НАВИГАЦИЯ + АВТОЗАКРЫТИЕ МОДАЛОК ============ */
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(function (m) {
      m.style.display = 'none';
      m.classList.remove('show');
    });
  }

  function showView(viewId) {
    closeAllModals();
    ['view-tourney', 'view-club', 'view-admin', 'view-affiche', 'view-welcome'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var target = document.getElementById('view-' + viewId);
    if (target) target.style.display = 'block';
    var hero = document.getElementById('heroCarousel');
    if (hero) {
      var hasHeroPhotos = false;
      try { var hp = JSON.parse(localStorage.getItem('hero_slider_photos') || '[]'); hasHeroPhotos = Array.isArray(hp) && hp.length > 0; } catch (e) {}
      hero.style.display = (viewId === 'tourney' && hasHeroPhotos) ? 'block' : 'none';
    }
  }

  function showWelcome() { showView('welcome'); renderWelcomeSlider(); renderWelcomeTournaments(); }
  function showAffiche() { showView('affiche'); renderAffiche(); }

  function enterTournament(tKey) {
    if (!tournamentsData[tKey]) return;
    currentTourneyKey = tKey;
    try { localStorage.setItem('fav_tourney', tKey); } catch (e) {}
    var t = tournamentsData[tKey];
    var heading = document.getElementById('tourneyTitleHeading');
    if (heading) heading.innerText = t.title || 'Турнир';
    renderSidebar();
    renderTourney();
    updateDynamicTabs();
    if (t.isCup) switchTourneyTab('playoff'); else switchTourneyTab('table');
    showView('tourney');
  }
  function selectTourney(tKey) { enterTournament(tKey); }

  /* ============ Вкладки ============ */
  function hasScorersData(t) {
    if (!t) return false;
    var inMatches = Array.isArray(t.matches) && t.matches.some(function (m) { return m && m.scorers && m.scorers.trim().length > 5; });
    var inPlayoff = t.playoff && Array.isArray(t.playoff.matches) && t.playoff.matches.some(function (m) { return m && m.scorers && m.scorers.trim().length > 5; });
    return inMatches || inPlayoff;
  }
  function hasAssistsData(t) {
    if (!t || !t.matches) return false;
    if (t.rosters && Object.keys(t.rosters).length) return true;
    return t.matches.some(function (m) { return (m.events || []).some(function (e) { return e.type === 'goal' && e.assist; }); });
  }
  function hasAwardsData(t) { return !!(t && t.awards && t.awards.length); }

  function updateDynamicTabs() {
    var t = tournamentsData[currentTourneyKey];
    if (!t) return;
    var isCup = !!t.isCup;
    var tabs = {
      table:      { btn: 'tabBtnTable',      cnt: 'tab-table',      visible: !isCup },
      matches:    { btn: 'tabBtnMatches',    cnt: 'tab-matches',    visible: !isCup },
      scorers:    { btn: 'tabBtnScorers',    cnt: 'tab-scorers',    visible: hasScorersData(t) },
      assists:    { btn: 'tabBtnAssists',    cnt: 'tab-assists',    visible: !isCup && hasAssistsData(t) },
      discipline: { btn: 'tabBtnDiscipline', cnt: 'tab-discipline', visible: hasScorersData(t) },
      playoff:    { btn: 'tabBtnPlayoff',    cnt: 'tab-playoff',    visible: !!(t.playoff && t.playoff.matches) },
      media:      { btn: 'tabBtnMedia',      cnt: 'tab-media',      visible: true },
      awards:     { btn: 'tabBtnAwards',     cnt: 'tab-awards',     visible: hasAwardsData(t) }
    };
    Object.keys(tabs).forEach(function (k) {
      var info = tabs[k];
      var btn = document.getElementById(info.btn);
      if (btn) btn.style.display = info.visible ? 'inline-block' : 'none';
      if (!info.visible) { var cnt = document.getElementById(info.cnt); if (cnt) cnt.style.display = 'none'; }
    });
  }

  function switchTourneyTab(tab) {
    ['table','matches','scorers','assists','discipline','playoff','media','awards'].forEach(function (k) {
      var el = document.getElementById('tab-' + k);
      if (el) el.style.display = tab === k ? 'block' : 'none';
    });
    var map = { table: 'tabBtnTable', matches: 'tabBtnMatches', scorers: 'tabBtnScorers', assists: 'tabBtnAssists', discipline: 'tabBtnDiscipline', playoff: 'tabBtnPlayoff', media: 'tabBtnMedia', awards: 'tabBtnAwards' };
    Object.keys(map).forEach(function (k) { var btn = document.getElementById(map[k]); if (btn) btn.className = "tab-btn " + (tab === k ? 'active' : ''); });
    try {
      if (tab === 'matches') renderCalendar();
      if (tab === 'awards') renderAwards();
      if (tab === 'assists') renderAssists();
      if (tab === 'discipline') renderDiscipline();
      if (tab === 'playoff') renderPlayoff();
      if (tab === 'media') renderMedia();
    } catch (e) { console.error(e); }
  }

  function setFavoriteClub(cName) {
    favoriteClub = cName;
    try { localStorage.setItem("fav_club", cName); } catch (e) {}
    renderTourney();
    renderSidebar();
  }

  /* ============ ПАРСЕР scorers — двухколоночный ============ */
  function parseScorersFull(str, t1, t2) {
    var result = {};
    result[t1] = { goals: [], yellow: [], red: [] };
    result[t2] = { goals: [], yellow: [], red: [] };
    if (!str) return result;

    var t1N = String(t1).toLowerCase().replace(/ё/g,'е').trim();
    var t2N = String(t2).toLowerCase().replace(/ё/g,'е').trim();

    String(str).split(/;\s*/).forEach(function (part) {
      part = part.trim(); if (!part) return;
      var ci = part.indexOf(':'); if (ci === -1) return;
      var rawClub = part.slice(0, ci).trim();
      var rest = part.slice(ci + 1).trim();
      var nClub = rawClub.toLowerCase().replace(/ё/g,'е').trim();

      var clubId = null;
      var c1 = clubsData.find(function (c) { return c.name === t1; });
      var c2 = clubsData.find(function (c) { return c.name === t2; });
      var c1N = c1 ? c1.name.toLowerCase().replace(/ё/g,'е').trim() : '';
      var c2N = c2 ? c2.name.toLowerCase().replace(/ё/g,'е').trim() : '';
      if (nClub === c1N || nClub === t1N) clubId = t1;
      else if (nClub === c2N || nClub === t2N) clubId = t2;
      if (!clubId) return;

      // КК
      var redStr = '';
      var m = rest.match(/,\s*КК:\s*(.+)$/);
      if (m) { redStr = m[1].trim(); rest = rest.slice(0, rest.length - m[0].length).trim(); }
      else { m = rest.match(/^КК:\s*(.+)$/); if (m) { redStr = m[1].trim(); rest = ''; } }
      // ЖК
      var yellowStr = '';
      m = rest.match(/,\s*ЖК:\s*(.+)$/);
      if (m) { yellowStr = m[1].trim(); rest = rest.slice(0, rest.length - m[0].length).trim(); }
      else { m = rest.match(/^ЖК:\s*(.+)$/); if (m) { yellowStr = m[1].trim(); rest = ''; } }

      if (rest) {
        rest.split(',').forEach(function (token) {
          token = token.trim(); if (!token) return;
          if (/техническ/i.test(token)) return;
          var isOwn = /автогол|\(аг\)/i.test(token);

          var count = 1;
          var cm = token.match(/\((\d+)\)/);
          if (cm) { count = parseInt(cm[1]) || 1; token = token.replace(/\((\d+)\)/g, '').trim(); }

          if (isOwn) {
            var nm = cleanName(token.replace(/автогол/i, '').replace(/\(аг\)/i, ''));
            if (nm) result[clubId].goals.push({ name: nm, count: 1, assist: '', ownGoal: true });
            return;
          }
          var assist = '';
          if (token.indexOf('/') !== -1) {
            var pp = token.split('/');
            token = pp[0].trim();
            assist = (pp[1] || '').trim();
          }
          token = cleanName(token);
          if (!token) return;
          result[clubId].goals.push({ name: token, count: count, assist: assist });
        });
      }
      if (yellowStr) yellowStr.split(',').forEach(function (t) { var nm = cleanName(t); if (nm) result[clubId].yellow.push({ name: nm }); });
      if (redStr) redStr.split(',').forEach(function (t) { var nm = cleanName(t); if (nm) result[clubId].red.push({ name: nm }); });
    });
    return result;
  }

  function renderGoalsColumn(goals, yellow, red) {
    // СТАРЫЙ формат — для совместимости с admin-extras
    var html = '';
    (goals || []).forEach(function (g) {
      var cls = 'lfld-card-goal';
      if (g.ownGoal) cls += ' lfld-card-goal-own';
      html += '<div class="' + cls + '">' + (g.ownGoal ? '(А/Г) ' : '') + g.name + (g.count > 1 ? ' (' + g.count + ')' : '') + '</div>';
    });
    (yellow || []).forEach(function (y) { html += '<div class="lfld-card-goal lfld-card-goal-yellow">' + y.name + '</div>'; });
    (red || []).forEach(function (r) { html += '<div class="lfld-card-goal lfld-card-goal-red">' + r.name + '</div>'; });
    return html || '<div class="lfld-card-goal-empty">—</div>';
  }

  /* ============ КАРТОЧКА МАТЧА — двухколоночный протокол ============ */
  function renderMatchCard(matchData) {
    var stage = matchData.stage || '';
    var date = matchData.date || '';
    var t1 = matchData.t1 || '';
    var t2 = matchData.t2 || '';
    var s1 = matchData.s1 !== undefined ? matchData.s1 : 0;
    var s2 = matchData.s2 !== undefined ? matchData.s2 : 0;
    var played = matchData.played !== false && (s1 > 0 || s2 > 0 || matchData.played === true);
    var editable = !!matchData.editable;
    var matchIdx = matchData.matchIdx;
    var onClick = matchData.onClick || '';
    var actionsHtml = matchData.actionsHtml || '';
    var expandable = !!matchData.expandable;
    var cardId = matchData.cardId || '';

    // Парсим scorers
    var scorersRaw = matchData.scorers;
    var parsed;
    if (typeof scorersRaw === 'string') {
      parsed = parseScorersFull(scorersRaw, t1, t2);
    } else if (scorersRaw && scorersRaw[t1] && Array.isArray(scorersRaw[t1].goals)) {
      parsed = scorersRaw;
    } else {
      parsed = parseScorersFull('', t1, t2);
    }
    var s1p = parsed[t1] || { goals: [], yellow: [], red: [] };
    var s2p = parsed[t2] || { goals: [], yellow: [], red: [] };

    var winner1 = played && s1 > s2;
    var winner2 = played && s2 > s1;

    var scoreHtml;
    if (editable) {
      scoreHtml = '<div class="lfld-card-score-edit" onclick="event.stopPropagation();">' +
        '<input type="number" class="lfld-card-score-input" min="0" value="' + s1 + '" onchange="window.updateBracketScore(' + matchIdx + ',\'s1\',this.value)">' +
        '<span class="lfld-card-score-sep">:</span>' +
        '<input type="number" class="lfld-card-score-input" min="0" value="' + s2 + '" onchange="window.updateBracketScore(' + matchIdx + ',\'s2\',this.value)">' +
      '</div>';
    } else {
      scoreHtml = '<div class="lfld-card-score">' + (played ? (s1 + ' : ' + s2) : 'VS') + '</div>';
    }

    // Двухколоночный протокол
    function colHtml(side) {
      var html = '';
      // --- голы ---
      side.goals.forEach(function (g) {
        var k = playerKey(g.name);
        var cls = g.ownGoal ? 'own-goal' : 'goal';
        html += '<div class="protocol-line ' + cls + '">' +
          '<span class="p-name player-name-clickable" onclick="openPlayerModal(\'' + escapeAttr(k) + '\')">' + escapeHtml(g.name) + '</span>' +
          (g.count > 1 ? '<span class="p-count">(' + g.count + ')</span>' : '') +
        '</div>';
        if (g.assist) {
          html += '<div class="protocol-line assist"><span class="p-assist">ассист: ' +
            '<span class="player-name-clickable" onclick="openPlayerModal(\'' + escapeAttr(playerKey(g.assist)) + '\')">' + escapeHtml(g.assist) + '</span>' +
          '</span></div>';
        }
      });
      // --- разделитель ---
      if (side.goals.length && (side.yellow.length || side.red.length)) {
        html += '<div class="protocol-sep"></div>';
      }
      // --- карточки ОТДЕЛЬНЫМИ строками ---
      side.yellow.forEach(function (y) {
        html += '<div class="protocol-line card-yellow"><span class="p-name player-name-clickable" onclick="openPlayerModal(\'' + escapeAttr(playerKey(y.name)) + '\')">' + escapeHtml(y.name) + '</span></div>';
      });
      side.red.forEach(function (r) {
        html += '<div class="protocol-line card-red"><span class="p-name player-name-clickable" onclick="openPlayerModal(\'' + escapeAttr(playerKey(r.name)) + '\')">' + escapeHtml(r.name) + '</span></div>';
      });
      return html || '<div class="protocol-empty">—</div>';
    }

    var hasProtocol = played && (
      s1p.goals.length + s1p.yellow.length + s1p.red.length +
      s2p.goals.length + s2p.yellow.length + s2p.red.length
    ) > 0;

    var cardClick;
    if (expandable && cardId) cardClick = 'window.__toggleBracketCard(\'' + cardId + '\', this)';
    else if (onClick) cardClick = onClick;
    else cardClick = '';
    var expanded = expandable && window.__bracketExpanded && window.__bracketExpanded[cardId];

    var html = '';
    html += '<div class="lfld-match-card' + (cardClick ? ' pointer' : '') + (expanded ? ' expanded' : '') + '"' + (cardClick ? ' onclick="' + cardClick + '"' : '') + '>';
    html +=   '<div class="lfld-match-card-top">';
    html +=     '<div class="lfld-match-card-title">РЕЗУЛЬТАТ МАТЧА</div>';
    html +=     '<div class="lfld-match-card-stage">' + escapeHtml(stage || '') + (date ? ' | ' + escapeHtml(date) : '') + '</div>';
    html +=   '</div>';
    html +=   '<div class="lfld-match-card-pill">';
    html +=     '<div class="lfld-card-team' + (winner1 ? ' winner' : '') + '">';
    html +=       '<div class="lfld-card-team-logo">' + getClubLogoForCard(t1) + '</div>';
    html +=       '<div class="lfld-card-team-name" onclick="event.stopPropagation(); openClubCabinet(\'' + escapeAttr(t1) + '\')">' + escapeHtml(t1) + '</div>';
    html +=     '</div>';
    html +=     scoreHtml;
    html +=     '<div class="lfld-card-team' + (winner2 ? ' winner' : '') + '">';
    html +=       '<div class="lfld-card-team-logo">' + getClubLogoForCard(t2) + '</div>';
    html +=       '<div class="lfld-card-team-name" onclick="event.stopPropagation(); openClubCabinet(\'' + escapeAttr(t2) + '\')">' + escapeHtml(t2) + '</div>';
    html +=     '</div>';
    html +=   '</div>';

    if (played && hasProtocol) {
      var style = (expandable && !expanded) ? ' style="display:none;"' : '';
      html += '<div class="lfld-match-card-protocol"' + style + '>';
      html +=   '<div class="protocol-col protocol-col-left">' + colHtml(s1p) + '</div>';
      html +=   '<div class="protocol-col protocol-col-right">' + colHtml(s2p) + '</div>';
      html += '</div>';
      if (expandable) {
        html += '<div class="lfld-card-expand-hint">' + (expanded ? '▲ Свернуть протокол' : '▼ Детали матча') + '</div>';
      }
    }
    if (actionsHtml && actionsHtml.trim()) {
      html += '<div class="lfld-match-card-actions" onclick="event.stopPropagation();">' + actionsHtml + '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ============ Турнирная таблица ============ */
  function renderTourney() {
    try {
      ensureCurrentTourney();
      var t = tournamentsData[currentTourneyKey]; if (!t) return;
      var data = calculateStandings(currentTourneyKey);
      var html = ''; var totalTeams = data.stats.length;
      data.stats.forEach(function (team, idx) {
        var isFav = team.name === favoriteClub;
        var rank = idx + 1; var rankClass = '';
        if (totalTeams >= 6) {
          if (rank <= 2) rankClass = 'rank-promotion';
          else if (rank >= 3 && rank <= 6) rankClass = 'rank-middle';
          else if (rank >= 7) rankClass = 'rank-relegation';
        }
        var trClass = [isFav ? 'fav-row' : '', rankClass].filter(Boolean).join(' ');
        html += '<tr class="' + trClass + '">';
        html += '<td>' + rank + '</td>';
        html += '<td class="text-left"><span class="club-link" onclick="openClubCabinet(\'' + escapeAttr(team.name) + '\')">' + getClubLogoHtml(team.name) + ' <strong>' + escapeHtml(team.name) + '</strong></span> ' + (isFav ? '★' : '') + '</td>';
        html += '<td>' + team.p + '</td><td>' + team.w + '</td><td>' + team.d + '</td><td>' + team.l + '</td>';
        html += '<td>' + team.gf + ' - ' + team.ga + '</td>';
        html += '<td><strong>' + team.pts + '</strong></td>';
        html += '<td><button onclick="setFavoriteClub(\'' + escapeAttr(team.name) + '\')">' + (isFav ? 'Выбран' : 'Выбрать') + '</button></td>';
        html += '</tr>';
      });
      var tb = document.getElementById('tableBody');
      if (tb) tb.innerHTML = html || '<tr><td colspan="9" style="text-align:center;">Нет команд</td></tr>';
      renderCalendar(); renderAssists(); renderDiscipline(); renderPlayoff();

      var sHtml = "";
      data.players.sort(function (a, b) { return b.goals - a.goals; });
      data.players.slice(0, 25).forEach(function (p, idx) {
        sHtml += '<tr class="pointer" onclick="openPlayerModal(\'' + escapeAttr(playerKey(p.name)) + '\')">';
        sHtml += '<td>' + (idx + 1) + '</td>';
        sHtml += '<td class="text-left"><strong>' + escapeHtml(p.name) + '</strong></td>';
        sHtml += '<td class="text-left"><span class="club-link" onclick="event.stopPropagation(); openClubCabinet(\'' + escapeAttr(p.club) + '\')">' + escapeHtml(p.club) + '</span></td>';
        sHtml += '<td class="goals-cell">' + p.goals + '</td>';
        sHtml += '<td class="yellow-cell">' + p.yellowCards + '</td>';
        sHtml += '<td class="red-cell">' + p.redCards + '</td>';
        sHtml += '</tr>';
      });
      var sb = document.getElementById('scorersBody');
      if (sb) sb.innerHTML = sHtml || '<tr><td colspan="6" style="text-align:center;">Пока нет данных</td></tr>';
      renderAwards();
    } catch (e) { console.error('renderTourney:', e); }
  }

  /* ============ Календарь ============ */
  function renderCalendar() {
    var t = tournamentsData[currentTourneyKey]; if (!t) return;
    var container = document.getElementById('calendarContainer'); if (!container) return;
    var matches = (t.matches || []).slice();
    matches.sort(function (a, b) {
      var na = parseInt((a.tour || '').replace(/\D/g, '')) || 0;
      var nb = parseInt((b.tour || '').replace(/\D/g, '')) || 0;
      if (na !== nb) return na - nb;
      return (a.date || '').localeCompare(b.date || '');
    });
    var groups = {}, order = [];
    matches.forEach(function (m) {
      var k = m.tour || '—';
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(m);
    });
    if (!order.length) { container.innerHTML = '<p style="color:#94a3b8;">Матчей пока нет.</p>'; return; }
    var html = '';
    order.forEach(function (tour) {
      html += '<div class="calendar-tour">';
      html += '<div class="calendar-tour-title">' + escapeHtml(tour) + '</div>';
      html += '<div class="lfld-matches-list">';
      groups[tour].forEach(function (m) {
        var idx = t.matches.indexOf(m);
        var matchRef = currentTourneyKey + '|' + idx;
        var played = m.played !== false && m.s1 !== undefined && (m.s1 > 0 || m.s2 > 0 || m.played === true);
        var stageLabel = tour;
        if (m.stadium) stageLabel += ' • ' + m.stadium;
        var actionsHtml = getMatchAlbumButtonHtml(currentTourneyKey, m) + ' ' + getMatchStreamHtml(currentTourneyKey, m);
        html += renderMatchCard({
          stage: stageLabel, date: m.date || '', t1: m.t1, t2: m.t2,
          s1: m.s1 || 0, s2: m.s2 || 0, played: played, scorers: m.scorers || '',
          onClick: 'openMatchPoster(\'' + escapeAttr(matchRef) + '\')',
          actionsHtml: actionsHtml
        });
      });
      html += '</div></div>';
    });
    container.innerHTML = html;
  }

  function getMatchAlbumButtonHtml(tk, m) {
    var id = makeMatchId(tk, m);
    if (!matchAlbums[id]) return '';
    return '<button class="vk-album-btn" onclick="event.stopPropagation(); openVkAlbum(\'' + escapeAttr(id) + '\')">Фотоотчёт</button>';
  }
  function getMatchStreamHtml(tk, m) {
    var id = makeMatchId(tk, m);
    var vkLive = vkLiveLinks[id]; var s = streamLinks[id];
    if (vkLive) return '<a class="stream-btn" href="' + vkLive + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">🔴 Эфир VK</a>';
    if (s) {
      if (s.status === 'live' && s.url) return '<a class="stream-btn" href="' + s.url + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">● Прямой эфир</a>';
      if (s.replay) return '<a class="stream-btn replay" href="' + s.replay + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">Смотреть запись</a>';
      if (s.url) return '<a class="stream-btn replay" href="' + s.url + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">Трансляция</a>';
    }
    return '';
  }

  /* ============ VK / Постер ============ */
  function openVkAlbum(matchId) {
    var url = matchAlbums[matchId]; if (!url) return;
    closePlayerModal();
    var parts = matchId.split('_');
    var tk = parts[0], tour = parts[1], t1 = parts[2], t2 = parts[3];
    var match = null;
    if (tournamentsData[tk]) { match = (tournamentsData[tk].matches || []).find(function (x) { return (x.tour === tour || x.round === tour) && x.t1 === t1 && x.t2 === t2; }); }
    document.getElementById('vkAlbumTitle').innerText = t1 + ' — ' + t2;
    var sub = tour; if (match) sub += '  •  Счёт ' + match.s1 + ':' + match.s2;
    document.getElementById('vkAlbumSubtitle').innerText = sub;
    document.getElementById('vkAlbumFrame').innerHTML = '<iframe src="' + url.replace('m.vk.com', 'vk.com') + '" allowfullscreen></iframe>';
    document.getElementById('vkAlbumOpenLink').href = url;
    document.getElementById('vkAlbumModal').style.display = 'flex';
  }
  function closeVkAlbum() {
    var m = document.getElementById('vkAlbumModal'); if (m) m.style.display = 'none';
    var f = document.getElementById('vkAlbumFrame'); if (f) f.innerHTML = '';
  }

  function openMatchPoster(matchRef) {
    try {
      var parts = matchRef.split('|'); var tk = parts[0]; var idx = parseInt(parts[1]);
      var t = tournamentsData[tk];
      if (!t || !t.matches || !t.matches[idx]) return;
      var m = t.matches[idx];
      var matchId = makeMatchId(tk, m);
      var vkLive = vkLiveLinks[matchId]; var s = streamLinks[matchId];
      var streamUrl = vkLive || (s && (s.status === 'live' ? s.url : s.replay)) || (s && s.url) || '';
      var played = m.played !== false && m.s1 !== undefined && (m.s1 > 0 || m.s2 > 0 || m.played === true);
      var status = m.status || (played ? 'finished' : 'upcoming');
      var statusLabel = { upcoming: 'ПРЕДСТОЯЩИЙ МАТЧ', live: 'ПРЯМОЙ ЭФИР', finished: 'ФИНАЛЬНЫЙ СЧЁТ', postponed: 'ОТЛОЖЕН', cancelled: 'ОТМЕНЁН' }[status] || 'МАТЧ';
      var goals = {}; var yellows = {}; var reds = {};
      function parseSide(side, club) {
        if (!side) return;
        var redPart = '';
        var kkIdx = side.indexOf('КК:');
        if (kkIdx !== -1) { redPart = side.slice(kkIdx + 3); side = side.slice(0, kkIdx); }
        var yellowPart = '';
        var zhkIdx = side.indexOf('ЖК:');
        if (zhkIdx !== -1) { yellowPart = side.slice(zhkIdx + 3); side = side.slice(0, zhkIdx); }
        var goalArr = [];
        side.split(',').forEach(function (tk2) {
          tk2 = tk2.trim().replace(/[\s,]+$/, ''); if (!tk2) return;
          if (/автогол|\(аг\)|техническ/i.test(tk2)) return;
          var cnt = 1; var mm = tk2.match(/\((\d+)\)/);
          if (mm) { cnt = parseInt(mm[1]) || 1; tk2 = tk2.replace(/\((\d+)\)/, '').trim(); }
          if (tk2.indexOf('/') !== -1) tk2 = tk2.split('/')[0].trim();
          var name = cleanName(tk2); if (!name) return;
          goalArr.push({ name: name, cnt: cnt });
        });
        goals[club] = goalArr;
        var yArr = []; yellowPart.split(',').forEach(function (tk2) { var n = cleanName(tk2.trim()); if (n) yArr.push(n); });
        yellows[club] = yArr;
        var rArr = []; redPart.split(',').forEach(function (tk2) { var n = cleanName(tk2.trim()); if (n) rArr.push(n); });
        reds[club] = rArr;
      }
      (m.scorers || '').split(';').forEach(function (part) {
        var sp = part.split(':'); if (sp.length < 2) return;
        var club = sp[0].trim();
        if (club === m.t1 || club === m.t2) parseSide(sp.slice(1).join(':'), club);
      });
      var html = '';
      html += '<div class="poster">';
      html += '<div class="poster-top">';
      html += '<div class="poster-league"><img src="' + FED_LOGO + '" alt="" class="poster-league-logo"><span>ЛФЛД • ФЕДЕРАЦИЯ ФУТБОЛА</span></div>';
      html += '<div class="poster-tourney">' + escapeHtml(t.title || '') + '</div>';
      html += '<div class="poster-status poster-status-' + status + '">' + statusLabel + '</div>';
      if (m.date) html += '<div class="poster-date">' + escapeHtml(m.date) + (m.stadium ? ' • ' + escapeHtml(m.stadium) : '') + '</div>';
      html += '</div>';
      html += '<div class="poster-pill">';
      html += '<div class="poster-team">' + getClubLogoHtml(m.t1, true) + '<div class="poster-team-name">' + escapeHtml(m.t1) + '</div></div>';
      html += '<div class="poster-score">' + (played ? (m.s1 + ' : ' + m.s2) : 'VS') + '</div>';
      html += '<div class="poster-team">' + getClubLogoHtml(m.t2, true) + '<div class="poster-team-name">' + escapeHtml(m.t2) + '</div></div>';
      html += '</div>';
      var hasGoals = (goals[m.t1] && goals[m.t1].length) || (goals[m.t2] && goals[m.t2].length);
      var hasYellow = (yellows[m.t1] && yellows[m.t1].length) || (yellows[m.t2] && yellows[m.t2].length);
      var hasRed = (reds[m.t1] && reds[m.t1].length) || (reds[m.t2] && reds[m.t2].length);
      if (hasGoals || hasYellow || hasRed) {
        html += '<div class="poster-stats">';
        if (hasGoals) {
          html += '<div class="poster-col"><div class="poster-col-title">⚽ АВТОРЫ ГОЛОВ</div>';
          [m.t1, m.t2].forEach(function (club) {
            var arr = goals[club] || []; if (!arr.length) return;
            html += '<div class="poster-col-club">' + escapeHtml(club) + '</div>';
            arr.forEach(function (g) { html += '<div class="poster-goal-row">' + escapeHtml(g.name) + (g.cnt > 1 ? ' <span class="poster-goal-cnt">(' + g.cnt + ')</span>' : '') + '</div>'; });
          });
          html += '</div>';
        }
        if (hasYellow) {
          html += '<div class="poster-col"><div class="poster-col-title poster-col-title-yellow">🟨 ЖЁЛТЫЕ</div>';
          [m.t1, m.t2].forEach(function (club) { var arr = yellows[club] || []; if (!arr.length) return; html += '<div class="poster-col-club">' + escapeHtml(club) + '</div>'; arr.forEach(function (n) { html += '<div class="poster-card-row poster-card-yellow">' + escapeHtml(n) + '</div>'; }); });
          html += '</div>';
        }
        if (hasRed) {
          html += '<div class="poster-col"><div class="poster-col-title poster-col-title-red">🟥 КРАСНЫЕ</div>';
          [m.t1, m.t2].forEach(function (club) { var arr = reds[club] || []; if (!arr.length) return; html += '<div class="poster-col-club">' + escapeHtml(club) + '</div>'; arr.forEach(function (n) { html += '<div class="poster-card-row poster-card-red">' + escapeHtml(n) + '</div>'; }); });
          html += '</div>';
        }
        html += '</div>';
      } else if (played) { html += '<div class="poster-nodata">Протокол матча без детализации</div>'; }
      if (streamUrl) html += '<a class="poster-stream-btn" href="' + streamUrl + '" target="_blank" rel="noopener">🔴 Смотреть трансляцию матча ВКонтакте</a>';
      html += '<div class="poster-footer">' + VK_COMMUNITY_URL + '</div>';
      html += '</div>';
      document.getElementById('matchPosterBody').innerHTML = html;
      document.getElementById('matchPosterModal').style.display = 'flex';
    } catch (e) { console.error('openMatchPoster:', e); }
  }
  function closeMatchPoster() { var m = document.getElementById('matchPosterModal'); if (m) m.style.display = 'none'; }

  /* ============ Плей-офф ============ */
  function getMatchWinner(m) { if (!m || !m.t1 || !m.t2) return ''; if ((m.s1 || 0) > (m.s2 || 0)) return m.t1; if ((m.s2 || 0) > (m.s1 || 0)) return m.t2; return ''; }
  function getMatchLoser(m) { if (!m || !m.t1 || !m.t2) return ''; if ((m.s1 || 0) > (m.s2 || 0)) return m.t2; if ((m.s2 || 0) > (m.s1 || 0)) return m.t1; return ''; }
  function resolveBracket(tKey) {
    var t = tournamentsData[tKey];
    if (!t || !t.playoff) return null;
    var m = t.playoff.matches || [];
    var source = t.playoff.source || '5x5';
    var standings = calculateStandings(source).stats;
    var top6 = standings.slice(0, 6);
    var r = {
      qf1: Object.assign({}, m[0] || {}), qf2: Object.assign({}, m[1] || {}),
      sf1: Object.assign({}, m[2] || {}), sf2: Object.assign({}, m[3] || {}),
      third: Object.assign({}, m[4] || {}), final: Object.assign({}, m[5] || {})
    };
    if (r.qf1 && !r.qf1.t1 && top6[3]) r.qf1.t1 = top6[3].name;
    if (r.qf1 && !r.qf1.t2 && top6[4]) r.qf1.t2 = top6[4].name;
    if (r.qf2 && !r.qf2.t1 && top6[2]) r.qf2.t1 = top6[2].name;
    if (r.qf2 && !r.qf2.t2 && top6[5]) r.qf2.t2 = top6[5].name;
    var wQF1 = getMatchWinner(r.qf1), wQF2 = getMatchWinner(r.qf2);
    if (r.sf1) { if (!r.sf1.t1 && wQF1) r.sf1.t1 = wQF1; if (!r.sf1.t2 && top6[0]) r.sf1.t2 = top6[0].name; }
    if (r.sf2) { if (!r.sf2.t1 && wQF2) r.sf2.t1 = wQF2; if (!r.sf2.t2 && top6[1]) r.sf2.t2 = top6[1].name; }
    var wSF1 = getMatchWinner(r.sf1), lSF1 = getMatchLoser(r.sf1);
    var wSF2 = getMatchWinner(r.sf2), lSF2 = getMatchLoser(r.sf2);
    if (r.final) { if (!r.final.t1 && wSF1) r.final.t1 = wSF1; if (!r.final.t2 && wSF2) r.final.t2 = wSF2; }
    if (r.third) { if (!r.third.t1 && lSF1) r.third.t1 = lSF1; if (!r.third.t2 && lSF2) r.third.t2 = lSF2; }
    r.seed1 = top6[0] ? { name: top6[0].name, place: '1 место (авто-проход)' } : null;
    r.seed2 = top6[1] ? { name: top6[1].name, place: '2 место (авто-проход)' } : null;
    return r;
  }
  function renderBracketMatch(elId, match, matchIdx, place1, place2) {
    var el = document.getElementById(elId); if (!el) return;
    var t1 = (match && match.t1) ? match.t1 : '';
    var t2 = (match && match.t2) ? match.t2 : '';
    var s1 = (match && match.s1 !== undefined) ? (match.s1 || 0) : 0;
    var s2 = (match && match.s2 !== undefined) ? (match.s2 || 0) : 0;
    var date = (match && match.date) ? match.date : '';
    var scorers = parseScorersFull((match && match.scorers) || '', t1, t2);
    var round = (match && match.round) ? match.round : '';
    var played = t1 && t2 && (s1 > 0 || s2 > 0);
    var stageLabel = round || 'Матч';
    if (place1 || place2) {
      var hint = []; if (place1) hint.push(place1); if (place2) hint.push(place2);
      stageLabel += ' • ' + hint.join(' / ');
    }
    el.innerHTML = renderMatchCard({
      stage: stageLabel, date: date,
      t1: t1, t2: t2, s1: s1, s2: s2,
      played: played, scorers: scorers,
      editable: true, matchIdx: matchIdx,
      expandable: true,
      cardId: 'bracket_' + currentTourneyKey + '_' + matchIdx
    });
  }
  function renderSeedCard(elId, seed) {
    var el = document.getElementById(elId); if (!el) return;
    if (!seed) {
      el.innerHTML = '<div class="lfld-match-card"><div class="lfld-match-card-top"><div class="lfld-match-card-title">АВТО-ПРОХОД</div><div class="lfld-match-card-stage">—</div></div><div class="lfld-match-card-pill"><div class="lfld-card-team"><div class="lfld-card-team-name">—</div></div><div class="lfld-card-score">—</div><div class="lfld-card-team"><div class="lfld-card-team-name">—</div></div></div></div>';
      return;
    }
    var html = '';
    html += '<div class="lfld-match-card">';
    html +=   '<div class="lfld-match-card-top">';
    html +=     '<div class="lfld-match-card-title">АВТО-ПРОХОД</div>';
    html +=     '<div class="lfld-match-card-stage">' + escapeHtml(seed.place) + '</div>';
    html +=   '</div>';
    html +=   '<div class="lfld-match-card-pill">';
    html +=     '<div class="lfld-card-team" style="grid-column:1/3;">';
    html +=       '<div class="lfld-card-team-logo">' + getClubLogoForCard(seed.name) + '</div>';
    html +=       '<div class="lfld-card-team-name" onclick="openClubCabinet(\'' + escapeAttr(seed.name) + '\')">' + escapeHtml(seed.name) + '</div>';
    html +=     '</div>';
    html +=     '<div class="lfld-card-score">→</div>';
    html +=   '</div>';
    html += '</div>';
    el.innerHTML = html;
  }
  function renderPlayoff() {
    var t = tournamentsData[currentTourneyKey];
    var titleEl = document.getElementById('playoffTitle');
    if (!t || !t.playoff) return;
    if (titleEl) titleEl.innerText = t.playoff.title || 'Сетка плей-офф';
    var r = resolveBracket(currentTourneyKey); if (!r) return;
    renderBracketMatch('bracket-qf1',  r.qf1,  0, '4 место', '5 место');
    renderBracketMatch('bracket-qf2',  r.qf2,  1, '3 место', '6 место');
    renderBracketMatch('bracket-sf1',  r.sf1,  2, 'Победитель 1/4', '1 место');
    renderBracketMatch('bracket-sf2',  r.sf2,  3, 'Победитель 1/4', '2 место');
    renderBracketMatch('bracket-final', r.final, 5, 'Победитель 1/2', 'Победитель 1/2');
    renderBracketMatch('bracket-third', r.third, 4, 'Проигравший 1/2', 'Проигравший 1/2');
    renderSeedCard('bracket-seed1', r.seed1);
    renderSeedCard('bracket-seed2', r.seed2);
    requestAnimationFrame(function () { requestAnimationFrame(drawBracketLines); });
  }
  function drawBracketLines() {
    var svg = document.getElementById('bracketSvg');
    var root = document.getElementById('bracketRoot');
    if (!svg || !root) return;
    svg.innerHTML = '';
    var rootRect = root.getBoundingClientRect();
    var w = root.scrollWidth, h = root.scrollHeight;
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.style.width = w + 'px'; svg.style.height = h + 'px';
    var links = [
      { from: 'bracket-qf1',  to: 'bracket-sf1',   style: 'solid' },
      { from: 'bracket-seed1', to: 'bracket-sf1',  style: 'dashed' },
      { from: 'bracket-qf2',  to: 'bracket-sf2',   style: 'solid' },
      { from: 'bracket-seed2', to: 'bracket-sf2',  style: 'dashed' },
      { from: 'bracket-sf1',  to: 'bracket-final', style: 'solid' },
      { from: 'bracket-sf2',  to: 'bracket-final', style: 'solid' },
      { from: 'bracket-sf1',  to: 'bracket-third', style: 'third' },
      { from: 'bracket-sf2',  to: 'bracket-third', style: 'third' }
    ];
    links.forEach(function (link) {
      var a = document.getElementById(link.from);
      var b = document.getElementById(link.to);
      if (!a || !b) return;
      var ar = a.getBoundingClientRect(); var br = b.getBoundingClientRect();
      var x1 = ar.right - rootRect.left; var y1 = ar.top + ar.height / 2 - rootRect.top;
      var x2 = br.left - rootRect.left; var y2 = br.top + br.height / 2 - rootRect.top;
      var midX = (x1 + x2) / 2;
      var d = 'M ' + x1 + ' ' + y1 + ' H ' + midX + ' V ' + y2 + ' H ' + x2;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '2');
      if (link.style === 'dashed') { path.setAttribute('stroke', 'rgba(245,166,35,0.35)'); path.setAttribute('stroke-dasharray', '6,5'); }
      else if (link.style === 'third') { path.setAttribute('stroke', 'rgba(148,163,184,0.3)'); path.setAttribute('stroke-dasharray', '4,4'); }
      else { path.setAttribute('stroke', 'rgba(245,166,35,0.6)'); }
      svg.appendChild(path);
    });
  }

  window.updateBracketScore = function (matchIdx, field, value) {
    var t = tournamentsData[currentTourneyKey];
    if (!t || !t.playoff || !t.playoff.matches[matchIdx]) return;
    t.playoff.matches[matchIdx][field] = Math.max(0, parseInt(value) || 0);
    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
    renderPlayoff();
  };
  window.addEventListener('resize', function () {
    var tab = document.getElementById('tab-playoff');
    if (tab && tab.style.display === 'block') setTimeout(drawBracketLines, 50);
  });

  /* ============ Ассистенты / Дисциплина / Медиа / Награды ============ */
  function renderAssists() {
    var list = getAssists(currentTourneyKey);
    var body = document.getElementById('assistsBody'); if (!body) return;
    var html = '';
    list.slice(0, 30).forEach(function (p, idx) {
      html += '<tr class="pointer" onclick="openPlayerModal(\'' + escapeAttr(playerKey(p.name)) + '\')">';
      html += '<td>' + (idx + 1) + '</td>';
      html += '<td class="text-left"><strong>' + escapeHtml(p.name) + '</strong></td>';
      html += '<td class="text-left"><span class="club-link" onclick="event.stopPropagation(); openClubCabinet(\'' + escapeAttr(p.club) + '\')">' + escapeHtml(p.club) + '</span></td>';
      html += '<td class="assist-cell">' + p.assists + '</td></tr>';
    });
    body.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">Пока нет данных</td></tr>';
  }
  function renderDiscipline() {
    var data = calculateStandings(currentTourneyKey);
    var body = document.getElementById('disciplineBody'); if (!body) return;
    var list = data.players.filter(function (p) { return p.yellowCards > 0 || p.redCards > 0; });
    list.sort(function (a, b) { if (b.redCards !== a.redCards) return b.redCards - a.redCards; return b.yellowCards - a.yellowCards; });
    if (!list.length) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Нет дисциплинарных нарушений</td></tr>'; return; }
    var html = '';
    list.forEach(function (p, idx) {
      html += '<tr class="pointer" onclick="openPlayerModal(\'' + escapeAttr(playerKey(p.name)) + '\')">';
      html += '<td>' + (idx + 1) + '</td>';
      html += '<td class="text-left"><strong>' + escapeHtml(p.name) + '</strong></td>';
      html += '<td class="text-left"><span class="club-link" onclick="event.stopPropagation(); openClubCabinet(\'' + escapeAttr(p.club) + '\')">' + escapeHtml(p.club) + '</span></td>';
      html += '<td class="yellow-cell">' + p.yellowCards + '</td>';
      html += '<td class="red-cell">' + p.redCards + '</td></tr>';
    });
    body.innerHTML = html;
  }
  function renderMedia() {
    var t = tournamentsData[currentTourneyKey];
    var container = document.getElementById('mediaGrid'); if (!container || !t) return;
    var all = [];
    (t.matches || []).forEach(function (m, idx) {
      var id = makeMatchId(currentTourneyKey, m);
      var vkLive = vkLiveLinks[id]; var s = streamLinks[id];
      if (vkLive || (s && (s.url || s.replay))) all.push({ m: m, vkLive: vkLive, s: s, idx: idx, playoff: false });
    });
    if (t.playoff && t.playoff.matches) {
      t.playoff.matches.forEach(function (m, idx) {
        var id = makeMatchId(currentTourneyKey, m);
        var vkLive = vkLiveLinks[id]; var s = streamLinks[id];
        if (vkLive || (s && (s.url || s.replay))) all.push({ m: m, vkLive: vkLive, s: s, idx: idx, playoff: true });
      });
    }
    if (!all.length) { container.innerHTML = '<div class="media-empty">Пока нет привязанных трансляций.</div>'; return; }
    var html = '';
    all.forEach(function (x) {
      var m = x.m;
      var url = x.vkLive || (x.s && (x.s.status === 'live' ? x.s.url : x.s.replay)) || (x.s && x.s.url) || '';
      html += '<div class="media-card">';
      html += '<div class="media-card-head"><span class="media-tour">' + escapeHtml(m.tour || m.round || '') + '</span>' + (x.playoff ? '<span class="media-badge-playoff">Кубок</span>' : '') + '</div>';
      html += '<div class="media-card-title">' + escapeHtml(m.t1) + ' — ' + escapeHtml(m.t2) + '</div>';
      if (m.date) html += '<div class="media-card-date">' + escapeHtml(m.date) + '</div>';
      if (m.s1 !== undefined) html += '<div class="media-card-score">' + m.s1 + ' : ' + m.s2 + '</div>';
      html += '<div class="media-card-actions">';
      if (url) html += '<a class="stream-btn" href="' + url + '" target="_blank" rel="noopener">🔴 Смотреть</a>';
      html += '</div></div>';
    });
    container.innerHTML = html;
  }
  function renderAwards() {
    var t = tournamentsData[currentTourneyKey];
    var awards = (t && t.awards) ? t.awards : [];
    var container = document.getElementById('awardsList'); if (!container) return;
    if (!awards.length) { container.innerHTML = '<div class="award-empty">Номинации пока не заполнены</div>'; return; }
    var html = '';
    awards.forEach(function (a) {
      var lastName = (a.name || '').split(/\s+/)[0];
      html += '<div class="award-item">';
      html += '<div class="award-title">' + escapeHtml(a.title) + '</div>';
      html += '<div class="award-pill" onclick="openPlayerModal(\'' + escapeAttr(playerKey(lastName)) + '\')">';
      html += getClubLogoHtml(a.club);
      html += '<span class="award-name">' + escapeHtml(a.name) + ' <span class="award-club">(' + escapeHtml(a.club) + ')</span></span>';
      html += '</div></div>';
    });
    container.innerHTML = html;
  }

  /* ============ Профиль клуба ============ */
  function openClubCabinet(clubName, tourneyKey) {
    try {
      if (!clubName) return;
      showView('club');
      document.getElementById('clubHeroName').innerText = "ФК «" + clubName + "»";
      document.getElementById('clubLogoHero').innerHTML = getClubLogoHtml(clubName, true);

      // Фото + руководство из teamsData.js
      var _clubKey = null;
      if (window.teamsDatabase) {
        var _resolve = (window.teamRosters && window.teamRosters.resolveClubName) || null;
        var _keys = Object.keys(window.teamsDatabase);
        for (var _i = 0; _i < _keys.length; _i++) {
          var _k = _keys[_i];
          if (_k === clubName) { _clubKey = _k; break; }
          if (_resolve && _resolve(_k) === clubName) { _clubKey = _k; break; }
        }
      }
      var _tdb = _clubKey ? window.teamsDatabase[_clubKey] : null;
      var _heroEl = document.getElementById('clubHeroPhoto');
      if (_heroEl) {
        if (_tdb && _tdb.photo) _heroEl.innerHTML = '<img src="' + _tdb.photo + '" alt="">';
        else _heroEl.innerHTML = '<div class="club-hero-photo-placeholder">Фото команды не загружено</div>';
      }
      var _leadEl = document.getElementById('clubLeadership');
      if (_leadEl) {
        if (_tdb && _tdb.leadership && _tdb.leadership.length) {
          _leadEl.innerHTML = _tdb.leadership.map(function (l) {
            return '<div class="club-leadership-card">' +
              '<div class="role">' + escapeHtml(l.role || 'Руководство') + '</div>' +
              '<div class="name">' + escapeHtml(l.name || '') + '</div>' +
              '</div>';
          }).join('');
        } else {
          _leadEl.innerHTML = '';
        }
      }

      var playedTourneys = [];
      Object.keys(tournamentsData).forEach(function (k) {
        var t = tournamentsData[k];
        if (t && t.teams && t.teams.indexOf(clubName) !== -1) playedTourneys.push(k);
      });
      if (!playedTourneys.length) {
        document.getElementById('clubTourneyTabs').innerHTML = "";
        document.getElementById('clubRosterBody').innerHTML = '<tr><td colspan="6" style="text-align:center;">Клуб не участвует в текущих турнирах</td></tr>';
        document.getElementById('clubMatchesGrid').innerHTML = "";
        renderClubPhotos(clubName, null);
        return;
      }
      var activeKey = tourneyKey || (playedTourneys.indexOf(currentTourneyKey) !== -1 ? currentTourneyKey : playedTourneys[0]);
      var tabsHtml = "";
      playedTourneys.forEach(function (tk) {
        tabsHtml += '<button class="tab-btn ' + (tk === activeKey ? 'active' : '') + '" onclick="openClubCabinet(\'' + escapeAttr(clubName) + '\', \'' + tk + '\')">' + escapeHtml(tournamentsData[tk].title || tk) + '</button>';
      });
      document.getElementById('clubTourneyTabs').innerHTML = tabsHtml;

      var res = calculateStandings(activeKey);
      var statsMap = {};
      res.players.forEach(function (x) { if (x.club === clubName) statsMap[playerKeyFromFull(x.name)] = x; });

      var rosterObjs = (window.teamRosters ? window.teamRosters.get(clubName) : []);
      var rHtml = "";

      if (rosterObjs.length) {
        rosterObjs.forEach(function (p) {
          var name = typeof p === 'string' ? p : p.name;
          var num  = typeof p === 'string' ? '' : (p.num || '');
          var pos  = typeof p === 'string' ? 'УНИ' : (p.pos || 'УНИ');
          var cap  = typeof p === 'string' ? false : !!p.captain;
          var stats = statsMap[playerKeyFromFull(name)] || {};
          var posCls = 'pos-' + pos.toLowerCase();
          rHtml += '<tr>';
          rHtml += '<td class="text-left">' + (num ? '<strong>#' + num + '</strong> ' : '') + '<strong>' + escapeHtml(name) + '</strong>' + (cap ? ' <span style="color:var(--gold)">(К)</span>' : '') + '</td>';
          rHtml += '<td><span class="pos-badge ' + posCls + '">' + pos + '</span></td>';
          rHtml += '<td class="goals-cell">' + (stats.goals || 0) + '</td>';
          rHtml += '<td class="yellow-cell">' + (stats.yellowCards || 0) + '</td>';
          rHtml += '<td class="red-cell">' + (stats.redCards || 0) + '</td>';
          rHtml += '<td><button onclick="event.stopPropagation(); openPlayerModal(\'' + escapeAttr(playerKey(name)) + '\')">Досье</button></td>';
          rHtml += '</tr>';
        });
      } else {
        var roster = res.players.filter(function (x) { return x.club === clubName; }).sort(function (a, b) { return b.goals - a.goals; });
        if (!roster.length && tournamentsData[activeKey].rosters && tournamentsData[activeKey].rosters[clubName]) {
          tournamentsData[activeKey].rosters[clubName].forEach(function (name) {
            roster.push({ name: name, club: clubName, goals: 0, yellowCards: 0, redCards: 0 });
          });
        }
        roster.forEach(function (p) {
          rHtml += '<tr class="pointer" onclick="openPlayerModal(\'' + escapeAttr(playerKey(p.name)) + '\')">';
          rHtml += '<td class="text-left"><strong>' + escapeHtml(p.name) + '</strong></td>';
          rHtml += '<td><span class="pos-badge pos-uni">УНИ</span></td>';
          rHtml += '<td class="goals-cell">' + (p.goals || 0) + '</td>';
          rHtml += '<td class="yellow-cell">' + (p.yellowCards || 0) + '</td>';
          rHtml += '<td class="red-cell">' + (p.redCards || 0) + '</td>';
          rHtml += '<td><button>Досье</button></td></tr>';
        });
      }
      document.getElementById('clubRosterBody').innerHTML = rHtml || '<tr><td colspan="6" style="text-align:center;">Пока нет данных</td></tr>';

      var cMatches = (tournamentsData[activeKey].matches || []).filter(function (m) { return m.t1 === clubName || m.t2 === clubName; });
      var cmHtml = "";
      cMatches.forEach(function (m) {
        var idx = tournamentsData[activeKey].matches.indexOf(m);
        var played = m.played !== false && (m.s1 > 0 || m.s2 > 0 || m.played === true);
        var actionsHtml = getMatchAlbumButtonHtml(activeKey, m) + ' ' + getMatchStreamHtml(activeKey, m);
        cmHtml += renderMatchCard({
          stage: m.tour, date: m.date || '',
          t1: m.t1, t2: m.t2, s1: m.s1 || 0, s2: m.s2 || 0,
          played: played, scorers: m.scorers || '',
          onClick: 'openMatchPoster(\'' + escapeAttr(activeKey + '|' + idx) + '\')',
          actionsHtml: actionsHtml
        });
      });
      document.getElementById('clubMatchesGrid').innerHTML = cmHtml || '<p style="color:#94a3b8;">Матчей пока нет.</p>';
      renderClubPhotos(clubName, activeKey);
    } catch (e) { console.error(e); }
  }

  function renderClubPhotos(clubName, activeKey) {
    var grid = document.getElementById('clubPhotosGrid'); if (!grid) return;
    var photos = teamPhotos[clubName] || [];
    if (activeKey) photos = photos.filter(function (p) { return !p.tourney || p.tourney === activeKey; });
    if (!photos.length) { grid.innerHTML = '<div class="club-photos-empty">Пока нет фотографий с матчей.</div>'; return; }
    var html = '';
    photos.forEach(function (p) {
      var caption = (p.caption || '').replace(/"/g, '&quot;');
      html += '<div class="club-photo-item" onclick="openPhotoViewer(\'' + p.url.replace(/'/g, "\\'") + '\', \'' + (p.caption || '').replace(/'/g, "\\'") + '\')">';
      html += '<img src="' + p.url + '" alt="' + caption + '" loading="lazy">';
      if (p.caption) html += '<div class="club-photo-caption">' + escapeHtml(p.caption) + '</div>';
      html += '</div>';
    });
    grid.innerHTML = html;
  }
  function openPhotoViewer(url, caption) {
    var img = document.getElementById('photoViewerImg'); var cap = document.getElementById('photoViewerCaption');
    if (img) img.src = url; if (cap) cap.innerText = caption || '';
    document.getElementById('photoViewerModal').style.display = 'flex';
  }
  function closePhotoViewer() { var m = document.getElementById('photoViewerModal'); if (m) m.style.display = 'none'; }

  /* ============ ПРОФИЛЬ ИГРОКА (3:4 + награды + статистика) ============ */
  function calcAge(birth) {
    if (!birth) return null;
    var y, m = 1, d = 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) { var p = birth.split('-').map(Number); y = p[0]; m = p[1]; d = p[2]; }
    else if (/^\d{2}\.\d{2}\.\d{4}$/.test(birth)) { var q = birth.split('.').map(Number); d = q[0]; m = q[1]; y = q[2]; }
    else return null;
    var now = new Date();
    var age = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
    return age;
  }

  function openPlayerModal(playerNameOrKey) {
    try {
      var key = playerKey(playerNameOrKey);

      // Собираем статистику
      var stats = { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, byTour: [] };
      var displayName = playerNameOrKey;
      var clubsSeen = {};

      Object.keys(tournamentsData).forEach(function (tk) {
        var t = tournamentsData[tk];
        var tourStats = { tour: t.title || tk, matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, teams: {} };
        var touched = false;

        (t.matches || []).forEach(function (m) {
          if (!m.played || !m.scorers) return;
          var parsed = parseScorersFull(m.scorers, m.t1, m.t2);
          [m.t1, m.t2].forEach(function (cid) {
            var side = parsed[cid]; if (!side) return;
            side.goals.forEach(function (g) {
              var gk = playerKey(g.name);
              if (gk === key) {
                tourStats.goals += g.count; tourStats.teams[cid] = 1; clubsSeen[cid] = 1; touched = true;
                if (g.name.length > displayName.length) displayName = g.name;
              }
              if (g.assist && playerKey(g.assist) === key) {
                tourStats.assists++; tourStats.teams[cid] = 1; clubsSeen[cid] = 1; touched = true;
              }
            });
            side.yellow.forEach(function (y) {
              if (playerKey(y.name) === key) { tourStats.yellow++; tourStats.teams[cid] = 1; clubsSeen[cid] = 1; touched = true; }
            });
            side.red.forEach(function (r) {
              if (playerKey(r.name) === key) { tourStats.red++; tourStats.teams[cid] = 1; clubsSeen[cid] = 1; touched = true; }
            });
          });
        });

        if (touched) {
          // Точное число матчей
          var realMatches = 0;
          (t.matches || []).forEach(function (m) {
            if (!m.played || !m.scorers) return;
            var parsed = parseScorersFull(m.scorers, m.t1, m.t2);
            [m.t1, m.t2].forEach(function (cid) {
              var side = parsed[cid]; if (!side) return;
              var inMatch = false;
              side.goals.forEach(function (g) { if (playerKey(g.name) === key || (g.assist && playerKey(g.assist) === key)) inMatch = true; });
              side.yellow.forEach(function (y) { if (playerKey(y.name) === key) inMatch = true; });
              side.red.forEach(function (r) { if (playerKey(r.name) === key) inMatch = true; });
              if (inMatch) realMatches++;
            });
          });
          tourStats.matches = realMatches;
          tourStats.teamList = Object.keys(tourStats.teams).map(function (cid) {
            var c = clubsData.find(function (x) { return x.name === cid; });
            return c ? c.name : cid;
          });
          stats.byTour.push(tourStats);
          stats.matches += tourStats.matches;
          stats.goals += tourStats.goals;
          stats.assists += tourStats.assists;
          stats.yellow += tourStats.yellow;
          stats.red += tourStats.red;
        }
      });

      // Анкета из teamsData.js
      var tdbPlayer = null;
      if (window.teamsDatabase) {
        Object.keys(window.teamsDatabase).forEach(function (clubKey) {
          var tdb = window.teamsDatabase[clubKey];
          if (!tdb || !Array.isArray(tdb.roster)) return;
          tdb.roster.forEach(function (p) {
            if (!tdbPlayer && playerKey(p.name) === key) tdbPlayer = p;
          });
        });
      }
      var pos = (tdbPlayer && tdbPlayer.pos) || 'УНИ';
      var birth = (tdbPlayer && tdbPlayer.birth && tdbPlayer.birth !== '—') ? tdbPlayer.birth : '';
      var age = birth ? calcAge(birth) : null;

      // Награды: из локального хранилища + авто (лучший бомбардир турнира)
      var awards = [];
      if (window.teamPlayerProfiles && window.teamPlayerProfiles[key] && window.teamPlayerProfiles[key].awards) {
        awards = window.teamPlayerProfiles[key].awards.slice();
      }
      Object.keys(tournamentsData).forEach(function (tk) {
        var t = tournamentsData[tk];
        if (!t.matches) return;
        var scorers = {};
        t.matches.forEach(function (m) {
          if (!m.played || !m.scorers) return;
          var parsed = parseScorersFull(m.scorers, m.t1, m.t2);
          [m.t1, m.t2].forEach(function (cid) {
            var side = parsed[cid]; if (!side) return;
            side.goals.forEach(function (g) {
              if (g.ownGoal) return;
              var gk = playerKey(g.name);
              scorers[gk] = (scorers[gk] || 0) + g.count;
            });
          });
        });
        var maxGoals = 0;
        Object.keys(scorers).forEach(function (k) { if (scorers[k] > maxGoals) maxGoals = scorers[k]; });
        if (maxGoals > 0 && scorers[key] === maxGoals && awards.indexOf('best_scorer') === -1) awards.push('best_scorer');
      });

      var awardMap = {
        best_scorer: { icon:'⚽', label:'Лучший бомбардир' },
        best_player: { icon:'🏆', label:'Лучший игрок' },
        best_goalkeeper: { icon:'🧤', label:'Лучший вратарь' },
        best_defender: { icon:'🛡️', label:'Лучший защитник' },
        best_young: { icon:'⭐', label:'Лучший молодой игрок' },
        best_veteran: { icon:'🎖️', label:'Лучший возрастной игрок' }
      };
      var awardsHtml = awards.map(function (a) {
        var m = awardMap[a]; if (!m) return '';
        return '<span class="award-chip"><span class="aw-icon">' + m.icon + '</span>' + m.label + '</span>';
      }).join('');

      var photo = (window.teamPlayerProfiles && window.teamPlayerProfiles[key] && window.teamPlayerProfiles[key].photo) || '';

      var careerHtml = '';
      if (stats.byTour.length) {
        careerHtml = '<table style="margin-top:14px;"><thead><tr>' +
          '<th class="text-left">Турнир</th><th class="text-left">Команды</th>' +
          '<th>М</th><th>Г</th><th>А</th><th class="yellow-head">🟨</th><th class="red-head">🟥</th>' +
        '</tr></thead><tbody>';
        stats.byTour.forEach(function (s) {
          careerHtml += '<tr>' +
            '<td class="text-left">' + escapeHtml(s.tour) + '</td>' +
            '<td class="text-left">' + escapeHtml((s.teamList || []).join(', ') || '—') + '</td>' +
            '<td>' + s.matches + '</td>' +
            '<td class="goals-cell">' + s.goals + '</td>' +
            '<td class="assist-cell">' + s.assists + '</td>' +
            '<td class="yellow-cell">' + s.yellow + '</td>' +
            '<td class="red-cell">' + s.red + '</td>' +
          '</tr>';
        });
        careerHtml += '</tbody></table>';
      } else {
        careerHtml = '<div class="club-photos-empty" style="margin-top:14px;">Нет данных о матчах</div>';
      }

      var modal = document.getElementById('playerModal');
      var content = modal.querySelector('.modal-content');
      content.innerHTML =
        '<button class="modal-close" id="modalCloseBtn">✕</button>' +
        '<h2 class="modal-title" style="margin-bottom:18px;">Профиль игрока</h2>' +
        '<div class="player-hero-34">' +
          '<div class="player-photo-3x4">' +
            (photo
              ? '<img src="' + escapeAttr(photo) + '" alt="">'
              : '<div class="avatar-placeholder"><span>👤</span><span class="lbl">Нет фото</span></div>') +
          '</div>' +
          '<div class="player-info-block">' +
            '<h2>' + escapeHtml(displayName) + '</h2>' +
            '<div class="player-info-row">' +
              '<span class="pos-badge pos-' + pos + '">' + pos + '</span>' +
              (birth ? '<span>📅 ' + escapeHtml(birth) + (age !== null ? ' (' + age + ' лет)' : '') + '</span>' : '') +
            '</div>' +
            (awardsHtml ? '<div class="player-awards-row">' + awardsHtml + '</div>' : '') +
            '<div class="player-info-row" style="margin-top:14px;gap:18px;">' +
              '<span><strong>' + stats.matches + '</strong> матчей</span>' +
              '<span><strong style="color:var(--gold)">' + stats.goals + '</strong> голов</span>' +
              '<span><strong style="color:var(--emerald)">' + stats.assists + '</strong> передач</span>' +
              '<span><strong style="color:var(--yellow)">' + stats.yellow + '</strong> ЖК</span>' +
              '<span><strong style="color:#fca5a5">' + stats.red + '</strong> КК</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<h3 style="margin-top:20px;">Карьера и статистика</h3>' + careerHtml;

      var closeBtn = document.getElementById('modalCloseBtn');
      if (closeBtn) closeBtn.onclick = function () { modal.style.display = 'none'; };
      modal.style.display = 'flex';
    } catch (e) { console.error('openPlayerModal:', e); }
  }
  function closePlayerModal() { var el = document.getElementById('playerModal'); if (el) el.style.display = 'none'; }

  /* ============ Афиша ============ */
  function renderAffiche() {
    try {
      var upcoming = [];
      Object.keys(tournamentsData).forEach(function (tk) {
        (tournamentsData[tk].matches || []).forEach(function (m) { if (m.status === 'upcoming' || (!m.status && m.played === false)) upcoming.push({ tk: tk, m: m }); });
      });
      upcoming.sort(function (a, b) { return (a.m.date || '').localeCompare(b.m.date || ''); });
      var el = document.getElementById('afficheUpcoming');
      if (el) {
        if (!upcoming.length) el.innerHTML = '<p style="color:#94a3b8;">Пока нет предстоящих матчей</p>';
        else {
          var h = '';
          upcoming.slice(0, 12).forEach(function (x) {
            h += '<div class="affiche-card"><div class="affiche-tour">' + escapeHtml(x.m.tour) + '</div>';
            h += '<div class="affiche-title">' + escapeHtml(x.m.t1) + ' — ' + escapeHtml(x.m.t2) + '</div>';
            h += '<div class="affiche-date">' + escapeHtml(x.m.date || 'Дата не назначена') + '</div>';
            h += '<div class="affiche-sub">' + escapeHtml(tournamentsData[x.tk].title) + '</div></div>';
          });
          el.innerHTML = h;
        }
      }
      var el2 = document.getElementById('afficheTournaments');
      if (el2) {
        var open = Object.keys(tournamentsData).filter(function (k) { return tournamentsData[k].status === 'announce'; });
        if (!open.length) el2.innerHTML = '<p style="color:#94a3b8;">Нет открытых турниров</p>';
        else {
          var h2 = '';
          open.forEach(function (k) { h2 += '<div class="affiche-card"><div class="affiche-title">' + escapeHtml(tournamentsData[k].title) + '</div><div class="affiche-sub">Участников: ' + (tournamentsData[k].teams || []).length + '</div></div>'; });
          el2.innerHTML = h2;
        }
      }
      var el3 = document.getElementById('afficheContacts');
      if (el3) {
        if (!organizersData.length) el3.innerHTML = '<p style="color:#94a3b8;">Контакты пока не заполнены</p>';
        else {
          var h3 = '';
          organizersData.forEach(function (c) {
            h3 += '<div class="contact-card"><div class="contact-role">' + escapeHtml(c.role || 'Организатор') + '</div>';
            h3 += '<div class="contact-name">' + escapeHtml(c.name || '') + '</div>';
            if (c.phone) h3 += '<div class="contact-phone">Тел: ' + escapeHtml(c.phone) + '</div>';
            if (c.vk) h3 += '<a class="contact-link" href="' + c.vk + '" target="_blank" rel="noopener">ВКонтакте →</a>';
            h3 += '</div>';
          });
          el3.innerHTML = h3;
        }
      }
    } catch (e) { console.error(e); }
  }

  /* ============ Админка (обёртка) ============ */
  function toggleAdminPanel() {
    if (!window.auth || !window.auth.isAuthenticated()) {
      if (window.auth) window.auth.openLoginModal();
      return;
    }
    var adm = document.getElementById('view-admin'); if (!adm) return;
    if (adm.style.display === "block") showView('tourney');
    else {
      showView('admin');
      if (typeof window.onAdminPanelOpened === 'function') { try { window.onAdminPanelOpened(); } catch (e) { console.error(e); } }
    }
  }
  window.onAdminAuthSuccess = function (user) {
    showView('admin');
    if (typeof window.onAdminPanelOpened === 'function') { try { window.onAdminPanelOpened(); } catch (e) {} }
  };
  window.onAdminPanelClosed = function () { showView('tourney'); };

  /* ============ Сайдбар ============ */
  function renderTourneyButtons() {
    var container = document.getElementById('sidebarTourneysList'); if (!container) return;
    var html = '';
    Object.keys(tournamentsData).forEach(function (k) {
      var t = tournamentsData[k];
      html += '<button class="menu-btn dynamic-tourney-btn ' + (k === currentTourneyKey ? 'active' : '') + '" data-key="' + k + '">' + escapeHtml(t.title || k) + '</button>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.dynamic-tourney-btn').forEach(function (btn) {
      btn.onclick = function () { enterTournament(this.getAttribute('data-key')); };
    });
  }
  function renderSidebar() {
    try {
      renderTourneyButtons();
      var clubsGrid = document.getElementById('sidebarClubsList');
      if (clubsGrid) {
        var clubsHtml = '';
        clubsData.forEach(function (c) {
          var safeName = escapeAttr(c.name);
          clubsHtml += '<div class="club-mini' + (c.name === favoriteClub ? ' active' : '') + '" title="' + c.name.replace(/"/g, '&quot;') + '" onclick="openClubCabinet(\'' + safeName + '\')">' + getClubLogoHtml(c.name) + '</div>';
        });
        clubsGrid.innerHTML = clubsHtml;
      }
      var favEl = document.getElementById('favClubSelect');
      if (favEl) {
        favEl.innerHTML = '<option value="">Мой клуб</option>' + clubsData.map(function (c) {
          return '<option value="' + c.name.replace(/"/g, '&quot;') + '" ' + (c.name === favoriteClub ? 'selected' : '') + '>' + c.name + '</option>';
        }).join('');
      }
    } catch (e) { console.error(e); }
  }

  /* ============ Hero carousel ============ */
  var heroState = { slides: [], cur: 0, timer: null };
  function initHeroCarousel() {
    var carousel = document.getElementById('heroCarousel');
    var slidesEl = document.getElementById('heroSlides');
    var dotsEl = document.getElementById('heroDots');
    if (!carousel || !slidesEl || !dotsEl) return;
    var photos = [];
    try { photos = JSON.parse(localStorage.getItem('hero_slider_photos') || '[]'); } catch (e) { photos = []; }
    if (!photos.length) { carousel.style.display = 'none'; return; }
    carousel.style.display = 'block';
    slidesEl.innerHTML = ''; dotsEl.innerHTML = ''; heroState.slides = [];
    photos.forEach(function (p, i) {
      var slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = 'url(' + p + ')';
      slidesEl.appendChild(slide);
      heroState.slides.push(slide);
      var dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
      dot.onclick = function () { heroGoTo(i); };
      dotsEl.appendChild(dot);
    });
    var prev = document.getElementById('heroPrev'); var next = document.getElementById('heroNext');
    if (prev) prev.onclick = function () { heroGoTo(heroState.cur - 1); };
    if (next) next.onclick = function () { heroGoTo(heroState.cur + 1); };
    if (heroState.slides.length > 1) {
      if (heroState.timer) clearInterval(heroState.timer);
      heroState.timer = setInterval(function () { heroGoTo(heroState.cur + 1); }, 4000);
    }
  }
  function heroGoTo(i) {
    if (!heroState.slides.length) return;
    var total = heroState.slides.length;
    i = ((i % total) + total) % total;
    heroState.slides[heroState.cur].classList.remove('active');
    var dots = document.querySelectorAll('.hero-dot');
    if (dots[heroState.cur]) dots[heroState.cur].classList.remove('active');
    heroState.cur = i;
    heroState.slides[heroState.cur].classList.add('active');
    if (dots[heroState.cur]) dots[heroState.cur].classList.add('active');
  }

  /* ============ Welcome ============ */
  var DEFAULT_WELCOME_PHOTOS = [
    "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&q=80",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&q=80",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80"
  ];
  var welcomeState = { slides: [], current: 0, timer: null };
  function getWelcomePhotos() {
    try { var saved = JSON.parse(localStorage.getItem('ff_welcome_photos') || 'null'); if (Array.isArray(saved) && saved.length) return saved; } catch (e) {}
    return DEFAULT_WELCOME_PHOTOS.slice();
  }
  function getWelcomeInterval() { var s = parseInt(localStorage.getItem('ff_welcome_interval') || '5000', 10); return s >= 1000 ? s : 5000; }
  function renderWelcomeSlider() {
    var hero = document.getElementById('welcomeHero');
    var dots = document.getElementById('welcomeDots');
    if (!hero || !dots) return;
    hero.querySelectorAll('.welcome-slide').forEach(function (el) { el.remove(); });
    var photos = getWelcomePhotos();
    photos.forEach(function (url, i) {
      var slide = document.createElement('div');
      slide.className = 'welcome-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = 'url(' + url + ')';
      hero.insertBefore(slide, hero.firstChild);
    });
    dots.innerHTML = '';
    photos.forEach(function (url, i) {
      var dot = document.createElement('button');
      dot.className = 'welcome-dot' + (i === 0 ? ' active' : '');
      dot.onclick = function () { welcomeGoTo(i); };
      dots.appendChild(dot);
    });
    welcomeState.slides = hero.querySelectorAll('.welcome-slide');
    welcomeState.current = 0;
    startWelcomeTimer();
  }
  function welcomeGoTo(i) {
    var total = welcomeState.slides.length;
    if (!total) return;
    i = ((i % total) + total) % total;
    welcomeState.slides[welcomeState.current].classList.remove('active');
    var dots = document.querySelectorAll('.welcome-dot');
    if (dots[welcomeState.current]) dots[welcomeState.current].classList.remove('active');
    welcomeState.current = i;
    welcomeState.slides[i].classList.add('active');
    if (dots[i]) dots[i].classList.add('active');
  }
  function startWelcomeTimer() {
    if (welcomeState.timer) clearInterval(welcomeState.timer);
    welcomeState.timer = setInterval(function () { welcomeGoTo(welcomeState.current + 1); }, getWelcomeInterval());
  }
  function renderWelcomeTournaments() {
    var grid = document.getElementById('welcomeTournamentsGrid'); if (!grid) return;
    var meta = {
      'night_league_8x8': { badge: 'Идёт сейчас', cls: 'live' },
      'cup_5x5': { badge: 'Плей-офф', cls: 'playoff' },
      '5x5': { badge: 'Регулярный сезон', cls: 'season' },
      '7x7': { badge: 'Весна 2026', cls: 'season' },
      'veterans_40': { badge: 'Ветераны', cls: 'season' }
    };
    var order = ['night_league_8x8', 'cup_5x5', '5x5', '7x7', 'veterans_40'];
    Object.keys(tournamentsData).forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });
    var html = '';
    order.forEach(function (k) {
      if (!tournamentsData[k]) return;
      var t = tournamentsData[k];
      var s = meta[k] || { badge: '', cls: '' };
      html += '<div class="welcome-tournament-card" onclick="enterTournament(\'' + k + '\')">';
      if (s.badge) html += '<span class="welcome-card-badge ' + s.cls + '">' + s.badge + '</span>';
      html += '<h3 class="welcome-card-title">' + escapeHtml(t.title) + '</h3>';
      var sub = t.isCup ? 'Сетка плей-офф' : ((t.teams && t.teams.length) ? t.teams.length + ' команд' : '');
      html += '<p class="welcome-card-sub">' + sub + '</p>';
      html += '<button class="welcome-card-btn">Перейти к турниру →</button>';
      html += '</div>';
    });
    grid.innerHTML = html;
  }

  /* ============ Биндинги ============ */
  function safeBind(id, event, handler) { var el = document.getElementById(id); if (el) el[event] = handler; }
  safeBind('btnHomeWelcome', 'onclick', showWelcome);
  safeBind('welcomePrev', 'onclick', function () { welcomeGoTo(welcomeState.current - 1); });
  safeBind('welcomeNext', 'onclick', function () { welcomeGoTo(welcomeState.current + 1); });
  safeBind('favClubSelect', 'onchange', function () { setFavoriteClub(this.value); });
  safeBind('backToTourneyBtn', 'onclick', function () { showView('tourney'); });
  safeBind('vkAlbumCloseBtn', 'onclick', closeVkAlbum);
  safeBind('posterCloseBtn', 'onclick', closeMatchPoster);
  safeBind('photoViewerCloseBtn', 'onclick', closePhotoViewer);

  var vam = document.getElementById('vkAlbumModal'); if (vam) vam.onclick = function (e) { if (e.target === this) closeVkAlbum(); };
  var ppm = document.getElementById('matchPosterModal'); if (ppm) ppm.onclick = function (e) { if (e.target === this) closeMatchPoster(); };
  var pvm = document.getElementById('photoViewerModal'); if (pvm) pvm.onclick = function (e) { if (e.target === this) closePhotoViewer(); };

  safeBind('tabBtnTable', 'onclick', function () { switchTourneyTab('table'); });
  safeBind('tabBtnMatches', 'onclick', function () { switchTourneyTab('matches'); });
  safeBind('tabBtnScorers', 'onclick', function () { switchTourneyTab('scorers'); });
  safeBind('tabBtnAssists', 'onclick', function () { switchTourneyTab('assists'); });
  safeBind('tabBtnDiscipline', 'onclick', function () { switchTourneyTab('discipline'); });
  safeBind('tabBtnPlayoff', 'onclick', function () { switchTourneyTab('playoff'); });
  safeBind('tabBtnMedia', 'onclick', function () { switchTourneyTab('media'); });
  safeBind('tabBtnAwards', 'onclick', function () { switchTourneyTab('awards'); });
  safeBind('btnAffiche', 'onclick', showAffiche);
  safeBind('resetDataBtn', 'onclick', function () {
    if (!confirm("Точно сбросить все добавленные матчи?")) return;
    localStorage.removeItem("ff_tournaments");
    location.reload();
  });

  // Выход из админки
  (function () {
    var btn = document.getElementById('closeAdminBtn');
    if (btn) btn.onclick = function () {
      if (window.auth && window.auth.logout) window.auth.logout();
      else showView('tourney');
    };
  })();

  /* ============ Экспорт в window ============ */
  window.clubsData = clubsData;
  window.tournamentsData = tournamentsData;
  window.saveTournamentsToStorage = saveTournamentsToStorage;
  window.renderSidebar = renderSidebar;
  window.renderTourney = renderTourney;
  window.renderCalendar = renderCalendar;
  window.renderAssists = renderAssists;
  window.renderDiscipline = renderDiscipline;
  window.renderPlayoff = renderPlayoff;
  window.renderMedia = renderMedia;
  window.selectTourney = selectTourney;
  window.enterTournament = enterTournament;
  window.openClubCabinet = openClubCabinet;
  window.openMatchPoster = openMatchPoster;
  window.getClubLogoHtml = getClubLogoHtml;
  window.renderLogoHtml = renderLogoHtml;
  window.calculateStandings = calculateStandings;
  window.getAssists = getAssists;
  window.initHeroCarousel = initHeroCarousel;
  window.showView = showView;
  window.showAffiche = showAffiche;
  window.showWelcome = showWelcome;
  window.renderWelcome = renderWelcomeSlider;
  window.getWelcomePhotos = getWelcomePhotos;
  window.startWelcomeTimer = startWelcomeTimer;
  window.openPlayerModal = openPlayerModal;
  window.makeMatchId = makeMatchId;
  window.getCurrentTourneyKey = function () { return currentTourneyKey; };
  window.organizersData = organizersData;
  window.saveOrganizers = saveOrganizers;
  window.streamLinks = streamLinks;
  window.saveStreamLinks = saveStreamLinks;
  window.vkLiveLinks = vkLiveLinks;
  window.saveVkLiveLinks = saveVkLiveLinks;
  window.teamPhotos = teamPhotos;
  window.saveTeamPhotos = saveTeamPhotos;
  window.getMatchStreamHtml = getMatchStreamHtml;
  window.renderAffiche = renderAffiche;
  window.updateDynamicTabs = updateDynamicTabs;
  window.renderClubPhotos = renderClubPhotos;
  window.parseCardScorers = parseScorersFull;
  window.renderMatchCard = renderMatchCard;
  window.VK_COMMUNITY_URL = VK_COMMUNITY_URL;
  window.toggleAdminPanel = toggleAdminPanel;
  window.closePlayerModal = closePlayerModal;
  window.closeAllModals = closeAllModals;

  /* ============ Инициализация ============ */
  try { document.getElementById('fedLogoDisplay').innerHTML = getFedLogoHtml(); } catch (e) {}
  try {
    ensureCurrentTourney();
    renderSidebar();
    initHeroCarousel();
    showWelcome();
  } catch (e) { console.error('Инициализация:', e); }

  console.log('[main] загружен. Турниров:', Object.keys(tournamentsData).length);
})();