/* ============================================================
   lfld-media.js v4.1
   
   ИСПРАВЛЕНИЯ:
   - getPlayerPhoto() работает по ID, по нормализованному ФИО,
     по фамилия_имя, и через PlayerResolver.
   - Автоматически приводит ключи к формату «p_фамилия_имя».
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_TEAM   = 'ff_club_main_photo';
  var STORAGE_PLAYER = 'ff_player_photos_by_id';

  var FORBIDDEN_SINGLE_SURNAMES = [
    'нагорнов', 'калимуллин', 'галеев', 'алексеев', 'манонов',
    'иванов', 'юсупов', 'шагеев', 'герасимов', 'васин', 'королев', 'королёв',
    'самарцев', 'светличный'
  ];

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function normWithSpaces(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function isSingleSurname(str) {
    var words = normWithSpaces(str).split(' ').filter(Boolean);
    if (words.length !== 1) return false;
    return FORBIDDEN_SINGLE_SURNAMES.indexOf(words[0]) !== -1;
  }

  /* ============================================================
     РЕЗОЛВ ИГРОКА → ID
     ============================================================ */
  function resolvePlayerId(ref) {
    if (!ref) return null;

    /* Уже ID */
    if (typeof ref === 'string' && /^p_[a-z0-9_]+$/i.test(ref)) return ref;
    if (typeof ref === 'object' && ref.id && /^p_[a-z0-9_]+$/i.test(ref.id)) return ref.id;

    /* Через PlayerResolver */
    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try {
        var resolved = window.PlayerResolver.resolve(
          typeof ref === 'object' ? (ref.full || ref.fullName || ref.name || '') : ref,
          typeof ref === 'object' ? ref.club : null
        );
        if (resolved && resolved.id) return resolved.id;
      } catch (e) {}
    }

    /* Через LFLD_PLAYER_IDS — по ключу фамилия_имя */
    if (window.LFLD_PLAYER_IDS) {
      var str = typeof ref === 'object' ? (ref.full || ref.fullName || ref.name || '') : ref;
      var parts = normWithSpaces(str).split(' ').filter(Boolean);
      if (parts.length >= 2) {
        var key = parts[0] + '_' + parts[1];
        if (window.LFLD_PLAYER_IDS[key]) return window.LFLD_PLAYER_IDS[key];
      }
    }

    return null;
  }

  /* ============================================================
     КОРЕНЬ
     ============================================================ */
  function ensureRoot() {
    if (!window.LFLD_MASTER_DB) window.LFLD_MASTER_DB = {};
    if (!window.LFLD_MASTER_DB.teamPhotos)   window.LFLD_MASTER_DB.teamPhotos   = {};
    if (!window.LFLD_MASTER_DB.playerPhotos) window.LFLD_MASTER_DB.playerPhotos = {};
    return window.LFLD_MASTER_DB;
  }
  ensureRoot();

  /* ============================================================
     ФОТО КОМАНД
     ============================================================ */
  function teamKey(club) {
    return 'team_' + normWithSpaces(club).replace(/\s+/g, '_');
  }

  function setTeamPhoto(club, dataUrl) {
    if (!club) return null;
    ensureRoot();
    var k = teamKey(club);
    if (dataUrl) window.LFLD_MASTER_DB.teamPhotos[k] = dataUrl;
    else delete window.LFLD_MASTER_DB.teamPhotos[k];
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (dataUrl) map[club] = dataUrl; else delete map[club];
      localStorage.setItem(STORAGE_TEAM, JSON.stringify(map));
    } catch (e) {}
    return k;
  }

  function getTeamPhoto(club) {
    if (!club) return '';
    ensureRoot();
    var k = teamKey(club);
    var url = window.LFLD_MASTER_DB.teamPhotos[k];
    if (url) return url;
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (map[club]) {
        window.LFLD_MASTER_DB.teamPhotos[k] = map[club];
        return map[club];
      }
    } catch (e) {}
    return '';
  }

  /* ============================================================
     ФОТО ИГРОКОВ
     ============================================================ */
  function setPlayerPhoto(ref, dataUrl) {
    if (!ref) return null;
    ensureRoot();

    var refStr = typeof ref === 'object' ? (ref.full || ref.fullName || ref.name || '') : String(ref);
    if (isSingleSurname(refStr)) {
      console.error('[lfld-media] ❌ ОТКАЗ: одиночная фамилия "' + refStr + '"');
      return null;
    }

    var id = resolvePlayerId(ref);
    if (!id) {
      console.warn('[lfld-media] Не удалось определить ID:', ref);
      return null;
    }

    if (dataUrl) window.LFLD_MASTER_DB.playerPhotos[id] = dataUrl;
    else delete window.LFLD_MASTER_DB.playerPhotos[id];

    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (dataUrl) map[id] = dataUrl; else delete map[id];
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(map));
    } catch (e) {}

    return id;
  }

  function getPlayerPhoto(ref) {
    if (!ref) return '';
    ensureRoot();

    var db = window.LFLD_MASTER_DB;
    var photos = db.playerPhotos || {};

    /* 1. Прямой ID */
    var directId = null;
    if (typeof ref === 'string' && /^p_[a-z0-9_]+$/i.test(ref)) directId = ref;
    else if (typeof ref === 'object' && ref.id) directId = ref.id;

    if (directId && photos[directId]) return photos[directId];

    /* 2. Через PlayerResolver / LFLD_PLAYER_IDS */
    var resolvedId = resolvePlayerId(ref);
    if (resolvedId && photos[resolvedId]) return photos[resolvedId];

    /* 3. По нормализованному ФИО */
    var str = typeof ref === 'object' ? (ref.full || ref.fullName || ref.name || '') : ref;
    var normFio = norm(str);
    if (normFio && photos[normFio]) return photos[normFio];

    /* 4. По «фамилия_имя» */
    var parts = normWithSpaces(str).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      var fioKey = parts[0] + '_' + parts[1];
      if (photos[fioKey]) return photos[fioKey];
    }

    /* 5. localStorage — по resolvedId */
    try {
      var local = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (resolvedId && local[resolvedId]) {
        photos[resolvedId] = local[resolvedId];
        return local[resolvedId];
      }
      if (directId && local[directId]) {
        photos[directId] = local[directId];
        return local[directId];
      }
    } catch (e) {}

    return '';
  }

  function clearPlayerPhoto(ref) { return setPlayerPhoto(ref, ''); }

  /* ============================================================
     ПАКЕТНЫЙ ИМПОРТ / ЭКСПОРТ
     ============================================================ */
  function importRegistry(teamMap, playerMap) {
    ensureRoot();
    if (teamMap && typeof teamMap === 'object') {
      Object.keys(teamMap).forEach(function (k) {
        if (teamMap[k]) window.LFLD_MASTER_DB.teamPhotos[k] = teamMap[k];
      });
    }
    if (playerMap && typeof playerMap === 'object') {
      Object.keys(playerMap).forEach(function (k) {
        if (!playerMap[k]) return;
        var id = k;
        if (!/^p_[a-z0-9_]+$/i.test(k)) {
          id = resolvePlayerId(k);
          if (!id) return;
        }
        if (!window.LFLD_MASTER_DB.playerPhotos[id]) {
          window.LFLD_MASTER_DB.playerPhotos[id] = playerMap[k];
        }
      });
    }
    try {
      localStorage.setItem(STORAGE_TEAM, JSON.stringify(window.LFLD_MASTER_DB.teamPhotos));
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(window.LFLD_MASTER_DB.playerPhotos));
    } catch (e) {}
  }

  function exportRegistry() {
    ensureRoot();
    return {
      teamPhotos:   Object.assign({}, window.LFLD_MASTER_DB.teamPhotos),
      playerPhotos: Object.assign({}, window.LFLD_MASTER_DB.playerPhotos)
    };
  }

  /* ============================================================
     АВТОЗАГРУЗКА
     ============================================================ */
  function loadFromStorage() {
    try {
      var t = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      Object.keys(t).forEach(function (club) {
        if (!t[club]) return;
        var k = teamKey(club);
        if (!window.LFLD_MASTER_DB.teamPhotos[k]) window.LFLD_MASTER_DB.teamPhotos[k] = t[club];
      });
    } catch (e) {}
    try {
      var p = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      Object.keys(p).forEach(function (id) {
        if (!p[id]) return;
        if (!window.LFLD_MASTER_DB.playerPhotos[id]) window.LFLD_MASTER_DB.playerPhotos[id] = p[id];
      });
    } catch (e) {}
  }
  loadFromStorage();

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.lfldMedia = {
    teamKey: teamKey,
    resolvePlayerId: resolvePlayerId,
    isSingleSurname: isSingleSurname,

    setTeamPhoto: setTeamPhoto,
    getTeamPhoto: getTeamPhoto,
    clearTeamPhoto: function (club) { return setTeamPhoto(club, ''); },

    setPlayerPhoto: setPlayerPhoto,
    getPlayerPhoto: getPlayerPhoto,
    clearPlayerPhoto: clearPlayerPhoto,

    saveTeamPhoto: setTeamPhoto,
    savePlayerPhoto: setPlayerPhoto,

    importRegistry: importRegistry,
    exportRegistry: exportRegistry,

    loadFromStorage: loadFromStorage,

    FORBIDDEN_SINGLE_SURNAMES: FORBIDDEN_SINGLE_SURNAMES
  };

  window.saveTeamPhoto   = setTeamPhoto;
  window.getTeamPhoto    = getTeamPhoto;
  window.savePlayerPhoto = setPlayerPhoto;
  window.getPlayerPhoto  = getPlayerPhoto;

  console.log('[lfld-media] v4.1 · сквозной поиск по ID + ФИО + фамилия_имя');
})();