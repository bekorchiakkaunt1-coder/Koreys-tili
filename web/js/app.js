// Hash router + lifecycle. Flush queue first, then bootstrap (one call, §12.12).
var App = (function () {
  var tg = window.Telegram && Telegram.WebApp;
  var el = document.getElementById('app');
  var state = { boot: null, session: null };
  var cleanup = null;
  var stale = false;

  function init() {
    if (!tg || !tg.initData) { el.innerHTML = '<p class="center muted">' + T.noTelegram + '</p>'; return; }
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes(); // swipes must not close the app
    tg.BackButton.onClick(function () { App.go('home'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) Queue.flush().catch(function () {}); });
    if (tg.isVersionAtLeast('8.0')) tg.onEvent('deactivated', function () { Queue.flush().catch(function () {}); });
    window.addEventListener('hashchange', route);

    Queue.load()
      .then(function () { return Queue.flush().catch(function () {}); })
      .then(loadBoot)
      .then(route, showError);
  }

  function loadBoot() {
    return Api.call('bootstrap').then(function (boot) {
      state.boot = boot;
      state.session = new Session(boot, Srs.create(boot.cfg), CONFIG);
      stale = false;
    });
  }

  function route() {
    var name = (location.hash || '#home').slice(1);
    if (cleanup) { cleanup(); cleanup = null; }
    if (name !== 'home') tg.BackButton.show(); else tg.BackButton.hide();
    if (name === 'home' && stale) {
      el.innerHTML = '<p class="muted center">' + T.loading + '</p>';
      Queue.flush().catch(function () {}).then(loadBoot).then(function () { HomeScreen.render(el, state); }, showError);
      return;
    }
    var screen = { home: HomeScreen, review: ReviewScreen, add: AddScreen }[name] || HomeScreen;
    cleanup = screen.render(el, state) || null;
  }

  function showError(e) {
    el.innerHTML = '<p class="center error">' + esc(T.errors[e && e.code] || (e && e.message) || 'Xato') + '</p>';
  }

  return {
    init: init,
    go: function (name) {
      if (name === 'home') stale = true;
      if (location.hash === '#' + name) route(); else location.hash = name;
    },
    invalidate: function () { stale = true; },
  };
})();

App.init();
