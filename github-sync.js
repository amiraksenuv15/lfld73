/* ============================================================
   github-sync.js — прямая публикация данных админки в GitHub
   Репозиторий: amiraksenuv15/lfld73
   Ветка:       main
   Файл:        allTournamentsMasterData.js

   v2.0 — публикует также реестры фото:
     - LFLD_MASTER_DB.teamPhotos
     - LFLD_MASTER_DB.playerPhotos
   ============================================================ */
(function () {
  'use strict';

  var GH_OWNER  = 'amiraksenuv15';
  var GH_REPO   = 'lfld73';
  var GH_BRANCH = 'main';
  var GH_FILE   = 'allTournamentsMasterData.js';
  var TOKEN_KEY = 'lfld_gh_token';
  var API_BASE  = 'https://api.github.com';

  /* ============================================================
     Base64 с корректной поддержкой UTF-8 / кириллицы
     ============================================================ */
  function toBase64Unicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  }

  /* ============================================================
     Токен
     ============================================================ */
  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function saveToken(t) {
    try { localStorage.setItem(TOKEN_KEY, String(t || '')); } catch (e) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  /* ============================================================
     Сбор данных для публикации
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
    aux.playerPhotos        = safeGet('ff_player_photos', {});
    aux.tournaments         = safeGet('ff_tournaments', null);
    aux.customClubs         = safeGet('ff_custom_clubs', []);
    aux.bannerSlides        = safeGet('bannerSlides', []);
    aux.organizers          = safeGet('ff_organizers', []);
    return aux;
  }

  /* Готовим копию LFLD_MASTER_DB с уже встроенными реестрами фото */
  function buildMasterWithMedia() {
    var master = window.LFLD_MASTER_DB || {};
    var copy = {};
    Object.keys(master).forEach(function (k) {
      if (k === 'teamPhotos' || k === 'playerPhotos') return;   /* вставим отдельно */
      copy[k] = master[k];
    });
    /* Гарантированно создаём реестры, даже если они пусты */
    copy.teamPhotos   = (master.teamPhotos   && typeof master.teamPhotos   === 'object') ? master.teamPhotos   : {};
    copy.playerPhotos = (master.playerPhotos && typeof master.playerPhotos === 'object') ? master.playerPhotos : {};
    return copy;
  }

  function buildFileContent() {
    var master = buildMasterWithMedia();
    var aux = collectAuxData();
    var ts = new Date().toISOString();

    var L = [];
    L.push('/* ============================================================');
    L.push('   allTournamentsMasterData.js — автогенерация из админки');
    L.push('   Опубликовано: ' + ts);
    L.push('   ============================================================ */');
    L.push('');
    L.push('/* ---------- Гарантия реестров фото ---------- */');
    L.push('window.LFLD_MASTER_DB = window.LFLD_MASTER_DB || {};');
    L.push('window.LFLD_MASTER_DB.teamPhotos   = window.LFLD_MASTER_DB.teamPhotos   || {};');
    L.push('window.LFLD_MASTER_DB.playerPhotos = window.LFLD_MASTER_DB.playerPhotos || {};');
    L.push('');
    L.push('/* ---------- Мастер-база турниров + реестры фото ---------- */');
    L.push('window.LFLD_MASTER_DB = Object.assign(window.LFLD_MASTER_DB, ' + JSON.stringify(master, null, 2) + ');');
    L.push('');
    L.push('/* ---------- Вспомогательные данные (заявки, сборная, фон) ---------- */');
    L.push('window.LFLD_AUX_DATA = ' + JSON.stringify(aux, null, 2) + ';');
    L.push('');
    L.push('/* ---------- Автосинхронизация вспомогательных данных в localStorage ---------- */');
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
    L.push('  mergeInto("ff_player_photos",         A.playerPhotos);');
    L.push('  mergeInto("ff_tournaments",           A.tournaments);');
    L.push('  if (Array.isArray(A.customClubs) && A.customClubs.length) {');
    L.push('    try {');
    L.push('      var cc = JSON.parse(localStorage.getItem("ff_custom_clubs") || "[]");');
    L.push('      A.customClubs.forEach(function (c) {');
    L.push('        if (!c || !c.name) return;');
    L.push('        if (!cc.find(function (x) { return x.name === c.name; })) cc.push(c);');
    L.push('      });');
    L.push('      localStorage.setItem("ff_custom_clubs", JSON.stringify(cc));');
    L.push('    } catch (e) {}');
    L.push('  }');
    L.push('  if (Array.isArray(A.bannerSlides) && A.bannerSlides.length) {');
    L.push('    try { localStorage.setItem("bannerSlides", JSON.stringify(A.bannerSlides)); } catch (e) {}');
    L.push('  }');
    L.push('  if (Array.isArray(A.organizers) && A.organizers.length) {');
    L.push('    try { localStorage.setItem("ff_organizers", JSON.stringify(A.organizers)); } catch (e) {}');
    L.push('  }');
    L.push('})();');
    L.push('');

    return L.join('\n');
  }

  /* ============================================================
     GitHub API
     ============================================================ */
  function ghHeaders(token) {
    return {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  function getCurrentFileSha(token) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO
      + '/contents/' + encodeURIComponent(GH_FILE)
      + '?ref=' + encodeURIComponent(GH_BRANCH);
    return fetch(url, { headers: ghHeaders(token) })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) {
          return res.json().then(function (j) {
            throw new Error('GET ' + res.status + ': ' + (j.message || 'unknown'));
          });
        }
        return res.json();
      })
      .then(function (data) { return data && data.sha ? data.sha : null; });
  }

  function putFile(token, content, sha, message) {
    var url = API_BASE + '/repos/' + GH_OWNER + '/' + GH_REPO
      + '/contents/' + encodeURIComponent(GH_FILE);
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
      if (!res.ok) {
        return res.json().then(function (j) {
          throw new Error('PUT ' + res.status + ': ' + (j.message || 'unknown'));
        });
      }
      return res.json();
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
  function hideStatus() {
    var el = document.getElementById('gh-sync-status');
    if (el) el.classList.add('hidden');
  }
  function setButtonBusy(busy) {
    var b = document.getElementById('publish-to-github-btn');
    if (!b) return;
    b.disabled = !!busy;
    b.classList.toggle('busy', !!busy);
    b.innerHTML = busy
      ? '⏳ Отправка на GitHub...'
      : '🚀 Сохранить все изменения и опубликовать на сайт';
  }

  function renderBlock() {
    var w = ensureWrap();
    if (!w) return;
    var savedToken = loadToken();

    w.innerHTML =
      '<div class="admin-extras-section gh-sync-section">' +
        '<h3>🔗 Синхронизация с GitHub</h3>' +
        '<p>Публикация всех изменений (мастер-база, заявки, символическая сборная, <strong>фото команд и игроков</strong>) напрямую в репозиторий ' +
          '<strong>' + GH_OWNER + '/' + GH_REPO + '</strong> — ветка <code>' + GH_BRANCH + '</code>, файл <code>' + GH_FILE + '</code>.</p>' +

        '<div class="form-row">' +
          '<div class="form-group" style="flex:1;">' +
            '<label>Персональный токен GitHub (PAT)</label>' +
            '<input type="password" id="gh-token-input" ' +
              'placeholder="Вставьте токен ghp_..." ' +
              'value="' + (savedToken ? savedToken.replace(/"/g, '&quot;') : '') + '" ' +
              'autocomplete="off" spellcheck="false">' +
            '<small style="color:#94a3b8;font-size:11px;display:block;margin-top:6px;">' +
              'Нужен scope <code>repo</code>. Токен хранится только в вашем браузере (localStorage).' +
            '</small>' +
          '</div>' +
          '<div class="form-group" style="display:flex;align-items:flex-end;gap:8px;">' +
            '<button type="button" class="btn-secondary" id="gh-save-token-btn">💾 Сохранить ключ</button>' +
            '<button type="button" class="btn-danger" id="gh-clear-token-btn" title="Удалить сохранённый токен">🗑 Удалить</button>' +
          '</div>' +
        '</div>' +

        '<button id="publish-to-github-btn" type="button" class="gh-publish-btn">' +
          '🚀 Сохранить все изменения и опубликовать на сайт' +
        '</button>' +

        '<div id="gh-sync-status" class="gh-sync-status hidden"></div>' +

        '<div class="gh-sync-help">' +
          '<div>Что публикуется:</div>' +
          '<ul>' +
            '<li><code>window.LFLD_MASTER_DB</code> — мастер-база турниров</li>' +
            '<li><code>teamPhotos</code> — <strong>фото команд</strong> (единый реестр)</li>' +
            '<li><code>playerPhotos</code> — <strong>фото игроков</strong> (единый реестр)</li>' +
            '<li><code>ff_cup_metallist_rosters</code> — заявки Кубка Металлиста</li>' +
            '<li><code>ff_symbolic_teams</code> — символические сборные туров</li>' +
            '<li><code>ff_club_main_photo</code> — командные фото (совместимость)</li>' +
            '<li><code>ff_player_photos</code> — фото игроков (совместимость)</li>' +
            '<li><code>ff_tournaments</code>, <code>ff_custom_clubs</code>, <code>bannerSlides</code>, <code>ff_organizers</code></li>' +
          '</ul>' +
        '</div>' +
      '</div>';

    bind();
  }

  function bind() {
    var tokenInp = document.getElementById('gh-token-input');
    var saveBtn  = document.getElementById('gh-save-token-btn');
    var clearBtn = document.getElementById('gh-clear-token-btn');
    var pubBtn   = document.getElementById('publish-to-github-btn');

    if (saveBtn) saveBtn.onclick = function () {
      var t = (tokenInp && tokenInp.value || '').trim();
      if (!t) { setStatus('⚠ Введите токен', 'err'); return; }
      saveToken(t);
      setStatus('✅ Ключ сохранён в браузере', 'ok');
      setTimeout(hideStatus, 3500);
    };

    if (clearBtn) clearBtn.onclick = function () {
      if (!confirm('Удалить сохранённый токен из браузера?')) return;
      clearToken();
      if (tokenInp) tokenInp.value = '';
      setStatus('🗑 Токен удалён', 'info');
      setTimeout(hideStatus, 2500);
    };

    if (pubBtn) pubBtn.onclick = publishToGithub;
  }

  /* ============================================================
     Публикация
     ============================================================ */
  function publishToGithub() {
    var tokenInp = document.getElementById('gh-token-input');
    var token = (tokenInp && tokenInp.value || '').trim() || loadToken();

    if (!token) {
      setStatus('⚠ Пожалуйста, укажите GitHub токен доступа', 'err');
      if (tokenInp) tokenInp.focus();
      return;
    }
    saveToken(token);

    setButtonBusy(true);
    setStatus('⏳ Сбор данных и отправка на GitHub...', 'info');

    var fileContent;
    try {
      /* Гарантируем, что lfld-media уже синхронизировал реестры в LFLD_MASTER_DB */
      if (window.lfldMedia && window.lfldMedia.loadFromStorage) {
        try { window.lfldMedia.loadFromStorage(); } catch (e) {}
      }
      fileContent = buildFileContent();
    } catch (e) {
      setButtonBusy(false);
      setStatus('❌ Ошибка формирования файла: ' + e.message, 'err');
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
        var message = 'Auto-sync from admin · ' + new Date().toLocaleString('ru-RU')
          + (photoCount ? ' · media: ' + photoCount : '');
        return putFile(token, fileContent, sha, message);
      })
      .then(function (res) {
        setButtonBusy(false);
        var commitShort = (res && res.commit && res.commit.sha)
          ? res.commit.sha.slice(0, 7)
          : '';
        setStatus(
          '✅ Успешно опубликовано на GitHub' +
          (commitShort ? ' (commit ' + commitShort + ')' : '') +
          (photoCount ? ' · медиа: ' + photoCount : '') +
          '. Сайт обновится после пересборки/CDN (~1–2 мин).',
          'ok'
        );
        setTimeout(hideStatus, 8000);
      })
      .catch(function (err) {
        console.error('[github-sync]', err);
        setButtonBusy(false);
        var msg = String(err && err.message || err);
        if (msg.indexOf('401') !== -1 || msg.indexOf('Bad credentials') !== -1)
          msg = '❌ Неверный токен или истёк срок действия. Проверьте PAT.';
        else if (msg.indexOf('403') !== -1)
          msg = '❌ Доступ запрещён. Проверьте scope токена (нужен «repo»).';
        else if (msg.indexOf('404') !== -1)
          msg = '❌ Репозиторий или ветка не найдены. Проверьте настройки.';
        else if (msg.indexOf('409') !== -1)
          msg = '⚠ Конфликт SHA. Обновите страницу и повторите.';
        else
          msg = '❌ Ошибка: ' + msg;
        setStatus(msg, 'err');
      });
  }

  /* ============================================================
     Хук в админку
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
    if (document.getElementById('view-admin') &&
        document.getElementById('view-admin').style.display === 'block') {
      setTimeout(renderBlock, 100);
    }
    console.log('[github-sync] загружен → ' + GH_OWNER + '/' + GH_REPO + ' (с медиа-реестрами)');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();