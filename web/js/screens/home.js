var HomeScreen = {
  render: function (el, state) {
    var c = state.boot.counts;
    var examMs = Date.parse(String(state.boot.cfg.exam_date).slice(0, 10) + 'T00:00:00+09:00');
    var examDays = Math.ceil((examMs - Date.now()) / 86400000);
    var total = state.boot.due.length + state.boot.fresh.length;
    var lat = Api.latency();
    el.innerHTML =
      '<h1>' + T.title + '</h1>' +
      (isFinite(examDays) ? '<p class="muted">' + T.examIn(examDays) + '</p>' : '') +
      '<div class="panel stats">' +
        '<div><b>' + c.due + '</b><span class="small muted">' + T.due + '</span></div>' +
        '<div><b>' + c.new_left + '</b><span class="small muted">' + T.fresh + '</span></div>' +
        '<div><b>' + c.inbox_new + '</b><span class="small muted">' + T.inbox + '</span></div>' +
      '</div>' +
      '<div class="stack">' +
        '<button id="go-review"' + (total ? '' : ' disabled') + '>' + T.start(total) + '</button>' +
        '<button id="go-add" class="secondary">' + T.add + '</button>' +
      '</div>' +
      (Queue.size() ? '<p class="small muted center">' + T.pending(Queue.size()) + '</p>' : '') +
      (state.syncing ? '<p class="small muted center">' + T.syncing + '</p>' : '') +
      (state.syncError ? '<p class="small muted center">' + T.offline + '</p>' : '') +
      (lat ? '<p class="small muted center">' + T.latency(lat) + '</p>' : '');
    el.querySelector('#go-review').onclick = function () { App.go('review'); };
    el.querySelector('#go-add').onclick = function () { App.go('add'); };
  },
};
