var ReviewScreen = {
  render: function (el, state) {
    var session = state.session;
    var timer = null;

    function show() {
      clearTimeout(timer);
      var now = Date.now();
      var nx = session.next(now);
      var left = session.left();
      if (!nx.card) {
        Queue.flush().catch(function () {});
        el.innerHTML =
          '<div class="card"><h1>' + T.done + '</h1><p class="muted">' + T.doneSub + '</p>' +
          (nx.waitUntil ? '<p class="muted small">' + T.later(Srs.label(nx.waitUntil - now)) + '</p>' : '') +
          '</div><button id="home" class="secondary">' + T.home + '</button>';
        el.querySelector('#home').onclick = function () { App.go('home'); };
        if (nx.waitUntil) timer = setTimeout(show, Math.max(1000, nx.waitUntil - now - CONFIG.LEARN_AHEAD_MS));
        return;
      }
      var card = nx.card;
      var shownAt = now;
      el.innerHTML =
        '<div class="progress"><span>' + T.left(left.due, left.fresh) + '</span><span>' + session.done + '</span></div>' +
        '<div class="card">' +
          '<div class="ko" lang="ko">' + esc(card.ko) + '</div>' +
          '<div id="back" hidden>' +
            '<div class="meaning">' + esc(card.meaning_uz || card.gloss_en || '') + '</div>' +
            glossLine(card) +
            (card.example_ko ? '<div class="example" lang="ko">' + esc(card.example_ko) + '</div>' : '') +
            (card.example_uz ? '<div class="example muted small">' + esc(card.example_uz) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div id="controls"><button id="reveal">' + T.show + '</button></div>';
      el.querySelector('#reveal').onclick = function () {
        el.querySelector('#back').hidden = false;
        var p = session.srs.preview(card, Date.now());
        el.querySelector('#controls').innerHTML = '<div class="grades">' + [1, 2, 3, 4].map(function (r) {
          return '<button class="g' + r + '" data-r="' + r + '">' + T.grades[r - 1] + '<small>' + Srs.label(p[r].ivl_ms) + '</small></button>';
        }).join('') + '</div>';
        el.querySelectorAll('.grades button').forEach(function (b) {
          b.onclick = function () {
            var res = session.grade(card, Number(b.getAttribute('data-r')), Date.now(), shownAt, Api.uuid());
            Queue.push(res.review);
            App.saveSession();
            haptic();
            show();
          };
        });
      };
    }

    show();
    return function cleanup() { clearTimeout(timer); };
  },
};

/** EN pivot (if Uzbek is primary) + RU + dictionary pronunciation and POS, from krdict (D-27). */
function glossLine(card) {
  var parts = [];
  if (card.meaning_uz && card.gloss_en) parts.push(card.gloss_en);
  if (card.gloss_ru) parts.push(card.gloss_ru);
  var meta = [];
  if (card.pron_dict && card.pron_dict !== card.ko) meta.push('[' + card.pron_dict + ']');
  if (card.pos) meta.push(card.pos);
  return (parts.length ? '<div class="muted small">' + esc(parts.join(' · ')) + '</div>' : '') +
    (meta.length ? '<div class="muted small" lang="ko">' + esc(meta.join(' ')) + '</div>' : '');
}

function esc(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function haptic() {
  var tg = window.Telegram && Telegram.WebApp;
  if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1') && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}
