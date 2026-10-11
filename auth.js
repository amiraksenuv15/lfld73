/* ============================================================
   auth.js — скрытая авторизация ЛФЛД
   Вход: 3 быстрых клика по логотипу (≤500 мс между кликами)
   Логины: admin / lfld
   Пароли: admin.lfld2026 / admin2026 / atom73 / lfld-dimitrovgrad
   ============================================================ */
(function () {
  'use strict';

  var SESSION_KEY = 'isAdminAuth';
  var FAIL_KEY = 'ff_admin_fails';
  var MAX_FAILS = 5;
  var LOCK_MS = 3 * 60 * 1000;

  var CLICK_TARGET = 3;
  var CLICK_WINDOW = 500;

  var VALID_LOGINS = ['admin', 'lfld'];
  var VALID_PASSWORDS = [
    'admin.lfld2026',       // ← новый основной
    'admin2026',
    'atom73',
    'lfld-dimitrovgrad'
  ];

  var clickCount = 0;
  var clickTimer = null;

  function isAuthenticated() { return sessionStorage.getItem(SESSION_KEY) === 'true'; }
  function setSession() { sessionStorage.setItem(SESSION_KEY, 'true'); }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  function getFails() { try { return JSON.parse(localStorage.getItem(FAIL_KEY) || '[]'); } catch (e) { return []; } }
  function saveFails(list) { localStorage.setItem(FAIL_KEY, JSON.stringify(list)); }
  function isLocked() {
    var list = getFails().filter(function (t) { return Date.now() - t < LOCK_MS; });
    saveFails(list);
    return list.length >= MAX_FAILS;
  }
  function lockSecondsLeft() {
    var list = getFails().filter(function (t) { return Date.now() - t < LOCK_MS; });
    if (list.length < MAX_FAILS) return 0;
    return Math.ceil((LOCK_MS - (Date.now() - Math.min.apply(null, list))) / 1000);
  }
  function addFail() { var list = getFails(); list.push(Date.now()); saveFails(list); }

  function tryLogin(login, password) {
    if (isLocked()) return { ok: false, error: 'Слишком много попыток. Подождите ' + lockSecondsLeft() + ' сек.' };
    login = String(login || '').trim().toLowerCase();
    password = String(password || '');
    if (!login || !password) return { ok: false, error: 'Введите логин и пароль' };
    if (VALID_LOGINS.indexOf(login) !== -1 && VALID_PASSWORDS.indexOf(password) !== -1) {
      saveFails([]);
      setSession();
      return { ok: true };
    }
    addFail();
    return { ok: false, error: 'Неверный логин или пароль' };
  }

  function openLoginModal() {
    var m = document.getElementById('adminLoginModal');
    if (!m) return;
    m.style.display = 'flex';
    var err = document.getElementById('adminLoginError');
    if (err) { err.className = 'login-error'; err.innerText = ''; }
    var li = document.getElementById('adminLoginInput');
    var pi = document.getElementById('adminPassInput');
    if (li) li.value = '';
    if (pi) pi.value = '';
    var card = m.querySelector('.admin-login-content');
    if (card) card.classList.remove('shake');
    setTimeout(function () { if (li) li.focus(); }, 60);
  }

  function closeLoginModal() {
    var m = document.getElementById('adminLoginModal');
    if (m) m.style.display = 'none';
  }

  function submitLogin() {
    var li = document.getElementById('adminLoginInput');
    var pi = document.getElementById('adminPassInput');
    var err = document.getElementById('adminLoginError');
    var res = tryLogin(li ? li.value : '', pi ? pi.value : '');
    if (res.ok) {
      closeLoginModal();
      if (typeof window.onAdminAuthSuccess === 'function') window.onAdminAuthSuccess();
      else if (window.showView) window.showView('admin');
    } else {
      if (err) { err.className = 'login-error show'; err.innerText = res.error; }
      var card = document.querySelector('.admin-login-content');
      if (card) { card.classList.add('shake'); setTimeout(function () { card.classList.remove('shake'); }, 500); }
      if (pi) { pi.value = ''; pi.focus(); }
    }
  }

  function onBrandClick() {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);

    if (clickCount >= CLICK_TARGET) {
      clickCount = 0;
      if (isAuthenticated()) {
        if (typeof window.onAdminAuthSuccess === 'function') window.onAdminAuthSuccess();
        else if (window.showView) window.showView('admin');
      } else {
        openLoginModal();
      }
      return;
    }

    clickTimer = setTimeout(function () {
      if (clickCount === 1 && window.showWelcome) window.showWelcome();
      clickCount = 0;
    }, CLICK_WINDOW);
  }

  function logout() {
    if (!confirm('Выйти из админки?')) return;
    clearSession();
    if (window.showView) window.showView('tourney');
    if (typeof window.onAdminPanelClosed === 'function') window.onAdminPanelClosed();
  }

  function checkHash() {
    if (location.hash === '#admin' || location.hash === '#lfld-admin') {
      if (isAuthenticated()) {
        if (typeof window.onAdminAuthSuccess === 'function') window.onAdminAuthSuccess();
        else if (window.showView) window.showView('admin');
      } else openLoginModal();
    }
  }

  window.auth = {
    isAuthenticated: isAuthenticated,
    tryLogin: tryLogin,
    logout: logout,
    openLoginModal: openLoginModal,
    closeLoginModal: closeLoginModal,
    submitLogin: submitLogin
  };

  document.addEventListener('DOMContentLoaded', function () {
    var brand = document.getElementById('brandBtn');
    if (brand) {
      var clone = brand.cloneNode(true);
      brand.parentNode.replaceChild(clone, brand);
      clone.addEventListener('click', onBrandClick);
    }
    var closeBtn = document.getElementById('adminLoginCloseBtn'); if (closeBtn) closeBtn.onclick = closeLoginModal;
    var okBtn = document.getElementById('adminLoginSubmitBtn'); if (okBtn) okBtn.onclick = submitLogin;
    var cancelBtn = document.getElementById('adminLoginCancelBtn'); if (cancelBtn) cancelBtn.onclick = closeLoginModal;
    var modal = document.getElementById('adminLoginModal');
    if (modal) modal.onclick = function (e) { if (e.target === this) closeLoginModal(); };
    var lInput = document.getElementById('adminLoginInput');
    var pInput = document.getElementById('adminPassInput');
    function keyHandler(e) { if (e.key === 'Enter') submitLogin(); }
    if (lInput) lInput.addEventListener('keydown', keyHandler);
    if (pInput) pInput.addEventListener('keydown', keyHandler);
    checkHash();
  });
  window.addEventListener('hashchange', checkHash);

  console.log('[auth] загружен. Логин: admin / Пароль: admin.lfld2026');
})();