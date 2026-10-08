/**
 * Single entry point. Two branches with deliberately different return values (§12.1):
 *  - route=tg  → Telegram webhook. MUST return nothing (empty 200). Returning
 *               ContentService output yields a 302 that Telegram treats as failure
 *               and retries for up to 24 h, re-executing doPost every time.
 *  - route=api → Mini App API. Returns ContentService JSON (fetch follows the 302).
 */
function doPost(e) {
  const route = e && e.parameter && e.parameter.route;
  if (route === 'tg') {
    handleWebhook_(e);
    return; // empty 200 — never return ContentService here
  }
  if (route === 'api') {
    // Always answer JSON: an uncaught error yields an HTML page without CORS headers,
    // which the WebView reports only as a network failure.
    const t0 = Date.now();
    let out;
    try {
      out = handleApi_(e);
    } catch (err) {
      logError_('api', err);
      out = { ok: false, error: { code: 'INTERNAL', message: String(err && err.message || err) } };
    }
    if (out.action) logApi_(out, Date.now() - t0); // set only after auth passed: no sheet writes for strangers
    return json_(out);
  }
  return; // unknown route: empty 200, no details
}

function doGet() {
  return HtmlService.createHtmlOutput('ok');
}

/** @param {Object} e */
function handleWebhook_(e) {
  // §12.2: no headers in `e`, so the secret rides in the URL. Check it before any Sheets access.
  const key = prop_(PROP.WEBHOOK_KEY);
  if (!key || !safeEqual_(String(e.parameter.key || ''), key)) return;

  let update;
  try {
    update = JSON.parse(e.postData.contents);
  } catch (err) {
    return;
  }
  if (typeof update.update_id !== 'number') return;

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    console.error('webhook lock timeout', update.update_id);
    return;
  }
  try {
    const last = JSON.parse(prop_(PROP.LAST_UPDATE) || 'null');
    const now = Date.now();
    if (!shouldProcessUpdate_(update.update_id, last, now)) return;
    // Mark before handling: at-most-once. A crash mid-handler must not cause a replay.
    setProp_(PROP.LAST_UPDATE, JSON.stringify({ id: update.update_id, ts: now }));
    Bot.handleUpdate(update);
  } catch (err) {
    logError_('webhook', err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Durable dedupe (§12.3). Telegram ids increase monotonically, but are randomised
 * after a week of inactivity → accept anything once the last update is > 6 days old.
 * @param {number} id @param {?{id:number, ts:number}} last @param {number} nowMs
 * @return {boolean}
 */
function shouldProcessUpdate_(id, last, nowMs) {
  if (!last) return true;
  if (nowMs - last.ts > 6 * 24 * 3600 * 1000) return true;
  return id > last.id;
}

/** @param {Object} obj */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Constant-time string compare. */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** One INFO row per API call (action, ok/code, ms) — latency spike §12.12 and diagnostics. */
function logApi_(out, ms) {
  try {
    Repo.append('logs', [{ ts: Date.now(), level: 'INFO', where: 'api.' + (out.action || ''), msg: out.ok ? 'ok' : out.error.code, ms: ms }]);
  } catch (e) {
    console.error('logs sheet unavailable', e);
  }
}

/** Logs to console and the `logs` sheet (errors only — not a hot path). */
function logError_(where, err) {
  const msg = err && err.stack ? err.stack : String(err);
  console.error(where, msg);
  try {
    Repo.append('logs', [{ ts: Date.now(), level: 'ERROR', where: where, msg: msg.slice(0, 2000), ms: '' }]);
  } catch (e2) {
    console.error('logs sheet unavailable', e2);
  }
}
