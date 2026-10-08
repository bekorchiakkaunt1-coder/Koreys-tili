// Last known bootstrap (server boot + local grading), localStorage only — small, sync, per device.
var Store = (function () {
  var KEY = 'hp_boot_v1';
  return {
    load: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
    },
    save: function (boot) {
      try { localStorage.setItem(KEY, JSON.stringify(boot)); } catch (e) { /* quota or disabled */ }
    },
  };
})();
