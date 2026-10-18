/* ============================================================
   teamMediaData.js v1.0

   МОДУЛЬНЫЙ РЕЕСТР МЕДИА ПО КЛУБАМ

   Структура:
   window.LFLD_TEAMS_MEDIA[clubSlug] = {
     teamPhoto: "data:image/jpeg;base64,...",   // главное фото команды
     players: {
       "p_vasin_egor": "data:image/jpeg;base64,...",
       "p_samartsev_mark": "data:image/jpeg;base64,...",
       ...
     }
   }

   Хранится в localStorage (сжатая версия) и публикуется в GitHub
   через отдельный файл teamMediaData.js.
   ============================================================ */

window.LFLD_TEAMS_MEDIA = window.LFLD_TEAMS_MEDIA || {};

/* ============================================================
   МАППИНГ: название клуба → slug
   ============================================================ */
window.LFLD_CLUB_SLUGS = {
  'Комета': 'kometa',
  'Спринт': 'sprint',
  'Спринт-Кальяри': 'sprint',
  'Металлист': 'metallist',
  'Металлист-М': 'metallist_m',
  'Химмаш': 'himmash',
  'Нейтрон': 'neutron',
  'ПТИМАШ': 'ptimash',
  'Кабо-Верде': 'kabo_verde',
  'Ак Барс': 'ak_bars',
  'Авангард': 'avangard',
  'Автостар': 'avtostar',
  'ДИТИ НИЯУ МИФИ': 'mifi',
  'МИФИ': 'mifi',
  'СШ Лада': 'lada',
  'Нефтчи': 'neftchi',
  'Волга': 'volga',
  'Тонус': 'tonus',
  'ФК НЕ Молодёжка': 'ne_molodezhka',
  'Detali63SMR': 'detali63'
};

window.LFLD_SLUG_TO_CLUB = {
  'kometa': 'Комета',
  'sprint': 'Спринт',
  'metallist': 'Металлист',
  'metallist_m': 'Металлист-М',
  'himmash': 'Химмаш',
  'neutron': 'Нейтрон',
  'ptimash': 'ПТИМАШ',
  'kabo_verde': 'Кабо-Верде',
  'ak_bars': 'Ак Барс',
  'avangard': 'Авангард',
  'avtostar': 'Автостар',
  'mifi': 'ДИТИ НИЯУ МИФИ',
  'lada': 'СШ Лада',
  'neftchi': 'Нефтчи',
  'volga': 'Волга',
  'tonus': 'Тонус',
  'ne_molodezhka': 'ФК НЕ Молодёжка',
  'detali63': 'Detali63SMR'
};

function normClub(club) {
  return String(club || '').toLowerCase().replace(/ё/g, 'е').trim();
}

/**
 * Получить slug клуба по его названию.
 * Неизвестные клубы транслитерируются в slug.
 */
window.getClubSlug = function (club) {
  if (!club) return '';
  var direct = window.LFLD_CLUB_SLUGS[club];
  if (direct) return direct;

  var n = normClub(club);
  var keys = Object.keys(window.LFLD_CLUB_SLUGS);
  for (var i = 0; i < keys.length; i++) {
    if (normClub(keys[i]) === n) return window.LFLD_CLUB_SLUGS[keys[i]];
  }

  /* Fallback: транслитерация */
  var trans = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
    'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  return n.split('').map(function (ch) {
    return trans[ch] !== undefined ? trans[ch] : (ch.match(/[a-z0-9]/) ? ch : '');
  }).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'club';
};

/* ============================================================
   ЧТЕНИЕ / ЗАПИСЬ / СОХРАНЕНИЕ
   ============================================================ */
function ensureClubBucket(club) {
  var slug = window.getClubSlug(club);
  if (!slug) return null;
  if (!window.LFLD_TEAMS_MEDIA[slug]) {
    window.LFLD_TEAMS_MEDIA[slug] = {
      teamPhoto: '',
      players: {}
    };
  }
  if (!window.LFLD_TEAMS_MEDIA[slug].players) {
    window.LFLD_TEAMS_MEDIA[slug].players = {};
  }
  return window.LFLD_TEAMS_MEDIA[slug];
}

function saveToLocalStorage() {
  try {
    var json = JSON.stringify(window.LFLD_TEAMS_MEDIA);
    localStorage.setItem('lfld_teams_media_v1', json);
  } catch (e) {
    console.warn('[teamMediaData] localStorage save error:', e);
  }
}

function loadFromLocalStorage() {
  try {
    var raw = localStorage.getItem('lfld_teams_media_v1');
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.keys(parsed).forEach(function (slug) {
      var entry = parsed[slug];
      if (!entry) return;
      if (!window.LFLD_TEAMS_MEDIA[slug]) {
        window.LFLD_TEAMS_MEDIA[slug] = { teamPhoto: '', players: {} };
      }
      if (entry.teamPhoto && !window.LFLD_TEAMS_MEDIA[slug].teamPhoto) {
        window.LFLD_TEAMS_MEDIA[slug].teamPhoto = entry.teamPhoto;
      }
      if (entry.players && typeof entry.players === 'object') {
        Object.keys(entry.players).forEach(function (pid) {
          if (entry.players[pid] && !window.LFLD_TEAMS_MEDIA[slug].players[pid]) {
            window.LFLD_TEAMS_MEDIA[slug].players[pid] = entry.players[pid];
          }
        });
      }
    });
  } catch (e) {
    console.warn('[teamMediaData] localStorage load error:', e);
  }
}

/* ============================================================
   ПУБЛИЧНОЕ API
   ============================================================ */
window.teamMedia = {

  /* --- Команда --- */
  setTeamPhoto: function (club, dataUrl) {
    var bucket = ensureClubBucket(club);
    if (!bucket) return false;
    if (dataUrl) bucket.teamPhoto = dataUrl;
    else bucket.teamPhoto = '';
    saveToLocalStorage();
    return true;
  },

  getTeamPhoto: function (club) {
    var slug = window.getClubSlug(club);
    if (!slug) return '';
    var bucket = window.LFLD_TEAMS_MEDIA[slug];
    return (bucket && bucket.teamPhoto) || '';
  },

  clearTeamPhoto: function (club) {
    return this.setTeamPhoto(club, '');
  },

  /* --- Игрок --- */
  setPlayerPhoto: function (club, playerId, dataUrl) {
    if (!club || !playerId) return false;
    var bucket = ensureClubBucket(club);
    if (!bucket) return false;
    if (dataUrl) bucket.players[playerId] = dataUrl;
    else delete bucket.players[playerId];
    saveToLocalStorage();
    return true;
  },

  getPlayerPhoto: function (club, playerId) {
    var slug = window.getClubSlug(club);
    if (!slug || !playerId) return '';
    var bucket = window.LFLD_TEAMS_MEDIA[slug];
    return (bucket && bucket.players && bucket.players[playerId]) || '';
  },

  clearPlayerPhoto: function (club, playerId) {
    return this.setPlayerPhoto(club, playerId, '');
  },

  /**
   * Найти фото игрока во ВСЕХ командах (если точный клуб неизвестен).
   */
  findPlayerPhotoAnywhere: function (playerId) {
    if (!playerId) return '';
    var slugs = Object.keys(window.LFLD_TEAMS_MEDIA);
    for (var i = 0; i < slugs.length; i++) {
      var bucket = window.LFLD_TEAMS_MEDIA[slugs[i]];
      if (bucket && bucket.players && bucket.players[playerId]) {
        return bucket.players[playerId];
      }
    }
    return '';
  },

  /**
   * Все фото игрока в разных клубах.
   */
  getAllPlayerPhotos: function (playerId) {
    var out = [];
    if (!playerId) return out;
    var slugs = Object.keys(window.LFLD_TEAMS_MEDIA);
    slugs.forEach(function (slug) {
      var bucket = window.LFLD_TEAMS_MEDIA[slug];
      if (bucket && bucket.players && bucket.players[playerId]) {
        out.push({
          club: window.LFLD_SLUG_TO_CLUB[slug] || slug,
          slug: slug,
          url: bucket.players[playerId]
        });
      }
    });
    return out;
  },

  /* --- Экспорт / импорт --- */
  exportAll: function () {
    return JSON.parse(JSON.stringify(window.LFLD_TEAMS_MEDIA));
  },

  importAll: function (data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (slug) {
      if (!window.LFLD_TEAMS_MEDIA[slug]) {
        window.LFLD_TEAMS_MEDIA[slug] = { teamPhoto: '', players: {} };
      }
      var entry = data[slug];
      if (entry.teamPhoto) window.LFLD_TEAMS_MEDIA[slug].teamPhoto = entry.teamPhoto;
      if (entry.players && typeof entry.players === 'object') {
        Object.keys(entry.players).forEach(function (pid) {
          if (entry.players[pid]) {
            window.LFLD_TEAMS_MEDIA[slug].players[pid] = entry.players[pid];
          }
        });
      }
    });
    saveToLocalStorage();
  },

  saveToLocalStorage: saveToLocalStorage,
  loadFromLocalStorage: loadFromLocalStorage,

  /* --- Миграция старых данных --- */
  /**
   * Переносит фото из старых реестров (LFLD_MASTER_DB.playerPhotos,
   * ff_club_main_photo, ff_player_photos_by_id) в LFLD_TEAMS_MEDIA.
   */
  migrateFromLegacy: function () {
    var migrated = 0;

    /* 1. Командные фото из ff_club_main_photo */
    try {
      var legacyTeam = JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}');
      Object.keys(legacyTeam).forEach(function (club) {
        if (!legacyTeam[club]) return;
        if (window.teamMedia.getTeamPhoto(club)) return;
        window.teamMedia.setTeamPhoto(club, legacyTeam[club]);
        migrated++;
      });
    } catch (e) {}

    /* 2. Фото игроков из ff_player_photos_by_id */
    try {
      var legacyPlayers = JSON.parse(localStorage.getItem('ff_player_photos_by_id') || '{}');
      Object.keys(legacyPlayers).forEach(function (playerId) {
        if (!legacyPlayers[playerId]) return;
        if (!/^p_[a-z0-9_]+$/i.test(playerId)) return;

        /* Определяем клуб для игрока */
        var club = window.__getPlayerClubById ? window.__getPlayerClubById(playerId) : null;
        if (!club) club = 'unknown';

        if (window.teamMedia.getPlayerPhoto(club, playerId)) return;
        window.teamMedia.setPlayerPhoto(club, playerId, legacyPlayers[playerId]);
        migrated++;
      });
    } catch (e) {}

    /* 3. Из LFLD_MASTER_DB.playerPhotos */
    try {
      var master = window.LFLD_MASTER_DB && window.LFLD_MASTER_DB.playerPhotos;
      if (master && typeof master === 'object') {
        Object.keys(master).forEach(function (playerId) {
          if (!master[playerId]) return;
          if (!/^p_[a-z0-9_]+$/i.test(playerId)) return;
          var club = window.__getPlayerClubById ? window.__getPlayerClubById(playerId) : null;
          if (!club) club = 'unknown';
          if (window.teamMedia.getPlayerPhoto(club, playerId)) return;
          window.teamMedia.setPlayerPhoto(club, playerId, master[playerId]);
          migrated++;
        });
      }
    } catch (e) {}

    if (migrated) {
      console.log('[teamMediaData] Мигрировано фото из legacy:', migrated);
    }
    return migrated;
  }
};

/* ============================================================
   ХЕЛПЕР: определить клуб игрока по его ID (для миграции)
   ============================================================ */
window.__getPlayerClubById = function (playerId) {
  var M = window.LFLD_MASTER_DB;
  if (!M || !playerId) return null;
  var tourneyKeys = ['tournament_5x5', 'tournament_7x7', 'tournament_night'];
  for (var ti = 0; ti < tourneyKeys.length; ti++) {
    var t = M[tourneyKeys[ti]];
    if (!t || !t.teams) continue;
    var clubs = Object.keys(t.teams);
    for (var ci = 0; ci < clubs.length; ci++) {
      var arr = t.teams[clubs[ci]] || [];
      for (var pi = 0; pi < arr.length; pi++) {
        if (arr[pi] && arr[pi].id === playerId) return clubs[ci];
      }
    }
  }
  return null;
};

/* ============================================================
   АВТОЗАПУСК
   ============================================================ */
(function boot() {
  loadFromLocalStorage();
  /* Миграция с небольшой задержкой, чтобы база успела подгрузиться */
  setTimeout(function () {
    try { window.teamMedia.migrateFromLegacy(); } catch (e) { console.warn('[teamMediaData migrate]', e); }
  }, 1500);
})();

console.log('[teamMediaData] v1.0 загружен · модульное хранилище по клубам');