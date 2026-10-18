/* ============================================================
   lfld-media.js v5.0

   ЕДИНЫЙ РЕЗОЛВЕР ФОТО

   Приоритет:
   1. LFLD_TEAMS_MEDIA (модульное хранилище по клубам)
   2. LFLD_MASTER_DB.playerPhotos (legacy по ID)
   3. LFLD_MASTER_DB.teamPhotos (legacy команды)
   4. localStorage (ff_player_photos_by_id / ff_club_main_photo)
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_TEAM = 'ff_club_main_photo';
  var STORAGE_PLAYER = 'ff_player_photos_by_id';

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '').trim();
  }
  function normWithSpaces(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function resolvePlayerId(ref) {
    if (!ref) return null;
    if (typeof ref === 'string' && /^p_[a-z0-9_]+$/i.test(ref)) return ref;
    if (typeof ref === 'object' && ref.id) return ref.id;

    if (window.PlayerResolver && window.PlayerResolver.resolve) {
      try {
        var resolved = window.PlayerResolver.resolve(
          typeof ref === 'object' ? (ref.full || ref.fullName || ref.name || '') : ref,
          typeof ref === 'object' ? ref.club : null
        );
        if (resolved && resolved.id) return resolved.id;
      } catch (e) {}
    }
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
     КОМАНДНОЕ ФОТО
     ============================================================ */
  function getTeamPhoto(club) {
    if (!club) return '';

    /* 1. Новое модульное хранилище */
    if (window.teamMedia && window.teamMedia.getTeamPhoto) {
      var u = window.teamMedia.getTeamPhoto(club);
      if (u) return u;
    }

    /* 2. Legacy LFLD_MASTER_DB.teamPhotos */
    var M = window.LFLD_MASTER_DB;
    if (M && M.teamPhotos) {
      var slug = (window.getClubSlug ? window.getClubSlug(club) : null) || '';
      var key1 = 'team_' + normWithSpaces(club).replace(/\s+/g, '_');
      if (M.teamPhotos[key1]) return M.teamPhotos[key1];
      if (slug && M.teamPhotos['team_' + slug]) return M.teamPhotos['team_' + slug];
    }

    /* 3. Legacy localStorage */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (map[club]) return map[club];
    } catch (e) {}

    return '';
  }

  function setTeamPhoto(club, dataUrl) {
    if (!club) return false;
    if (window.teamMedia && window.teamMedia.setTeamPhoto) {
      window.teamMedia.setTeamPhoto(club, dataUrl);
    }
    /* Дублируем в legacy для совместимости */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_TEAM) || '{}');
      if (dataUrl) map[club] = dataUrl;
      else delete map[club];
      localStorage.setItem(STORAGE_TEAM, JSON.stringify(map));
    } catch (e) {}
    return true;
  }

  /* ============================================================
     ФОТО ИГРОКА
     Порядок:
     1. LFLD_TEAMS_MEDIA[clubSlug].players[playerId]
     2. LFLD_TEAMS_MEDIA[*].players[playerId]  (если клуб неизвестен)
     3. LFLD_MASTER_DB.playerPhotos[playerId]
     4. localStorage[playerId]
     5. database.js
     ============================================================ */
  function getPlayerPhoto(ref) {
    var playerId = resolvePlayerId(ref);
    var club = '';
    if (typeof ref === 'object' && ref.club) club = ref.club;

    var M = window.LFLD_MASTER_DB || {};

    /* 1. Модульное хранилище по клубу */
    if (window.teamMedia && playerId) {
      if (club) {
        var u1 = window.teamMedia.getPlayerPhoto(club, playerId);
        if (u1) return u1;
      }
      /* 2. Поиск по всем клубам */
      var u2 = window.teamMedia.findPlayerPhotoAnywhere(playerId);
      if (u2) return u2;
    }

    /* 3. Legacy playerPhotos[playerId] */
    if (playerId && M.playerPhotos && M.playerPhotos[playerId]) {
      return M.playerPhotos[playerId];
    }

    /* 4. localStorage */
    try {
      var local = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (playerId && local[playerId]) return local[playerId];
    } catch (e) {}

    /* 5. database.js */
    if (playerId && window.database && window.database.getPlayer) {
      try {
        var dbPlayer = window.database.getPlayer(playerId);
        if (dbPlayer && dbPlayer.photo) return dbPlayer.photo;
      } catch (e) {}
    }

    /* 6. Fallback: по нормализованному ФИО в playerPhotos */
    if (M.playerPhotos && typeof ref === 'string') {
      var normFio = norm(ref);
      if (normFio && M.playerPhotos[normFio]) return M.playerPhotos[normFio];
    }

    return '';
  }

  function setPlayerPhoto(ref, dataUrl) {
    var playerId = resolvePlayerId(ref);
    if (!playerId) {
      console.warn('[lfld-media] setPlayerPhoto: не удалось определить ID игрока:', ref);
      return false;
    }
    var club = (typeof ref === 'object' && ref.club) || '';
    if (!club && window.__getPlayerClubById) {
      club = window.__getPlayerClubById(playerId) || '';
    }

    /* 1. Модульное хранилище */
    if (window.teamMedia && club) {
      window.teamMedia.setPlayerPhoto(club, playerId, dataUrl);
    }

    /* 2. Legacy playerPhotos */
    if (window.LFLD_MASTER_DB) {
      window.LFLD_MASTER_DB.playerPhotos = window.LFLD_MASTER_DB.playerPhotos || {};
      if (dataUrl) window.LFLD_MASTER_DB.playerPhotos[playerId] = dataUrl;
      else delete window.LFLD_MASTER_DB.playerPhotos[playerId];
    }

    /* 3. localStorage */
    try {
      var map = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || '{}');
      if (dataUrl) map[playerId] = dataUrl;
      else delete map[playerId];
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(map));
    } catch (e) {}

    return true;
  }

  function clearPlayerPhoto(ref) {
    return setPlayerPhoto(ref, '');
  }

  /* ============================================================
     ЭКСПОРТ
     ============================================================ */
  window.lfldMedia = {
    resolvePlayerId: resolvePlayerId,
    getTeamPhoto: getTeamPhoto,
    setTeamPhoto: setTeamPhoto,
    clearTeamPhoto: function (c) { return setTeamPhoto(c, ''); },
    getPlayerPhoto: getPlayerPhoto,
    setPlayerPhoto: setPlayerPhoto,
    clearPlayerPhoto: clearPlayerPhoto,
    saveTeamPhoto: setTeamPhoto,
    savePlayerPhoto: setPlayerPhoto
  };

  window.getTeamPhoto = getTeamPhoto;
  window.getPlayerPhoto = getPlayerPhoto;
  window.saveTeamPhoto = setTeamPhoto;
  window.savePlayerPhoto = setPlayerPhoto;

  console.log('[lfld-media] v5.0 · читает из LFLD_TEAMS_MEDIA + legacy');
})();