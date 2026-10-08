/**
 * Pure-JS suites, runnable in the GAS editor (runAllTests) and in Node (tools/test-gas.mjs).
 * Oracles are independent (§10): the initData vector comes from the master prompt §12.6,
 * FSRS values from ts-fsrs itself.
 */
const AUTH_VECTOR = {
  token: '1234567890:AAFakeTokenForUnitTestsOnly_DoNotUse',
  initData: 'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Kobiljon%22%2C%22last_name%22%3A%22%ED%95%9C%EA%B0%95%22%2C%22username%22%3A%22test_user%22%2C%22language_code%22%3A%22uz%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1790985600&signature=dGVzdC1zaWduYXR1cmUtbm90LXJlYWw&hash=b45182fcd2df074236293c02f588b6160182c86a755914fb348ffa00172700e0',
  wrongHash: '6974adf3805d1c9aa0320b8ad68acecef01b07cba35939f5e4ada71b20ff8082',
  owner: 123456789,
  authDate: 1790985600,
};

function runAllTests() {
  const t = testRunner_();
  testAuth_(t);
  testDedupe_(t);
  testParseAdd_(t);
  testNewCard_(t);
  testSrs_(t);
  return t.done();
}

function testRunner_() {
  let pass = 0;
  const fails = [];
  return {
    eq: function (name, got, want) {
      if (JSON.stringify(got) === JSON.stringify(want)) { pass++; return; }
      fails.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
    },
    done: function () {
      fails.forEach(function (f) { console.error('✗ ' + f); });
      console.log(pass + ' passed, ' + fails.length + ' failed');
      return fails.length === 0;
    },
  };
}

function testAuth_(t) {
  const v = AUTH_VECTOR;
  const now = v.authDate + 60;
  const fields = Auth.parse(v.initData);
  t.eq('auth: hash with signature in dcs', Auth.computeHash(fields, v.token), fields.hash);
  t.eq('auth: valid', Auth.authorize(v.initData, v.token, v.owner, now, 86400).ok, true);
  t.eq('auth: user parsed', Auth.authorize(v.initData, v.token, v.owner, now, 86400).user.last_name, '한강');
  t.eq('auth: signature-excluded hash fails', Auth.authorize(v.initData.replace(/hash=[0-9a-f]+/, 'hash=' + v.wrongHash), v.token, v.owner, now, 86400).code, 'AUTH_INVALID');
  t.eq('auth: tampered field fails', Auth.authorize(v.initData.replace('Kobiljon', 'Kobiljom'), v.token, v.owner, now, 86400).code, 'AUTH_INVALID');
  t.eq('auth: wrong token fails', Auth.authorize(v.initData, v.token + 'x', v.owner, now, 86400).code, 'AUTH_INVALID');
  t.eq('auth: expired', Auth.authorize(v.initData, v.token, v.owner, v.authDate + 86401, 86400).code, 'AUTH_EXPIRED');
  t.eq('auth: other user', Auth.authorize(v.initData, v.token, 999, now, 86400).code, 'FORBIDDEN');
  t.eq('auth: empty', Auth.authorize('', v.token, v.owner, now, 86400).code, 'AUTH_INVALID');
}

function testDedupe_(t) {
  const day = 24 * 3600 * 1000;
  const now = 1790985600000;
  t.eq('dedupe: first ever', shouldProcessUpdate_(5, null, now), true);
  t.eq('dedupe: newer', shouldProcessUpdate_(6, { id: 5, ts: now - 1000 }, now), true);
  t.eq('dedupe: same id', shouldProcessUpdate_(5, { id: 5, ts: now - 1000 }, now), false);
  t.eq('dedupe: older id', shouldProcessUpdate_(4, { id: 5, ts: now - 1000 }, now), false);
  t.eq('dedupe: >6 days idle accepts random id', shouldProcessUpdate_(3, { id: 5, ts: now - 7 * day }, now), true);
}

function testParseAdd_(t) {
  t.eq('add: one', Bot.parseAdd('사과 - olma'), { items: [{ ko: '사과', uz: 'olma' }], bad: [] });
  t.eq('add: bulk + en dash + dup + spaces', Bot.parseAdd('사과 - olma\n  책   –  kitob \n사과 - olma'),
    { items: [{ ko: '사과', uz: 'olma' }, { ko: '책', uz: 'kitob' }], bad: [] });
  t.eq('add: phrase with hyphen in meaning', Bot.parseAdd('얼마예요? - qancha turadi? - narx'),
    { items: [{ ko: '얼마예요?', uz: 'qancha turadi? - narx' }], bad: [] });
  t.eq('add: bad line reported', Bot.parseAdd('사과 - olma\nbu nima'), { items: [{ ko: '사과', uz: 'olma' }], bad: ['bu nima'] });
  t.eq('add: plain capture is not add', Bot.parseAdd('카드 돼요?'), null);
  t.eq('add: korean on both sides is capture', Bot.parseAdd('딸기 - 많이 달아요'), null);
  t.eq('add: no hangul is capture', Bot.parseAdd('salom - hi'), null);
  t.eq('add: empty', Bot.parseAdd(''), null);
}

function testNewCard_(t) {
  const row = newCardRow_('c1', 'n1', 'recog', Date.UTC(2026, 9, 12, 0, 30));
  t.eq('card: new state/due', [row.state, row.reps, row.lapses, row.due], [0, 0, 0, Date.UTC(2026, 9, 12, 0, 30)]);
  t.eq('card: no elapsed_days', 'elapsed_days' in row, false);
}

/** Oracle: §10 day-boundary vector (S=10 reviewed 01:30 KST) and ts-fsrs determinism. */
function testSrs_(t) {
  const H = 3600000;
  const kst = function (d, h, m) { return Date.UTC(2026, 9, d, h, m) - 9 * H; };
  const srs = Srs.create({ desired_retention: 0.9, day_start_hour: 5 });
  const last = kst(12, 1, 30);
  const row = { card_id: 'c1', note_id: 'n1', due: last + 240 * H, stability: 10, difficulty: 5, state: 2, reps: 5,
    lapses: 0, learning_steps: 0, scheduled_days: 10, last_review: last };
  const s = function (h, m) { return Math.round(srs.apply(row, 3, kst(12, h, m)).row.stability * 1000) / 1000; };
  t.eq('srs: 04:30 KST same study day', s(4, 30), 10);
  t.eq('srs: 08:30 KST new study day', s(8, 30), 13.047);
  t.eq('srs: dayKey before/after 05:00', [srs.dayKey(kst(12, 4, 59)), srs.dayKey(kst(12, 5, 0))], ['2026-10-11', '2026-10-12']);
  t.eq('srs: next day start', srs.nextDayStartMs(kst(12, 1, 30)), kst(12, 5, 0));

  const fresh = { card_id: 'cA', note_id: 'n', due: last, stability: 0, difficulty: 0, state: 0, reps: 0, lapses: 0,
    learning_steps: 0, scheduled_days: 0, last_review: '' };
  const p = srs.preview(fresh, last);
  t.eq('srs: new previews Again/Hard/Good (min)', [1, 2, 3].map(function (r) { return Math.round(p[r].ivl_ms / 60000); }), [1, 6, 10]);
  const run = function (inst, id) {
    let r = Object.assign({}, fresh, { card_id: id });
    let ts = last;
    const out = [];
    for (let i = 0; i < 8; i++) { r = inst.apply(r, 3, ts).row; out.push(r.due); ts = r.due; }
    return out;
  };
  const other = Srs.create({ desired_retention: 0.9, day_start_hour: 5 });
  t.eq('srs: fuzz identical across instances', run(srs, 'cA'), run(other, 'cA'));
  t.eq('srs: fuzz depends on card_id', JSON.stringify(run(srs, 'cA')) !== JSON.stringify(run(srs, 'cB')), true);
  const a = srs.apply(fresh, 1, last);
  t.eq('srs: log fields', [a.log.rating, a.log.state_before, a.log.offset_h, 'elapsed_days' in a.row], [1, 0, 4, false]);
  t.eq('srs: labels', [60000, 600000, 3 * H, 48 * H, 45 * 24 * H].map(Srs.label), ['1 daq', '10 daq', '3 soat', '2 kun', '1.5 oy']);
}
