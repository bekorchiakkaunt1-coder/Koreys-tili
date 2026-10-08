// Mini App checks: shared files identical to GAS, all scripts parse, session ordering rules.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
assert.equal(read('web/js/srs.js'), read('gas/Srs.js'), 'web/js/srs.js must be a copy of gas/Srs.js');
assert.equal(read('web/js/vendor/korean-vendor.1.js'), read('gas/00_vendor.js'), 'vendor copies differ');

const files = [
  ...readdirSync(new URL('web/js/', root)).filter((f) => f.endsWith('.js')).map((f) => 'web/js/' + f),
  ...readdirSync(new URL('web/js/screens/', root)).map((f) => 'web/js/screens/' + f),
];
// The Router answers JSON (with CORS headers) only on ?route=api; any other URL gets an empty 200 without them.
assert.match(read('web/js/api.js'), /fetch\(CONFIG\.API_URL \+ '\?route=api'/, 'Mini App must call ?route=api');
assert.equal(read('web/js/config.js').match(/API_URL: '([^']+)'/)[1], read('gas/Config.js').match(/DEFAULT_WEBAPP_URL = '([^']+)'/)[1], 'API_URL == DEFAULT_WEBAPP_URL');
for (const f of files) execFileSync(process.execPath, ['--check', new URL(f, root).pathname]);

const ctx = vm.createContext({});
for (const f of ['web/js/vendor/korean-vendor.1.js', 'web/js/srs.js', 'web/js/session.js']) vm.runInContext(read(f), ctx);
const run = (c) => vm.runInContext(c, ctx);
const srs = run('Srs.create({desired_retention: 0.9, day_start_hour: 5})');
const now = Date.UTC(2026, 9, 13, 1, 0); // 10:00 KST
const nextDay = srs.nextDayStartMs(now);
const mk = (id, state, due) => ({ card_id: id, note_id: 'n' + id, ko: id, due, stability: state ? 5 : 0, difficulty: state ? 5 : 0,
  state, reps: state ? 3 : 0, lapses: 0, learning_steps: 0, scheduled_days: state ? 5 : 0, last_review: state ? due - 5 * 864e5 : '' });
const boot = {
  next_day_start: nextDay,
  due: [mk('r1', 2, now - 1000), mk('r2', 2, now - 500)],
  fresh: Array.from({ length: 7 }, (_, i) => mk('f' + i, 0, now)),
};
ctx.boot = boot; ctx.srs = srs;
const s = run('new Session(boot, srs, {NEW_BATCH: 5, LEARN_AHEAD_MS: 20 * 60000}, ' + now + ')');
let t = now;
const order = [];
const step = (rating) => { const nx = s.next(t); if (!nx.card) return null; order.push(nx.card.card_id); s.grade(nx.card, rating, t, t - 3000, 'q' + order.length); t += 5000; return nx.card; };
step(3); step(3);
assert.deepEqual(order, ['r1', 'r2'], 'due reviews first');
for (let i = 0; i < 5; i++) step(3); // introduce 5 new, each → Learning (10 min step)
assert.deepEqual(order.slice(2), ['f0', 'f1', 'f2', 'f3', 'f4']);
assert.equal(s.newInLearning(), 5);
// 6th new card is held back; learn-ahead shows f0 again (due in ≤ 20 min)
assert.equal(s.next(t).card.card_id, 'f0', 'batch of 5 → learn-ahead instead of f5');
// Graduate all five with Good → f5 becomes available
for (let i = 0; i < 5; i++) { t += 10 * 60000; step(3); }
assert.equal(s.newInLearning(), 0);
assert.equal(s.next(t).card.card_id, 'f5');
// Again on a review card → relearning, comes back after 10 min
const s2 = run('new Session({next_day_start: boot.next_day_start, due: [boot.due[0]], fresh: []}, srs, {NEW_BATCH: 5, LEARN_AHEAD_MS: 0}, ' + now + ')');
const g = s2.grade(s2.next(now).card, 1, now, now - 1000, 'x');
assert.equal(g.review.source, 'review');
assert.equal(s2.next(now).card, null);
assert.ok(s2.next(now).waitUntil > now);
assert.equal(s2.next(now + 10 * 60000).card.card_id, 'r1');
// Snapshot → new Session (cache reload) keeps learning cards time-gated
ctx.snap = s2.snapshot({ ...boot, due: [boot.due[0]], fresh: [], counts: { due: 1, new_left: 0, inbox_new: 0 } });
assert.equal(ctx.snap.counts.due, 1);
const s3 = run('new Session(snap, srs, {NEW_BATCH: 5, LEARN_AHEAD_MS: 0}, ' + now + ')');
assert.equal(s3.next(now).card, null, 'relearning card not shown before its due');
assert.equal(s3.next(now + 10 * 60000).card.card_id, 'r1');
// Lug'at search + status
for (const f of ['web/js/i18n.js', 'web/js/screens/notes.js']) vm.runInContext(read(f), ctx);
const row = (ko, uz, en, state, due, active = true) => ['n', ko, uz, en, '', '명사', 'krdict', active, state, due];
const M = (r, q) => run('NotesSearch').match(r, q);
assert.ok(M(row('사과', 'olma', 'apple'), 'ㅅㄱ'), 'choseong');
assert.ok(!M(row('사과', 'olma', 'apple'), 'ㄱㄷ'));
assert.ok(M(row('사과', 'olma', 'apple'), 'APP'), 'English, case-insensitive');
assert.ok(M(row('사과', 'olma', 'apple'), 'olm') && M(row('사과', '', 'apple'), '사'));
assert.ok(M(row('가다', '', 'go'), '  '), 'empty query matches all');
const S = (r) => run('NotesSearch').status(r, now);
assert.deepEqual([S(row('a', '', '', 0, now)), S(row('a', '', '', 1, now)), S(row('a', '', '', 2, now + 3 * 864e5)), S(row('a', '', '', 2, now, false))],
  ['hali o‘rganilmagan', 'o‘rganilmoqda', '3 kundan keyin', 'o‘chirilgan']);
console.log('web ok: shared files identical, ' + files.length + ' scripts parse, session order/batch/learn-ahead/relearn, lug‘at search/status');
