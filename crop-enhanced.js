/* ============================================================
   crop-enhanced.js — Cropper.js интеграция с автосжатием.
   Обеспечивает window.__openCropModal(src, aspectRatio, onSave, opts)
   где opts:
     { title?, outW?, outH?, quality? }
   По умолчанию: outW = 1000, quality = 0.75 (жёсткое сжатие фото).
   ============================================================ */
(function () {
  'use strict';

  var currentCropper = null;
  var currentOnSave = null;

  /* ---------- Параметры сжатия по умолчанию ---------- */
  var DEFAULT_MAX_W = 1000;      /* командное фото: не более 1000px по ширине */
  var DEFAULT_QUALITY = 0.75;    /* ~80–130 КБ JPEG */

  /* Спец-профили для разных типов фото */
  var PRESET_TEAM   = { maxW: 1000, quality: 0.75 };   /* командное фото 16:7 */
  var PRESET_BANNER = { maxW: 1600, quality: 0.75 };   /* баннер главной 21:9 */
  var PRESET_PLAYER = { maxW: 240,  quality: 0.70 };   /* фото игрока 3:4 */

  window.__CROP_PRESETS = {
    TEAM: PRESET_TEAM,
    BANNER: PRESET_BANNER,
    PLAYER: PRESET_PLAYER
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function ensureModal() {
    var modal = document.getElementById('photo-cropper-modal');
    if (modal) return modal;

    /* Fallback — если модалку не вставили в HTML, создаём её динамически */
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'photo-cropper-modal';
    modal.innerHTML =
      '<div class="modal-content cropper-modal-content">' +
        '<button class="modal-close" id="cropper-modal-close" type="button">✕</button>' +
        '<h2 style="margin:0 0 6px;">Настройка и кадрирование фотографии</h2>' +
        '<p style="color:#94a3b8;font-size:12px;margin:0 0 14px;">Перетаскивайте рамку или само изображение. Пропорции зафиксированы под блок сайта.</p>' +
        '<div class="cropper-stage"><img id="cropper-image" src="" alt=""></div>' +
        '<div class="cropper-preview-label">Живой предпросмотр (как будет на сайте):</div>' +
        '<div class="preview-box"></div>' +
        '<div class="cropper-actions">' +
          '<button type="button" class="btn-success" id="save-cropped-photo-btn">Сохранить и применить кадрирование</button>' +
          '<button type="button" class="btn-secondary" id="cancel-cropped-photo-btn">Отмена</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  /* ============================================================
     window.__openCropModal(imageSrc, aspectRatio, onSave, opts)
     ============================================================ */
  function openCropModal(imageSrc, aspectRatio, onSave, opts) {
    aspectRatio = aspectRatio || (16 / 9);
    opts = opts || {};

    if (typeof Cropper === 'undefined') {
      alert('Библиотека Cropper.js не загружена. Проверьте подключение CDN в <head>.');
      return;
    }

    var modal = ensureModal();
    var image = document.getElementById('cropper-image');
    var previewBox = document.querySelector('#photo-cropper-modal .preview-box');
    var titleEl = document.querySelector('#photo-cropper-modal h2');
    if (titleEl && opts.title) titleEl.innerText = opts.title;

    modal.style.display = 'flex';
    currentOnSave = onSave;
    modal._cropOpts = {
      outW: opts.outW || DEFAULT_MAX_W,
      outH: opts.outH || 0,
      quality: opts.quality != null ? opts.quality : DEFAULT_QUALITY,
      aspectRatio: aspectRatio
    };

    if (currentCropper) { currentCropper.destroy(); currentCropper = null; }

    image.onload = function () {
      currentCropper = new Cropper(image, {
        aspectRatio: aspectRatio,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        background: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        preview: previewBox,
        responsive: true,
        checkOrientation: false
      });
    };
    image.src = imageSrc;
    image.style.maxHeight = '500px';
    image.style.width = 'auto';
    image.style.display = 'block';
    image.style.margin = '0 auto';
  }
  window.__openCropModal = openCropModal;

  /* ============================================================
     Кнопка «Сохранить» — жёсткое ограничение размера и качества
     ============================================================ */
  function onSave() {
    if (!currentCropper) return;

    var modal = document.getElementById('photo-cropper-modal');
    var cropOpts = (modal && modal._cropOpts) || {
      outW: DEFAULT_MAX_W,
      outH: 0,
      quality: DEFAULT_QUALITY,
      aspectRatio: 16 / 9
    };

    /* Ограничиваем максимальную ширину жёстко */
    var targetW = Math.min(cropOpts.outW || DEFAULT_MAX_W, 1600);
    var targetH;
    if (cropOpts.outH && cropOpts.outH > 0) {
      targetH = Math.min(cropOpts.outH, 1200);
    } else {
      targetH = Math.round(targetW / cropOpts.aspectRatio);
    }
    var quality = Math.max(0.5, Math.min(0.9, cropOpts.quality || DEFAULT_QUALITY));

    var canvas = currentCropper.getCroppedCanvas({
      width: targetW,
      height: targetH,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    var croppedDataUrl = canvas.toDataURL('image/jpeg', quality);

    var sizeKB = Math.round((croppedDataUrl.length * 3) / 4 / 1024);
    console.log('[crop-enhanced] экспорт: ' + targetW + 'x' + targetH + ', quality=' + quality + ', ~' + sizeKB + ' КБ');

    if (typeof currentOnSave === 'function') {
      try { currentOnSave(croppedDataUrl); }
      catch (e) {
        console.error('[crop onSave]', e);
        alert('Ошибка при сохранении: ' + (e && e.message ? e.message : e));
      }
    }

    /* Мгновенное обновление картинки на сайте, если открыт профиль команды */
    try {
      var heroImg = document.querySelector('.club-hero-photo img');
      if (heroImg && typeof currentTeamIdForPhoto === 'string') {
        var sel = document.querySelector('.team-cover-photo[data-team="' + currentTeamIdForPhoto + '"]');
        if (sel) sel.src = croppedDataUrl;
      }
    } catch (e) {}

    closeCropper();
  }

  function closeCropper() {
    var modal = document.getElementById('photo-cropper-modal');
    if (modal) modal.style.display = 'none';
    if (currentCropper) { currentCropper.destroy(); currentCropper = null; }
    currentOnSave = null;
  }

  function bind() {
    var modal = ensureModal();

    var saveBtn = document.getElementById('save-cropped-photo-btn');
    if (saveBtn && !saveBtn.__bound) { saveBtn.__bound = true; saveBtn.addEventListener('click', onSave); }

    var cancelBtn = document.getElementById('cancel-cropped-photo-btn');
    if (cancelBtn && !cancelBtn.__bound) { cancelBtn.__bound = true; cancelBtn.addEventListener('click', closeCropper); }

    var closeBtn = document.getElementById('cropper-modal-close');
    if (closeBtn && !closeBtn.__bound) { closeBtn.__bound = true; closeBtn.addEventListener('click', closeCropper); }

    if (modal && !modal.__outsideBound) {
      modal.__outsideBound = true;
      modal.addEventListener('click', function (e) { if (e.target === modal) closeCropper(); });
    }
  }

  ready(bind);
  window.addEventListener('load', bind);

  console.log('[crop-enhanced] загружен — Cropper.js 1.6.1 + автосжатие (max 1000px, JPEG 0.75)');
})();