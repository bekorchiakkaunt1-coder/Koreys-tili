// CORS simple request (§12.5): text/plain string body, no custom headers, redirect followed.
var Api = (function () {
  var LAT_KEY = 'hp_latency';

  function call(action, payload) {
    var tg = window.Telegram && Telegram.WebApp;
    var body = JSON.stringify({ action: action, initData: tg ? tg.initData : '', reqId: uuid(), payload: payload || null });
    var t0 = performance.now();
    return fetch(CONFIG.API_URL, { method: 'POST', body: body })
      .then(function (res) { return res.json(); }, function () { throw apiError('NETWORK'); })
      .then(function (json) {
        recordLatency(action, Math.round(performance.now() - t0));
        if (!json.ok) throw apiError(json.error && json.error.code, json.error && json.error.message);
        return json.data;
      });
  }

  function apiError(code, message) {
    var e = new Error(message || code || 'error');
    e.code = code || 'NETWORK';
    return e;
  }

  function recordLatency(action, ms) {
    try {
      var arr = JSON.parse(localStorage.getItem(LAT_KEY) || '[]');
      arr.push(ms);
      localStorage.setItem(LAT_KEY, JSON.stringify(arr.slice(-50)));
    } catch (e) { /* storage unavailable */ }
  }

  /** @return {?{p50:number, p95:number, n:number}} */
  function latency() {
    try {
      var arr = JSON.parse(localStorage.getItem(LAT_KEY) || '[]').slice().sort(function (a, b) { return a - b; });
      if (!arr.length) return null;
      var q = function (p) { return arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]; };
      return { p50: q(0.5), p95: q(0.95), n: arr.length };
    } catch (e) { return null; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  return { call: call, latency: latency, uuid: uuid };
})();
