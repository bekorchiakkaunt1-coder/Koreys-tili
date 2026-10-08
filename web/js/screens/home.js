var HomeScreen = {
  render: function (el, state) {
    var c = state.boot.counts;
    var examDays = Math.ceil((Date.parse(state.boot.cfg.exam_date + 'T00:00:00+09:00') - Date.now()) / 86400000);
    var total = state.boot.due.length + state.boot.fresh.length;
    var lat = Api.latency();
    el.innerHTML =
      '<h1>' + T.title + '</h1>' +
      '<p class="muted">' + T.examIn(examDays) + '</p>' +
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
      (lat ? '<p class="small muted center">' + T.latency(lat.p50, lat.p95, lat.n) + '</p>' : '');
    el.querySelector('#go-review').onclick = function () { App.go('review'); };
    el.querySelector('#go-add').onclick = function () { App.go('add'); };
  },
};
