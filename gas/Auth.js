/**
 * Telegram Mini App initData validation (§12.6, D-04).
 * data_check_string = every field except `hash` (`signature` stays in), sorted, key=value, '\n'.
 * secret = HMAC_SHA256(key='WebAppData', value=botToken); mac = HMAC_SHA256(key=secret, value=dcs).
 * GAS has no mixed String/Byte[] overload: (String, String) for the secret, (Byte[], Byte[]) for the mac.
 */
const Auth = (function () {
  /**
   * Manual parser: URL/URLSearchParams/TextEncoder do not exist in GAS V8.
   * @param {string} initData @return {Object<string,string>}
   */
  function parse(initData) {
    const out = {};
    String(initData || '').split('&').forEach(function (pair) {
      if (!pair) return;
      const i = pair.indexOf('=');
      const k = i < 0 ? pair : pair.slice(0, i);
      const v = i < 0 ? '' : pair.slice(i + 1);
      out[decode(k)] = decode(v);
    });
    return out;
  }

  function decode(s) {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  }

  /** @param {Object<string,string>} fields @return {string} */
  function dataCheckString(fields) {
    return Object.keys(fields)
      .filter(function (k) { return k !== 'hash'; })
      .sort()
      .map(function (k) { return k + '=' + fields[k]; })
      .join('\n');
  }

  function hex(bytes) {
    return bytes.map(function (b) { return (b & 0xff).toString(16).padStart(2, '0'); }).join('');
  }

  /** @return {string} lowercase hex HMAC of the data_check_string */
  function computeHash(fields, botToken) {
    const secret = Utilities.computeHmacSha256Signature(botToken, 'WebAppData');
    const mac = Utilities.computeHmacSha256Signature(Utilities.newBlob(dataCheckString(fields)).getBytes(), secret);
    return hex(mac);
  }

  /**
   * Full check: signature, age, owner.
   * @param {string} initData @param {string} botToken @param {string|number} ownerId
   * @param {number} nowSec @param {number} maxAgeSec
   * @return {{ok:true, user:Object}|{ok:false, code:string}}
   */
  function authorize(initData, botToken, ownerId, nowSec, maxAgeSec) {
    const fields = parse(initData);
    if (!fields.hash || !fields.auth_date || !fields.user) return { ok: false, code: 'AUTH_INVALID' };
    if (!safeEqual_(computeHash(fields, botToken), String(fields.hash).toLowerCase())) {
      return { ok: false, code: 'AUTH_INVALID' };
    }
    if (nowSec - Number(fields.auth_date) > maxAgeSec) return { ok: false, code: 'AUTH_EXPIRED' };
    let user;
    try {
      user = JSON.parse(fields.user);
    } catch (e) {
      return { ok: false, code: 'AUTH_INVALID' };
    }
    if (String(user.id) !== String(ownerId)) return { ok: false, code: 'FORBIDDEN' };
    return { ok: true, user: user };
  }

  return { parse: parse, dataCheckString: dataCheckString, computeHash: computeHash, authorize: authorize };
})();
