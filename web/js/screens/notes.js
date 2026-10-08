// "Lug‘at": every word, instant client-side search (ko / uz / en / ru / choseong ㅅㄱ),
// edit my Uzbek meaning, switch a card off/on. List cached for offline use.
var NotesSearch = {
  /** row: [note_id, ko, meaning_uz, gloss_en, gloss_ru, pos, source, active, state, due] */
  match: function (row, q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return true;
    if (/^[ㄱ-ㅎ]+$/.test(q)) return HV.hangul.getChoseong(row[1]).replace(/\s/g, '').indexOf(q) >= 0;
    return [row[1], row[2], row[3], row[4]].some(function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; });
  },
  status: function (row, now) {
    if (!row[7]) return T.notes.off;
    if (row[8] === null || row[8] === 0) return T.notes.fresh;
    if (row[8] === 1 || row[8] === 3) return T.notes.learning;
    var days = Math.max(0, Math.round((row[9] - now) / 86400000));
    return days ? T.notes.inDays(days) : T.notes.today;
  },
};

var NotesScreen = (function () {
  var KEY = 'hp_notes_v1';
  var LIMIT = 100;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(rows) { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) { /* quota */ } }

  return {
    render: function (el) {
      var rows = load();
      var query = '';
      var open = null;
      el.innerHTML =
        '<h1>' + T.notes.title + '</h1>' +
        '<input id="nq" class="search" type="search" placeholder="' + T.notes.search + '" autocapitalize="off" autocorrect="off" spellcheck="false">' +
        '<p id="ncount" class="small muted"></p><div id="nlist"></div>';
      var list = el.querySelector('#nlist');
      var count = el.querySelector('#ncount');

      function draw() {
        if (!rows) { list.innerHTML = '<p class="muted center">' + T.loading + '</p>'; return; }
        var now = Date.now();
        var hits = rows.filter(function (r) { return NotesSearch.match(r, query); });
        count.textContent = T.notes.count(hits.length, rows.length);
        list.innerHTML = hits.slice(0, LIMIT).map(function (r) {
          var meaning = r[2] || r[3];
          return '<div class="note' + (r[7] ? '' : ' off') + '" data-id="' + esc(r[0]) + '">' +
            '<div class="note-head"><b lang="ko">' + esc(r[1]) + '</b><span class="small muted">' + esc(NotesSearch.status(r, now)) + '</span></div>' +
            '<div class="small' + (r[2] ? '' : ' muted') + '">' + esc(meaning) + '</div>' +
            (open === r[0] ? editor(r) : '') + '</div>';
        }).join('') + (hits.length > LIMIT ? '<p class="small muted center">' + T.notes.more(hits.length - LIMIT) + '</p>' : '');
      }

      function editor(r) {
        return '<div class="note-edit stack">' +
          (r[3] || r[4] ? '<div class="small muted">' + esc([r[3], r[4]].filter(Boolean).join(' · ')) + '</div>' : '') +
          '<input id="nmeaning" type="text" value="' + esc(r[2]) + '" placeholder="' + T.notes.uzPlaceholder + '">' +
          '<div class="row2"><button id="nsave">' + T.notes.save + '</button>' +
          '<button id="ntoggle" class="secondary">' + (r[7] ? T.notes.disable : T.notes.enable) + '</button></div>' +
          '<p id="nmsg" class="small muted"></p></div>';
      }

      function update(r, payload) {
        var msg = el.querySelector('#nmsg');
        msg.textContent = T.notes.saving;
        Api.call('notes.update', Object.assign({ note_id: r[0] }, payload)).then(function (res) {
          r[2] = res.meaning_uz;
          r[7] = res.active;
          save(rows);
          App.patchNote(r[0], { meaning_uz: res.meaning_uz, active: res.active });
          open = null;
          draw();
        }, function (e) { msg.className = 'small error'; msg.textContent = T.errors[e.code] || e.message; });
      }

      list.addEventListener('click', function (ev) {
        var card = ev.target.closest('.note');
        if (!card) return;
        var r = rows.filter(function (x) { return x[0] === card.getAttribute('data-id'); })[0];
        if (ev.target.id === 'nsave') return update(r, { meaning_uz: el.querySelector('#nmeaning').value });
        if (ev.target.id === 'ntoggle') return update(r, { active: !r[7] });
        if (ev.target.closest('.note-edit')) return;
        open = open === r[0] ? null : r[0];
        draw();
        var input = el.querySelector('#nmeaning');
        if (input) input.focus();
      });
      el.querySelector('#nq').addEventListener('input', function (ev) { query = ev.target.value; open = null; draw(); });

      draw();
      Api.call('notes.list').then(function (res) {
        rows = res.rows;
        save(rows);
        if (open === null) draw();
      }, function (e) {
        if (!rows) list.innerHTML = '<p class="center error">' + esc(T.errors[e.code] || e.message) + '</p>';
      });
    },
  };
})();
