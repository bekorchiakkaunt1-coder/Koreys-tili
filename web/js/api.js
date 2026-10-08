// CORS simple request (§12.5): text/plain string body, no custom headers, redirect followed.
var Api = (function () {
  var LAT_KEY = 'hp_latency';

  function call(action, payload) {
    var tg = window.Telegram && Telegram.WebApp;
    var body = JSON.stringify({ action: action, initData: tg ? tg.initData : '', reqId: uuid(), payload: payload || null });
    var t0 = performance.now();
    return fetch(CONFIG.API_URL + '?route=api', { method: 'POST', body: body })
      .then(function (res) {
        return res.json().catch(function () { throw apiError('NETWORK', 'HTTP ' + res.status + ': not JSON'); });
      }, function (err) { throw apiError('NETWORK', String(err && err.message || err)); })
      .then(function (json) {
        recordLatency(Math.round(performance.now() - t0), json.ms);
        if (!json.ok) throw apiError(json.error && json.error.code, json.error && json.error.message);
        return json.data;
      });
  }

  function apiError(code, message) {
    var e = new Error(message || code || 'error');
    e.code = code || 'NETWORK';
    e.detail = message || '';
    return e;
  }

  /** Keeps the last 50 [round trip ms, server ms] pairs (spike §12.12: p50/p95). */
  function recordLatency(ms, serverMs) {
    try {
      var arr = JSON.parse(localStorage.getItem(LAT_KEY) || '[]');
      arr.push([ms, typeof serverMs === 'number' ? serverMs : null]);
      localStorage.setItem(LAT_KEY, JSON.stringify(arr.slice(-50)));
    } catch (e) { /* storage unavailable */ }
  }

  /** @return {?{p50:number, p95:number, server:?number, n:number}} */
  function latency() {
    try {
      var arr = JSON.parse(localStorage.getItem(LAT_KEY) || '[]').map(function (x) { return Array.isArray(x) ? x : [x, null]; });
      if (!arr.length) return null;
      var q = function (xs, p) { xs = xs.slice().sort(function (a, b) { return a - b; }); return xs[Math.min(xs.length - 1, Math.floor(p * xs.length))]; };
      var rt = arr.map(function (x) { return x[0]; });
      var sv = arr.map(function (x) { return x[1]; }).filter(function (x) { return x !== null; });
      return { p50: q(rt, 0.5), p95: q(rt, 0.95), server: sv.length ? q(sv, 0.5) : null, n: arr.length };
    } catch (e) { return null; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  return { call: call, latency: latency, uuid: uuid };
})();
