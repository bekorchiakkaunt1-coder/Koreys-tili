var AddScreen = {
  render: function (el) {
    el.innerHTML =
      '<h1>' + T.add + '</h1>' +
      '<p class="muted small">' + T.addHint + '</p>' +
      '<textarea id="add-text" placeholder="사과 - olma&#10;책 - kitob" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>' +
      '<div class="stack"><button id="add-btn">' + T.addBtn + '</button></div>' +
      '<p id="add-out" class="small" style="white-space:pre-line"></p>';
    var btn = el.querySelector('#add-btn');
    var out = el.querySelector('#add-out');
    btn.onclick = function () {
      var text = el.querySelector('#add-text').value;
      if (!text.trim()) return;
      btn.disabled = true;
      Api.call('notes.add', { text: text }).then(function (r) {
        out.className = 'small';
        out.textContent = T.added(r);
        el.querySelector('#add-text').value = '';
        App.refresh().catch(function () {});
      }, function (e) {
        out.className = 'small error';
        out.textContent = T.errors[e.code] || e.message;
      }).then(function () { btn.disabled = false; });
    };
  },
};
