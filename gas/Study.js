/**
 * Study API actions (Phase 1): bootstrap, reviews.submit, notes.add.
 * Grading happens in the Mini App; the server re-applies every review with the same
 * Srs adapter (same bundle, same fuzz seed) and persists the result (D-07).
 */
const NOTE_FIELDS = ['ko', 'meaning_uz', 'gloss_en', 'gloss_ru', 'pos', 'hanja', 'pron_dict', 'example_ko', 'example_uz', 'audio_url'];
const MAX_DUE_BATCH = 500;

/** @return {{cfg:Object, srs:Object}} */
function studyContext_() {
  const cfg = getConfig_();
  return { cfg: cfg, srs: Srs.create(cfg) };
}

function strip_(row) {
  const o = {};
  Object.keys(row).forEach(function (k) { if (k !== '_row') o[k] = row[k]; });
  return o;
}

/** Due batch + today's new cards + counts, in one call (§12.12). */
function apiBootstrap_() {
  const ctx = studyContext_();
  const now = Date.now();
  const nextDay = ctx.srs.nextDayStartMs(now);
  const today = ctx.srs.dayKey(now);

  const notes = {};
  Repo.readAll('notes').forEach(function (n) { if (n.active !== false && n.active !== 'FALSE') notes[n.note_id] = n; });
  const stats = Repo.findBy('daily_stats', 'date', today);
  const newToday = stats ? Number(stats.new) || 0 : 0;
  const reviewsToday = stats ? Number(stats.reviews) || 0 : 0;
  const newLimit = Math.max(0, Number(ctx.cfg.new_per_day) - newToday);

  const due = [];
  const fresh = [];
  Repo.readAll('cards').forEach(function (c) {
    if (c.suspended === true || c.suspended === 'TRUE' || !notes[c.note_id]) return;
    if (c.buried_until && Number(c.buried_until) > now) return;
    if (Number(c.state) === 0) fresh.push(c);
    else if (Number(c.due) < nextDay) due.push(c);
  });
  due.sort(function (a, b) { return Number(a.due) - Number(b.due); });
  // §6.3 order: my own words (Ibrat, captures, manual) first, then krdict 초급 by popularity (row order).
  const rank = function (c) { return notes[c.note_id].source === 'krdict' ? 1 : 0; };
  fresh.sort(function (a, b) { return rank(a) - rank(b) || a._row - b._row; });

  const withNote = function (c) {
    const o = strip_(c);
    const n = notes[c.note_id];
    NOTE_FIELDS.forEach(function (f) { o[f] = n[f]; });
    o.gloss_en = tidyGloss_(o.gloss_en);
    o.gloss_ru = tidyGloss_(o.gloss_ru);
    return o;
  };
  const inboxNew = Repo.column('inbox', 'status').filter(function (s) { return s === 'new'; }).length;

  return {
    now: now,
    day: today,
    next_day_start: nextDay,
    cfg: {
      desired_retention: Number(ctx.cfg.desired_retention),
      day_start_hour: Number(ctx.cfg.day_start_hour),
      new_per_day: Number(ctx.cfg.new_per_day),
      params_version: ctx.cfg.params_version,
      exam_date: ctx.cfg.exam_date,
    },
    due: due.slice(0, MAX_DUE_BATCH).map(withNote),
    fresh: fresh.slice(0, newLimit).map(withNote),
    counts: {
      due: due.length, new_left: Math.min(newLimit, fresh.length), new_pool: fresh.length,
      new_today: newToday, reviews_today: reviewsToday, inbox_new: inboxNew,
    },
  };
}

/**
 * Batch of graded reviews, idempotent per review `req_id` (§12.3).
 * payload.reviews: [{req_id, card_id, rating, ts, duration_ms}]
 */
function apiReviewsSubmit_(payload) {
  const reviews = (payload && payload.reviews) || [];
  if (!Array.isArray(reviews) || reviews.length > 500) throw apiErr_('BAD_REQUEST', 'reviews: array ≤ 500');
  return withLock_(function () {
    const ctx = studyContext_();
    const now = Date.now();
    const seen = {};
    Repo.column('review_log', 'req_id').forEach(function (r) { seen[String(r)] = true; });
    const cards = {};
    Repo.readAll('cards').forEach(function (c) { cards[c.card_id] = c; });

    const logs = [];
    const changed = {};
    const rejected = [];
    const perDay = {};
    let duplicates = 0;
    reviews.slice().sort(function (a, b) { return Number(a.ts) - Number(b.ts); }).forEach(function (rv) {
      const reqId = String(rv.req_id || '');
      if (!reqId) { rejected.push({ req_id: reqId, reason: 'no req_id' }); return; }
      if (seen[reqId]) { duplicates++; return; }
      const card = cards[rv.card_id];
      const ts = Number(rv.ts);
      if (!card) { rejected.push({ req_id: reqId, reason: 'unknown card' }); return; }
      if (!(ts > 0) || ts > now + 5 * 60000) { rejected.push({ req_id: reqId, reason: 'bad ts' }); return; }
      if (card.last_review !== '' && ts < Number(card.last_review)) { rejected.push({ req_id: reqId, reason: 'stale' }); return; }
      if ([1, 2, 3, 4].indexOf(Number(rv.rating)) < 0) { rejected.push({ req_id: reqId, reason: 'bad rating' }); return; }

      const res = ctx.srs.apply(card, Number(rv.rating), ts);
      res.row._row = card._row;
      cards[rv.card_id] = res.row;
      changed[rv.card_id] = res.row;
      seen[reqId] = true;
      const dur = Math.max(0, Math.min(Number(rv.duration_ms) || 0, 10 * 60000));
      logs.push(Object.assign(res.log, {
        log_id: newId_('r'), req_id: reqId, duration_ms: dur, source: rv.source === 'learn' ? 'learn' : 'review',
        params_version: ctx.cfg.params_version,
      }));
      const day = ctx.srs.dayKey(ts);
      const d = perDay[day] || (perDay[day] = { reviews: 0, new: 0, ms: 0 });
      d.reviews++;
      d.ms += dur;
      if (res.log.state_before === 0) d.new++;
    });

    const changedRows = Object.keys(changed).map(function (k) { return changed[k]; });
    Repo.writeRows('cards', changedRows);
    Repo.append('review_log', logs);
    bumpDailyStats_(perDay);
    return {
      accepted: logs.length, duplicates: duplicates, rejected: rejected,
      cards: changedRows.map(strip_),
    };
  });
}

/** Increments daily_stats per study day (hot paths never read review_log). */
function bumpDailyStats_(perDay) {
  const days = Object.keys(perDay);
  if (!days.length) return;
  const rows = {};
  Repo.readAll('daily_stats').forEach(function (r) { rows[String(r.date)] = r; });
  const fresh = [];
  days.forEach(function (day) {
    const d = perDay[day];
    const r = rows[day];
    const add = { reviews: d.reviews, new: d.new, srs_min: Math.round(d.ms / 600) / 100 };
    if (r) {
      Repo.writeRows('daily_stats', [Object.assign(r, {
        reviews: (Number(r.reviews) || 0) + add.reviews,
        new: (Number(r.new) || 0) + add.new,
        srs_min: Math.round(((Number(r.srs_min) || 0) + add.srs_min) * 100) / 100,
      })]);
    } else {
      fresh.push({ date: day, reviews: add.reviews, new: add.new, srs_min: add.srs_min, mvd_done: false, build_min: 0 });
    }
  });
  Repo.append('daily_stats', fresh);
}

/** Mini App Add screen: same `ko - uz` syntax as the bot. */
function apiNotesAdd_(payload) {
  const parsed = Bot.parseAdd(payload && payload.text);
  if (!parsed) throw apiErr_('BAD_REQUEST', 'Format: 사과 - olma (har qatorda bitta)');
  return withLock_(function () {
    const res = Notes.addBulk(parsed.items, 'manual');
    return { added: res.added, dup: res.dup, bad: parsed.bad };
  });
}

function apiErr_(code, message) {
  const e = new Error(message);
  e.apiCode = code;
  return e;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    throw apiErr_('CONFLICT', 'Busy, retry');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * All notes in a compact form for the Mini App "Lug‘at" screen (searched client-side, offline).
 * Row: [note_id, ko, meaning_uz, gloss_en, gloss_ru, pos, source, active, card_state, card_due].
 */
function apiNotesList_() {
  const cards = {};
  Repo.readAll('cards').forEach(function (c) {
    if (c.kind === 'recog' || !cards[c.note_id]) cards[c.note_id] = c;
  });
  const rows = Repo.readAll('notes').map(function (n) {
    const c = cards[n.note_id];
    const active = !(n.active === false || n.active === 'FALSE');
    return [n.note_id, String(n.ko), String(n.meaning_uz || ''), tidyGloss_(n.gloss_en), tidyGloss_(n.gloss_ru),
      String(n.pos || ''), String(n.source || ''), active, c ? Number(c.state) || 0 : null, c ? Number(c.due) || 0 : null];
  });
  const rank = function (r) { return r[6] === 'krdict' ? 1 : 0; };
  rows.sort(function (a, b) { return rank(a) - rank(b); });
  return { rows: rows };
}

/** Edits my Uzbek meaning and/or (de)activates a note. payload: {note_id, meaning_uz?, active?} */
function apiNotesUpdate_(payload) {
  const id = payload && payload.note_id;
  if (!id) throw apiErr_('BAD_REQUEST', 'note_id required');
  return withLock_(function () {
    const note = Repo.findBy('notes', 'note_id', id);
    if (!note) throw apiErr_('BAD_REQUEST', 'Unknown note');
    const fields = { updated_at: Date.now() };
    if (typeof payload.meaning_uz === 'string') {
      const m = payload.meaning_uz.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 200);
      fields.meaning_uz = m;
      fields.meaning_uz_status = m ? 'own' : 'none';
    }
    if (typeof payload.active === 'boolean') fields.active = payload.active;
    Repo.writeRows('notes', [Object.assign(note, fields)]);
    return { note_id: id, meaning_uz: note.meaning_uz, active: note.active === true || note.active === 'TRUE' };
  });
}
