/* ============================================================
   crop-enhanced.js — улучшенный визуальный кроппер с превью.
   Перехватывает файловые input'ы админки после каждого рендера.
   ============================================================ */
(function () {
  'use strict';

  function q(id) { return document.getElementById(id); }

  /* =================== КРОППЕР =================== */
  function enhancedCropModal(imageSrc, aspectRatio, onSave) {
    aspectRatio = aspectRatio || (16 / 9);

    var modal = q('cropModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'cropModal';
      modal.innerHTML =
        '<div class="modal-content crop-modal-content">' +
          '<button class="modal-close" id="cropCloseBtn" type="button">✕</button>' +
          '<h2 style="margin:0 0 6px;">Конструктор кадрирования</h2>' +
          '<p style="color:#94a3b8;font-size:12px;margin:0 0 16px;">Перетаскивайте рамку мышью или пальцем. Зум — ползунком ниже. Живое превью внизу.</p>' +
          '<div class="crop-stage" id="cropStage"><canvas id="cropCanvas"></canvas><div class="crop-box" id="cropBox"></div></div>' +
          '<div class="crop-toolbar">' +
            '<label>Масштаб</label>' +
            '<input type="range" id="cropZoom" min="1" max="3" step="0.01" value="1">' +
            '<span class="crop-zoom-val" id="cropZoomVal">100%</span>' +
            '<button type="button" class="btn-secondary" id="cropResetZoom" style="padding:5px 10px!important;font-size:11px;">Сброс</button>' +
          '</div>' +
          '<div class="crop-preview-row">' +
            '<span class="crop-preview-label">Превью (как в шапке):</span>' +
            '<div class="crop-preview-img"><img id="cropPreview" alt=""></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button type="button" class="btn-success" id="cropApplyBtn">Обрезать и применить</button>' +
            '<button type="button" class="btn-secondary" id="cropCancelBtn">Отмена</button>' +
          '</div>' +
          '<div class="crop-hint">Соотношение сторон: <span id="cropAspectLabel"></span></div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';

    var canvas = q('cropCanvas');
    var ctx = canvas.getContext('2d');
    var stage = q('cropStage');
    var box = q('cropBox');
    var zoomInp = q('cropZoom');
    var zoomVal = q('cropZoomVal');
    var preview = q('cropPreview');
    var aspectLabel = q('cropAspectLabel');

    var arText = '16:9';
    if (Math.abs(aspectRatio - 21/9) < 0.02) arText = '21:9';
    else if (Math.abs(aspectRatio - 4/3)  < 0.02) arText = '4:3';
    else if (Math.abs(aspectRatio - 3/4)  < 0.02) arText = '3:4';
    else if (Math.abs(aspectRatio - 1)    < 0.02) arText = '1:1';
    else if (Math.abs(aspectRatio - 16/9) < 0.02) arText = '16:9';
    if (aspectLabel) aspectLabel.innerText = arText;

    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var stageW = stage.clientWidth || 720;
      var maxH = Math.min(window.innerHeight * 0.55, 460);
      var baseScale = Math.min(stageW / img.width, maxH / img.height);

      var cw = Math.round(img.width * baseScale);
      var ch = Math.round(img.height * baseScale);

      canvas.width = cw; canvas.height = ch;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);

      var boxW, boxH;
      if (cw / ch > aspectRatio) {
        boxH = ch * 0.85; boxW = boxH * aspectRatio;
      } else {
        boxW = cw * 0.85; boxH = boxW / aspectRatio;
      }
      var boxX = (cw - boxW) / 2;
      var boxY = (ch - boxH) / 2;
      box.style.left = boxX + 'px';
      box.style.top = boxY + 'px';
      box.style.width = boxW + 'px';
      box.style.height = boxH + 'px';

      updatePreview();

      /* --- Перетаскивание --- */
      var dragging = false, dsX = 0, dsY = 0, bsX = 0, bsY = 0;
      box.addEventListener('mousedown', startDrag);
      box.addEventListener('touchstart', startDrag, { passive: false });

      function startDrag(e) {
        e.preventDefault();
        dragging = true;
        var p = getPointer(e);
        dsX = p.x; dsY = p.y;
        bsX = parseFloat(box.style.left) || 0;
        bsY = parseFloat(box.style.top) || 0;
      }
      function onMove(e) {
        if (!dragging) return;
        e.preventDefault();
        var p = getPointer(e);
        var dx = p.x - dsX, dy = p.y - dsY;
        var bW = parseFloat(box.style.width) || 0;
        var bH = parseFloat(box.style.height) || 0;
        var newX = Math.max(0, Math.min(cw - bW, bsX + dx));
        var newY = Math.max(0, Math.min(ch - bH, bsY + dy));
        box.style.left = newX + 'px';
        box.style.top = newY + 'px';
        updatePreview();
      }
      function endDrag() { dragging = false; }
      function getPointer(e) {
        var r = stage.getBoundingClientRect();
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchend', endDrag);

      /* --- Зум --- */
      zoomInp.oninput = function () {
        var z = parseFloat(this.value) || 1;
        zoomVal.innerText = Math.round(z * 100) + '%';
        var newW = Math.round(cw * z), newH = Math.round(ch * z);
        canvas.width = newW; canvas.height = newH;
        canvas.style.width = newW + 'px';
        canvas.style.height = newH + 'px';
        ctx.clearRect(0, 0, newW, newH);
        ctx.drawImage(img, 0, 0, newW, newH);
        // пропорциональный сдвиг рамки
        var bX = parseFloat(box.style.left) || 0, bY = parseFloat(box.style.top) || 0;
        var bW = parseFloat(box.style.width) || 0, bH = parseFloat(box.style.height) || 0;
        bX = Math.max(0, Math.min(newW - bW * z / (canvas.width / cw), bX));
        bY = Math.max(0, Math.min(newH - bH, bY));
        box.style.left = bX + 'px';
        box.style.top = bY + 'px';
        box.style.width = (bW * z) + 'px';
        box.style.height = (bH * z) + 'px';
        cw = newW; ch = newH;
        updatePreview();
      };
      q('cropResetZoom').onclick = function () { zoomInp.value = 1; zoomInp.oninput(); };

      /* --- Превью --- */
      function updatePreview() {
        try {
          var bX = parseFloat(box.style.left) || 0;
          var bY = parseFloat(box.style.top) || 0;
          var bW = parseFloat(box.style.width) || 0;
          var bH = parseFloat(box.style.height) || 0;
          var sx = img.width / cw;
          var sy = img.height / ch;
          var pc = document.createElement('canvas');
          pc.width = 480;
          pc.height = Math.round(480 / aspectRatio);
          var pctx = pc.getContext('2d');
          pctx.imageSmoothingQuality = 'high';
          pctx.drawImage(img, bX * sx, bY * sy, bW * sx, bH * sy, 0, 0, pc.width, pc.height);
          preview.src = pc.toDataURL('image/jpeg', 0.75);
        } catch (e) { console.warn('[crop preview]', e); }
      }

      /* --- Применение --- */
      q('cropApplyBtn').onclick = function () {
        try {
          var bX = parseFloat(box.style.left) || 0;
          var bY = parseFloat(box.style.top) || 0;
          var bW = parseFloat(box.style.width) || 0;
          var bH = parseFloat(box.style.height) || 0;
          var sx = img.width / cw;
          var sy = img.height / ch;
          var outW = 1280;
          var outH = Math.round(outW / aspectRatio);
          var oc = document.createElement('canvas');
          oc.width = outW; oc.height = outH;
          var octx = oc.getContext('2d');
          octx.imageSmoothingQuality = 'high';
          octx.drawImage(img, bX * sx, bY * sy, bW * sx, bH * sy, 0, 0, outW, outH);
          var dataUrl = oc.toDataURL('image/jpeg', 0.85);
          if (typeof onSave === 'function') onSave(dataUrl);
          closeCrop();
        } catch (e) {
          console.error('[crop apply]', e);
          alert('Ошибка обрезки. Попробуйте другое изображение.');
        }
      };

      function closeCrop() {
        modal.style.display = 'none';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
      }
      q('cropCloseBtn').onclick = closeCrop;
      q('cropCancelBtn').onclick = closeCrop;
      modal.onclick = function (e) { if (e.target === modal) closeCrop(); };
    };
    img.onerror = function () { alert('Не удалось загрузить изображение'); modal.style.display = 'none'; };
    img.src = imageSrc;
  }

  window.__openCropModal = enhancedCropModal;

  /* ============================================================
     Перезавешивание input[type=file] в админке на новый кроппер
     Работает с блоками: командное фото, баннер главной, фото игрока
     ============================================================ */
  function rehookAdminFileInputs() {
    /* Командное фото: cmpFileInput (16:9) */
    var cmp = q('cmpFileInput');
    if (cmp && !cmp.__enhanced) {
      cmp.__enhanced = true;
      cmp.onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        var clubSel = q('cmpClubSelect');
        var club = clubSel ? clubSel.value : '';
        if (!club) { alert('Сначала выберите клуб'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          enhancedCropModal(e.target.result, 16 / 9, function (cropped) {
            var map = {};
            try { map = JSON.parse(localStorage.getItem('ff_club_main_photo') || '{}'); } catch (err) {}
            map[club] = cropped;
            try { localStorage.setItem('ff_club_main_photo', JSON.stringify(map)); } catch (err) {}
            alert('Фото команды сохранено!');
            if (window.renderAdminExtras) window.renderAdminExtras();
          });
        };
        reader.readAsDataURL(f);
        this.value = '';
      };
    }

    /* Баннер главной: bannerFileInput (21:9) */
    var bf = q('bannerFileInput');
    if (bf && !bf.__enhanced) {
      bf.__enhanced = true;
      bf.onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          enhancedCropModal(e.target.result, 21 / 9, function (cropped) {
            if (window.bannerManager) window.bannerManager.addSlide(cropped);
            if (window.renderAdminExtras) window.renderAdminExtras();
            alert('Баннер добавлен');
          });
        };
        reader.readAsDataURL(f);
        this.value = '';
      };
    }

    /* Фото игрока: pePhotoFile (3:4) */
    var pf = q('pePhotoFile');
    if (pf && !pf.__enhanced) {
      pf.__enhanced = true;
      pf.onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          enhancedCropModal(e.target.result, 3 / 4, function (cropped) {
            if (window.database && window.database.updatePlayer) {
              var pid = (window.__cropEditPlayerId || null);
              if (pid) window.database.updatePlayer(pid, { photo: cropped });
              var prev = q('pePhotoPreview');
              if (prev) prev.innerHTML = '<img src="' + cropped + '" style="width:100%;height:100%;object-fit:cover;">';
            }
          });
        };
        reader.readAsDataURL(f);
        this.value = '';
      };
    }
  }

  /* Патчим onAdminPanelOpened, чтобы хук срабатывал после каждого рендера */
  function patch() {
    var prev = window.onAdminPanelOpened;
    window.onAdminPanelOpened = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      setTimeout(rehookAdminFileInputs, 80);
    };
  }

  function boot() {
    patch();
    // Пробуем сразу, если админка уже открыта
    setTimeout(rehookAdminFileInputs, 400);
    console.log('[crop-enhanced] загружен — __openCropModal переопределён');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();