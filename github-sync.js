/* ============================================================
   github-sync.js v4.0 — публикация с фото строго по ID
   ============================================================ */
(function () {
  'use strict';

  var GH_OWNER = 'amiraksenuv15';
  var GH_REPO  = 'lfld73';
  var GH_BRANCH = 'main';
  var GH_FILE  = 'allTournamentsMasterData.js';
  var TOKEN_KEY = 'lfld_gh_token';
  var API_BASE = 'https://api.github.com';

  function toBase64Unicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }

  function loadToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function saveToken(t) { try { localStorage.setItem(TOKEN_KEY, String(t || '')); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function collectAuxData() {
    var aux = {};
    function safeGet(key, def) {
      try { return JSON.parse(localStorage.getItem(key) || 'null') || def; }
      catch (e) { return def; }
    }
    aux.cupMetallistRosters = safeGet('ff_cup_metallist_rosters', {});
    aux.symbolicTeams       = safeGet('ff_symbolic_teams', {});
    aux.clubMainPhoto       = safeGet('ff_club_main_photo', {});
    aux.tournaments         = safeGet('ff_tournaments', null);
    aux.customClubs         = safeGet('ff_custom_clubs', []);
    aux.bannerSlides        = safeGet('bannerSlides', []);
    aux.organizers          = safeGet('ff_organizers', []);
    return aux;
  }

  /* ⚡ Собираем LFLD_MASTER_DB с playerPhotos по ID */
  function buildMasterWithMedia() {
    var master = window.LFLD_MASTER_DB || {};
    var copy = {};
    Object.keys(master).forEach(function (k) {
      if (k === 'teamPhotos' || k === 'playerPhotos') return;
      copy[k] = master[k];
    });
    /* Командные фото */
    copy.teamPhotos = Object.assign({}, master.teamPhotos || {});
    /* Фото игроков — ТОЛЬКО по ID */
    copy.playerPhotos = Object.assign({}, master.playerPhotos || {});

    /* Подтянуть из localStorage на случай рассинхрона */
    try {
      var localTeams = JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}');
      Object.keys(localTeams).forEach(function (club) {
        if (!localTeams[club]) return;
        var tk = (window.lfldMedia && window.lfldMedia.teamKey)
          ? window.lfldMedia.teamKey(club)
          : 'team_' + club.toLowerCase().replace(/\s+/g, '_');
        if (!copy.teamPhotos[tk]) copy.teamPhotos[tk] = localTeams[club];
      });
    } catch (e) {}

    try {
      var localPlayersById = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      Object.keys(localPlayersById).forEach(function (id) {
        if (!localPlayersById[id]) return;
        if (!copy.playerPhotos[id]) copy.playerPhotos[id] = localPlayersById[id];
      });
    } catch (e) {}

    return copy;
  }

  function buildFileContent() {
    var master = buildMasterWithMedia();
    var aux = collectAuxData();
    var ts = new Date().toISOString();
    var playerIds = window.LFLD_PLAYER_IDS || {};

    var L = [];
    L.push('/* ============================================================');
    L.push('   allTournamentsMasterData.js — автогенерация из админки');
    L.push('   Опубликовано: ' + ts);
    L.push('   ============================================================ */');
    L.push('');
    L.push('window.LFLD_MASTER_DB = window.LFLD_MASTER_DB || {};');
    L.push('window.LFLD_MASTER_DB.teamPhotos   = window.LFLD_MASTER_DB.teamPhotos   || {};');
    L.push('window.LFLD_MASTER_DB.playerPhotos = window.LFLD_MASTER_DB.playerPhotos || {};');
    L.push('');
    L.push('/* ---------- Реестр ID игроков ---------- */');
    L.push('window.LFLD_PLAYER_IDS = ' + JSON.stringify(playerIds, null, 2) + ';');
    L.push('');
    L.push('/* ---------- Мастер-база + фото по ID ---------- */');
    L.push('window.LFLD_MASTER_DB = Object.assign(window.LFLD_MASTER_DB, ' + JSON.stringify(master, null, 2) + ');');
    L.push('');
    L.push('/* ---------- Вспомогательные данные ---------- */');
    L.push('window.LFLD_AUX_DATA = ' + JSON.stringify(aux, null, 2) + ';');
    L.push('');
    L.push('/* ---------- Автосинхронизация в localStorage ---------- */');
    L.push('(function () {');
    L.push('  if (!window.LFLD_AUX_DATA) return;');
    L.push('  var A = window.LFLD_AUX_DATA;');
    L.push('  function mergeInto(key, value) {');
    L.push('    if (!value) return;');
    L.push('    try {');
    L.push('      var existing = JSON.parse(localStorage.getItem(key) || "null");');
    L.push('      var merged = (existing && typeof existing === "object")');
    L.push('        ? Object.assign({}, value, existing)');
    L.push('        : value;');
    L.push('      localStorage.setItem(key, JSON.stringify(merged));');
    L.push('    } catch (e) {}');
    L.push('  }');
    L.push('  mergeInto("ff_cup_metallist_rosters", A.cupMetallistRosters);');
    L.push('  mergeInto("ff_symbolic_teams",        A.symbolicTeams);');
    L.push('  mergeInto("ff_club_main_photo",       A.clubMainPhoto);');
    L.push('  mergeInto("ff_tournaments",           A.tournaments);');
    L.push('');
    L.push('  /* Фото игроков по ID */');
    L.push('  if (window.LFLD_MASTER_DB && window.LFLD_MASTER_DB.playerPhotos) {');
    L.push('    try {');
    L.push('      var existingPhotos = JSON.parse(localStorage.getItem("ff_player_photos_by_id") || "{}");');
    L.push('      Object.assign(existingPhotos, window.LFLD_MASTER_DB.playerPhotos);');
    L.push('      localStorage.setItem("ff_player_photos_by_id", JSON.stringify(existingPhotos));');
    L.push('    } catch (e) {}');
    L.push('  }');
    L.push('');
    L.push('  if (Array.isArray(A.customClubs) && A.customClubs.length) {');
    L.push('    try { var cc = JSON.parse(localStorage.getItem("ff_custom_clubs") || "[]"); A.customClubs.forEach(function (c) { if (!c || !c.name) return; if (!cc.find(function (x) { return x.name === c.name; })) cc.push(c); }); localStorage.setItem("ff_custom_clubs", JSON.stringify(cc)); } catch (e) {}');
    L.push('  }');
    L.push('})();');
    L.push('');

    return L.join('\n');
  }

  function ghHeaders(token) {
    return {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  function getCurrentFileSha(token) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + encodeURIComponent(GH_FILE) + '?ref=' + encodeURIComponent(GH_BRANCH);
    return fetch(url, { headers: ghHeaders(token) })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) return res.json().then(function (j) { throw new Error('GET ' + res.status + ': ' + (j.message || 'unknown')); });
        return res.json();
      })
      .then(function (data) { return data && data.sha ? data.sha : null; });
  }

  function putFile(token, content, sha, message) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + encodeURIComponent(GH_FILE);
    var body = {
      message: message || ('Auto-sync ' + new Date().toISOString()),
      content: toBase64Unicode(content),
      branch: GH_BRANCH
    };
    if (sha) body.sha = sha;
    return fetch(url, {
      method: 'PUT',
      headers: ghHeaders(token),
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (j) { throw new Error('PUT ' + res.status + ': ' + (j.message || 'unknown')); });
      return res.json();
    });
  }

  function ensureWrap() {
    var w = document.getElementById('ghSyncWrap');
    if (w) return w;
    var extras = document.getElementById('adminExtrasContainer');
    if (!extras || !extras.parentNode) return null;
    w = document.createElement('div');
    w.id = 'ghSyncWrap';
    extras.parentNode.insertBefore(w, extras.nextSibling);
    return w;
  }

  function setStatus(text, kind) {
    var el = document.getElementById('gh-sync-status');
    if (!el) return;
    el.className = 'gh-sync-status ' + (kind || 'info');
    el.innerText = text;
    el.classList.remove('hidden');
  }
  function hideStatus() { var el = document.getElementById('gh-sync-status'); if (el) el.classList.add('hidden'); }
  function setButtonBusy(busy) {
    var b = document.getElementById('publish-to-github-btn');
    if (!b) return;
    b.disabled = !!busy;
    b.classList.toggle('busy', !!busy);
    b.innerHTML = busy ? '⏳ Отправка...' : '🚀 Сохранить и опубликовать на сайт';
  }

  function renderBlock() {
    var w = ensureWrap(); if (!w) return;
    var savedToken = loadToken();
    w.innerHTML =
      '<div class="admin-extras-section gh-sync-section">' +
        '<h3>🔗 Синхронизация с GitHub</h3>' +
        '<p>Публикация <strong>мастер-базы, фото команд и фото игроков по ID</strong> в репозиторий ' +
          '<strong>' + GH_OWNER + '/' + GH_REPO + '</strong>.</p>' +
        '<div class="form-row">' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Персональный токен GitHub (PAT)</label>' +
            '<input type="password" id="gh-token-input" placeholder="ghp_..." value="' + (savedToken ? savedToken.replace(/"/g, '&quot;') : '') + '" autocomplete="off">' +
          '</div>' +
          '<div class="form-group" style="display:flex;align-items:flex-end;gap:8px;">' +
            '<button type="button" class="btn-secondary" id="gh-save-token-btn">💾 Сохранить ключ</button>' +
            '<button type="button" class="btn-danger" id="gh-clear-token-btn">🗑 Удалить</button>' +
          '</div>' +
        '</div>' +
        '<button id="publish-to-github-btn" type="button" class="gh-publish-btn">🚀 Сохранить и опубликовать на сайт</button>' +
        '<div id="gh-sync-status" class="gh-sync-status hidden"></div>' +
      '</div>';
    bind();
  }

  function bind() {
    var tokenInp = document.getElementById('gh-token-input');
    var saveBtn = document.getElementById('gh-save-token-btn');
    var clearBtn = document.getElementById('gh-clear-token-btn');
    var pubBtn = document.getElementById('publish-to-github-btn');
    if (saveBtn) saveBtn.onclick = function () {
      var t = (tokenInp && tokenInp.value || '').trim();
      if (!t) { setStatus('⚠ Введите токен', 'err'); return; }
      saveToken(t); setStatus('✅ Ключ сохранён', 'ok'); setTimeout(hideStatus, 3500);
    };
    if (clearBtn) clearBtn.onclick = function () {
      if (!confirm('Удалить токен?')) return;
      clearToken(); if (tokenInp) tokenInp.value = '';
      setStatus('🗑 Токен удалён', 'info'); setTimeout(hideStatus, 2500);
    };
    if (pubBtn) pubBtn.onclick = publishToGithub;
  }

  function publishToGithub() {
    var tokenInp = document.getElementById('gh-token-input');
    var token = (tokenInp && tokenInp.value || '').trim() || loadToken();
    if (!token) { setStatus('⚠ Укажите GitHub токен', 'err'); if (tokenInp) tokenInp.focus(); return; }
    saveToken(token);

    setButtonBusy(true);
    setStatus('⏳ Сбор данных...', 'info');

    var fileContent;
    try {
      if (window.lfldMedia && window.lfldMedia.loadFromStorage) {
        try { window.lfldMedia.loadFromStorage(); } catch (e) {}
      }
      fileContent = buildFileContent();
    } catch (e) {
      setButtonBusy(false);
      setStatus('❌ Ошибка: ' + e.message, 'err');
      return;
    }

    var photoCount = 0;
    try {
      var tp = (window.LFLD_MASTER_DB && window.LFLD_MASTER_DB.teamPhotos) || {};
      var pp = (window.LFLD_MASTER_DB && window.LFLD_MASTER_DB.playerPhotos) || {};
      photoCount = Object.keys(tp).length + Object.keys(pp).length;
    } catch (e) {}

    getCurrentFileSha(token)
      .then(function (sha) {
        var message = 'Auto-sync · ' + new Date().toLocaleString('ru-RU') + (photoCount ? ' · media: ' + photoCount : '');
        return putFile(token, fileContent, sha, message);
      })
      .then(function (res) {
        setButtonBusy(false);
        var commitShort = (res && res.commit && res.commit.sha) ? res.commit.sha.slice(0, 7) : '';
        setStatus(
          '✅ Опубликовано' + (commitShort ? ' (commit ' + commitShort + ')' : '') +
          (photoCount ? ' · медиа: ' + photoCount : '') +
          '. Перезагрузите страницу на мобильном.',
          'ok'
        );
        setTimeout(hideStatus, 10000);
      })
      .catch(function (err) {
        console.error('[github-sync]', err);
        setButtonBusy(false);
        var msg = String(err && err.message || err);
        if (msg.indexOf('401') !== -1) msg = '❌ Неверный токен';
        else if (msg.indexOf('403') !== -1) msg = '❌ Нужен scope «repo»';
        else if (msg.indexOf('404') !== -1) msg = '❌ Репозиторий не найден';
        else if (msg.indexOf('409') !== -1) msg = '⚠ Конфликт SHA. Обновите страницу.';
        else msg = '❌ ' + msg;
        setStatus(msg, 'err');
      });
  }

  function patchAdmin() {
    var prev = window.onAdminPanelOpened;
    window.onAdminPanelOpened = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      try { renderBlock(); } catch (e) {}
    };
  }

  function boot() { patchAdmin(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  console.log('[github-sync] v4.0 · фото по ID публикуются в GitHub');
})();