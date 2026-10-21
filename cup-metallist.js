/* ============================================================
   cup-metallist.js v4.0 — «Кубок Металлиста 2026»
   ТУРНИР ПАМЯТИ БУТЯЕВА Г.А.
   Место проведения: ФОК «Легенда», г. Димитровград

   ОБНОВЛЕНИЯ v4.0:
   - Формат: 10 команд (2 группы × 5)
   - Группа А: Химмаш, Ак Барс, Detali63SMR, ПТИМАШ, Автостар
   - Группа Б: Металлист, Спринт, Тонус, Авангард, Real TJK
   - Групповой этап: 20 матчей (18 — 31.10, 2 — 01.11)
   - Серебряный плей-офф: 1/4 (А4–Б5, Б4–А5) → полуфиналы → финал
   - Золотой плей-офф: полуфиналы (А1–Б2, Б1–А2) → финал
   - Таймы плей-офф: 15 минут
   - Награждение: 17:30, 01.11.2026
   - formatVersion: 2 — при несовпадении с сохранённой версией
     турнир пересобирается заново
   ============================================================ */
(function () {
  'use strict';

  var CUP_KEY      = 'cup_metallist_2026';
  var ROSTER_STORE = 'ff_cup_metallist_rosters';
  var ACTIVE_TAB   = 'groups';
  var FORMAT_VERSION = 2;

  var VENUE_NAME   = 'ФОК Легенда';
  var VENUE_LABEL  = 'ФОК «Легенда»';
  var VENUE_FULL   = 'ФОК «Легенда», г. Димитровград';

  /* ===== КЛУБЫ ===== */
  var CLUB_HIMMASH   = 'Химмаш';
  var CLUB_AKBARS    = 'Ак Барс';
  var CLUB_DETALI    = 'Detali63SMR';
  var CLUB_PTIMASH   = 'ПТИМАШ';
  var CLUB_AUTOSTAR  = 'Автостар';
  var CLUB_METALLIST = 'Металлист';
  var CLUB_SPRINT    = 'Спринт';
  var CLUB_TONUS     = 'Тонус';
  var CLUB_AVANGARD  = 'Авангард';
  var CLUB_REALTJK   = 'Real TJK';

  /* ===== ГРУППЫ ===== */
  var GROUPS = {
    A: [CLUB_HIMMASH, CLUB_AKBARS, CLUB_DETALI, CLUB_PTIMASH, CLUB_AUTOSTAR],
    B: [CLUB_METALLIST, CLUB_SPRINT, CLUB_TONUS, CLUB_AVANGARD, CLUB_REALTJK]
  };

  /* ===== РАСПИСАНИЕ ГРУППОВОГО ЭТАПА ===== */
  var SCHEDULE = [
    /* ---------- 31.10.2026 · суббота ---------- */
    { date: '31.10.2026', time: '12:00', t1: CLUB_PTIMASH,   t2: CLUB_AKBARS,    group: 'A', opening: true },
    { date: '31.10.2026', time: '12:25', t1: CLUB_SPRINT,    t2: CLUB_AVANGARD,  group: 'B' },
    { date: '31.10.2026', time: '12:50', t1: CLUB_AUTOSTAR,  t2: CLUB_DETALI,    group: 'A' },
    { date: '31.10.2026', time: '13:15', t1: CLUB_TONUS,     t2: CLUB_REALTJK,   group: 'B' },
    { date: '31.10.2026', time: '13:40', t1: CLUB_AKBARS,    t2: CLUB_AUTOSTAR,  group: 'A' },
    { date: '31.10.2026', time: '14:05', t1: CLUB_SPRINT,    t2: CLUB_TONUS,     group: 'B' },
    { date: '31.10.2026', time: '14:30', t1: CLUB_DETALI,    t2: CLUB_HIMMASH,   group: 'A' },
    { date: '31.10.2026', time: '14:55', t1: CLUB_METALLIST, t2: CLUB_REALTJK,   group: 'B' },
    { date: '31.10.2026', time: '15:20', t1: CLUB_PTIMASH,   t2: CLUB_AUTOSTAR,  group: 'A' },
    { date: '31.10.2026', time: '15:45', t1: CLUB_METALLIST, t2: CLUB_TONUS,     group: 'B' },
    { date: '31.10.2026', time: '16:10', t1: CLUB_HIMMASH,   t2: CLUB_AKBARS,    group: 'A' },
    { date: '31.10.2026', time: '16:35', t1: CLUB_AVANGARD,  t2: CLUB_REALTJK,   group: 'B' },
    { date: '31.10.2026', time: '17:00', t1: CLUB_PTIMASH,   t2: CLUB_HIMMASH,   group: 'A' },
    { date: '31.10.2026', time: '17:30', t1: CLUB_SPRINT,    t2: CLUB_REALTJK,   group: 'B' },
    { date: '31.10.2026', time: '18:00', t1: CLUB_DETALI,    t2: CLUB_AKBARS,    group: 'A' },
    { date: '31.10.2026', time: '18:30', t1: CLUB_METALLIST, t2: CLUB_AVANGARD,  group: 'B' },
    { date: '31.10.2026', time: '19:00', t1: CLUB_DETALI,    t2: CLUB_PTIMASH,   group: 'A' },
    { date: '31.10.2026', time: '19:30', t1: CLUB_METALLIST, t2: CLUB_SPRINT,    group: 'B' },

    /* ---------- 01.11.2026 · воскресенье ---------- */
    { date: '01.11.2026', time: '10:00', t1: CLUB_AUTOSTAR,  t2: CLUB_HIMMASH,   group: 'A' },
    { date: '01.11.2026', time: '10:30', t1: CLUB_AVANGARD,  t2: CLUB_TONUS,     group: 'B' }
  ];

  /* ===== СЕРЕБРЯНЫЙ ПЛЕЙ-ОФФ ===== */
  var SILVER_PO = [
    { stage: 'Серебряный 1/4 финала',    time: '11:00', t1: 'А4', t2: 'Б5' },
    { stage: 'Серебряный 1/4 финала',    time: '11:30', t1: 'Б4', t2: 'А5' },
    { stage: 'Серебряный полуфинал',     time: '12:40', t1: 'А3', t2: 'Побед. (А4–Б5)' },
    { stage: 'Серебряный полуфинал',     time: '14:00', t1: 'Б3', t2: 'Побед. (Б4–А5)' },
    { stage: 'Матч за 3-е место · Серебро', time: '14:40', t1: 'Проигр. СФ1', t2: 'Проигр. СФ2' },
    { stage: 'ФИНАЛ · Серебряный',       time: '16:00', t1: 'Побед. СФ1', t2: 'Побед. СФ2', final: true }
  ];

  /* ===== ЗОЛОТОЙ ПЛЕЙ-ОФФ ===== */
  var GOLD_PO = [
    { stage: 'Золотой полуфинал',        time: '12:00', t1: 'А1', t2: 'Б2' },
    { stage: 'Золотой полуфинал',        time: '13:20', t1: 'Б1', t2: 'А2' },
    { stage: 'Матч за 3-е место · Золото', time: '15:20', t1: 'Проигр. ЗФ1', t2: 'Проигр. ЗФ2' },
    { stage: 'ФИНАЛ · Золотой',          time: '16:40', t1: 'Побед. ЗФ1', t2: 'Побед. ЗФ2', final: true }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escA(s) { return esc(s).replace(/'/g, '&#39;'); }
  function q(id) { return document.getElementById(id); }

  /* ============================ РЕГИСТРАЦИЯ КЛУБОВ ============================ */
  function ensureClubs() {
    var arr = window.clubsData; if (!arr) return;
    var byName = {}; arr.forEach(function (c) { byName[c.name] = c; });

    function ensureClub(name, logo) {
      if (!byName[name]) {
        var nc = { name: name, logo: logo };
        arr.push(nc);
        byName[name] = nc;
      } else if (!byName[name].logo || byName[name].logo === '⚽') {
        byName[name].logo = logo;
      }
    }

    ensureClub(CLUB_DETALI,  'logos/detali63.png');
    ensureClub(CLUB_TONUS,   'logos/tonus.png');
    ensureClub(CLUB_REALTJK, 'logos/realtjk.png');
  }

  /* ============================ РЕГИСТРАЦИЯ ТУРНИРА ============================ */
  function ensureTournament() {
    var TD = window.tournamentsData; if (!TD) return;

    /* Уже есть нужная версия — только venue обновляем */
    if (TD[CUP_KEY] && TD[CUP_KEY].isMetallistCup && TD[CUP_KEY].formatVersion === FORMAT_VERSION) {
      TD[CUP_KEY].matches = (TD[CUP_KEY].matches || []).map(function (m) {
        m.venue = VENUE_NAME;
        m.stadium = VENUE_NAME;
        return m;
      });
      if (!TD[CUP_KEY].meta) TD[CUP_KEY].meta = {};
      TD[CUP_KEY].meta.venue = VENUE_FULL;
      if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
      return;
    }

    /* Старая версия — удаляем */
    if (TD[CUP_KEY]) delete TD[CUP_KEY];

    /* Формируем команды и матчи */
    var teams = GROUPS.A.concat(GROUPS.B);
    var matches = SCHEDULE.map(function (m) {
      return {
        tour: 'Групповой этап · Группа ' + m.group,
        date: m.date + ' ' + m.time,
        t1: m.t1, t2: m.t2,
        s1: 0, s2: 0, scorers: '',
        played: false, status: 'upcoming',
        group: m.group, time: m.time,
        venue: VENUE_NAME, stadium: VENUE_NAME,
        opening: !!m.opening
      };
    });

    TD[CUP_KEY] = {
      title: 'Турнир памяти Бутяева Г.А. «Кубок Металлиста» (2026)',
      isCup: true, isMetallistCup: true,
      formatVersion: FORMAT_VERSION,
      status: 'announce',
      teams: teams, rosters: {}, matches: matches, awards: [],
      meta: {
        groups: GROUPS, schedule: SCHEDULE,
        silverPO: SILVER_PO, goldPO: GOLD_PO,
        dates: '31.10.2026 — 01.11.2026',
        format: '2 тайма × 15 минут',
        venue: VENUE_FULL,
        venueShort: VENUE_NAME,
        venueLabel: VENUE_LABEL,
        formatVersion: FORMAT_VERSION
      }
    };

    if (window.saveTournamentsToStorage) window.saveTournamentsToStorage();
  }

  function loadRosters() {
    try { return JSON.parse(localStorage.getItem(ROSTER_STORE) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveRosters(r) { try { localStorage.setItem(ROSTER_STORE, JSON.stringify(r)); } catch (e) {} }

  /* ============================ ТАБЛИЦЫ ГРУПП ============================ */
  function computeGroupTable(groupKey) {
    var teams = GROUPS[groupKey] || [];
    var rows = {};
    teams.forEach(function (t) { rows[t] = { name: t, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }; });
    var t = window.tournamentsData && window.tournamentsData[CUP_KEY];
    if (!t) return Object.values(rows);
    (t.matches || []).forEach(function (m) {
      if (!m || m.group !== groupKey || !m.played) return;
      var a = rows[m.t1], b = rows[m.t2]; if (!a || !b) return;
      a.p++; b.p++;
      a.gf += m.s1 || 0; a.ga += m.s2 || 0;
      b.gf += m.s2 || 0; b.ga += m.s1 || 0;
      if (m.s1 > m.s2) { a.w++; a.pts += 3; b.l++; }
      else if (m.s1 < m.s2) { b.w++; b.pts += 3; a.l++; }
      else { a.d++; a.pts++; b.d++; b.pts++; }
    });
    return Object.values(rows).sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      var dA = a.gf - a.ga, dB = b.gf - b.ga;
      if (dB !== dA) return dB - dA;
      return b.gf - a.gf;
    });
  }

  function renderGroupTableHtml(groupKey) {
    var rows = computeGroupTable(groupKey);
    var html = '<div class="cup-group-card">';
    html +=   '<div class="cup-group-title">Группа ' + esc(groupKey) + '</div>';
    html +=   '<table class="cup-group-table"><thead><tr>' +
                 '<th>#</th><th class="text-left">Команда</th>' +
                 '<th>И</th><th>В</th><th>Н</th><th>П</th><th>М</th><th>О</th>' +
               '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var diff = r.gf - r.ga;
      var diffStr = diff > 0 ? '+' + diff : String(diff);
      var placeClass = (i < 2) ? ' style="color:#f5a623;font-weight:800;"' : ((i < 4) ? ' style="color:#34d399;font-weight:700;"' : '');
      html += '<tr>' +
        '<td' + placeClass + '>' + (i + 1) + '</td>' +
        '<td class="text-left"><span class="club-link" onclick="window.openClubCabinet && window.openClubCabinet(\'' + escA(r.name) + '\')">' +
          (window.getClubLogoForCard ? window.getClubLogoForCard(r.name) : '⚽') +
          '<strong>' + esc(r.name) + '</strong></span></td>' +
        '<td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td>' +
        '<td>' + r.gf + '–' + r.ga + '<br><small style="color:#64748b">' + diffStr + '</small></td>' +
        '<td><strong>' + r.pts + '</strong></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /* ============================ РАСПИСАНИЕ ============================ */
  function renderScheduleChips() {
    var byDate = {};
    SCHEDULE.forEach(function (m) {
      if (!byDate[m.date]) byDate[m.date] = [];
      byDate[m.date].push(m);
    });
    var dates = Object.keys(byDate).sort();

    var dayHeaderStyle =
      'font-family:var(--font-accent);font-size:13px;font-weight:900;color:#f5a623;' +
      'text-transform:uppercase;letter-spacing:.1em;margin:22px 0 12px;' +
      'padding-bottom:8px;border-bottom:2px solid rgba(245,166,35,.4);';

    var openingBadgeStyle =
      'margin-top:8px;padding:4px 10px;' +
      'background:linear-gradient(135deg,#f5a623,#d97706);color:#070c18;' +
      'font-size:10px;font-weight:900;border-radius:999px;' +
      'letter-spacing:.05em;text-align:center;';

    var html = '';
    dates.forEach(function (date) {
      var dayLabel = date;
      if (date === '31.10.2026') dayLabel += ' · суббота';
      else if (date === '01.11.2026') dayLabel += ' · воскресенье';

      html += '<div style="' + dayHeaderStyle + '">📅 ' + esc(dayLabel) +
        ' <span style="color:#94a3b8;font-weight:600;letter-spacing:.02em;font-size:11px;margin-left:8px;">📍 ' + esc(VENUE_LABEL) + '</span>' +
      '</div>';

      html += '<div class="cup-schedule-grid">';
      byDate[date].forEach(function (m) {
        var openingBadge = m.opening
          ? '<div style="' + openingBadgeStyle + '">⭐ МАТЧ ОТКРЫТИЯ КУБКА</div>'
          : '';

        html += '<div class="cup-match-chip">' +
          '<div class="cup-match-row">' +
            '<span class="cup-match-time">' + esc(m.time) + '</span>' +
            '<span class="cup-match-venue-badge">Группа ' + esc(m.group) + '</span>' +
          '</div>' +
          '<div class="cup-match-teams">' +
            '<span class="cup-match-t1">' + esc(m.t1) + '</span>' +
            '<span class="cup-match-vs">—</span>' +
            '<span class="cup-match-t2">' + esc(m.t2) + '</span>' +
          '</div>' +
          openingBadge +
        '</div>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderPlayoffHtml(list, title) {
    var html = '<div class="cup-po-block"><h3 class="cup-po-title">' + esc(title) + '</h3>';
    list.forEach(function (m) {
      var cls = m.final ? 'cup-po-stage final' : 'cup-po-stage';
      html += '<div class="' + cls + '">' +
        '<div class="cup-po-time">' + esc(m.time) +
          '<div class="cup-po-venue-badge">📍 ' + esc(VENUE_LABEL) + '</div>' +
        '</div>' +
        '<div><div class="cup-po-label">' + esc(m.stage) + '</div>' +
        '<div class="cup-po-teams">' + esc(m.t1) + ' — ' + esc(m.t2) + '</div></div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderAwardPlate() {
    return '<div class="cup-award-plate">' +
      '🏆 17:30 — ТОРЖЕСТВЕННОЕ НАГРАЖДЕНИЕ КОМАНД<br>' +
      '<span style="font-size:11px;font-weight:600;letter-spacing:.02em;text-transform:none;">' +
      'обязательное присутствие всех участников турнира!</span></div>';
  }

  /* ============================ АНОНС / РЕГЛАМЕНТ ============================ */
  function renderInfoHtml() {
    var t = window.tournamentsData && window.tournamentsData[CUP_KEY];
    var meta = (t && t.meta) || {};
    var html = '';
    html += '<div class="cup-info-card">';
    html +=   '<h2 style="margin:0 0 4px;font-size:20px;">🏆 Турнир памяти Бутяева Г.А.<br><span style="color:#f5a623;">«Кубок Металлиста» (2026)</span></h2>';
    html +=   '<p style="color:#94a3b8;margin:0 0 18px;font-size:13px;">Официальный двухдневный кубковый турнир ЛФЛД</p>';

    html +=   '<div class="cup-venue-highlight">📍 Место проведения всех матчей: <strong>' + esc(VENUE_LABEL) + '</strong></div>';

    html +=   '<div class="cup-info-row"><div class="cup-info-label">Даты</div><div class="cup-info-value">31.10.2026 — 01.11.2026</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Формат</div><div class="cup-info-value">2 тайма × 15 минут</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Место проведения</div><div class="cup-info-value">' + esc(VENUE_FULL) + '</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Участники</div><div class="cup-info-value">10 команд (2 группы × 5)</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">День 1 · 31.10</div><div class="cup-info-value">Групповой этап — 18 матчей</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">День 2 · 01.11</div><div class="cup-info-value">Групповой этап — 2 матча · Серебряный и Золотой плей-офф</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Серебряный плей-офф</div><div class="cup-info-value">1/4 финала (А4–Б5, Б4–А5) → полуфиналы (А3–поб.1, Б3–поб.2) → матч за 3-е место → финал</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Золотой плей-офф</div><div class="cup-info-value">Полуфиналы (А1–Б2, Б1–А2) → матч за 3-е место → финал</div></div>';
    html +=   '<div class="cup-info-row"><div class="cup-info-label">Награждение</div><div class="cup-info-value">01.11.2026 в 17:30 — торжественное награждение команд</div></div>';
    html += '</div>';
    html += renderAwardPlate();
    return html;
  }

  /* ============================ ПУБЛИЧНАЯ СТРАНИЦА ============================ */
  function ensureCupView() {
    var v = q('view-cup');
    if (!v) {
      v = document.createElement('div');
      v.id = 'view-cup';
      v.style.display = 'none';
      var content = document.querySelector('.content');
      if (content) content.appendChild(v);
    }
    return v;
  }

  function hideOtherViews() {
    ['view-tourney','view-club','view-admin','view-affiche','view-welcome']
      .forEach(function (id) { var el = q(id); if (el) el.style.display = 'none'; });
    var hero = q('heroCarousel'); if (hero) hero.style.display = 'none';
  }

  function renderCupPage() {
    hideOtherViews();
    var v = ensureCupView(); if (!v) return;
    v.style.display = 'block';

    var tabBtn = function (key, label) {
      var cls = 'tab-btn' + (ACTIVE_TAB === key ? ' active' : '');
      return '<button class="' + cls + '" data-cup-tab="' + key + '" type="button">' + label + '</button>';
    };

    v.innerHTML =
      '<button class="back-btn" id="cupBackBtn" type="button">← На главную</button>' +
      '<div class="cup-hero">' +
        '<h1 class="cup-hero-title">🏆 Турнир памяти Бутяева Г.А.<br><span style="color:#f5a623;font-size:.75em;">«Кубок Металлиста» 2026</span></h1>' +
        '<p class="cup-hero-sub">31.10.2026 — Групповой этап · 01.11.2026 — Золотой и Серебряный плей-офф</p>' +
        '<p class="cup-hero-venue">📍 Место проведения: <strong>' + esc(VENUE_LABEL) + '</strong>, г. Димитровград</p>' +
        '<p class="cup-hero-badge">📣 Статус: Анонс · Скоро</p>' +
      '</div>' +
      '<div class="tabs cup-tabs">' +
        tabBtn('groups','Групповой этап') +
        tabBtn('gold','Золотой плей-офф') +
        tabBtn('silver','Серебряный плей-офф') +
        tabBtn('info','Анонс и регламент') +
      '</div>' +
      '<div id="cupTabBody"></div>';

    q('cupBackBtn').onclick = function () { if (window.showWelcome) window.showWelcome(); };
    v.querySelectorAll('[data-cup-tab]').forEach(function (btn) {
      btn.onclick = function () { ACTIVE_TAB = btn.getAttribute('data-cup-tab'); renderCupPage(); };
    });
    renderCupTabBody();
  }

  function renderCupTabBody() {
    var body = q('cupTabBody'); if (!body) return;
    if (ACTIVE_TAB === 'groups') {
      body.innerHTML =
        '<div class="cup-venue-banner">📍 Все матчи турнира проходят в <strong>' + esc(VENUE_LABEL) + '</strong></div>' +
        '<div class="cup-group-grid">' + renderGroupTableHtml('A') + renderGroupTableHtml('B') + '</div>' +
        '<h3 class="cup-section-title">📅 Расписание группового этапа · ' + esc(VENUE_LABEL) + '</h3>' +
        renderScheduleChips();
      return;
    }
    if (ACTIVE_TAB === 'gold') {
      body.innerHTML =
        '<div class="cup-venue-banner">📍 Все матчи плей-офф проходят в <strong>' + esc(VENUE_LABEL) + '</strong></div>' +
        renderPlayoffHtml(GOLD_PO, '🥇 Золотой плей-офф — за 1–4 места · 01.11.2026') + renderAwardPlate();
      return;
    }
    if (ACTIVE_TAB === 'silver') {
      body.innerHTML =
        '<div class="cup-venue-banner">📍 Все матчи плей-офф проходят в <strong>' + esc(VENUE_LABEL) + '</strong></div>' +
        renderPlayoffHtml(SILVER_PO, '🥈 Серебряный плей-офф — за 5–8+ места · 01.11.2026') + renderAwardPlate();
      return;
    }
    if (ACTIVE_TAB === 'info') { body.innerHTML = renderInfoHtml(); return; }
  }

  window.openMetallistCup = function () {
    ensureClubs(); ensureTournament();
    if (window.renderSidebar) window.renderSidebar();
    renderCupPage();
  };

  function patchEnterTournament() {
    var orig = window.enterTournament;
    if (!orig || orig.__metallistPatched) return;
    var patched = function (key) {
      if (key === CUP_KEY) { window.openMetallistCup(); return; }
      return orig.apply(this, arguments);
    };
    patched.__metallistPatched = true;
    window.enterTournament = patched;
    window.selectTourney = patched;
  }

  /* ============================ УМНЫЙ МОДУЛЬ ЗАЯВОК ============================ */
  function collectAllPlayers() {
    var list = [];
    if (window.database && window.database.players) {
      var all = window.database.players();
      Object.keys(all).forEach(function (id) {
        var p = all[id];
        var fio = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
        if (!fio) return;
        list.push({
          id: id, name: fio,
          clubs: p.clubs || [],
          position: p.position || 'УНИ',
          birthDate: p.birthDate || '',
          photo: p.photo || ''
        });
      });
    }
    return list;
  }

  function positionLabel(pos) {
    return ({ 'ВРТ':'Вратарь','ЗАЩ':'Защитник','ПЗ':'Полузащитник','НАП':'Нападающий','УНИ':'Универсал' })[pos] || pos;
  }

  function ensureCupAdminWrap() {
    var w = q('cupAdminWrap');
    if (w) return w;
    var extras = q('adminExtrasContainer');
    if (!extras || !extras.parentNode) return null;
    w = document.createElement('div');
    w.id = 'cupAdminWrap';
    extras.parentNode.insertBefore(w, extras.nextSibling);
    return w;
  }

  function renderCupAdminBlock() {
    var w = ensureCupAdminWrap(); if (!w) return;

    var allTeams = GROUPS.A.concat(GROUPS.B);
    var rosters = loadRosters();
    var selected = window.__cupAdminSelected || allTeams[0];
    window.__cupAdminSelected = selected;

    var current = rosters[selected] || [];
    var allPlayers = collectAllPlayers();

    var teamOptions = allTeams.map(function (t) {
      return '<option value="' + esc(t) + '"' + (t === selected ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');

    var filterPos = window.__cupAdminPosFilter || '';
    var searchQuery = window.__cupAdminSearch || '';

    var rosterRows = '';
    if (!current.length) {
      rosterRows = '<div class="cas-empty">Заявка пуста. Найдите игрока в поиске или создайте нового.</div>';
    } else {
      current.forEach(function (p, i) {
        rosterRows += '<div class="cup-roster-row">' +
          '<span class="cr-num">' + (i + 1) + '</span>' +
          '<span class="cr-num" style="color:#94a3b8;">' + esc(p.num || '—') + '</span>' +
          '<span class="cr-name">' + esc(p.name) + '</span>' +
          '<span class="cr-pos">' + esc(p.pos || 'УНИ') + '</span>' +
          '<button type="button" class="cr-del" data-cup-del="' + i + '">✕</button>' +
        '</div>';
      });
    }

    w.innerHTML =
      '<div class="admin-extras-section">' +
        '<h3>🏆 Кубок Металлиста — Заявки команд</h3>' +
        '<p>Место проведения: <strong>' + esc(VENUE_FULL) + '</strong>. Выбирайте игроков из глобальной базы через поиск или создавайте новых — они автоматически попадут в базу ЛФЛД.</p>' +

        '<div class="form-row">' +
          '<div class="form-group"><label>Команда:</label>' +
            '<select id="cupAdminTeamSelect">' + teamOptions + '</select>' +
          '</div>' +
        '</div>' +

        '<div class="cup-admin-smart">' +
          '<div class="cas-search-row">' +
            '<div class="cas-search-wrap">' +
              '<input type="text" class="cas-search-input" id="casSearch" placeholder="🔍 Найти игрока по фамилии..." value="' + esc(searchQuery) + '" autocomplete="off">' +
              '<button type="button" class="cas-search-clear" id="casClear" title="Очистить">✕</button>' +
              '<div class="cas-drop" id="casDrop"></div>' +
            '</div>' +
            '<select id="casFilterPos">' +
              '<option value="">Все позиции</option>' +
              ['ВРТ','ЗАЩ','ПЗ','НАП','УНИ'].map(function (x) {
                return '<option value="' + x + '"' + (filterPos === x ? ' selected' : '') + '>' + positionLabel(x) + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="cas-create-row">' +
            '<input type="text" id="casNewName" placeholder="ФИО нового игрока" style="flex:1;min-width:180px;">' +
            '<input type="text" id="casNewNum" placeholder="№" style="width:70px;">' +
            '<select id="casNewPos">' +
              ['ВРТ','ЗАЩ','ПЗ','НАП','УНИ'].map(function (x) { return '<option value="' + x + '">' + x + '</option>'; }).join('') +
            '</select>' +
            '<input type="text" id="casNewBirth" placeholder="дд.мм.гггг" style="width:120px;">' +
            '<button type="button" class="btn-success" id="casCreateBtn">+ Создать и добавить</button>' +
          '</div>' +
        '</div>' +

        '<h4 style="margin:18px 0 6px;color:#f5a623;font-size:12px;letter-spacing:.06em;text-transform:uppercase;">Заявка «' + esc(selected) + '» (' + current.length + ')</h4>' +
        '<div class="cup-roster-list">' + rosterRows + '</div>' +

        '<div class="cas-export-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
          '<button type="button" class="btn-success" id="casSaveBtn">💾 Сохранить заявку</button>' +
          '<button type="button" class="btn-secondary" id="casExportBtn">📤 Экспорт в код</button>' +
          '<button type="button" class="btn-danger" id="casClearTeamBtn">Очистить команду</button>' +
        '</div>' +
        '<div class="ai-status" id="casStatus"></div>' +
      '</div>';

    bindCupAdminEvents(w, allTeams, selected);
  }

  function bindCupAdminEvents(w, allTeams, selected) {
    q('cupAdminTeamSelect').onchange = function () {
      window.__cupAdminSelected = this.value;
      window.__cupAdminSearch = '';
      renderCupAdminBlock();
    };

    var searchInput = q('casSearch');
    var drop = q('casDrop');
    var allPlayers = collectAllPlayers();

    function renderDrop(query) {
      var query_n = String(query || '').toLowerCase().replace(/ё/g, 'е').trim();
      var filterPos = q('casFilterPos').value || '';
      var rosters = loadRosters();
      var currentNames = (rosters[selected] || []).map(function (p) {
        return String(p.name || '').toLowerCase().replace(/ё/g, 'е');
      });

      var matches = allPlayers;
      if (query_n) {
        matches = matches.filter(function (p) {
          return p.name.toLowerCase().replace(/ё/g, 'е').indexOf(query_n) !== -1;
        });
      }
      if (filterPos) {
        matches = matches.filter(function (p) { return p.position === filterPos; });
      }
      matches = matches.slice(0, 50);

      if (!matches.length) {
        drop.innerHTML = '<div class="cas-empty">Не найдено. Создайте нового игрока ↓</div>';
        drop.classList.add('open');
        return;
      }
      drop.innerHTML = matches.map(function (p) {
        var isIn = currentNames.indexOf(p.name.toLowerCase().replace(/ё/g, 'е')) !== -1;
        var clubStr = (p.clubs || []).slice(0, 2).join(', ');
        return '<div class="cas-item' + (isIn ? ' disabled' : '') + '" data-name="' + escA(p.name) + '" data-pos="' + escA(p.position) + '" data-id="' + escA(p.id) + '">' +
          '<div><strong>' + esc(p.name) + '</strong>' + (clubStr ? ' <span style="color:#64748b;font-size:11px;">— ' + esc(clubStr) + '</span>' : '') + '</div>' +
          '<span class="cas-pos">' + esc(p.position) + '</span>' +
        '</div>';
      }).join('');
      drop.classList.add('open');

      drop.querySelectorAll('.cas-item').forEach(function (it) {
        it.onclick = function () {
          if (it.classList.contains('disabled')) return;
          var name = it.getAttribute('data-name');
          var pos = it.getAttribute('data-pos');
          var r = loadRosters();
          var cur = r[selected] || [];
          cur.push({ name: name, pos: pos || 'УНИ', num: '' });
          r[selected] = cur;
          saveRosters(r);
          renderCupAdminBlock();
        };
      });
    }

    searchInput.oninput = function () {
      window.__cupAdminSearch = this.value;
      renderDrop(this.value);
    };
    searchInput.onfocus = function () { renderDrop(this.value); };
    q('casClear').onclick = function () {
      searchInput.value = '';
      window.__cupAdminSearch = '';
      drop.classList.remove('open');
    };
    document.addEventListener('click', function outside(e) {
      if (!w.contains(e.target)) return;
      if (!q('casDrop') || !q('casSearch')) return;
      if (!q('casDrop').contains(e.target) && e.target !== q('casSearch') && e.target !== q('casClear')) {
        q('casDrop').classList.remove('open');
      }
    });
    q('casFilterPos').onchange = function () {
      window.__cupAdminPosFilter = this.value;
      renderDrop(searchInput.value);
    };

    q('casCreateBtn').onclick = function () {
      var name = (q('casNewName').value || '').trim();
      var num = (q('casNewNum').value || '').trim();
      var pos = q('casNewPos').value;
      var birth = (q('casNewBirth').value || '').trim();
      if (!name) { alert('Введите ФИО игрока'); return; }

      if (window.database && window.database.ensurePlayer) {
        var created = window.database.ensurePlayer(name, selected);
        if (created && birth) window.database.updatePlayer(created.id, { birthDate: birth, position: pos });
        if (window.database.save) window.database.save();
      }

      var r = loadRosters();
      var cur = r[selected] || [];
      cur.push({ name: name, pos: pos, num: num, birth: birth });
      r[selected] = cur;
      saveRosters(r);

      q('casNewName').value = '';
      q('casNewNum').value = '';
      q('casNewBirth').value = '';

      var st = q('casStatus');
      if (st) { st.className = 'ai-status show ok'; st.innerText = 'Игрок добавлен: ' + name; }

      renderCupAdminBlock();
    };

    w.querySelectorAll('[data-cup-del]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-cup-del'), 10);
        var r = loadRosters();
        var cur = r[selected] || [];
        cur.splice(idx, 1);
        r[selected] = cur;
        saveRosters(r);
        renderCupAdminBlock();
      };
    });

    q('casSaveBtn').onclick = function () {
      var r = loadRosters();
      var cur = r[selected] || [];
      if (window.database && window.database.addToRoster) {
        cur.forEach(function (p) {
          try { window.database.addToRoster(CUP_KEY, selected, p.name, { num: p.num, pos: p.pos }); } catch (e) {}
        });
        if (window.database.save) window.database.save();
      }
      var st = q('casStatus');
      if (st) { st.className = 'ai-status show ok'; st.innerText = 'Заявка «' + selected + '» сохранена (' + cur.length + ' игроков)'; }
    };

    q('casExportBtn').onclick = function () {
      var rosters = loadRosters();
      var lines = [];
      lines.push('/* ==== Заявки «Кубок Металлиста 2026» — вставить в allTournamentsMasterData.js ==== */');
      lines.push('/* Место проведения: ' + VENUE_FULL + ' */');
      lines.push('window.LFLD_CUP_METALLIST_ROSTERS = ' + JSON.stringify(rosters, null, 2) + ';');
      var code = lines.join('\n');
      openExportModal(code);
    };

    q('casClearTeamBtn').onclick = function () {
      if (!confirm('Очистить заявку команды «' + selected + '»?')) return;
      var r = loadRosters();
      delete r[selected];
      saveRosters(r);
      renderCupAdminBlock();
    };
  }

  function openExportModal(code) {
    var ex = q('casExportModal');
    if (!ex) {
      ex = document.createElement('div');
      ex.id = 'casExportModal';
      ex.className = 'cas-export-modal';
      ex.innerHTML =
        '<div class="cas-export-content">' +
          '<h3>Экспорт заявок — вставьте в allTournamentsMasterData.js</h3>' +
          '<textarea id="casExportArea" readonly></textarea>' +
          '<div class="cas-export-actions">' +
            '<button type="button" class="btn-success" id="casExportCopy">📋 Скопировать</button>' +
            '<button type="button" class="btn-danger" id="casExportClose">Закрыть</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ex);
    }
    q('casExportArea').value = code;
    ex.style.display = 'flex';
    q('casExportClose').onclick = function () { ex.style.display = 'none'; };
    q('casExportCopy').onclick = function () {
      var ta = q('casExportArea');
      ta.select();
      try { document.execCommand('copy'); alert('Скопировано!'); } catch (e) {}
    };
  }

  function patchAdminOpen() {
    var prev = window.onAdminPanelOpened;
    window.onAdminPanelOpened = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      try { renderCupAdminBlock(); } catch (e) { console.warn('[cup-metallist:admin]', e); }
    };
  }

  /* ============================ ЗАПУСК ============================ */
  function boot() {
    setTimeout(function () {
      try { ensureClubs(); }          catch (e) {}
      try { ensureTournament(); }     catch (e) {}
      try { patchEnterTournament(); } catch (e) {}
      try { patchAdminOpen(); }       catch (e) {}
      try { if (window.renderSidebar) window.renderSidebar(); } catch (e) {}
      console.log('[cup-metallist] v4.0 загружен · 10 команд · formatVersion=' + FORMAT_VERSION + ' · ' + VENUE_FULL);
    }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();