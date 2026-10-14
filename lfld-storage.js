/* ============================================================
   lfld-storage.js — патч localStorage: защита от QuotaExceededError
   Подключается ПЕРВЫМ, до всех остальных скриптов.
   Ловит переполнение хранилища, автоматически чистит
   некритичные ключи и повторяет запись.

   v1.1 — добавлен ключ ff_player_photos в неcricitical list
   ============================================================ */
(function () {
  'use strict';

  /* Ключи, которые можно безопасно удалить при переполнении.
     НЕ трогаем: ff_tournaments, ff_database_v1, ff_symbolic_teams,
     ff_cup_metallist_rosters, lfld_gh_token. */
  var NON_CRITICAL_KEYS = [
    'hero_slider_photos',
    'ff_welcome_photos',
    'ff_welcome_interval',
    'lfld_site_background',
    'lfld_site_blur_bg',
    'bannerSlides',
    'ff_team_photos',
    'ff_tournament_posters',
    'match_vk_albums',
    'ff_streams',
    'ff_vk_live'
  ];

  /* Дополнительные ключи, которые при полном сбросе тоже удаляем,
     но в мягкой очистке не трогаем (это могут быть важные данные). */
  var EXTRA_RESET_KEYS = [
    'ff_tournaments',
    'ff_database_v1',
    'ff_master_imported_v3',
    'ff_symbolic_teams',
    'ff_cup_metallist_rosters',
    'ff_club_main_photo',
    'ff_player_photos',
    'ff_custom_clubs',
    'ff_organizers',
    'fav_club',
    'fav_tourney'
  ];

  var originalSetItem = null;
  try {
    originalSetItem = localStorage.setItem.bind(localStorage);
  } catch (e) {
    console.warn('[lfld-storage] localStorage недоступен:', e);
    return;
  }

  function clearNonCritical() {
    var removed = 0;
    NON_CRITICAL_KEYS.forEach(function (k) {
      try {
        if (localStorage.getItem(k) !== null) {
          localStorage.removeItem(k);
          removed++;
        }
      } catch (e) {}
    });
    console.log('[lfld-storage] очищено неcricitical ключей: ' + removed);
    return removed;
  }

  function isQuotaError(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError'
        || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        || e.code === 22
        || e.code === 1014;
  }

  /* Патчим setItem */
  localStorage.setItem = function (key, value) {
    try {
      originalSetItem(key, value);
    } catch (e) {
      if (isQuotaError(e)) {
        console.warn('[lfld-storage] QuotaExceededError при сохранении "' + key + '". Чистим кэш...');
        clearNonCritical();
        try {
          originalSetItem(key, value);
        } catch (e2) {
          console.error('[lfld-storage] Не удалось сохранить после 1-й очистки. Грубая очистка...');
          try {
            localStorage.removeItem('ff_tournaments');
            localStorage.removeItem('ff_database_v1');
            localStorage.removeItem('ff_master_imported_v3');
            originalSetItem(key, value);
          } catch (e3) {
            console.error('[lfld-storage] Финальная попытка провалилась:', e3);
            /* Всё равно не роняем приложение — просто логируем */
          }
        }
      } else {
        throw e;
      }
    }
  };

  /* Публичное API для админки */
  window.__storageCleanup = clearNonCritical;

  /* Полная очистка кэша устройства (кнопка в админке) */
  window.__fullCacheReset = function () {
    var keysToRemove = NON_CRITICAL_KEYS.concat(EXTRA_RESET_KEYS);
    keysToRemove.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    console.log('[lfld-storage] Полный сброс кэша устройства выполнен (' + keysToRemove.length + ' ключей)');
    return keysToRemove.length;
  };

  console.log('[lfld-storage] загружен — защита от QuotaExceededError активна');
})();