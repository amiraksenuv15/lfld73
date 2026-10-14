/* ============================================================
   totw-public.js — публичный рендер Символической сборной тура
   Поддержка 8 ФИКСИРОВАННЫХ позиций (ВРТ/ЛЗ/ПЗ/ОПЗ/ЦПЗ/ЛВ/ПВ/ЦН)
   ============================================================ */
(function () {
  'use strict';

  var CUP_KEY = 'cup_metallist_2026';

  /* --- Раскладка 8 фиксированных позиций на поле --- */
  var TOTW_LAYOUT = {
    'ЦН':  { x: 50, y: 12 },
    'ЛВ':  { x: 18, y: 28 },
    'ПВ':  { x: 82, y: 28 },
    'ОПЗ': { x: 30, y: 50 },
    'ЦПЗ': { x: 70, y: 50 },
    'ЛЗ':  { x: 22, y: 68 },
    'ПЗ':  { x: 78, y: 68 },
    'ВРТ': { x: 50, y: 88 }
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }

  /* ============================ СБОРНАЯ ТУРА ============================ */
  function loadSavedTOTW(preferredTourney) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem('ff_symbolic_teams') || '{}') || {}; }
    catch (e) { all = {}; }

    var keys = Object.keys(all);
    if (!keys.length) return null;

    var targetKey = null;
    if (preferredTourney) {
      var forCur = keys.filter(function (k) { return k.indexOf(preferredTourney + '|') === 0; });
      if (forCur.length) {
        forCur.sort(function (a, b) {
          return (parseInt(a.split('|')[1].replace(/\D/g, '')) || 0)
               - (parseInt(b.split('|')[1].replace(/\D/g, '')) || 0);
        });
        targetKey = forCur[forCur.length - 1];
      }
    }
    if (!targetKey) {
      keys.sort(function (a, b) {
        return (parseInt(a.split('|')[1].replace(/\D/g, '')) || 0)
             - (parseInt(b.split('|')[1].replace(/\D/g, '')) || 0);
      });
      targetKey = keys[keys.length - 1];
    }
    var payload = all[targetKey];
    if (!payload) return null;

    // Унификация формата: либо slots, либо players
    if (payload.slots && Array.isArray(payload.slots)) return payload;
    if (Array.isArray(payload.players)) {
      var slots = [];
      payload.players.forEach(function (p, i) {
        if (!p || !p.name) return;
        slots.push({ name: p.name, club: p.club, pos: p.pos || 'ПЗ', short: p.short || '' });
      });
      payload.slots = slots;
    }
    return payload;
  }

  function clubLogoHtml(club) {
    if (window.getClubLogoForCard) return window.getClubLogoForCard(club);
    if (window.getClubLogoHtml)     return window.getClubLogoHtml(club);
    return '<span style="font-size:22px;line-height:1;">⚽</span>';
  }

  function renderHomeTOTW() {
    var pitch = document.getElementById('symbolicPitch');
    var titleEl = document.getElementById('symbolicTitle');
    var section = document.getElementById('homeSymbolicSection');
    if (section) section.style.display = 'block';
    if (!pitch) return;

    pitch.querySelectorAll('.sp-player, .symbolic-empty').forEach(function (el) { el.remove(); });

    var cur = (window.getCurrentTourneyKey && window.getCurrentTourneyKey()) || null;
    var saved = loadSavedTOTW(cur);

    if (titleEl) {
      titleEl.innerText = (saved && saved.round)
        ? 'Символическая сборная · ' + saved.round
        : 'Символическая сборная тура';
    }

    var filled = (saved && saved.slots) ? saved.slots.filter(function (p) { return p && p.name && p.club; }) : [];

    if (!filled.length) {
      var empty = document.createElement('div');
      empty.className = 'symbolic-empty';
      empty.style.cssText =
        'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'text-align:center;color:rgba(241,245,249,0.75);font-size:12px;' +
        'padding:10px 16px;background:rgba(11,17,30,0.55);border-radius:10px;' +
        'border:1px solid rgba(255,255,255,0.1);max-width:80%;';
      empty.innerText = 'Сборная тура ещё не опубликована';
      pitch.appendChild(empty);
      return;
    }

    filled.forEach(function (p) {
      var code = String(p.pos || '').toUpperCase();
      var layout = TOTW_LAYOUT[code] || { x: 50, y: 50 };
      var el = document.createElement('div');
      el.className = 'sp-player';
      el.style.left = layout.x + '%';
      el.style.top = layout.y + '%';
      el.setAttribute('title', (p.name || '') + (p.club ? ' · ' + p.club : ''));
      var short = p.short || (p.name ? String(p.name).split(/\s+/)[0] : '—');
      el.innerHTML =
        '<div class="sp-shirt">' + clubLogoHtml(p.club) + '</div>' +
        '<div class="sp-name">' + escapeHtml(short) + '</div>' +
        '<div class="sp-pos">' + escapeHtml(code) + '</div>';
      el.addEventListener('click', function () {
        if (p.name && window.openPlayerModal) window.openPlayerModal(p.name, p.club);
      });
      pitch.appendChild(el);
    });
  }

  /* ============================ АФИША МАТЧЕЙ ============================ */
  function parseDateTime(str) {
    if (!str) return null;
    var m = String(str).match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  }
  function fmtDate(d) {
    if (!d) return '';
    var days = ['вс','пн','вт','ср','чт','пт','сб'];
    var months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
  }
  function fmtTime(str, d) {
    if (d) return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var m = String(str || '').match(/(\d{1,2}):(\d{2})/);
    return m ? (('0' + m[1]).slice(-2) + ':' + m[2]) : '';
  }
  function daysUntil(d) {
    if (!d) return null;
    var now = new Date();
    var diff = Math.ceil((d.getTime() - now.getTime()) / (24 * 3600 * 1000));
    if (diff < 0) return null;
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    if (diff <= 7) return 'через ' + diff + ' дн.';
    return null;
  }

  function collectUpcomingMatches() {
    var TD = window.tournamentsData || {};
    var all = [];
    Object.keys(TD).forEach(function (tk) {
      var t = TD[tk]; if (!t || !Array.isArray(t.matches)) return;
      t.matches.forEach(function (m) {
        if (!m) return;
        var status = m.status;
        if (status === 'finished' || status === 'cancelled') return;
        var played = m.played !== false && (m.s1 > 0 || m.s2 > 0);
        if (played || status === 'live') return;
        if (status && status !== 'upcoming' && status !== 'announce') return;
        var dt = parseDateTime(m.date);
        if (!dt) dt = new Date(8640000000000);
        all.push({ tk: tk, tourney: t.title || tk, isCup: !!t.isMetallistCup, match: m, dt: dt });
      });
    });
    all.sort(function (a, b) {
      if (a.isCup !== b.isCup) return a.isCup ? -1 : 1;
      return a.dt - b.dt;
    });
    return all.slice(0, 12);
  }

  function renderAfficheMatchCard(item) {
    var m = item.match;
    var dt = item.dt && item.dt.getTime() < 8.64e15 ? item.dt : null;
    var timeStr = fmtTime(m.time || m.date, dt);
    var dateStr = dt ? fmtDate(dt) : (m.date || 'Дата уточняется');
    var countdown = daysUntil(dt);
    var venue = m.venue || m.stadium || (item.isCup ? 'ФОК Легенда' : null) || 'Манеж «Атом»';
    var tourneyLabel = item.isCup ? 'Кубок Металлиста' : item.tourney;

    var html = '';
    html += '<div class="affiche-match-card' + (item.isCup ? ' is-cup' : '') + '">';
    html +=   '<div class="amc-top">';
    html +=     '<span class="amc-tour-badge">' + escapeHtml(tourneyLabel) + '</span>';
    html +=     '<span class="amc-announce-badge">' + (countdown ? 'АНОНС · ' + countdown : 'АНОНС МАТЧА') + '</span>';
    html +=   '</div>';
    html +=   '<div class="amc-teams">';
    html +=     '<div class="amc-team" onclick="window.openClubCabinet && window.openClubCabinet(\'' + escapeAttr(m.t1) + '\')">' +
                  '<div class="amc-team-logo">' + clubLogoHtml(m.t1) + '</div>' +
                  '<div class="amc-team-name">' + escapeHtml(m.t1) + '</div>' +
                '</div>';
    html +=     '<div class="amc-vs">VS</div>';
    html +=     '<div class="amc-team" onclick="window.openClubCabinet && window.openClubCabinet(\'' + escapeAttr(m.t2) + '\')">' +
                  '<div class="amc-team-logo">' + clubLogoHtml(m.t2) + '</div>' +
                  '<div class="amc-team-name">' + escapeHtml(m.t2) + '</div>' +
                '</div>';
    html +=   '</div>';
    html +=   '<div class="amc-meta">';
    html +=     '<span>📅 ' + escapeHtml(dateStr) + (timeStr ? ' · ' + escapeHtml(timeStr) : '') + '</span>';
    html +=     '<span class="amc-venue">📍 ' + escapeHtml(venue) + '</span>';
    if (m.tour) html += '<span>🏷 ' + escapeHtml(m.tour) + '</span>';
    html +=   '</div>';
    html += '</div>';
    return html;
  }

  function renderHomeAffiche() {
    var grid = document.getElementById('homeAfficheGrid');
    if (!grid) return;
    var items = collectUpcomingMatches();
    if (!items.length) {
      grid.innerHTML = '<div class="affiche-matches-empty">Пока нет запланированных матчей</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) { html += renderAfficheMatchCard(it); });
    grid.innerHTML = html;
  }

  /* ============================ ЭКСПОРТ ============================ */
  window.LFLD_V2 = window.LFLD_V2 || {};
  window.LFLD_V2.renderHomeTOTW = renderHomeTOTW;
  window.LFLD_V2.renderHomeAffiche = renderHomeAffiche;

  window.addEventListener('storage', function (e) {
    if (e.key === 'ff_symbolic_teams') renderHomeTOTW();
    if (e.key === 'ff_tournaments') renderHomeAffiche();
  });

  function boot() {
    setTimeout(function () {
      try { renderHomeTOTW(); } catch (e) { console.warn('[totw]', e); }
      try { renderHomeAffiche(); } catch (e) { console.warn('[affiche]', e); }
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[totw-public] загружен — 8 фикс. позиций');
})();