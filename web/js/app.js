// Hash router + lifecycle, offline-first: render the cached boot at once, refresh in the
// background (flush queue → bootstrap), never block Home on Apps Script (~2–5 s per call).
var App = (function () {
  var tg = window.Telegram && Telegram.WebApp;
  var el = document.getElementById('app');
  var state = { boot: null, session: null, syncing: false, syncError: null };
  var cleanup = null;
  var current = null;
  var refreshing = null;

  function init() {
    if (!tg || !tg.initData) { el.innerHTML = '<p class="center muted">' + T.noTelegram + '</p>'; return; }
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes(); // swipes must not close the app
    tg.BackButton.onClick(function () { App.go('home'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) Queue.flush().catch(function () {}); });
    if (tg.isVersionAtLeast('8.0')) tg.onEvent('deactivated', function () { Queue.flush().catch(function () {}); });
    window.addEventListener('hashchange', route);

    Queue.load().then(function () {
      var cached = Store.load();
      if (cached && sameDay(cached)) {
        setBoot(cached);
        route();
        refresh();
      } else {
        refresh().then(route, showError);
      }
    });
  }

  function sameDay(boot) {
    try { return Srs.create(boot.cfg).dayKey(Date.now()) === boot.day; } catch (e) { return false; }
  }

  function setBoot(boot) {
    state.boot = boot;
    state.session = new Session(boot, Srs.create(boot.cfg), CONFIG);
  }

  /** Flush queued reviews, then fetch a fresh boot. Applied unless a review is in progress. */
  function refresh() {
    if (refreshing) return refreshing;
    state.syncing = true;
    state.syncError = null;
    if (current === 'home') rerenderHome();
    refreshing = Queue.flush().catch(function () {})
      .then(function () { return Api.call('bootstrap'); })
      .then(function (boot) {
        Store.save(boot);
        if (current !== 'review') setBoot(boot);
      }, function (e) {
        state.syncError = e;
        if (!state.boot) throw e;
      })
      .then(function () {
        state.syncing = false;
        refreshing = null;
        if (current === 'home') rerenderHome();
      }, function (e) {
        state.syncing = false;
        refreshing = null;
        throw e;
      });
    return refreshing;
  }

  function rerenderHome() {
    if (current === 'home' && state.boot) HomeScreen.render(el, state);
  }

  /** Called after every grade: cache local truth so Home and the next open need no network. */
  function saveSession() {
    state.boot = state.session.snapshot(state.boot);
    Store.save(state.boot);
  }

  function route() {
    var name = (location.hash || '#home').slice(1);
    if (!{ home: 1, review: 1, add: 1 }[name]) name = 'home';
    if (cleanup) { cleanup(); cleanup = null; }
    current = name;
    if (name !== 'home') tg.BackButton.show(); else tg.BackButton.hide();
    if (!state.boot) { el.innerHTML = '<p class="muted center">' + T.loading + '</p>'; return; }
    var screen = { home: HomeScreen, review: ReviewScreen, add: AddScreen }[name];
    cleanup = screen.render(el, state) || null;
  }

  function showError(e) {
    el.innerHTML = '<p class="center error">' + esc(T.errors[e && e.code] || (e && e.message) || 'Xato') + '</p>' +
      (e && e.detail ? '<p class="center muted small">' + esc((e.code || '') + ' · ' + e.detail) + '</p>' : '') +
      '<div class="stack"><button id="retry" class="secondary">' + T.retry + '</button></div>';
    el.querySelector('#retry').onclick = function () {
      el.innerHTML = '<p class="muted center">' + T.loading + '</p>';
      refresh().then(route, showError);
    };
  }

  return {
    init: init,
    go: function (name) {
      if (location.hash === '#' + name) route(); else location.hash = name;
      if (name === 'home') refresh().catch(function () {});
    },
    saveSession: saveSession,
    refresh: refresh,
  };
})();

App.init();
