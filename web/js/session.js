// Review session ordering (§6.2), pure JS (tested in Node by tools/test-web.mjs):
// due learning cards → due reviews → new cards (≤ NEW_BATCH in learning at once) → learn-ahead.
function Session(boot, srs, opts, now) {
  var t = now === undefined ? Date.now() : now;
  this.srs = srs;
  this.opts = opts;
  this.nextDay = boot.next_day_start;
  // Cards due later today (learning steps) wait in `learning` until their time.
  this.due = boot.due.filter(function (c) { return c.due <= t; });
  this.learning = boot.due.filter(function (c) { return c.due > t; });
  this.fresh = boot.fresh.slice();
  this.introduced = {};
  this.done = 0;
}

Session.prototype.newInLearning = function () {
  var self = this;
  return this.learning.filter(function (c) { return self.introduced[c.card_id] && Number(c.state) !== 2; }).length;
};

/** @return {{card:?Object, waitUntil:?number}} */
Session.prototype.next = function (now) {
  this.learning.sort(function (a, b) { return a.due - b.due; });
  var l = this.learning[0];
  if (l && l.due <= now) return { card: l, waitUntil: null };
  if (this.due.length) return { card: this.due[0], waitUntil: null };
  if (this.fresh.length && this.newInLearning() < this.opts.NEW_BATCH) return { card: this.fresh[0], waitUntil: null };
  if (l && l.due - now <= this.opts.LEARN_AHEAD_MS) return { card: l, waitUntil: null };
  return { card: null, waitUntil: l ? l.due : null };
};

/**
 * Grades locally and returns the review to queue.
 * @return {{card:Object, review:Object}}
 */
Session.prototype.grade = function (card, rating, now, shownAt, reqId) {
  var id = card.card_id;
  var drop = function (arr) { return arr.filter(function (c) { return c.card_id !== id; }); };
  this.due = drop(this.due);
  this.fresh = drop(this.fresh);
  this.learning = drop(this.learning);
  if (Number(card.state) === 0) this.introduced[id] = true;
  var res = this.srs.apply(card, rating, now);
  if (res.row.due < this.nextDay) this.learning.push(res.row);
  this.done++;
  var before = Number(card.state);
  return {
    card: res.row,
    review: {
      req_id: reqId, card_id: id, rating: rating, ts: now,
      duration_ms: Math.max(0, now - shownAt), source: before === 2 ? 'review' : 'learn',
    },
  };
};

Session.prototype.left = function () {
  return { due: this.due.length + this.learning.length, fresh: this.fresh.length };
};

/**
 * Local truth after grading = last server boot + queued reviews. Cached so the next open
 * (or the way back to Home) renders instantly without waiting for Apps Script.
 */
Session.prototype.snapshot = function (boot) {
  var due = this.learning.concat(this.due).sort(function (a, b) { return a.due - b.due; });
  var counts = {};
  for (var k in boot.counts) counts[k] = boot.counts[k];
  counts.due = due.length;
  counts.new_left = this.fresh.length;
  var out = {};
  for (var b in boot) out[b] = boot[b];
  out.due = due;
  out.fresh = this.fresh.slice();
  out.counts = counts;
  return out;
};
