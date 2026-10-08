/**
 * Mini App API (§14): POST text/plain body {action, initData, reqId, payload}
 * → {ok:true, data} | {ok:false, error:{code, message}}.
 * Auth runs before any SpreadsheetApp.openById (§12.6).
 */
const API_ACTIONS = {
  /** Round-trip / latency spike. */
  ping: function (payload) {
    return { now: Date.now(), echo: payload || null };
  },
  bootstrap: function () { return apiBootstrap_(); },
  'reviews.submit': function (payload) { return apiReviewsSubmit_(payload); },
  'notes.add': function (payload) { return apiNotesAdd_(payload); },
};

/** @param {Object} e @return {Object} */
function handleApi_(e) {
  let body;
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '');
  } catch (err) {
    return apiError_('BAD_REQUEST', 'Body must be JSON');
  }
  const maxAge = Number(CONFIG_DEFAULTS.max_age_initdata_s);
  const auth = Auth.authorize(body.initData, prop_(PROP.BOT_TOKEN) || '', prop_(PROP.OWNER_ID) || '', Math.floor(Date.now() / 1000), maxAge);
  if (!auth.ok) return apiError_(auth.code, auth.code);

  const fn = API_ACTIONS[body.action];
  if (!fn) return apiError_('BAD_REQUEST', 'Unknown action: ' + body.action);
  try {
    return { ok: true, data: fn(body.payload, body.reqId) };
  } catch (err) {
    if (err && err.apiCode) return apiError_(err.apiCode, err.message);
    logError_('api.' + body.action, err);
    return apiError_('INTERNAL', 'Internal error');
  }
}

function apiError_(code, message) {
  return { ok: false, error: { code: code, message: message } };
}
