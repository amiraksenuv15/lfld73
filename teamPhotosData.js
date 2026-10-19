/* ============================================================
   teamPhotosData.js v1.0

   МОДУЛЬНОЕ ХРАНИЛИЩЕ ГЛАВНЫХ ФОТОГРАФИЙ (ОБЛОЖЕК) КЛУБОВ

   Структура:
   window.LFLD_TEAM_PHOTOS[slug] = "data:image/jpeg;base64,..."

   Ключи — нормализованные slug'и:
   kometa, sprint, metallist, khimmash, ptimash, avangard,
   neftchi, avtostar, diti_niyau_mifi, ssh_lada, ak_bars
   и т.д.

   API:
   - teamPhotos.getTeamPhoto(club)          → dataURL
   - teamPhotos.setTeamPhoto(club, dataUrl) → сохранить
   - teamPhotos.clearTeamPhoto(club)        → удалить
   - teamPhotos.exportAll()                 → объект для GitHub
   - teamPhotos.generateFileContent()       → строка для публикации
   - teamPhotos.migrateFromLegacy()         → миграция из старых реестров
   ============================================================ */

window.LFLD_TEAM_PHOTOS = window.LFLD_TEAM_PHOTOS || {};

/* ============================================================
   1. СЛОВАРЬ SLUG'ОВ КЛУБОВ
   Совместим с LFLD_CLUB_SLUGS из teamMediaData.js.
   Принимает также алиасы (khimmash, ssh_lada, diti_niyau_mifi).
   ============================================================ */
var TEAM_SLUG_MAP = {
  /* Канонические названия */
  'Комета':             'kometa',
  'Спринт':             'sprint',
  'Спринт-Кальяри':     'sprint',
  'Металлист':          'metallist',
  'Металлист-М':        'metallist_m',
  'Химмаш':             'khimmash',
  'Нейтрон':            'neutron',
  'ПТИМАШ':             'ptimash',
  'Кабо-Верде':         'kabo_verde',
  'Ак Барс':            'ak_bars',
  'Авангард':           'avangard',
  'Автостар':           'avtostar',
  'ДИТИ НИЯУ МИФИ':     'diti_niyau_mifi',
  'МИФИ':               'diti_niyau_mifi',
  'СШ Лада':            'ssh_lada',
  'Лада':               'ssh_lada',
  'Нефтчи':             'neftchi',
  'Волга':              'volga',
  'Тонус':              'tonus',
  'ФК НЕ Молодёжка':    'ne_molodezhka',
  'Detali63SMR':        'detali63'
};

/* Алиасы slug'ов (старые / альтернативные варианты) */
var TEAM_SLUG_ALIASES = {
  'himmash':          'khimmash',
  'mifi':             'diti_niyau_mifi',
  'lada':             'ssh_lada',
  'lada_ssh':         'ssh_lada',
  'sprint_kalyari':   'sprint',
  'sprint_cagliari':  'sprint',
  'metallist_m':      'metallist_m'
};

function normClub(club) {
  return String(club || '').toLowerCase().replace(/ё/g, 'е').trim();
}

/**
 * Получить slug клуба по названию.
 */
function getTeamSlug(club) {
  if (!club) return '';

  /* 1. Прямое совпадение по названию */
  if (TEAM_SLUG_MAP[club]) return TEAM_SLUG_MAP[club];

  /* 2. Мягкое совпадение по названию (ё/е, регистр) */
  var n = normClub(club);
  var keys = Object.keys(TEAM_SLUG_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (normClub(keys[i]) === n) return TEAM_SLUG_MAP[keys[i]];
  }

  /* 3. Клуб уже передан slug'ом (kometa, sprint, ...) */
  if (TEAM_SLUG_ALIASES[club]) return TEAM_SLUG_ALIASES[club];
  var nAlias = normClub(club);
  for (var k in TEAM_SLUG_ALIASES) {
    if (TEAM_SLUG_ALIASES.hasOwnProperty(k) && normClub(k) === nAlias) {
      return TEAM_SLUG_ALIASES[k];
    }
  }
  /* Проверяем, что это уже существующий slug */
  var allSlugs = Object.keys(TEAM_SLUG_MAP).map(function (k) { return TEAM_SLUG_MAP[k]; });
  if (allSlugs.indexOf(club) !== -1) return club;

  /* 4. Fallback: транслитерация */
  var trans = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
    'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  return n.split('').map(function (ch) {
    return trans[ch] !== undefined ? trans[ch] : (ch.match(/[a-z0-9]/) ? ch : '');
  }).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'club';
}

/* ============================================================
   2. СИД — если нужно зафиксировать фото в коде (обычно пусто)
   ============================================================ */
(function seedData() {
  var SEED = {
    /* Заполняется через админку. Пример:
    'kometa': 'data:image/jpeg;base64,...',
    'sprint': 'data:image/jpeg;base64,...' */
  };

  Object.keys(SEED).forEach(function (slug) {
    if (!window.LFLD_TEAM_PHOTOS[slug]) {
      window.LFLD_TEAM_PHOTOS[slug] = SEED[slug];
    }
  });
})();

/* ============================================================
   3. ХРАНЕНИЕ В LOCALSTORAGE
   ============================================================ */
var STORAGE_KEY = 'lfld_team_photos_v1';

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.LFLD_TEAM_PHOTOS));
    return true;
  } catch (e) {
    console.warn('[teamPhotosData] localStorage save error:', e);
    return false;
  }
}

function loadFromLocalStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return 0;

    var count = 0;
    Object.keys(parsed).forEach(function (slug) {
      if (!parsed[slug]) return;
      if (!window.LFLD_TEAM_PHOTOS[slug]) {
        window.LFLD_TEAM_PHOTOS[slug] = parsed[slug];
        count++;
      }
    });
    return count;
  } catch (e) {
    console.warn('[teamPhotosData] localStorage load error:', e);
    return 0;
  }
}

/* ============================================================
   4. ПУБЛИЧНОЕ API
   ============================================================ */
window.teamPhotos = {

  /**
   * Получить фото команды по названию или slug.
   */
  getTeamPhoto: function (club) {
    if (!club) return '';
    var slug = getTeamSlug(club);
    if (slug && window.LFLD_TEAM_PHOTOS[slug]) {
      return window.LFLD_TEAM_PHOTOS[slug];
    }
    /* Проверка по алиасу */
    var alias = TEAM_SLUG_ALIASES[slug];
    if (alias && window.LFLD_TEAM_PHOTOS[alias]) {
      return window.LFLD_TEAM_PHOTOS[alias];
    }
    return '';
  },

  /**
   * Сохранить фото команды.
   */
  setTeamPhoto: function (club, dataUrl) {
    if (!club) return false;
    var slug = getTeamSlug(club);
    if (!slug) return false;

    if (dataUrl) {
      window.LFLD_TEAM_PHOTOS[slug] = dataUrl;
    } else {
      delete window.LFLD_TEAM_PHOTOS[slug];
    }

    saveToLocalStorage();

    /* Дублируем в LFLD_MASTER_DB.teamPhotos (для совместимости) */
    try {
      if (window.LFLD_MASTER_DB) {
        window.LFLD_MASTER_DB.teamPhotos = window.LFLD_MASTER_DB.teamPhotos || {};
        if (dataUrl) {
          window.LFLD_MASTER_DB.teamPhotos['team_' + slug] = dataUrl;
        } else {
          delete window.LFLD_MASTER_DB.teamPhotos['team_' + slug];
        }
      }
    } catch (e) {}

    /* Дублируем в teamMediaData.js */
    try {
      if (window.teamMedia && window.teamMedia.setTeamPhoto) {
        window.teamMedia.setTeamPhoto(club, dataUrl);
      }
    } catch (e) {}

    return true;
  },

  /**
   * Удалить фото.
   */
  clearTeamPhoto: function (club) {
    return this.setTeamPhoto(club, '');
  },

  /**
   * Все фото команд (объект).
   */
  getAll: function () {
    return Object.assign({}, window.LFLD_TEAM_PHOTOS);
  },

  /**
   * Экспорт для публикации.
   */
  exportAll: function () {
    return JSON.parse(JSON.stringify(window.LFLD_TEAM_PHOTOS));
  },

  /**
   * Импорт.
   */
  importAll: function (data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (slug) {
      if (!data[slug]) return;
      if (!window.LFLD_TEAM_PHOTOS[slug]) {
        window.LFLD_TEAM_PHOTOS[slug] = data[slug];
      }
    });
    saveToLocalStorage();
  },

  /**
   * Генерация файла teamPhotosData.js для публикации в GitHub.
   */
  generateFileContent: function () {
    var data = this.exportAll();
    var ts = new Date().toISOString();
    var lines = [
      '/* ============================================================',
      '   teamPhotosData.js — автогенерация из админки',
      '   Опубликовано: ' + ts,
      '   ============================================================ */',
      '',
      'window.LFLD_TEAM_PHOTOS = window.LFLD_TEAM_PHOTOS || {};',
      '',
      'Object.assign(window.LFLD_TEAM_PHOTOS, ' + JSON.stringify(data, null, 2) + ');',
      '',
      '/* ---------- Автосинхронизация в localStorage ---------- */',
      '(function () {',
      '  if (!window.LFLD_TEAM_PHOTOS) return;',
      '  try {',
      '    var existing = JSON.parse(localStorage.getItem("lfld_team_photos_v1") || "{}");',
      '    var merged = Object.assign({}, window.LFLD_TEAM_PHOTOS, existing);',
      '    localStorage.setItem("lfld_team_photos_v1", JSON.stringify(merged));',
      '  } catch (e) {}',
      '})();',
      ''
    ];
    return lines.join('\n');
  },

  saveToLocalStorage: saveToLocalStorage,
  loadFromLocalStorage: loadFromLocalStorage,
  getTeamSlug: getTeamSlug,

  /**
   * Миграция фото из старых реестров:
   * - LFLD_MASTER_DB.teamPhotos (ключи team_<slug>)
   * - localStorage ff_club_main_photo (ключи = названия клубов)
   * - teamMediaData.js (LFLD_TEAMS_MEDIA[*].teamPhoto)
   */
  migrateFromLegacy: function () {
    var migrated = 0;

    /* 1. Из LFLD_MASTER_DB.teamPhotos */
    try {
      var M = window.LFLD_MASTER_DB;
      if (M && M.teamPhotos && typeof M.teamPhotos === 'object') {
        Object.keys(M.teamPhotos).forEach(function (key) {
          if (!M.teamPhotos[key]) return;
          var slug = key.indexOf('team_') === 0 ? key.slice(5) : key;
          /* Нормализуем slug через алиасы */
          if (TEAM_SLUG_ALIASES[slug]) slug = TEAM_SLUG_ALIASES[slug];
          if (!window.LFLD_TEAM_PHOTOS[slug]) {
            window.LFLD_TEAM_PHOTOS[slug] = M.teamPhotos[key];
            migrated++;
          }
        });
      }
    } catch (e) {}

    /* 2. Из localStorage ff_club_main_photo */
    try {
      var legacy = JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}');
      Object.keys(legacy).forEach(function (club) {
        if (!legacy[club]) return;
        var slug = getTeamSlug(club);
        if (!slug) return;
        if (!window.LFLD_TEAM_PHOTOS[slug]) {
          window.LFLD_TEAM_PHOTOS[slug] = legacy[club];
          migrated++;
        }
      });
    } catch (e) {}

    /* 3. Из teamMediaData.js */
    try {
      if (window.LFLD_TEAMS_MEDIA) {
        Object.keys(window.LFLD_TEAMS_MEDIA).forEach(function (slug) {
          var bucket = window.LFLD_TEAMS_MEDIA[slug];
          if (!bucket || !bucket.teamPhoto) return;
          var normalizedSlug = TEAM_SLUG_ALIASES[slug] || slug;
          if (!window.LFLD_TEAM_PHOTOS[normalizedSlug]) {
            window.LFLD_TEAM_PHOTOS[normalizedSlug] = bucket.teamPhoto;
            migrated++;
          }
        });
      }
    } catch (e) {}

    if (migrated) {
      saveToLocalStorage();
      console.log('[teamPhotosData] Мигрировано фото команд из legacy:', migrated);
    }
    return migrated;
  }
};

/* ============================================================
   5. АВТОЗАПУСК
   ============================================================ */
(function boot() {
  /* 1. Загрузка из localStorage */
  loadFromLocalStorage();

  /* 2. Миграция legacy (с задержкой, чтобы база успела подгрузиться) */
  setTimeout(function () {
    try { window.teamPhotos.migrateFromLegacy(); } catch (e) { console.warn('[teamPhotosData migrate]', e); }
  }, 1500);
  setTimeout(function () {
    try { window.teamPhotos.migrateFromLegacy(); } catch (e) {}
  }, 3500);

  console.log('[teamPhotosData] v1.0 · загружено фото команд:', Object.keys(window.LFLD_TEAM_PHOTOS).length);
})();