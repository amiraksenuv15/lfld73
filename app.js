/* ============================================================
   app.js — движок ЛФЛД
   ============================================================ */
(function () {
  'use strict';

  /* ========== Ссылки на данные ========== */
  const BASE_CLUBS = window.DEFAULT_CLUBS || [];
  const BASE_TOURNAMENTS = window.DEFAULT_TOURNAMENTS || {};
  const STORAGE_TOURNAMENTS = 'lfld_tournaments_v3';
  const STORAGE_PROFILES = 'lfld_player_profiles_v3';
  const STORAGE_TEAMS = 'lfld_teams_overrides_v3';

  let clubsData = [];
  let tournamentsData = {};
  let playerProfiles = {};  // { key: { name, photo, pos, birth, awards[] } }
  let teamOverrides = {};   // { clubId: { name, logo, photo, vk } }

  const clubMap = {};
  function rebuildClubMap() {
    Object.keys(clubMap).forEach(k => delete clubMap[k]);
    clubsData.forEach(c => clubMap[c.id] = c);
  }
  function clubName(id) { return clubMap[id] ? clubMap[id].name : '—'; }
  function clubIdByName(name) {
    if (!name) return null;
    const n = normalize(name);
    for (const id in clubMap) if (normalize(clubMap[id].name) === n) return id;
    return null;
  }
  function clubLogo(id, cls) {
    const c = clubMap[id]; if (!c) return '<span class="badge-icon">⚽</span>';
    const isImg = /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(c.logo) || /^(https?:|\/|data:)/.test(c.logo);
    if (isImg) return '<img src="' + c.logo + '" alt="" class="' + (cls || '') + '">';
    return '<span class="badge-icon ' + (cls || '') + '">' + (c.logo || '⚽') + '</span>';
  }

  /* ========== Утилиты ========== */
  function normalize(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  }
  function playerKey(name) {
    const n = normalize(name).split(/\s+/)[0];
    return n.replace(/[^а-яa-z0-9]/gi, '');
  }
  function cleanName(s) {
    return String(s || '').replace(/\((\d+)\)/g, '').replace(/[\s.,;:]+$/g, '').replace(/\s+/g, ' ').trim();
  }
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  /* ========== Парсер scorers ========== */
  function parseScorers(str, t1, t2) {
    const result = {};
    result[t1] = { goals: [], yellow: [], red: [] };
    result[t2] = { goals: [], yellow: [], red: [] };
    if (!str) return result;

    const t1Name = normalize(clubName(t1));
    const t2Name = normalize(clubName(t2));

    String(str).split(/;\s*/).forEach(part => {
      part = part.trim();
      if (!part) return;
      const ci = part.indexOf(':');
      if (ci === -1) return;
      const rawClub = part.slice(0, ci).trim();
      let rest = part.slice(ci + 1).trim();
      const nClub = normalize(rawClub);
      let clubId = null;
      if (nClub === t1Name) clubId = t1;
      else if (nClub === t2Name) clubId = t2;
      if (!clubId) return;

      // КК
      let redStr = '';
      let m = rest.match(/,\s*КК:\s*(.+)$/);
      if (m) { redStr = m[1].trim(); rest = rest.slice(0, rest.length - m[0].length).trim(); }
      else { m = rest.match(/^КК:\s*(.+)$/); if (m) { redStr = m[1].trim(); rest = ''; } }
      // ЖК
      let yellowStr = '';
      m = rest.match(/,\s*ЖК:\s*(.+)$/);
      if (m) { yellowStr = m[1].trim(); rest = rest.slice(0, rest.length - m[0].length).trim(); }
      else { m = rest.match(/^ЖК:\s*(.+)$/); if (m) { yellowStr = m[1].trim(); rest = ''; } }

      // Голы
      if (rest) {
        rest.split(',').forEach(token => {
          token = token.trim();
          if (!token) return;
          if (/автогол|техническ|\(аг\)/i.test(token)) {
            if (/автогол/i.test(token)) {
              const nm = cleanName(token.replace(/автогол/i, '').replace(/\(аг\)/i, ''));
              if (nm) result[clubId].goals.push({ name: nm, count: 1, assist: '', ownGoal: true });
            }
            return;
          }
          let count = 1;
          const cm = token.match(/\((\d+)\)/);
          if (cm) { count = parseInt(cm[1]) || 1; token = token.replace(/\((\d+)\)/g, '').trim(); }
          let assist = '';
          if (token.indexOf('/') !== -1) {
            const parts = token.split('/');
            token = parts[0].trim();
            assist = (parts[1] || '').trim();
          }
          token = cleanName(token);
          if (!token) return;
          result[clubId].goals.push({ name: token, count, assist });
        });
      }
      if (yellowStr) yellowStr.split(',').forEach(t => { const nm = cleanName(t); if (nm) result[clubId].yellow.push({ name: nm }); });
      if (redStr) redStr.split(',').forEach(t => { const nm = cleanName(t); if (nm) result[clubId].red.push({ name: nm }); });
    });
    return result;
  }

  /* ========== Генератор scorers ========== */
  function buildScorers(events, t1, t2) {
    const parts = [];
    [t1, t2].forEach(cid => {
      const side = events[cid];
      if (!side) return;
      const goalChunks = side.goals.map(g =>
        (g.ownGoal ? 'Автогол' : g.name) + (g.count > 1 ? ' (' + g.count + ')' : '')
      );
      let line = clubName(cid) + ': ' + (goalChunks.length ? goalChunks.join(', ') : '—');
      if (side.yellow.length) line += ', ЖК: ' + side.yellow.map(y => y.name).join(', ');
      if (side.red.length) line += ', КК: ' + side.red.map(r => r.name).join(', ');
      parts.push(line);
    });
    return parts.join('; ');
  }

  /* ========== Реестр игроков ========== */
  let registry = {}; // { key: { name, clubs:Set } }

  function buildRegistry() {
    registry = {};
    Object.keys(tournamentsData).forEach(tk => {
      const t = tournamentsData[tk];
      (t.matches || []).forEach(m => {
        if (!m.scorers) return;
        const parsed = parseScorers(m.scorers, m.t1, m.t2);
        [m.t1, m.t2].forEach(cid => {
          const side = parsed[cid]; if (!side) return;
          side.goals.forEach(g => {
            const k = playerKey(g.name); if (!k) return;
            if (!registry[k]) registry[k] = { key: k, name: g.name, clubs: {} };
            registry[k].clubs[cid] = 1;
            if (g.assist) {
              const ka = playerKey(g.assist);
              if (ka) {
                if (!registry[ka]) registry[ka] = { key: ka, name: g.assist, clubs: {} };
                registry[ka].clubs[cid] = 1;
              }
            }
          });
          side.yellow.forEach(y => {
            const k = playerKey(y.name); if (!k) return;
            if (!registry[k]) registry[k] = { key: k, name: y.name, clubs: {} };
            registry[k].clubs[cid] = 1;
          });
          side.red.forEach(r => {
            const k = playerKey(r.name); if (!k) return;
            if (!registry[k]) registry[k] = { key: k, name: r.name, clubs: {} };
            registry[k].clubs[cid] = 1;
          });
        });
      });
    });
  }

  function getProfile(key) {
    if (!playerProfiles[key]) playerProfiles[key] = {};
    return playerProfiles[key];
  }
  function getPlayerDisplayName(key) {
    const prof = playerProfiles[key];
    if (prof && prof.name) return prof.name;
    if (registry[key]) return registry[key].name;
    return key;
  }

  /* ========== Статистика игрока ========== */
  function getPlayerStats(key) {
    const stats = { total: { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0 }, byTour: {} };
    Object.keys(tournamentsData).forEach(tk => {
      const t = tournamentsData[tk];
      const tourStats = { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, teams: {} };
      (t.matches || []).forEach(m => {
        if (!m.played || !m.scorers) return;
        const parsed = parseScorers(m.scorers, m.t1, m.t2);
        [m.t1, m.t2].forEach(cid => {
          const side = parsed[cid]; if (!side) return;
          let touched = false;
          side.goals.forEach(g => {
            const gk = playerKey(g.name);
            if (gk === key) { tourStats.goals += g.count; touched = true; }
            if (g.assist && playerKey(g.assist) === key) { tourStats.assists++; touched = true; }
          });
          side.yellow.forEach(y => { if (playerKey(y.name) === key) { tourStats.yellow++; touched = true; } });
          side.red.forEach(r => { if (playerKey(r.name) === key) { tourStats.red++; touched = true; } });
          if (touched) { tourStats.matches++; tourStats.teams[cid] = 1; }
        });
      });
      if (tourStats.matches || tourStats.goals || tourStats.assists || tourStats.yellow || tourStats.red) {
        tourStats.teams = Object.keys(tourStats.teams);
        stats.byTour[tk] = tourStats;
        stats.total.matches += tourStats.matches;
        stats.total.goals += tourStats.goals;
        stats.total.assists += tourStats.assists;
        stats.total.yellow += tourStats.yellow;
        stats.total.red += tourStats.red;
      }
    });
    return stats;
  }

  /* ========== Турнирная таблица ========== */
  function getStandings(tk) {
    const t = tournamentsData[tk]; if (!t) return [];
    const rows = {};
    (t.teams || []).forEach(cid => rows[cid] = { clubId: cid, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
    (t.matches || []).forEach(m => {
      if (!m.played || !rows[m.t1] || !rows[m.t2]) return;
      const a = rows[m.t1], b = rows[m.t2];
      a.p++; b.p++; a.gf += m.s1||0; a.ga += m.s2||0; b.gf += m.s2||0; b.ga += m.s1||0;
      if (m.s1 > m.s2) { a.w++; a.pts += 3; b.l++; }
      else if (m.s1 < m.s2) { b.w++; b.pts += 3; a.l++; }
      else { a.d++; a.pts++; b.d++; b.pts++; }
    });
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }

  /* ========== Бомбардиры / ассистенты ========== */
  function getScorersList(tk) {
    const t = tournamentsData[tk]; if (!t) return [];
    const map = {};
    (t.matches || []).forEach(m => {
      if (!m.played || !m.scorers) return;
      const parsed = parseScorers(m.scorers, m.t1, m.t2);
      [m.t1, m.t2].forEach(cid => {
        const side = parsed[cid]; if (!side) return;
        side.goals.forEach(g => {
          if (g.ownGoal) return;
          const k = playerKey(g.name); if (!k) return;
          if (!map[k]) map[k] = { key: k, goals: 0, clubId: cid };
          map[k].goals += g.count;
        });
      });
    });
    return Object.values(map).sort((a, b) => b.goals - a.goals);
  }
  function getAssistsList(tk) {
    const t = tournamentsData[tk]; if (!t) return [];
    const map = {};
    (t.matches || []).forEach(m => {
      if (!m.played || !m.scorers) return;
      const parsed = parseScorers(m.scorers, m.t1, m.t2);
      [m.t1, m.t2].forEach(cid => {
        const side = parsed[cid]; if (!side) return;
        side.goals.forEach(g => {
          if (!g.assist) return;
          const k = playerKey(g.assist); if (!k) return;
          if (!map[k]) map[k] = { key: k, assists: 0, clubId: cid };
          map[k].assists++;
        });
      });
    });
    return Object.values(map).sort((a, b) => b.assists - a.assists);
  }
  function getDisciplineList(tk) {
    const t = tournamentsData[tk]; if (!t) return [];
    const map = {};
    (t.matches || []).forEach(m => {
      if (!m.played || !m.scorers) return;
      const parsed = parseScorers(m.scorers, m.t1, m.t2);
      [m.t1, m.t2].forEach(cid => {
        const side = parsed[cid]; if (!side) return;
        side.yellow.forEach(y => {
          const k = playerKey(y.name); if (!k) return;
          if (!map[k]) map[k] = { key: k, yellow: 0, red: 0, clubId: cid };
          map[k].yellow++;
        });
        side.red.forEach(r => {
          const k = playerKey(r.name); if (!k) return;
          if (!map[k]) map[k] = { key: k, yellow: 0, red: 0, clubId: cid };
          map[k].red++;
        });
      });
    });
    return Object.values(map).sort((a, b) => (b.red - a.red) || (b.yellow - a.yellow));
  }

  /* ========== Сохранение ========== */
  function saveTournaments() { try { localStorage.setItem(STORAGE_TOURNAMENTS, JSON.stringify(tournamentsData)); } catch(e){} }
  function saveProfiles() { try { localStorage.setItem(STORAGE_PROFILES, JSON.stringify(playerProfiles)); } catch(e){} }
  function saveTeams() { try { localStorage.setItem(STORAGE_TEAMS, JSON.stringify(teamOverrides)); } catch(e){} }

  function loadAll() {
    // Clubs
    clubsData = JSON.parse(JSON.stringify(BASE_CLUBS));
    try {
      const savedT = JSON.parse(localStorage.getItem(STORAGE_TEAMS) || '{}');
      teamOverrides = savedT || {};
      Object.keys(teamOverrides).forEach(cid => {
        const c = clubsData.find(x => x.id === cid);
        if (c) Object.assign(c, teamOverrides[cid]);
      });
    } catch(e) { teamOverrides = {}; }
    rebuildClubMap();

    // Tournaments
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_TOURNAMENTS) || 'null'); } catch(e){}
    if (saved && typeof saved === 'object' && Object.keys(saved).length) {
      tournamentsData = saved;
    } else {
      tournamentsData = JSON.parse(JSON.stringify(BASE_TOURNAMENTS));
      saveTournaments();
    }

    // Profiles
    try { playerProfiles = JSON.parse(localStorage.getItem(STORAGE_PROFILES) || '{}') || {}; } catch(e) { playerProfiles = {}; }

    buildRegistry();
  }

  /* ========== РЕНДЕР ========== */
  let currentTournament = null;
  let currentTab = 'matches';

  function renderSidebar() {
    const elT = document.getElementById('sidebarTourneys');
    const keys = Object.keys(tournamentsData);
    if (!currentTournament || !tournamentsData[currentTournament]) currentTournament = keys[0];
    elT.innerHTML = keys.map(k => {
      const t = tournamentsData[k];
      const active = k === currentTournament ? ' active' : '';
      return '<button class="menu-btn' + active + '" data-tourney="' + escapeAttr(k) + '">' + escapeHtml(t.title) + '</button>';
    }).join('');

    const elC = document.getElementById('sidebarClubs');
    elC.innerHTML = clubsData.map(c =>
      '<div class="club-mini" data-club="' + escapeAttr(c.id) + '" title="' + escapeAttr(c.name) + '">' + clubLogo(c.id) + '</div>'
    ).join('');
  }

  function renderMatchCard(m) {
    const c1 = clubMap[m.t1], c2 = clubMap[m.t2];
    if (!c1 || !c2) return '';
    const parsed = parseScorers(m.scorers || '', m.t1, m.t2);
    const s1 = parsed[m.t1] || { goals: [], yellow: [], red: [] };
    const s2 = parsed[m.t2] || { goals: [], yellow: [], red: [] };
    const played = !!m.played;
    const winner1 = played && m.s1 > m.s2;
    const winner2 = played && m.s2 > m.s1;

    function renderCol(side) {
      let html = '';
      side.goals.forEach(g => {
        const name = escapeHtml(g.name);
        const cnt = g.count > 1 ? ' (' + g.count + ')' : '';
        const cls = g.ownGoal ? 'own-goal' : 'goal';
        html += '<div class="protocol-line ' + cls + '">' +
          '<span class="p-name player-name-clickable" data-player="' + escapeAttr(playerKey(g.name)) + '">' + name + '</span>' +
          '<span class="p-count">' + cnt + '</span>' +
        '</div>';
        if (g.assist) {
          html += '<div class="protocol-line assist"><span class="p-assist">ассист: <span class="player-name-clickable" data-player="' + escapeAttr(playerKey(g.assist)) + '">' + escapeHtml(g.assist) + '</span></span></div>';
        }
      });
      if (side.goals.length && (side.yellow.length || side.red.length)) html += '<div class="protocol-sep"></div>';
      side.yellow.forEach(y => {
        html += '<div class="protocol-line card-yellow"><span class="p-name player-name-clickable" data-player="' + escapeAttr(playerKey(y.name)) + '">' + escapeHtml(y.name) + '</span></div>';
      });
      side.red.forEach(r => {
        html += '<div class="protocol-line card-red"><span class="p-name player-name-clickable" data-player="' + escapeAttr(playerKey(r.name)) + '">' + escapeHtml(r.name) + '</span></div>';
      });
      return html || '<div class="protocol-empty">—</div>';
    }

    const hasProtocol = played && (s1.goals.length + s1.yellow.length + s1.red.length + s2.goals.length + s2.yellow.length + s2.red.length) > 0;

    return '<div class="lfld-match-card">' +
      '<div class="lfld-match-card-top">' +
        '<span class="match-stage">' + escapeHtml(m.tour || '') + '</span>' +
        (m.date ? '<span class="match-date">' + escapeHtml(m.date) + '</span>' : '') +
      '</div>' +
      '<div class="lfld-match-card-pill">' +
        '<div class="lfld-card-team' + (winner1 ? ' winner' : '') + '">' +
          '<div class="lfld-card-team-logo">' + clubLogo(m.t1) + '</div>' +
          '<div class="lfld-card-team-name" data-club="' + escapeAttr(m.t1) + '">' + escapeHtml(c1.name) + '</div>' +
        '</div>' +
        '<div class="lfld-card-score">' + (played ? (m.s1 + ' : ' + m.s2) : 'VS') + '</div>' +
        '<div class="lfld-card-team' + (winner2 ? ' winner' : '') + '">' +
          '<div class="lfld-card-team-logo">' + clubLogo(m.t2) + '</div>' +
          '<div class="lfld-card-team-name" data-club="' + escapeAttr(m.t2) + '">' + escapeHtml(c2.name) + '</div>' +
        '</div>' +
      '</div>' +
      (hasProtocol ?
        '<div class="lfld-match-card-protocol">' +
          '<div class="protocol-col protocol-col-left">' + renderCol(s1) + '</div>' +
          '<div class="protocol-col protocol-col-right">' + renderCol(s2) + '</div>' +
        '</div>' : '') +
    '</div>';
  }

  function renderContent() {
    const el = document.getElementById('content');
    const t = tournamentsData[currentTournament];
    if (!t) { el.innerHTML = '<div class="empty-state">Турнир не найден</div>'; return; }

    const standings = getStandings(currentTournament);
    const matches = (t.matches || []).slice();

    // Матчи
    let matchesHtml = '';
    matches.forEach(m => { matchesHtml += renderMatchCard(m); });
    if (!matchesHtml) matchesHtml = '<div class="empty-state">Матчей пока нет</div>';

    // Таблица
    let standingsHtml = '<table><thead><tr>' +
      '<th>#</th><th class="text-left">Клуб</th><th>И</th><th>В</th><th>Н</th><th>П</th><th>Мячи</th><th>Очки</th>' +
    '</tr></thead><tbody>';
    standings.forEach((r, i) => {
      standingsHtml += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="text-left"><span class="club-link" data-club="' + escapeAttr(r.clubId) + '">' + clubLogo(r.clubId) + '<strong>' + escapeHtml(clubName(r.clubId)) + '</strong></span></td>' +
        '<td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td>' +
        '<td>' + r.gf + ' - ' + r.ga + '</td>' +
        '<td><strong>' + r.pts + '</strong></td>' +
      '</tr>';
    });
    standingsHtml += '</tbody></table>';

    // Бомбардиры
    const sc = getScorersList(currentTournament);
    let scorersHtml = '<table><thead><tr><th>#</th><th class="text-left">Игрок</th><th class="text-left">Клуб</th><th>Голы</th></tr></thead><tbody>';
    sc.slice(0, 30).forEach((s, i) => {
      scorersHtml += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="text-left"><span class="player-name-clickable" data-player="' + escapeAttr(s.key) + '"><strong>' + escapeHtml(getPlayerDisplayName(s.key)) + '</strong></span></td>' +
        '<td class="text-left"><span class="club-link" data-club="' + escapeAttr(s.clubId) + '">' + escapeHtml(clubName(s.clubId)) + '</span></td>' +
        '<td class="goals-cell">' + s.goals + '</td>' +
      '</tr>';
    });
    scorersHtml += '</tbody></table>';

    // Ассистенты
    const as = getAssistsList(currentTournament);
    let assistsHtml = '<table><thead><tr><th>#</th><th class="text-left">Игрок</th><th class="text-left">Клуб</th><th>Передачи</th></tr></thead><tbody>';
    as.slice(0, 30).forEach((s, i) => {
      assistsHtml += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="text-left"><span class="player-name-clickable" data-player="' + escapeAttr(s.key) + '"><strong>' + escapeHtml(getPlayerDisplayName(s.key)) + '</strong></span></td>' +
        '<td class="text-left"><span class="club-link" data-club="' + escapeAttr(s.clubId) + '">' + escapeHtml(clubName(s.clubId)) + '</span></td>' +
        '<td class="assist-cell">' + s.assists + '</td>' +
      '</tr>';
    });
    assistsHtml += '</tbody></table>';

    // Дисциплина
    const dis = getDisciplineList(currentTournament);
    let disHtml = '<table><thead><tr><th>#</th><th class="text-left">Игрок</th><th class="text-left">Клуб</th><th class="yellow-head">ЖК</th><th class="red-head">КК</th></tr></thead><tbody>';
    dis.slice(0, 30).forEach((s, i) => {
      disHtml += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="text-left"><span class="player-name-clickable" data-player="' + escapeAttr(s.key) + '"><strong>' + escapeHtml(getPlayerDisplayName(s.key)) + '</strong></span></td>' +
        '<td class="text-left"><span class="club-link" data-club="' + escapeAttr(s.clubId) + '">' + escapeHtml(clubName(s.clubId)) + '</span></td>' +
        '<td class="yellow-cell">' + s.yellow + '</td>' +
        '<td class="red-cell">' + s.red + '</td>' +
      '</tr>';
    });
    disHtml += '</tbody></table>';

    el.innerHTML =
      '<h1>' + escapeHtml(t.title) + '</h1>' +
      '<div class="tabs">' +
        '<button class="tab-btn' + (currentTab === 'matches' ? ' active' : '') + '" data-tab="matches">Матчи</button>' +
        '<button class="tab-btn' + (currentTab === 'standings' ? ' active' : '') + '" data-tab="standings">Таблица</button>' +
        '<button class="tab-btn' + (currentTab === 'scorers' ? ' active' : '') + '" data-tab="scorers">Бомбардиры</button>' +
        '<button class="tab-btn' + (currentTab === 'assists' ? ' active' : '') + '" data-tab="assists">Ассистенты</button>' +
        '<button class="tab-btn' + (currentTab === 'discipline' ? ' active' : '') + '" data-tab="discipline">Дисциплина</button>' +
      '</div>' +
      '<div style="display:' + (currentTab === 'matches' ? 'block' : 'none') + ';">' + matchesHtml + '</div>' +
      '<div style="display:' + (currentTab === 'standings' ? 'block' : 'none') + ';">' + standingsHtml + '</div>' +
      '<div style="display:' + (currentTab === 'scorers' ? 'block' : 'none') + ';">' + scorersHtml + '</div>' +
      '<div style="display:' + (currentTab === 'assists' ? 'block' : 'none') + ';">' + assistsHtml + '</div>' +
      '<div style="display:' + (currentTab === 'discipline' ? 'block' : 'none') + ';">' + disHtml + '</div>';
  }

  /* ========== МОДАЛКА ИГРОКА ========== */
  function openPlayer(key) {
    if (!key) return;
    const prof = playerProfiles[key] || {};
    const reg = registry[key] || {};
    const name = prof.name || reg.name || key;
    const pos = prof.pos || '';
    const birth = prof.birth || '';
    const photo = prof.photo || '';
    const awards = prof.awards || [];
    const stats = getPlayerStats(key);

    let awardsHtml = '';
    const awardMap = {
      best_scorer: { icon:'⚽', label:'Лучший бомбардир' },
      best_player: { icon:'🏆', label:'Лучший игрок' },
      best_goalkeeper: { icon:'🧤', label:'Лучший вратарь' },
      best_defender: { icon:'🛡️', label:'Лучший защитник' },
      best_young: { icon:'⭐', label:'Лучший молодой' },
      best_veteran: { icon:'🎖️', label:'Лучший возрастной' }
    };
    awards.forEach(a => {
      const m = awardMap[a]; if (!m) return;
      awardsHtml += '<span class="award-badge"><span>' + m.icon + '</span>' + m.label + '</span>';
    });

    let career = '';
    const tourKeys = Object.keys(stats.byTour);
    if (tourKeys.length) {
      career = '<table><thead><tr><th class="text-left">Турнир</th><th class="text-left">Команды</th><th>М</th><th>Г</th><th>А</th><th class="yellow-head">🟨</th><th class="red-head">🟥</th></tr></thead><tbody>';
      tourKeys.forEach(tk => {
        const s = stats.byTour[tk];
        const t = tournamentsData[tk];
        const clubs = s.teams.map(cid => clubName(cid)).join(', ') || '—';
        career += '<tr>' +
          '<td class="text-left">' + escapeHtml(t ? t.title : tk) + '</td>' +
          '<td class="text-left">' + escapeHtml(clubs) + '</td>' +
          '<td>' + s.matches + '</td>' +
          '<td class="goals-cell">' + s.goals + '</td>' +
          '<td class="assist-cell">' + s.assists + '</td>' +
          '<td class="yellow-cell">' + s.yellow + '</td>' +
          '<td class="red-cell">' + s.red + '</td>' +
        '</tr>';
      });
      career += '</tbody></table>';
    } else {
      career = '<div class="empty-state">Ещё не участвовал в матчах с протоколом</div>';
    }

    const age = birth ? calcAge(birth) : null;
    const posBadge = pos ? '<span class="pos-badge pos-' + pos + '">' + pos + '</span>' : '';

    document.getElementById('playerModalBody').innerHTML =
      '<div class="player-hero">' +
        '<div class="player-photo-3x4">' +
          (photo ? '<img src="' + escapeAttr(photo) + '" alt="">' :
            '<div class="avatar-placeholder"><span>👤</span><span style="font-size:10px;">Нет фото</span></div>') +
        '</div>' +
        '<div class="player-info">' +
          '<h2>' + escapeHtml(name) + '</h2>' +
          '<div class="player-info-row">' +
            posBadge +
            (birth ? '<span>📅 ' + escapeHtml(birth) + (age !== null ? ' (' + age + ' лет)' : '') + '</span>' : '') +
          '</div>' +
          (awardsHtml ? '<div class="awards-list">' + awardsHtml + '</div>' : '') +
          '<div class="player-info-row" style="margin-top:14px;gap:20px;">' +
            '<span><strong>' + stats.total.matches + '</strong> матчей</span>' +
            '<span><strong style="color:var(--gold)">' + stats.total.goals + '</strong> голов</span>' +
            '<span><strong style="color:var(--emerald)">' + stats.total.assists + '</strong> передач</span>' +
            '<span><strong style="color:var(--yellow)">' + stats.total.yellow + '</strong> ЖК</span>' +
            '<span><strong style="color:#fca5a5">' + stats.total.red + '</strong> КК</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<h3>Карьера и статистика</h3>' + career;
    openModal('playerModal');
  }

  function calcAge(birth) {
    let y, m = 1, d = 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) { const p = birth.split('-').map(Number); y = p[0]; m = p[1]; d = p[2]; }
    else if (/^\d{2}\.\d{2}\.\d{4}$/.test(birth)) { const p = birth.split('.').map(Number); d = p[0]; m = p[1]; y = p[2]; }
    else return null;
    const now = new Date();
    let age = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
    return age;
  }

  /* ========== МОДАЛКА КОМАНДЫ ========== */
  function openTeam(clubId) {
    const c = clubMap[clubId]; if (!c) return;

    // Матчи команды
    let allMatches = [];
    Object.keys(tournamentsData).forEach(tk => {
      const t = tournamentsData[tk];
      if ((t.teams || []).indexOf(clubId) === -1) return;
      (t.matches || []).forEach(m => {
        if (m.t1 === clubId || m.t2 === clubId) allMatches.push(m);
      });
    });

    // Заявка — все игроки, которые когда-либо упоминались в scorers команды
    const rosterKeys = {};
    allMatches.forEach(m => {
      if (!m.scorers) return;
      const parsed = parseScorers(m.scorers, m.t1, m.t2);
      const side = parsed[clubId]; if (!side) return;
      side.goals.forEach(g => { const k = playerKey(g.name); if (k) rosterKeys[k] = 1; });
      side.yellow.forEach(y => { const k = playerKey(y.name); if (k) rosterKeys[k] = 1; });
      side.red.forEach(r => { const k = playerKey(r.name); if (k) rosterKeys[k] = 1; });
    });
    // Плюс из teamsData.js (ростер)
    const tdb = getTeamsDataEntry(c.name);
    if (tdb && Array.isArray(tdb.roster)) {
      tdb.roster.forEach(p => { const k = playerKey(p.name); if (k) rosterKeys[k] = 1; });
    }

    // Матчи — HTML
    let matchesHtml = allMatches.map(m => renderMatchCard(m)).join('') || '<div class="empty-state">Матчей пока нет</div>';

    // Ростер — HTML
    const keys = Object.keys(rosterKeys);
    let rosterHtml = '';
    if (keys.length) {
      rosterHtml = '<div class="roster-table-wrap"><table><thead><tr>' +
        '<th>№</th><th>Фото</th><th class="text-left">ФИО</th><th>Позиция</th><th>Д.р.</th><th>М</th><th>Г</th><th>А</th><th class="yellow-head">🟨</th><th class="red-head">🟥</th>' +
      '</tr></thead><tbody>';
      keys.forEach((k, i) => {
        const prof = playerProfiles[k] || {};
        const reg = registry[k] || {};
        const name = prof.name || reg.name || k;
        const pos = prof.pos || '';
        const birth = prof.birth || '';
        const photo = prof.photo || '';
        const st = getPlayerStats(k);
        rosterHtml += '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + (photo ? '<img src="' + escapeAttr(photo) + '" class="roster-mini-photo">' : '<span class="roster-mini-photo-placeholder">👤</span>') + '</td>' +
          '<td class="text-left"><span class="player-name-clickable" data-player="' + escapeAttr(k) + '"><strong>' + escapeHtml(name) + '</strong></span></td>' +
          '<td>' + (pos ? '<span class="pos-badge pos-' + pos + '">' + pos + '</span>' : '—') + '</td>' +
          '<td>' + (birth || '—') + '</td>' +
          '<td>' + st.total.matches + '</td>' +
          '<td class="goals-cell">' + st.total.goals + '</td>' +
          '<td class="assist-cell">' + st.total.assists + '</td>' +
          '<td class="yellow-cell">' + st.total.yellow + '</td>' +
          '<td class="red-cell">' + st.total.red + '</td>' +
        '</tr>';
      });
      rosterHtml += '</tbody></table></div>';
    } else {
      rosterHtml = '<div class="empty-state">Нет данных о составе</div>';
    }

    document.getElementById('teamModalBody').innerHTML =
      '<div class="team-photo-wide">' +
        (c.photo ? '<img src="' + escapeAttr(c.photo) + '" alt="">' : 'Командное фото не загружено') +
      '</div>' +
      '<div class="team-hero-info">' +
        '<div class="team-hero-logo">' + clubLogo(clubId) + '</div>' +
        '<div class="team-hero-text">' +
          '<h2>' + escapeHtml(c.name) + '</h2>' +
          '<div class="team-hero-city">' + escapeHtml(c.city || 'Димитровград') + '</div>' +
        '</div>' +
        (c.vk ? '<a class="team-vk-link" href="' + escapeAttr(c.vk) + '" target="_blank" rel="noopener">ВКонтакте</a>' : '') +
      '</div>' +
      '<div class="tabs">' +
        '<button class="tab-btn active" data-team-tab="matches">Матчи</button>' +
        '<button class="tab-btn" data-team-tab="roster">Заявка и статистика</button>' +
      '</div>' +
      '<div data-team-panel="matches">' + matchesHtml + '</div>' +
      '<div data-team-panel="roster" style="display:none;">' + rosterHtml + '</div>';
    openModal('teamModal');
  }

  function getTeamsDataEntry(clubName) {
    if (!window.teamsDatabase) return null;
    const target = normalize(clubName);
    const aliases = { 'сш лада':'лада', 'мифи':'дити нияу мифи' };
    const t = aliases[target] || target;
    for (const key in window.teamsDatabase) {
      if (normalize(key) === t) return window.teamsDatabase[key];
    }
    return null;
  }

  /* ========== МОДАЛКИ ========== */
  function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('show'); }
  function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }

  /* ========== АВТОРИЗАЦИЯ ========== */
  const USERS = [
    { login:'admin', pass:'lfld2026', role:'admin', name:'Главный администратор' },
    { login:'sudya', pass:'sudya777', role:'judge', name:'Главный судья' },
    { login:'org',   pass:'org12345', role:'organizer', name:'Организатор протоколов' }
  ];
  const SESSION_KEY = 'lfld_session_v3';
  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY); if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.exp || Date.now() > s.exp) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch(e) { return null; }
  }
  function isAuth() { return !!getSession(); }
  function setSession(u) { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ login:u.login, name:u.name, role:u.role, exp: Date.now() + 12*3600*1000 })); }
  function logout() { sessionStorage.removeItem(SESSION_KEY); closeModal('adminModal'); }
  function tryLogin(l, p) {
    l = String(l || '').trim().toLowerCase(); p = String(p || '');
    for (const u of USERS) if (u.login === l && u.pass === p) return u;
    return null;
  }
  function openLogin() { openModal('loginModal'); setTimeout(() => document.getElementById('loginInput').focus(), 100); }
  function doLogin() {
    const u = tryLogin(document.getElementById('loginInput').value, document.getElementById('loginPass').value);
    const err = document.getElementById('loginError');
    if (u) { err.classList.remove('show'); setSession(u); closeModal('loginModal'); openAdmin(); }
    else { err.textContent = 'Неверный логин или пароль'; err.classList.add('show'); }
  }

  /* ========== АДМИНКА ========== */
  let adminTab = 'matches';

  function openAdmin() {
    if (!isAuth()) { openLogin(); return; }
    renderAdminTabs();
    renderAdminBody();
    openModal('adminModal');
  }

  function renderAdminTabs() {
    const tabs = [
      { id:'matches',  label:'Матчи' },
      { id:'rosters',  label:'Заявки' },
      { id:'players',  label:'Игроки' },
      { id:'teams',    label:'Команды' }
    ];
    const el = document.getElementById('adminTabs');
    el.innerHTML = tabs.map(t => '<button class="admin-tab' + (t.id === adminTab ? ' active' : '') + '" data-admin-tab="' + t.id + '">' + t.label + '</button>').join('') +
      '<button class="admin-tab" id="adminLogout" style="margin-left:auto;color:var(--red);">Выйти ✕</button>';
    document.getElementById('adminLogout').onclick = logout;
  }

  function renderAdminBody() {
    if (adminTab === 'matches') renderAdminMatches();
    else if (adminTab === 'rosters') renderAdminRosters();
    else if (adminTab === 'players') renderAdminPlayers();
    else if (adminTab === 'teams') renderAdminTeams();
  }

  /* --- МАТЧИ --- */
  function renderAdminMatches() {
    const el = document.getElementById('adminBody');
    const tkeys = Object.keys(tournamentsData);

    let html = '<div class="admin-card"><h3>Добавить матч</h3>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Турнир</label><select id="amTourney">' + tkeys.map(k => '<option value="' + k + '">' + escapeHtml(tournamentsData[k].title) + '</option>').join('') + '</select></div>' +
        '<div class="form-group"><label>Тур / стадия</label><input type="text" id="amTour" placeholder="1 ТУР"></div>' +
        '<div class="form-group"><label>Дата</label><input type="text" id="amDate" placeholder="01.01.2026 19:00"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Команда 1</label><select id="amT1"></select></div>' +
        '<div class="form-group"><label>Команда 2</label><select id="amT2"></select></div>' +
      '</div>' +
      '<button class="btn-gold" id="amAdd">Создать матч</button>' +
    '</div>';

    html += '<div class="admin-card"><h3>Матчи по турнирам</h3>';
    tkeys.forEach(tk => {
      const t = tournamentsData[tk];
      if (!t.matches || !t.matches.length) return;
      html += '<h4>' + escapeHtml(t.title) + '</h4>';
      t.matches.forEach((m, idx) => {
        const c1 = clubName(m.t1), c2 = clubName(m.t2);
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(15,23,42,0.5);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;gap:10px;flex-wrap:wrap;">' +
          '<span style="font-size:13px;"><strong>' + escapeHtml(m.tour || '—') + '</strong> · ' + escapeHtml(c1) + ' — ' + escapeHtml(c2) + ' · <span style="color:var(--gold)">' + (m.played ? m.s1 + ':' + m.s2 : 'не сыгран') + '</span></span>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn-secondary" style="padding:5px 12px;font-size:11px;" data-edit-match="' + tk + '|' + idx + '">Протокол</button>' +
            '<button class="btn-danger" style="padding:5px 12px;font-size:11px;" data-del-match="' + tk + '|' + idx + '">✕</button>' +
          '</div>' +
        '</div>';
      });
    });
    html += '</div>';
    el.innerHTML = html;

    // Селекты
    const tSel = document.getElementById('amTourney');
    const t1Sel = document.getElementById('amT1');
    const t2Sel = document.getElementById('amT2');
    function sync() {
      const t = tournamentsData[tSel.value];
      const opts = t.teams.map(cid => '<option value="' + cid + '">' + escapeHtml(clubName(cid)) + '</option>').join('');
      t1Sel.innerHTML = opts; t2Sel.innerHTML = opts;
    }
    tSel.onchange = sync; sync();

    document.getElementById('amAdd').onclick = () => {
      const tk = tSel.value;
      const t = tournamentsData[tk];
      const tour = document.getElementById('amTour').value.trim();
      const date = document.getElementById('amDate').value.trim();
      const t1 = t1Sel.value, t2 = t2Sel.value;
      if (t1 === t2) return alert('Команды должны быть разными');
      t.matches.push({ tour, date, t1, t2, s1:0, s2:0, played:false, scorers:'' });
      saveTournaments(); buildRegistry(); renderAdminBody(); renderContent();
    };
  }

  function openMatchEditor(ref) {
    const parts = ref.split('|');
    const tk = parts[0], idx = parseInt(parts[1]);
    const t = tournamentsData[tk]; if (!t) return;
    const m = t.matches[idx]; if (!m) return;
    const parsed = parseScorers(m.scorers || '', m.t1, m.t2);
    const events = { [m.t1]: parsed[m.t1], [m.t2]: parsed[m.t2] };
    const roster = { [m.t1]: {}, [m.t2]: {} };

    // Собираем известных игроков команды
    (t.matches || []).forEach(mm => {
      if (!mm.scorers) return;
      const p = parseScorers(mm.scorers, mm.t1, mm.t2);
      [m.t1, m.t2].forEach(cid => {
        const side = p[cid]; if (!side) return;
        side.goals.forEach(g => { const k = playerKey(g.name); if (k) roster[cid][k] = 1; });
        side.yellow.forEach(y => { const k = playerKey(y.name); if (k) roster[cid][k] = 1; });
        side.red.forEach(r => { const k = playerKey(r.name); if (k) roster[cid][k] = 1; });
      });
    });
    // Из teamsData.js
    const tdb1 = getTeamsDataEntry(clubName(m.t1));
    if (tdb1 && Array.isArray(tdb1.roster)) tdb1.roster.forEach(p => { const k = playerKey(p.name); if (k) roster[m.t1][k] = 1; });
    const tdb2 = getTeamsDataEntry(clubName(m.t2));
    if (tdb2 && Array.isArray(tdb2.roster)) tdb2.roster.forEach(p => { const k = playerKey(p.name); if (k) roster[m.t2][k] = 1; });

    function playerOptsFor(cid, selectedKey) {
      const keys = Object.keys(roster[cid]).sort((a, b) => getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b)));
      return '<option value="">— игрок —</option>' + keys.map(k =>
        '<option value="' + escapeAttr(k) + '"' + (k === selectedKey ? ' selected' : '') + '>' + escapeHtml(getPlayerDisplayName(k)) + '</option>'
      ).join('');
    }

    function renderEvents() {
      let html = '';
      [m.t1, m.t2].forEach(cid => {
        const side = events[cid];
        // Голы
        side.goals.forEach((g, i) => {
          html += '<div class="event-row">' +
            '<select data-kind="goal" data-club="' + cid + '" data-idx="' + i + '">' +
              '<option value="goal"' + (!g.ownGoal ? ' selected' : '') + '>⚽ Гол</option>' +
              '<option value="own_goal"' + (g.ownGoal ? ' selected' : '') + '>⚽ Автогол</option>' +
            '</select>' +
            '<select data-field="name" data-kind="goal" data-club="' + cid + '" data-idx="' + i + '">' + playerOptsFor(cid, playerKey(g.name)) + '</select>' +
            '<select data-field="assist" data-kind="goal" data-club="' + cid + '" data-idx="' + i + '">' +
              '<option value="">— ассист —</option>' +
              Object.keys(roster[cid]).map(k => '<option value="' + escapeAttr(k) + '"' + (playerKey(g.assist) === k ? ' selected' : '') + '>' + escapeHtml(getPlayerDisplayName(k)) + '</option>').join('') +
            '</select>' +
            '<input type="number" min="1" value="' + (g.count || 1) + '" data-field="count" data-kind="goal" data-club="' + cid + '" data-idx="' + i + '">' +
            '<button class="event-del" data-del="goal" data-club="' + cid + '" data-idx="' + i + '">✕</button>' +
          '</div>';
        });
        // ЖК
        side.yellow.forEach((y, i) => {
          html += '<div class="event-row">' +
            '<span style="color:var(--yellow);font-weight:700;">🟨 ЖК</span>' +
            '<select data-field="name" data-kind="yellow" data-club="' + cid + '" data-idx="' + i + '">' + playerOptsFor(cid, playerKey(y.name)) + '</select>' +
            '<span></span><span></span>' +
            '<button class="event-del" data-del="yellow" data-club="' + cid + '" data-idx="' + i + '">✕</button>' +
          '</div>';
        });
        // КК
        side.red.forEach((r, i) => {
          html += '<div class="event-row">' +
            '<span style="color:#fca5a5;font-weight:700;">🟥 КК</span>' +
            '<select data-field="name" data-kind="red" data-club="' + cid + '" data-idx="' + i + '">' + playerOptsFor(cid, playerKey(r.name)) + '</select>' +
            '<span></span><span></span>' +
            '<button class="event-del" data-del="red" data-club="' + cid + '" data-idx="' + i + '">✕</button>' +
          '</div>';
        });
      });
      return html || '<div class="empty-state">Событий пока нет</div>';
    }

    document.getElementById('adminBody').innerHTML =
      '<div class="admin-card">' +
        '<button class="btn-secondary" id="meBack" style="margin-bottom:14px;">← Назад</button>' +
        '<h3>' + escapeHtml(clubName(m.t1)) + ' — ' + escapeHtml(clubName(m.t2)) + '</h3>' +
        '<p style="color:var(--muted);font-size:12px;">' + escapeHtml(m.tour || '') + ' · ' + escapeHtml(m.date || '') + '</p>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>' + escapeHtml(clubName(m.t1)) + '</label><input type="number" id="meS1" min="0" value="' + (m.s1 || 0) + '"></div>' +
          '<div class="form-group"><label>' + escapeHtml(clubName(m.t2)) + '</label><input type="number" id="meS2" min="0" value="' + (m.s2 || 0) + '"></div>' +
        '</div>' +
        '<h4>События — ' + escapeHtml(clubName(m.t1)) + '</h4>' +
        '<button class="btn-secondary" data-add-event="goal" data-club="' + m.t1 + '">+ Гол ' + escapeHtml(clubName(m.t1)) + '</button> ' +
        '<button class="btn-secondary" data-add-event="yellow" data-club="' + m.t1 + '">+ 🟨</button> ' +
        '<button class="btn-secondary" data-add-event="red" data-club="' + m.t1 + '">+ 🟥</button>' +
        '<h4>События — ' + escapeHtml(clubName(m.t2)) + '</h4>' +
        '<button class="btn-secondary" data-add-event="goal" data-club="' + m.t2 + '">+ Гол ' + escapeHtml(clubName(m.t2)) + '</button> ' +
        '<button class="btn-secondary" data-add-event="yellow" data-club="' + m.t2 + '">+ 🟨</button> ' +
        '<button class="btn-secondary" data-add-event="red" data-club="' + m.t2 + '">+ 🟥</button>' +
        '<div id="meEvents" style="margin-top:14px;">' + renderEvents() + '</div>' +
        '<div style="margin-top:18px;display:flex;gap:8px;">' +
          '<button class="btn-gold" id="meSave">Сохранить протокол</button>' +
          '<button class="btn-secondary" id="meCancel">Отмена</button>' +
        '</div>' +
      '</div>';

    function rerender() {
      document.getElementById('meEvents').innerHTML = renderEvents();
      bind();
    }
    function bind() {
      document.querySelectorAll('#meEvents [data-field]').forEach(el => {
        el.onchange = () => {
          const kind = el.getAttribute('data-kind');
          const cid = el.getAttribute('data-club');
          const i = parseInt(el.getAttribute('data-idx'));
          const field = el.getAttribute('data-field');
          const val = el.value;
          if (kind === 'goal') {
            const g = events[cid].goals[i]; if (!g) return;
            if (field === 'name') g.name = val ? getPlayerDisplayName(val) : '';
            else if (field === 'assist') g.assist = val ? getPlayerDisplayName(val) : '';
            else if (field === 'count') g.count = parseInt(val) || 1;
          } else {
            const arr = kind === 'yellow' ? events[cid].yellow : events[cid].red;
            const it = arr[i]; if (!it) return;
            if (field === 'name') it.name = val ? getPlayerDisplayName(val) : '';
          }
        };
      });
      document.querySelectorAll('#meEvents [data-del]').forEach(btn => {
        btn.onclick = () => {
          const kind = btn.getAttribute('data-del');
          const cid = btn.getAttribute('data-club');
          const i = parseInt(btn.getAttribute('data-idx'));
          if (kind === 'goal') events[cid].goals.splice(i, 1);
          else if (kind === 'yellow') events[cid].yellow.splice(i, 1);
          else if (kind === 'red') events[cid].red.splice(i, 1);
          rerender();
        };
      });
      document.querySelectorAll('[data-add-event]').forEach(btn => {
        btn.onclick = () => {
          const kind = btn.getAttribute('data-add-event');
          const cid = btn.getAttribute('data-club');
          if (kind === 'goal') events[cid].goals.push({ name:'', count:1, assist:'', ownGoal:false });
          else if (kind === 'yellow') events[cid].yellow.push({ name:'' });
          else if (kind === 'red') events[cid].red.push({ name:'' });
          rerender();
        };
      });
    }
    bind();

    document.getElementById('meBack').onclick = () => { renderAdminBody(); };
    document.getElementById('meCancel').onclick = () => { renderAdminBody(); };
    document.getElementById('meSave').onclick = () => {
      m.s1 = parseInt(document.getElementById('meS1').value) || 0;
      m.s2 = parseInt(document.getElementById('meS2').value) || 0;
      m.played = true;
      // фильтруем пустые
      [m.t1, m.t2].forEach(cid => {
        events[cid].goals = events[cid].goals.filter(g => g.name);
        events[cid].yellow = events[cid].yellow.filter(y => y.name);
        events[cid].red = events[cid].red.filter(r => r.name);
      });
      m.scorers = buildScorers(events, m.t1, m.t2);
      saveTournaments();
      buildRegistry();
      alert('Сохранено');
      renderAdminBody();
      renderContent();
    };
  }

  /* --- ЗАЯВКИ --- */
  function renderAdminRosters() {
    const el = document.getElementById('adminBody');
    el.innerHTML =
      '<div class="admin-card"><h3>Заявки на турниры</h3>' +
        '<p>Для управления заявкой используйте кабинет команды: там уже собраны все игроки, когда-либо упоминавшиеся за клуб. Для добавления в заявку используйте раздел <strong>Игроки</strong>.</p>' +
      '</div>';
  }

  /* --- ИГРОКИ --- */
  function renderAdminPlayers() {
    const el = document.getElementById('adminBody');
    const keys = Object.keys(registry).sort((a, b) => getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b)));
    el.innerHTML =
      '<div class="admin-card"><h3>Игроки (' + keys.length + ')</h3>' +
        '<input type="text" id="apSearch" placeholder="Поиск по имени..." style="width:100%;margin-bottom:14px;">' +
        '<div id="apList"></div>' +
      '</div>';
    function renderList() {
      const q = normalize(document.getElementById('apSearch').value);
      const filtered = keys.filter(k => !q || normalize(getPlayerDisplayName(k)).includes(q));
      const html = filtered.length
        ? '<div class="roster-table-wrap"><table><thead><tr><th>Фото</th><th class="text-left">Имя</th><th>Позиция</th><th>Д.р.</th><th>Награды</th><th></th></tr></thead><tbody>' +
          filtered.map(k => {
            const prof = playerProfiles[k] || {};
            const name = getPlayerDisplayName(k);
            return '<tr>' +
              '<td>' + (prof.photo ? '<img src="' + escapeAttr(prof.photo) + '" class="roster-mini-photo">' : '<span class="roster-mini-photo-placeholder">👤</span>') + '</td>' +
              '<td class="text-left"><strong>' + escapeHtml(name) + '</strong></td>' +
              '<td>' + (prof.pos ? '<span class="pos-badge pos-' + prof.pos + '">' + prof.pos + '</span>' : '—') + '</td>' +
              '<td>' + (prof.birth || '—') + '</td>' +
              '<td>' + (prof.awards && prof.awards.length ? prof.awards.join(', ') : '—') + '</td>' +
              '<td><button class="btn-secondary" style="padding:4px 10px;font-size:11px;" data-edit-player="' + escapeAttr(k) + '">Изменить</button></td>' +
            '</tr>';
          }).join('') +
        '</tbody></table></div>'
        : '<div class="empty-state">Не найдено</div>';
      document.getElementById('apList').innerHTML = html;
      document.querySelectorAll('[data-edit-player]').forEach(b => {
        b.onclick = () => editPlayer(b.getAttribute('data-edit-player'));
      });
    }
    setTimeout(() => { document.getElementById('apSearch').oninput = renderList; renderList(); }, 0);
  }

  function editPlayer(key) {
    const el = document.getElementById('adminBody');
    const prof = playerProfiles[key] || {};
    const awards = prof.awards || [];
    const awardOpts = [
      { v:'best_scorer',    l:'Лучший бомбардир' },
      { v:'best_player',    l:'Лучший игрок' },
      { v:'best_goalkeeper',l:'Лучший вратарь' },
      { v:'best_defender',  l:'Лучший защитник' },
      { v:'best_young',     l:'Лучший молодой' },
      { v:'best_veteran',   l:'Лучший возрастной' }
    ];
    el.innerHTML = '<div class="admin-card">' +
      '<button class="btn-secondary" id="peBack" style="margin-bottom:14px;">← Назад</button>' +
      '<h3>Игрок: ' + escapeHtml(getPlayerDisplayName(key)) + '</h3>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>ФИО (полное)</label><input type="text" id="peName" value="' + escapeAttr(prof.name || '') + '" placeholder="' + escapeAttr(getPlayerDisplayName(key)) + '"></div>' +
        '<div class="form-group"><label>Позиция</label><select id="pePos">' +
          ['','ВРТ','ЗАЩ','ПЗ','НАП','УНИ'].map(x => '<option value="' + x + '"' + (prof.pos === x ? ' selected' : '') + '>' + (x || '—') + '</option>').join('') +
        '</select></div>' +
        '<div class="form-group"><label>Дата рождения</label><input type="text" id="peBirth" value="' + escapeAttr(prof.birth || '') + '" placeholder="1995-03-12"></div>' +
      '</div>' +
      '<div class="form-group"><label>URL фото (3:4 вертикальное)</label><input type="text" id="pePhoto" value="' + escapeAttr(prof.photo || '') + '" placeholder="https://..."></div>' +
      '<div class="form-group"><label>Награды</label><div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        awardOpts.map(a => '<label style="display:flex;align-items:center;gap:6px;font-size:13px;"><input type="checkbox" value="' + a.v + '"' + (awards.indexOf(a.v) !== -1 ? ' checked' : '') + '> ' + a.l + '</label>').join('') +
      '</div></div>' +
      '<div style="margin-top:16px;display:flex;gap:8px;">' +
        '<button class="btn-gold" id="peSave">Сохранить</button>' +
      '</div>' +
    '</div>';
    document.getElementById('peBack').onclick = () => renderAdminBody();
    document.getElementById('peSave').onclick = () => {
      const newProf = {
        name: document.getElementById('peName').value.trim(),
        pos: document.getElementById('pePos').value,
        birth: document.getElementById('peBirth').value.trim(),
        photo: document.getElementById('pePhoto').value.trim(),
        awards: []
      };
      document.querySelectorAll('.admin-card input[type=checkbox]:checked').forEach(cb => newProf.awards.push(cb.value));
      playerProfiles[key] = newProf;
      saveProfiles();
      alert('Сохранено');
      renderAdminBody();
      renderContent();
    };
  }

  /* --- КОМАНДЫ --- */
  function renderAdminTeams() {
    const el = document.getElementById('adminBody');
    el.innerHTML = '<div class="admin-card"><h3>Команды</h3>' +
      clubsData.map(c => '<div class="form-row" style="align-items:flex-end;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div class="form-group" style="margin:0;"><label>Название</label><input type="text" data-tf="name" data-id="' + c.id + '" value="' + escapeAttr(c.name) + '"></div>' +
        '<div class="form-group" style="margin:0;"><label>Логотип</label><input type="text" data-tf="logo" data-id="' + c.id + '" value="' + escapeAttr(c.logo || '') + '"></div>' +
        '<div class="form-group" style="margin:0;"><label>Фото</label><input type="text" data-tf="photo" data-id="' + c.id + '" value="' + escapeAttr(c.photo || '') + '"></div>' +
        '<div class="form-group" style="margin:0;"><label>ВК</label><input type="text" data-tf="vk" data-id="' + c.id + '" value="' + escapeAttr(c.vk || '') + '"></div>' +
      '</div>').join('') +
      '<button class="btn-gold" id="teamsSave" style="margin-top:16px;">Сохранить</button>' +
    '</div>';
    document.getElementById('teamsSave').onclick = () => {
      clubKeys.forEach(id => {
        const c = clubsData.find(x => x.id === id);
        if (!c) return;
        const fields = ['name','logo','photo','vk'];
        fields.forEach(f => {
          const inp = document.querySelector('[data-tf="' + f + '"][data-id="' + id + '"]');
          if (inp) c[f] = inp.value.trim();
        });
        teamOverrides[id] = { name: c.name, logo: c.logo, photo: c.photo, vk: c.vk };
      });
      saveTeams();
      rebuildClubMap();
      alert('Сохранено');
      renderSidebar();
      renderContent();
    };
  }
  const clubKeys = clubsData.map(c => c.id);

  /* ========== ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ========== */
  function bindEvents() {
    document.querySelectorAll('[data-close]').forEach(b => {
      b.onclick = () => closeModal(b.getAttribute('data-close'));
    });
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.onclick = e => { if (e.target === m) m.classList.remove('show'); };
    });

    // 3 клика по лого → админка
    let clicks = 0, timer = null;
    document.getElementById('brandBtn').onclick = () => {
      clicks++;
      clearTimeout(timer); timer = setTimeout(() => clicks = 0, 700);
      if (clicks >= 3) { clicks = 0; if (isAuth()) openAdmin(); else openLogin(); }
    };

    // #admin
    function checkHash() { if (location.hash === '#admin') { if (isAuth()) openAdmin(); else openLogin(); } }
    window.addEventListener('hashchange', checkHash);
    setTimeout(checkHash, 100);

    // Login
    document.getElementById('loginSubmit').onclick = doLogin;
    document.getElementById('loginInput').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
    document.getElementById('loginPass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };

    // Делегирование
    document.addEventListener('click', e => {
      const pEl = e.target.closest('[data-player]');
      if (pEl) { openPlayer(pEl.getAttribute('data-player')); return; }
      const cEl = e.target.closest('[data-club]');
      if (cEl) { openTeam(cEl.getAttribute('data-club')); return; }
      const tEl = e.target.closest('[data-tourney]');
      if (tEl) { currentTournament = tEl.getAttribute('data-tourney'); currentTab = 'matches'; renderSidebar(); renderContent(); return; }
      const tabBtn = e.target.closest('.tab-btn[data-tab]');
      if (tabBtn) { currentTab = tabBtn.getAttribute('data-tab'); renderContent(); return; }
      const teamTab = e.target.closest('[data-team-tab]');
      if (teamTab) {
        const name = teamTab.getAttribute('data-team-tab');
        const parent = teamTab.closest('.modal-content');
        parent.querySelectorAll('[data-team-tab]').forEach(b => b.classList.remove('active'));
        teamTab.classList.add('active');
        parent.querySelectorAll('[data-team-panel]').forEach(p => p.style.display = p.getAttribute('data-team-panel') === name ? 'block' : 'none');
        return;
      }
      const adminTabEl = e.target.closest('[data-admin-tab]');
      if (adminTabEl) { adminTab = adminTabEl.getAttribute('data-admin-tab'); renderAdminTabs(); renderAdminBody(); return; }
      const editM = e.target.closest('[data-edit-match]');
      if (editM) { openMatchEditor(editM.getAttribute('data-edit-match')); return; }
      const delM = e.target.closest('[data-del-match]');
      if (delM) {
        if (!confirm('Удалить матч?')) return;
        const ref = delM.getAttribute('data-del-match').split('|');
        const t = tournamentsData[ref[0]];
        t.matches.splice(parseInt(ref[1]), 1);
        saveTournaments(); buildRegistry(); renderAdminBody(); renderContent();
        return;
      }
    });
  }

  /* ========== ИНИЦИАЛИЗАЦИЯ ========== */
  function init() {
    loadAll();
    const fedLogo = document.getElementById('fedLogoDisplay');
    if (fedLogo) fedLogo.innerHTML = '<img src="logos/lfld.png" alt="">';
    currentTournament = Object.keys(tournamentsData)[0];
    renderSidebar();
    renderContent();
    bindEvents();
    console.log('[app] Клубов:', clubsData.length, '| Игроков в реестре:', Object.keys(registry).length, '| Турниров:', Object.keys(tournamentsData).length);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LFLD = { get registry() { return registry; }, get tournamentsData() { return tournamentsData; }, get playerProfiles() { return playerProfiles; } };
})();