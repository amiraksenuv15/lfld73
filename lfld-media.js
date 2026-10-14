/* ============================================================
   lfld-media.js — единый глобальный реестр фотографий
   - window.LFLD_MASTER_DB.teamPhotos  = { teamKey: dataUrl }
   - window.LFLD_MASTER_DB.playerPhotos = { playerKey: dataUrl }
   - Синхронизация с localStorage и LFLD_MASTER_DB
   - Единое API для сохранения и чтения
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_TEAM   = 'ff_club_main_photo';   /* совместимость с админкой */
  var STORAGE_PLAYER = 'ff_player_photos';

  /* ---------- Ключи ---------- */
  function normKey(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
  }
  function teamKey(club) {
    return 'team_' + normKey(club).replace(/\s+/g, '_');
  }
  function playerKey(nameOrId) {
    return normKey(nameOrId).replace(/\s+/g, '_');
  }

  /* ---------- Инициализация реестров ---------- */
  function ensureRoot() {
    if (!window.LFLD_MASTER_DB) window.LFLD_MASTER_DB = {};
    if (!window.LFLD_MASTER_DB.teamPhotos)   window.LFLD_MASTER_DB.teamPhotos   = {};
    if (!window.LFLD_MASTER_DB.playerPhotos) window.LFLD_MASTER_DB.playerPhotos = {};
    return window.LFLD_MASTER_DB;
  }
  ensureRoot();

  /* ---------- Загрузка из localStorage ---------- */
  function loadFromStorage() {
    try {
      var t = JSON.parse(localStorage.getItem(STORAGE_TEAM) || 'null');
      if (t && typeof t === 'object') {
        Object.keys(t).forEach(function (club) {
          if (!t[club]) return;
          /* Ключ всегда через teamKey(club), если в storage был сырой ключ */
          window.LFLD_MASTER_DB.teamPhotos[teamKey(club)] = t[club];
        });
      }
    } catch (e) {}
    try {
      var p = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || 'null');
      if (p && typeof p === 'object') {
        Object.keys(p).forEach(function (k) {
          if (!p[k]) return;
          window.LFLD_MASTER_DB.playerPhotos[playerKey(k)] = p[k];
        });
      }
    } catch (e) {}
  }

  /* ---------- Сохранение в localStorage ---------- */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_TEAM, JSON.stringify(window.LFLD_MASTER_DB.teamPhotos));
    } catch (e) {
      console.warn('[lfld-media] teamPhotos save error:', e);
    }
    try {
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(window.LFLD_MASTER_DB.playerPhotos));
    } catch (e) {
      console.warn('[lfld-media] playerPhotos save error:', e);
    }
  }

  /* ============================================================
     ПУБЛИЧНОЕ API
     ============================================================ */

  /* --- Фото команды --- */
  function setTeamPhoto(club, dataUrl) {
    if (!club) return;
    ensureRoot();
    var k = teamKey(club);
    if (dataUrl) window.LFLD_MASTER_DB.teamPhotos[k] = dataUrl;
    else delete window.LFLD_MASTER_DB.teamPhotos[k];

    /* Дублируем в старый ключ по имени клуба — для совместимости */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (dataUrl) map[club] = dataUrl; else delete map[club];
      localStorage.setItem(STORAGE_TEAM, JSON.stringify(map));
    } catch (e) {}

    saveToStorage();
    return k;
  }

  function getTeamPhoto(club) {
    if (!club) return '';
    ensureRoot();
    var k = teamKey(club);
    var url = window.LFLD_MASTER_DB.teamPhotos[k];
    if (url) return url;

    /* Fallback на старый ключ */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (map[club]) {
        window.LFLD_MASTER_DB.teamPhotos[k] = map[club];
        return map[club];
      }
    } catch (e) {}
    return '';
  }

  function clearTeamPhoto(club) { return setTeamPhoto(club, ''); }

  /* --- Фото игрока (по имени ИЛИ id) --- */
  function setPlayerPhoto(nameOrId, dataUrl) {
    if (!nameOrId) return;
    ensureRoot();
    var k = playerKey(nameOrId);
    if (dataUrl) window.LFLD_MASTER_DB.playerPhotos[k] = dataUrl;
    else delete window.LFLD_MASTER_DB.playerPhotos[k];

    /* Дублируем в старый ключ (по id или фио) для совместимости */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (dataUrl) map[nameOrId] = dataUrl; else delete map[nameOrId];
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(map));
    } catch (e) {}

    saveToStorage();
    return k;
  }

  function getPlayerPhoto(nameOrId) {
    if (!nameOrId) return '';
    ensureRoot();
    var k = playerKey(nameOrId);
    var url = window.LFLD_MASTER_DB.playerPhotos[k];
    if (url) return url;

    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (map[nameOrId]) {
        window.LFLD_MASTER_DB.playerPhotos[k] = map[nameOrId];
        return map[nameOrId];
      }
    } catch (e) {}
    return '';
  }

  function clearPlayerPhoto(nameOrId) { return setPlayerPhoto(nameOrId, ''); }

  /* --- Пакетный импорт/экспорт --- */
  function importRegistry(teamMap, playerMap) {
    ensureRoot();
    if (teamMap && typeof teamMap === 'object') {
      Object.keys(teamMap).forEach(function (k) {
        if (teamMap[k]) window.LFLD_MASTER_DB.teamPhotos[k] = teamMap[k];
      });
    }
    if (playerMap && typeof playerMap === 'object') {
      Object.keys(playerMap).forEach(function (k) {
        if (playerMap[k]) window.LFLD_MASTER_DB.playerPhotos[k] = playerMap[k];
      });
    }
    saveToStorage();
  }

  function exportRegistry() {
    ensureRoot();
    return {
      teamPhotos:   Object.assign({}, window.LFLD_MASTER_DB.teamPhotos),
      playerPhotos: Object.assign({}, window.LFLD_MASTER_DB.playerPhotos)
    };
  }

  /* ---------- Автозагрузка при старте ---------- */
  loadFromStorage();

  /* ---------- Дополнение через LFLD_AUX_DATA (из GitHub) ---------- */
  (function mergeAux() {
    var A = window.LFLD_AUX_DATA;
    if (!A || typeof A !== 'object') return;
    if (A.clubMainPhoto && typeof A.clubMainPhoto === 'object') {
      Object.keys(A.clubMainPhoto).forEach(function (club) {
        if (!A.clubMainPhoto[club]) return;
        var k = teamKey(club);
        if (!window.LFLD_MASTER_DB.teamPhotos[k]) {
          window.LFLD_MASTER_DB.teamPhotos[k] = A.clubMainPhoto[club];
        }
      });
    }
    if (A.playerPhotos && typeof A.playerPhotos === 'object') {
      Object.keys(A.playerPhotos).forEach(function (key) {
        if (!A.playerPhotos[key]) return;
        var k = playerKey(key);
        if (!window.LFLD_MASTER_DB.playerPhotos[k]) {
          window.LFLD_MASTER_DB.playerPhotos[k] = A.playerPhotos[key];
        }
      });
    }
    saveToStorage();
  })();

  /* ---------- Экспорт в window ---------- */
  window.lfldMedia = {
    teamKey: teamKey,
    playerKey: playerKey,

    setTeamPhoto: setTeamPhoto,
    getTeamPhoto: getTeamPhoto,
    clearTeamPhoto: clearTeamPhoto,

    setPlayerPhoto: setPlayerPhoto,
    getPlayerPhoto: getPlayerPhoto,
    clearPlayerPhoto: clearPlayerPhoto,

    saveTeamPhoto: setTeamPhoto,       /* алиас, удобно для внешних модулей */
    savePlayerPhoto: setPlayerPhoto,

    importRegistry: importRegistry,
    exportRegistry: exportRegistry,

    saveToStorage: saveToStorage,
    loadFromStorage: loadFromStorage
  };

  /* Удобные прямые ссылки для старого кода */
  window.saveTeamPhoto   = setTeamPhoto;
  window.getTeamPhoto    = getTeamPhoto;
  window.savePlayerPhoto = setPlayerPhoto;
  window.getPlayerPhoto  = getPlayerPhoto;

  console.log('[lfld-media] загружен — единый реестр фото готов');
})();