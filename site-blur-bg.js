/* ============================================================
   site-blur-bg.js — размытый фон всего сайта через админку.
   Хранит конфиг в localStorage['lfld_site_blur_bg']:
     { url, blur, dark }
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'lfld_site_blur_bg';
  var DEFAULT_BLUR = 10;
  var DEFAULT_DARK = 40;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function ensureLayer() {
    var l = document.getElementById('site-blur-bg');
    if (!l) {
      l = document.createElement('div');
      l.id = 'site-blur-bg';
      document.body.insertBefore(l, document.body.firstChild);
    }
    return l;
  }

  function apply() {
    var cfg = load();
    var layer = ensureLayer();
    if (!cfg || !cfg.url) {
      layer.style.backgroundImage = '';
      layer.style.filter = '';
      layer.style.opacity = '';
      document.body.classList.remove('has-blur-bg');
      return;
    }
    document.body.classList.add('has-blur-bg');
    var blur = (cfg.blur != null) ? +cfg.blur : DEFAULT_BLUR;
    var dark = (cfg.dark != null) ? +cfg.dark : DEFAULT_DARK;
    var bright = Math.max(0.2, 1 - (dark / 100));
    layer.style.backgroundImage = 'url("' + cfg.url + '")';
    layer.style.filter = 'blur(' + blur + 'px) brightness(' + bright + ')';
    layer.style.opacity = '1';
  }

  window.siteBlurBg = {
    apply: apply,
    get: load,
    set: function (url, blur, dark) {
      var cfg = load();
      cfg.url = url || '';
      cfg.blur = (blur != null) ? +blur : DEFAULT_BLUR;
      cfg.dark = (dark != null) ? +dark : DEFAULT_DARK;
      save(cfg);
      apply();
    },
    setBlur: function (b) { var cfg = load(); cfg.blur = +b || 0; save(cfg); apply(); },
    setDark: function (d) { var cfg = load(); cfg.dark = +d || 0; save(cfg); apply(); },
    clear: function () { localStorage.removeItem(KEY); apply(); }
  };

  /* --- Патчим onAdminPanelOpened, чтобы добавить блок настроек --- */
  function renderAdminBlock() {
    var wrap = document.getElementById('siteBlurAdminWrap');
    if (!wrap) {
      var extras = document.getElementById('adminExtrasContainer');
      if (!extras || !extras.parentNode) return;
      wrap = document.createElement('div');
      wrap.id = 'siteBlurAdminWrap';
      extras.parentNode.insertBefore(wrap, extras.nextSibling);
    }

    var cfg = load();
    var currentUrl = cfg.url || '';
    var currentBlur = (cfg.blur != null) ? cfg.blur : DEFAULT_BLUR;
    var currentDark = (cfg.dark != null) ? cfg.dark : DEFAULT_DARK;

    wrap.innerHTML =
      '<div class="admin-extras-section">' +
        '<h3>🌫 Размытый фон всего сайта</h3>' +
        '<p>Загрузите изображение или вставьте ссылку. Настройте размытие и затемнение — применится мгновенно ко всем страницам.</p>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Загрузить файл</label><input type="file" id="sbbFile" accept="image/*"></div>' +
          '<div class="form-group"><label>Или прямая ссылка</label><input type="url" id="sbbUrl" placeholder="https://..." value="' + (currentUrl && currentUrl.indexOf('data:') !== 0 ? currentUrl.replace(/"/g, '&quot;') : '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Размытие (Blur): <span id="sbbBlurVal">' + currentBlur + 'px</span></label>' +
            '<input type="range" id="sbbBlur" min="0" max="20" step="1" value="' + currentBlur + '"></div>' +
          '<div class="form-group"><label>Затемнение (Opacity): <span id="sbbDarkVal">' + currentDark + '%</span></label>' +
            '<input type="range" id="sbbDark" min="10" max="60" step="1" value="' + currentDark + '"></div>' +
        '</div>' +
        '<div id="sbbPreview" style="margin:10px 0;"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
          '<button type="button" class="btn-success" id="sbbApply">Применить</button>' +
          '<button type="button" class="btn-danger" id="sbbClear">Убрать фон</button>' +
        '</div>' +
        '<div class="ai-status" id="sbbStatus"></div>' +
      '</div>';

    var preview = document.getElementById('sbbPreview');
    var previewUrl = currentUrl;

    function renderPreview(u) {
      if (!preview) return;
      preview.innerHTML = u
        ? '<div style="font-size:11px;color:#64748b;margin-bottom:4px;">Текущий фон:</div>' +
          '<img src="' + u + '" style="max-width:240px;max-height:130px;border-radius:8px;border:1px solid #334155;display:block;">'
        : '<span style="color:#64748b;font-size:12px;font-style:italic;">Фон не задан</span>';
    }
    renderPreview(currentUrl);

    document.getElementById('sbbFile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        previewUrl = e.target.result;
        renderPreview(previewUrl);
        document.getElementById('sbbUrl').value = '';
      };
      r.readAsDataURL(f);
    };
    document.getElementById('sbbUrl').oninput = function () {
      if (this.value.trim()) { previewUrl = this.value.trim(); renderPreview(previewUrl); }
    };
    document.getElementById('sbbBlur').oninput = function () {
      document.getElementById('sbbBlurVal').innerText = this.value + 'px';
    };
    document.getElementById('sbbDark').oninput = function () {
      document.getElementById('sbbDarkVal').innerText = this.value + '%';
    };

    document.getElementById('sbbApply').onclick = function () {
      var url = document.getElementById('sbbUrl').value.trim() || previewUrl;
      var blur = document.getElementById('sbbBlur').value;
      var dark = document.getElementById('sbbDark').value;
      if (!url) {
        var st = document.getElementById('sbbStatus');
        if (st) { st.className = 'ai-status show err'; st.innerText = 'Выберите файл или ссылку'; }
        return;
      }
      window.siteBlurBg.set(url, blur, dark);
      var st = document.getElementById('sbbStatus');
      if (st) { st.className = 'ai-status show ok'; st.innerText = 'Фон применён'; }
    };

    document.getElementById('sbbClear').onclick = function () {
      if (!confirm('Убрать размытый фон?')) return;
      window.siteBlurBg.clear();
      previewUrl = '';
      renderPreview('');
      document.getElementById('sbbFile').value = '';
      document.getElementById('sbbUrl').value = '';
      var st = document.getElementById('sbbStatus');
      if (st) { st.className = 'ai-status show ok'; st.innerText = 'Фон убран'; }
    };
  }

  function patchAdmin() {
    var prev = window.onAdminPanelOpened;
    window.onAdminPanelOpened = function () {
      if (typeof prev === 'function') { try { prev(); } catch (e) {} }
      try { renderAdminBlock(); } catch (e) { console.warn('[siteBlurBg:admin]', e); }
    };
  }

  function boot() {
    apply();
    patchAdmin();
    console.log('[site-blur-bg] загружен');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();