// Offline review queue (§12.12): DeviceStorage (Bot API 9.0+) mirrored to localStorage,
// flushed in batches; idempotent on the server via per-review req_id.
var Queue = (function () {
  var KEY = 'hp_review_queue';
  var items = [];
  var flushing = null;
  var backoff = 0;

  function ds() {
    var tg = window.Telegram && Telegram.WebApp;
    return tg && tg.isVersionAtLeast && tg.isVersionAtLeast('9.0') && tg.DeviceStorage ? tg.DeviceStorage : null;
  }

  function persist() {
    var json = JSON.stringify(items);
    try { localStorage.setItem(KEY, json); } catch (e) { /* ignore */ }
    var d = ds();
    if (d) { try { d.setItem(KEY, json, function () {}); } catch (e) { /* ignore */ } }
  }

  /** Loads the persisted queue; resolves with its length. */
  function load() {
    return new Promise(function (resolve) {
      var fromLocal = function () {
        try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { items = []; }
        resolve(items.length);
      };
      var d = ds();
      if (!d) return fromLocal();
      try {
        d.getItem(KEY, function (err, val) {
          if (err || !val) return fromLocal();
          try { items = JSON.parse(val); } catch (e) { return fromLocal(); }
          resolve(items.length);
        });
      } catch (e) { fromLocal(); }
    });
  }

  function push(review) {
    items.push(review);
    persist();
    if (items.length >= CONFIG.FLUSH_EVERY) flush();
  }

  /** Sends everything queued; keeps items on network failure (retried later). */
  function flush() {
    if (flushing) return flushing;
    if (!items.length) return Promise.resolve(0);
    var batch = items.slice(0, 200);
    flushing = Api.call('reviews.submit', { reviews: batch }).then(function (res) {
      var sent = {};
      batch.forEach(function (r) { sent[r.req_id] = true; });
      items = items.filter(function (r) { return !sent[r.req_id]; });
      persist();
      backoff = 0;
      if (res.rejected && res.rejected.length) console.warn('rejected reviews', res.rejected);
      flushing = null;
      return items.length ? flush() : 0;
    }, function (err) {
      flushing = null;
      if (err.code === 'NETWORK' || err.code === 'CONFLICT') {
        backoff = Math.min(backoff ? backoff * 2 : 2000, 60000);
        setTimeout(flush, backoff);
      }
      throw err;
    });
    return flushing;
  }

  return { load: load, push: push, flush: flush, size: function () { return items.length; } };
})();
