/**
 * ts-fsrs adapter (D-07, §6.1). Pure JS: the same file runs in Apps Script and in the
 * Mini App (web/js/srs.js is a byte-identical copy, checked by tools/test-gas.mjs).
 *
 * Rows store UTC ms. ts-fsrs counts UTC calendar days (flip at 09:00 KST); to move the
 * day boundary to `day_start_hour` KST, every timestamp is shifted by
 * offset = (9 − day_start_hour) h on the way in and shifted back on the way out.
 */
var Srs = (function () {
  var HOUR = 3600000;
  var DAY = 24 * HOUR;
  var KST = 9 * HOUR;

  /** @param {{desired_retention?:number, day_start_hour?:number}} cfg */
  function create(cfg) {
    var F = HV.fsrs;
    var params = F.generatorParameters({
      request_retention: Number(cfg.desired_retention) || 0.9,
      maximum_interval: 36500,
      enable_fuzz: true,
      enable_short_term: true,
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m'],
    });
    var f = F.fsrs(params).useStrategy(F.StrategyMode.SEED, F.GenSeedStrategyWithCardId('card_id'));
    var dayStart = cfg.day_start_hour === undefined || cfg.day_start_hour === '' ? 5 : Number(cfg.day_start_hour);
    var offset = (9 - dayStart) * HOUR;

    function toCard(row) {
      return {
        card_id: String(row.card_id),
        due: new Date(Number(row.due) + offset),
        stability: Number(row.stability) || 0,
        difficulty: Number(row.difficulty) || 0,
        elapsed_days: 0,
        scheduled_days: Number(row.scheduled_days) || 0,
        learning_steps: Number(row.learning_steps) || 0,
        reps: Number(row.reps) || 0,
        lapses: Number(row.lapses) || 0,
        state: Number(row.state) || 0,
        last_review: row.last_review === '' || row.last_review === null || row.last_review === undefined
          ? undefined : new Date(Number(row.last_review) + offset),
      };
    }

    function fromCard(row, c) {
      var out = {};
      for (var k in row) if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
      out.due = c.due.getTime() - offset;
      out.stability = c.stability;
      out.difficulty = c.difficulty;
      out.scheduled_days = c.scheduled_days;
      out.learning_steps = c.learning_steps;
      out.reps = c.reps;
      out.lapses = c.lapses;
      out.state = c.state;
      out.last_review = c.last_review ? c.last_review.getTime() - offset : '';
      return out;
    }

    /** @return {Object<number,{due:number, ivl_ms:number}>} keyed by rating 1–4 */
    function preview(row, nowMs) {
      var rec = f.repeat(toCard(row), new Date(nowMs + offset));
      var out = {};
      [1, 2, 3, 4].forEach(function (r) {
        var due = rec[r].card.due.getTime() - offset;
        out[r] = { due: due, ivl_ms: due - nowMs };
      });
      return out;
    }

    /**
     * @param {Object} row cards row @param {number} rating 1–4 @param {number} nowMs
     * @return {{row:Object, log:Object}} new row + review_log fields (without ids/duration)
     */
    function apply(row, rating, nowMs) {
      if ([1, 2, 3, 4].indexOf(Number(rating)) < 0) throw new Error('rating must be 1–4');
      var res = f.next(toCard(row), new Date(nowMs + offset), Number(rating));
      return {
        row: fromCard(row, res.card),
        log: {
          card_id: row.card_id, note_id: row.note_id, review_ts_utc_ms: nowMs, rating: Number(rating),
          state_before: Number(row.state) || 0, due_before: Number(row.due), s_before: Number(row.stability) || 0,
          d_before: Number(row.difficulty) || 0, s_after: res.card.stability, d_after: res.card.difficulty,
          scheduled_days: res.card.scheduled_days, offset_h: offset / HOUR,
        },
      };
    }

    /** Start of the study day containing nowMs (UTC ms). */
    function dayStartMs(nowMs) {
      var local = nowMs + KST - dayStart * HOUR;
      return Math.floor(local / DAY) * DAY - KST + dayStart * HOUR;
    }

    /** 'YYYY-MM-DD' of the study day containing nowMs. */
    function dayKey(nowMs) {
      return new Date(dayStartMs(nowMs) + KST).toISOString().slice(0, 10);
    }

    return {
      preview: preview, apply: apply, dayKey: dayKey, dayStartMs: dayStartMs,
      nextDayStartMs: function (nowMs) { return dayStartMs(nowMs) + DAY; },
      offsetMs: offset,
    };
  }

  /** Short interval label in Uzbek: 1 daq / 3 soat / 2 kun / 1.5 oy / 2 yil */
  function label(ms) {
    var min = Math.max(1, Math.round(ms / 60000));
    if (min < 60) return min + ' daq';
    if (min < 24 * 60) return Math.round(min / 60) + ' soat';
    var d = Math.round(ms / DAY);
    if (d < 30) return d + ' kun';
    if (d < 365) return (Math.round(d / 3) / 10) + ' oy';
    return (Math.round(d / 36.5) / 10) + ' yil';
  }

  return { create: create, label: label };
})();
