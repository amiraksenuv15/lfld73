/* ============================================================
   github-sync.js v5.0

   ПУБЛИКАЦИЯ В GITHUB ВСЕХ МОДУЛЕЙ:

   1. allTournamentsMasterData.js — мастер-база + фото (legacy)
   2. teamPhotosData.js — главные фото команд (модульное)
   3. playerPersonalData.js — персональные данные игроков (модульное)
   4. teamMediaData.js — модульное медиа по клубам

   Каждый файл публикуется отдельно через PUT /contents/:path.
   ============================================================ */
(function () {
  'use strict';

  var GH_OWNER  = 'amiraksenuv15';
  var GH_REPO   = 'lfld73';
  var GH_BRANCH = 'main';

  var FILES = {
    master:          'allTournamentsMasterData.js',
    teamPhotos:      'teamPhotosData.js',
    playerPersonal:  'playerPersonalData.js',
    teamMedia:       'teamMediaData.js'
  };

  var TOKEN_KEY = 'lfld_gh_token';
  var API_BASE  = 'https://api.github.com';

  /* ============================================================
     Base64 с поддержкой кириллицы
     ============================================================ */
  function toBase64Unicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  }

  function loadToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function saveToken(t) { try { localStorage.setItem(TOKEN_KEY, String(t || '')); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  /* ============================================================
     СБОР ДАННЫХ ДЛЯ КАЖДОГО ФАЙЛА
     ============================================================ */
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

  function buildMasterFileContent() {
    var M = window.LFLD_MASTER_DB || {};
    var copy = {};
    Object.keys(M).forEach(function (k) {
      if (k === 'teamPhotos' || k === 'playerPhotos') return;
      copy[k] = M[k];
    });
    copy.teamPhotos = Object.assign({}, M.teamPhotos || {});
    copy.playerPhotos = Object.assign({}, M.playerPhotos || {});

    /* Подтянуть из localStorage на случай рассинхрона */
    try {
      var localTeams = JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}');
      Object.keys(localTeams).forEach(function (club) {
        if (!localTeams[club]) return;
        var tk = 'team_' + club.toLowerCase().replace(/\s+/g, '_');
        if (!copy.teamPhotos[tk]) copy.teamPhotos[tk] = localTeams[club];
      });
    } catch (e) {}

    try {
      var localPlayers = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      Object.keys(localPlayers).forEach(function (id) {
        if (!localPlayers[id]) return;
        if (!copy.playerPhotos[id]) copy.playerPhotos[id] = localPlayers[id];
      });
    } catch (e) {}

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
    L.push('/* ---------- Мастер-база + фото (legacy-совместимость) ---------- */');
    L.push('window.LFLD_MASTER_DB = Object.assign(window.LFLD_MASTER_DB, ' + JSON.stringify(copy, null, 2) + ');');
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
    L.push('  if (Array.isArray(A.customClubs) && A.customClubs.length) {');
    L.push('    try { var cc = JSON.parse(localStorage.getItem("ff_custom_clubs") || "[]"); A.customClubs.forEach(function (c) { if (!c || !c.name) return; if (!cc.find(function (x) { return x.name === c.name; })) cc.push(c); }); localStorage.setItem("ff_custom_clubs", JSON.stringify(cc)); } catch (e) {}');
    L.push('  }');
    L.push('})();');
    L.push('');

    return L.join('\n');
  }

  function buildTeamPhotosFileContent() {
    if (window.teamPhotos && window.teamPhotos.generateFileContent) {
      return window.teamPhotos.generateFileContent();
    }
    /* Fallback */
    var data = (window.LFLD_TEAM_PHOTOS) || {};
    return (
      '/* teamPhotosData.js — автогенерация */\n' +
      'window.LFLD_TEAM_PHOTOS = window.LFLD_TEAM_PHOTOS || {};\n' +
      'Object.assign(window.LFLD_TEAM_PHOTOS, ' + JSON.stringify(data, null, 2) + ');\n'
    );
  }

  function buildPlayerPersonalFileContent() {
    if (window.playerPersonal && window.playerPersonal.generateFileContent) {
      return window.playerPersonal.generateFileContent();
    }
    /* Fallback */
    var data = (window.LFLD_PLAYER_PERSONAL) || {};
    return (
      '/* playerPersonalData.js — автогенерация */\n' +
      'window.LFLD_PLAYER_PERSONAL = window.LFLD_PLAYER_PERSONAL || {};\n' +
      'Object.assign(window.LFLD_PLAYER_PERSONAL, ' + JSON.stringify(data, null, 2) + ');\n'
    );
  }

  function buildTeamMediaFileContent() {
    var data = {};
    try {
      if (window.teamMedia && window.teamMedia.exportAll) {
        data = window.teamMedia.exportAll();
      } else if (window.LFLD_TEAMS_MEDIA) {
        data = window.LFLD_TEAMS_MEDIA;
      }
    } catch (e) {}
    var ts = new Date().toISOString();
    return (
      '/* ============================================================\n' +
      '   teamMediaData.js — автогенерация из админки\n' +
      '   Опубликовано: ' + ts + '\n' +
      '   ============================================================ */\n\n' +
      'window.LFLD_TEAMS_MEDIA = window.LFLD_TEAMS_MEDIA || {};\n\n' +
      'Object.assign(window.LFLD_TEAMS_MEDIA, ' + JSON.stringify(data, null, 2) + ');\n'
    );
  }

  /* ============================================================
     GITHUB API
     ============================================================ */
  function ghHeaders(token) {
    return {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  function getFileSha(token, path) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO
      + '/contents/' + encodeURIComponent(path)
      + '?ref=' + encodeURIComponent(GH_BRANCH);
    return fetch(url, { headers: ghHeaders(token) })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) return res.json().then(function (j) {
          throw new Error('GET ' + path + ' → ' + res.status + ': ' + (j.message || 'unknown'));
        });
        return res.json();
      })
      .then(function (data) { return data && data.sha ? data.sha : null; });
  }

  function putFile(token, path, content, sha, message) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + encodeURIComponent(path);
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
      if (!res.ok) return res.json().then(function (j) {
        throw new Error('PUT ' + path + ' → ' + res.status + ': ' + (j.message || 'unknown'));
      });
      return res.json();
    });
  }

  /**
   * Публикация одного файла.
   */
  function publishFile(token, path, content) {
    return getFileSha(token, path).then(function (sha) {
      return putFile(token, path, content, sha, 'Auto-sync ' + path + ' · ' + new Date().toLocaleString('ru-RU'));
    });
  }

  /* ============================================================
     UI
     ============================================================ */
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
    b.innerHTML = busy ? '⏳ Отправка файлов...' : '🚀 Сохранить всё и опубликовать на сайт';
  }

  function renderBlock() {
    var w = ensureWrap(); if (!w) return;
    var savedToken = loadToken();

    w.innerHTML =
      '<div class="admin-extras-section gh-sync-section">' +
        '<h3>🔗 Синхронизация с GitHub</h3>' +
        '<p>Публикация всех данных и медиа в репозиторий <strong>' + GH_OWNER + '/' + GH_REPO + '</strong>, ветка <code>' + GH_BRANCH + '</code>.</p>' +
        '<p style="font-size:12px;color:#94a3b8;">Публикуются файлы:</p>' +
        '<ul style="font-size:12px;color:#cbd5e1;margin:6px 0 16px 20px;">' +
          '<li><code>' + FILES.master + '</code> — мастер-база турниров</li>' +
          '<li><code>' + FILES.teamPhotos + '</code> — главные фото команд</li>' +
          '<li><code>' + FILES.playerPersonal + '</code> — персональные данные игроков</li>' +
          '<li><code>' + FILES.teamMedia + '</code> — медиа-реестр по клубам</li>' +
        '</ul>' +
        '<div class="form-row">' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Персональный токен GitHub (PAT)</label>' +
            '<input type="password" id="gh-token-input" placeholder="ghp_..." value="' + (savedToken ? savedToken.replace(/"/g, '&quot;') : '') + '" autocomplete="off">' +
          '</div>' +
          '<div class="form-group" style="display:flex;align-items:flex-end;gap:8px;">' +
            '<button type="button" class="btn-secondary" id="gh-save-token-btn">💾 Ключ</button>' +
            '<button type="button" class="btn-danger" id="gh-clear-token-btn">🗑</button>' +
          '</div>' +
        '</div>' +
        '<button id="publish-to-github-btn" type="button" class="gh-publish-btn">' +
          '🚀 Сохранить всё и опубликовать на сайт' +
        '</button>' +
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
      saveToken(t);
      setStatus('✅ Ключ сохранён', 'ok');
      setTimeout(hideStatus, 3500);
    };
    if (clearBtn) clearBtn.onclick = function () {
      if (!confirm('Удалить токен?')) return;
      clearToken();
      if (tokenInp) tokenInp.value = '';
      setStatus('🗑 Токен удалён', 'info');
      setTimeout(hideStatus, 2500);
    };
    if (pubBtn) pubBtn.onclick = publishAll;
  }

  /* ============================================================
     ПУБЛИКАЦИЯ ВСЕХ ФАЙЛОВ
     ============================================================ */
  function publishAll() {
    var tokenInp = document.getElementById('gh-token-input');
    var token = (tokenInp && tokenInp.value || '').trim() || loadToken();
    if (!token) { setStatus('⚠ Укажите GitHub токен', 'err'); if (tokenInp) tokenInp.focus(); return; }
    saveToken(token);

    setButtonBusy(true);
    setStatus('⏳ Подготовка данных...', 'info');

    /* Собираем содержимое всех файлов */
    var payload;
    try {
      if (window.lfldMedia && window.lfldMedia.loadFromStorage) {
        try { window.lfldMedia.loadFromStorage(); } catch (e) {}
      }
      if (window.teamPhotos && window.teamPhotos.loadFromLocalStorage) {
        try { window.teamPhotos.loadFromLocalStorage(); } catch (e) {}
      }
      if (window.playerPersonal && window.playerPersonal.loadFromLocalStorage) {
        try { window.playerPersonal.loadFromLocalStorage(); } catch (e) {}
      }
      if (window.teamMedia && window.teamMedia.loadFromLocalStorage) {
        try { window.teamMedia.loadFromLocalStorage(); } catch (e) {}
      }

      payload = {
        master:         buildMasterFileContent(),
        teamPhotos:     buildTeamPhotosFileContent(),
        playerPersonal: buildPlayerPersonalFileContent(),
        teamMedia:      buildTeamMediaFileContent()
      };
    } catch (e) {
      setButtonBusy(false);
      setStatus('❌ Ошибка формирования файлов: ' + e.message, 'err');
      return;
    }

    /* Поочерёдная публикация всех 4 файлов */
    var tasks = [
      { name: 'Мастер-база', path: FILES.master,         content: payload.master },
      { name: 'Фото команд', path: FILES.teamPhotos,     content: payload.teamPhotos },
      { name: 'Данные игроков', path: FILES.playerPersonal, content: payload.playerPersonal },
      { name: 'Медиа по клубам', path: FILES.teamMedia,  content: payload.teamMedia }
    ];

    var results = [];
    var totalPhotos = 0;
    try {
      var tp = (window.LFLD_TEAM_PHOTOS && Object.keys(window.LFLD_TEAM_PHOTOS).length) || 0;
      var pp = (window.LFLD_PLAYER_PERSONAL && Object.keys(window.LFLD_PLAYER_PERSONAL).length) || 0;
      totalPhotos = tp + pp;
    } catch (e) {}

    var idx = 0;
    function next() {
      if (idx >= tasks.length) {
        setButtonBusy(false);
        var summary = results.map(function (r) {
          return r.ok
            ? '✅ ' + r.name + (r.commit ? ' (' + r.commit + ')' : '')
            : '❌ ' + r.name + ': ' + r.error;
        }).join('\n');
        setStatus(
          'Публикация завершена' + (totalPhotos ? ' · медиа: ' + totalPhotos : '') + ':\n' + summary,
          results.every(function (r) { return r.ok; }) ? 'ok' : 'err'
        );
        setTimeout(hideStatus, 12000);
        return;
      }

      var task = tasks[idx];
      setStatus('⏳ Публикуется: ' + task.name + ' (' + (idx + 1) + '/' + tasks.length + ')...', 'info');

      publishFile(token, task.path, task.content)
        .then(function (res) {
          var commit = (res && res.commit && res.commit.sha) ? res.commit.sha.slice(0, 7) : '';
          results.push({ name: task.name, ok: true, commit: commit });
          idx++;
          next();
        })
        .catch(function (err) {
          console.error('[github-sync] ' + task.path + ':', err);
          results.push({ name: task.name, ok: false, error: String(err && err.message || err) });
          idx++;
          next();
        });
    }
    next();
  }

  /* ============================================================
     ХУК В АДМИНКУ
     ============================================================ */
  function patchAdmin() {
    var prev = window.onAdminPanelOpened;
    window.onAdminPanelOpened = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      try { renderBlock(); } catch (e) { console.warn('[github-sync:admin]', e); }
    };
  }

  function boot() {
    patchAdmin();
    if (document.getElementById('view-admin') && document.getElementById('view-admin').style.display === 'block') {
      setTimeout(renderBlock, 100);
    }
    console.log('[github-sync] v5.0 · публикует: мастер, teamPhotos, playerPersonal, teamMedia');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();