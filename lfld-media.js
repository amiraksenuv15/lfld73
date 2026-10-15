/* ============================================================
   lfld-media.js v3.0
   
   КРИТИЧНО:
   - Ключи хранятся строго по:
     a) уникальному ID (p_nagornov_ilya)
     b) полному ФИ (нагорновилья)
     c) полному ФИ + клуб (нагорновилья|химмаш)
   - ОДИНОЧНЫЕ ФАМИЛИИ (нагорнов, калимуллин, галеев, алексеев)
     КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ — иначе фото одного подставится другому!
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_TEAM   = 'ff_club_main_photo';
  var STORAGE_PLAYER = 'ff_player_photos';

  /* ⚠️ СТОП-ЛИСТ одиночных фамилий */
  var FORBIDDEN_SINGLE_SURNAMES = [
    'нагорнов', 'калимуллин', 'галеев', 'алексеев', 'манонов',
    'иванов', 'юсупов', 'шагеев', 'герасимов', 'васин', 'королев', 'королёв'
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

  /* ---------- Ключи ---------- */
  function teamKey(club) {
    return 'team_' + normWithSpaces(club).replace(/\s+/g, '_');
  }

  /**
   * Ключ для фото игрока. Возвращает объект { key, type, error }.
   * type: 'id' | 'full' | 'full_club'
   * error: если одиночная фамилия — вернёт ошибку.
   */
  function playerPhotoKey(ref) {
    if (!ref) return { key: null, type: null, error: 'empty_ref' };

    /* Объект с id */
    if (typeof ref === 'object' && ref.id) {
      return { key: 'id:' + ref.id, type: 'id', error: null };
    }

    var str = String(ref).trim();
    if (!str) return { key: null, type: null, error: 'empty_string' };

    /* Похоже на ID */
    if (/^p_[a-z0-9_]+$/i.test(str)) {
      return { key: 'id:' + str, type: 'id', error: null };
    }

    var words = normWithSpaces(str).split(' ').filter(Boolean);

    /* Одиночная фамилия — ЗАПРЕЩЕНО */
    if (words.length === 1) {
      if (FORBIDDEN_SINGLE_SURNAMES.indexOf(words[0]) !== -1) {
        return { key: null, type: null, error: 'forbidden_single_surname:' + words[0] };
      }
      /* Прочие одиночные — тоже рискованно, но не в стоп-листе */
      return { key: 'surname:' + words[0], type: 'surname', error: 'risky_single_surname' };
    }

    /* Полное ФИ (2+ слова) */
    var fullKey = 'full:' + words.join('');
    return { key: fullKey, type: 'full', error: null };
  }

  /* ---------- Инициализация ---------- */
  function ensureRoot() {
    if (!window.LFLD_MASTER_DB) window.LFLD_MASTER_DB = {};
    if (!window.LFLD_MASTER_DB.teamPhotos)   window.LFLD_MASTER_DB.teamPhotos   = {};
    if (!window.LFLD_MASTER_DB.playerPhotos) window.LFLD_MASTER_DB.playerPhotos = {};
    return window.LFLD_MASTER_DB;
  }
  ensureRoot();

  /* ---------- Загрузка / сохранение ---------- */
  function loadFromStorage() {
    try {
      var t = JSON.parse(localStorage.getItem(STORAGE_TEAM) || 'null');
      if (t && typeof t === 'object') {
        Object.keys(t).forEach(function (club) {
          if (!t[club]) return;
          window.LFLD_MASTER_DB.teamPhotos[teamKey(club)] = t[club];
        });
      }
    } catch (e) {}

    try {
      var p = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || 'null');
      if (p && typeof p === 'object') {
        Object.keys(p).forEach(function (k) {
          if (!p[k]) return;
          /* Проверяем, что старый ключ не является одиночной фамилией */
          var resolved = playerPhotoKey(k);
          if (resolved.error === 'forbidden_single_surname:' + norm(k)) {
            console.warn('[lfld-media] Пропущен устаревший ключ-одиночная фамилия:', k);
            return;
          }
          if (resolved.key) window.LFLD_MASTER_DB.playerPhotos[resolved.key] = p[k];
        });
      }
    } catch (e) {}
  }

  function saveToStorage() {
    try { localStorage.setItem(STORAGE_TEAM, JSON.stringify(window.LFLD_MASTER_DB.teamPhotos)); } catch (e) { console.warn('[lfld-media] team save:', e); }
    try { localStorage.setItem(STORAGE_PLAYER, JSON.stringify(window.LFLD_MASTER_DB.playerPhotos)); } catch (e) { console.warn('[lfld-media] player save:', e); }
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
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (map[club]) { window.LFLD_MASTER_DB.teamPhotos[k] = map[club]; return map[club]; }
    } catch (e) {}
    return '';
  }
  function clearTeamPhoto(club) { return setTeamPhoto(club, ''); }

  /* --- Фото игрока (по id ИЛИ полному ФИ) --- */
  function setPlayerPhoto(ref, dataUrl) {
    if (!ref) return null;
    ensureRoot();

    var resolved = playerPhotoKey(ref);
    if (resolved.error === 'forbidden_single_surname:' + norm(String(ref))) {
      console.error('[lfld-media] ❌ ОТКАЗ: одиночная фамилия "' + ref + '" ЗАПРЕЩЕНА. Используйте ID или полное ФИ.');
      alert('Невозможно сохранить фото: указана только фамилия.\nИспользуйте полное ФИ (например, «Нагорнов Илья») или уникальный ID.');
      return null;
    }
    if (!resolved.key) {
      console.warn('[lfld-media] Пустой ключ для:', ref);
      return null;
    }

    if (dataUrl) window.LFLD_MASTER_DB.playerPhotos[resolved.key] = dataUrl;
    else delete window.LFLD_MASTER_DB.playerPhotos[resolved.key];

    /* Дублируем в старый storage */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      /* Пишем в БЕЗОПАСНОМ виде: по полному ФИ, не по одной фамилии */
      var safeStorageKey = (typeof ref === 'object' && ref.id) ? ref.id : String(ref);
      if (isSingleSurname(safeStorageKey)) {
        console.warn('[lfld-media] Не сохраняю одиночную фамилию в storage:', safeStorageKey);
      } else {
        if (dataUrl) map[safeStorageKey] = dataUrl; else delete map[safeStorageKey];
      }
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(map));
    } catch (e) {}

    saveToStorage();
    return resolved.key;
  }

  function getPlayerPhoto(ref) {
    if (!ref) return '';
    ensureRoot();

    var resolved = playerPhotoKey(ref);
    if (!resolved.key) return '';

    /* 1. Ищем по строгому ключу */
    var url = window.LFLD_MASTER_DB.playerPhotos[resolved.key];
    if (url) return url;

    /* 2. Пробуем найти по ID, если передан объект с id */
    if (typeof ref === 'object' && ref.id) {
      var idKey = 'id:' + ref.id;
      if (window.LFLD_MASTER_DB.playerPhotos[idKey]) return window.LFLD_MASTER_DB.playerPhotos[idKey];
    }

    /* 3. Fallback: пробуем в localStorage по точному вхождению */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      /* Ищем только точное совпадение ключа, НЕ по фамилии */
      var str = String(ref).trim();
      if (map[str]) return map[str];
      if (typeof ref === 'object' && ref.id && map[ref.id]) return map[ref.id];
    } catch (e) {}

    return '';
  }

  function clearPlayerPhoto(ref) { return setPlayerPhoto(ref, ''); }

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
        if (!playerMap[k]) return;
        /* Проверяем на запрещённую одиночную фамилию */
        var resolved = playerPhotoKey(k);
        if (resolved.error && resolved.error.indexOf('forbidden_single_surname') === 0) {
          console.warn('[lfld-media] importRegistry: пропущена одиночная фамилия', k);
          return;
        }
        var key = resolved.key || k;
        window.LFLD_MASTER_DB.playerPhotos[key] = playerMap[k];
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

  /* ---------- Автозагрузка ---------- */
  loadFromStorage();

  /* ---------- Дополнение из LFLD_AUX_DATA ---------- */
  (function mergeAux() {
    var A = window.LFLD_AUX_DATA;
    if (!A || typeof A !== 'object') return;
    if (A.clubMainPhoto && typeof A.clubMainPhoto === 'object') {
      Object.keys(A.clubMainPhoto).forEach(function (club) {
        if (!A.clubMainPhoto[club]) return;
        var k = teamKey(club);
        if (!window.LFLD_MASTER_DB.teamPhotos[k]) window.LFLD_MASTER_DB.teamPhotos[k] = A.clubMainPhoto[club];
      });
    }
    if (A.playerPhotos && typeof A.playerPhotos === 'object') {
      Object.keys(A.playerPhotos).forEach(function (key) {
        if (!A.playerPhotos[key]) return;
        var resolved = playerPhotoKey(key);
        if (resolved.error && resolved.error.indexOf('forbidden_single_surname') === 0) return;
        var k = resolved.key || key;
        if (!window.LFLD_MASTER_DB.playerPhotos[k]) window.LFLD_MASTER_DB.playerPhotos[k] = A.playerPhotos[key];
      });
    }
    saveToStorage();
  })();

  /* ---------- Экспорт ---------- */
  window.lfldMedia = {
    teamKey: teamKey,
    playerKey: function (ref) { return playerPhotoKey(ref).key; },

    setTeamPhoto: setTeamPhoto,
    getTeamPhoto: getTeamPhoto,
    clearTeamPhoto: clearTeamPhoto,

    setPlayerPhoto: setPlayerPhoto,
    getPlayerPhoto: getPlayerPhoto,
    clearPlayerPhoto: clearPlayerPhoto,

    saveTeamPhoto: setTeamPhoto,
    savePlayerPhoto: setPlayerPhoto,

    importRegistry: importRegistry,
    exportRegistry: exportRegistry,

    saveToStorage: saveToStorage,
    loadFromStorage: loadFromStorage,

    isSingleSurname: isSingleSurname,
    FORBIDDEN_SINGLE_SURNAMES: FORBIDDEN_SINGLE_SURNAMES
  };

  window.saveTeamPhoto   = setTeamPhoto;
  window.getTeamPhoto    = getTeamPhoto;
  window.savePlayerPhoto = setPlayerPhoto;
  window.getPlayerPhoto  = getPlayerPhoto;

  console.log('[lfld-media] загружен v3.0 · запрет одиночных фамилий активен');
})();