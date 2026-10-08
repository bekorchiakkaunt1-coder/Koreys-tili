var HelpScreen = {
  render: function (el) {
    el.innerHTML = '<h1>' + T.help.title + '</h1>' + T.help.sections.map(function (s) {
      return '<div class="panel"><b>' + s[0] + '</b><div class="small" style="margin-top:6px">' + s[1] + '</div></div>';
    }).join('') + '<button id="hb" class="secondary">' + T.home + '</button>';
    el.querySelector('#hb').onclick = function () { App.go('home'); };
  },
};
