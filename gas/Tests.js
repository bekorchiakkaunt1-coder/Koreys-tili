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
  testKrdict_(t);
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

/**
 * krdict response fixtures. Element names follow krdict.py 3.0.2 (secondary source); values
 * are made up for parsing tests only — they are not dictionary data and never enter the DB.
 */
const KRDICT_FIXTURE = {
  en: '<?xml version="1.0" encoding="UTF-8"?><channel><title>t</title><total>3</total><start>1</start><num>100</num>' +
    '<item><target_code>101</target_code><word>사과</word><sup_no>0</sup_no><pronunciation>사과</pronunciation>' +
    '<word_grade>초급</word_grade><pos>명사</pos><sense><sense_order>1</sense_order><definition>과일.</definition>' +
    '<translation><trans_word>apple</trans_word><trans_dfn>A fruit.</trans_dfn></translation></sense></item>' +
    '<item><target_code>102</target_code><word>눈</word><sup_no>1</sup_no><pronunciation>눈</pronunciation>' +
    '<word_grade>초급</word_grade><pos>명사</pos><sense><definition>보는 기관.</definition>' +
    '<translation><trans_word>eye</trans_word><trans_dfn>An organ.</trans_dfn></translation></sense></item>' +
    '<item><target_code>103</target_code><word>눈</word><sup_no>2</sup_no><pronunciation>눈ː</pronunciation>' +
    '<word_grade>초급</word_grade><pos>명사</pos><sense><definition>하얀 것.</definition>' +
    '<translation><trans_word>snow</trans_word><trans_dfn>White &amp; cold.</trans_dfn></translation></sense></item>' +
    '<item><target_code>104</target_code><word>-님</word><sup_no>0</sup_no><word_grade>초급</word_grade><pos>접사</pos>' +
    '<sense><definition>높임.</definition></sense></item>' +
    '<item><target_code>105</target_code><word>국물</word><sup_no>0</sup_no><pronunciation>궁물</pronunciation>' +
    '<word_grade>초급</word_grade><pos>명사</pos><sense><definition>물.</definition>' +
    '<translation><trans_dfn><![CDATA[Liquid in which food has been boiled for a long time and seasoned]]></trans_dfn></translation></sense></item>' +
    '</channel>',
  ru: '<channel><total>3</total><item><target_code>101</target_code><word>사과</word><sense><definition>과일.</definition>' +
    '<translation><trans_word>яблоко</trans_word><trans_dfn>Фрукт.</trans_dfn></translation></sense></item></channel>',
  error: '<?xml version="1.0" encoding="UTF-8"?><error><error_code>020</error_code><message>등록되지 않은 인증키입니다.</message></error>',
};

function testKrdict_(t) {
  const en = Krdict.parse(KRDICT_FIXTURE.en);
  t.eq('krdict: items parsed', en.items.length, 5);
  t.eq('krdict: fields', [en.total, en.items[0].target_code, en.items[0].word, en.items[0].pos, en.items[0].senses[0].translations[0].word],
    [3, '101', '사과', '명사', 'apple']);
  t.eq('krdict: entity decoded', en.items[2].senses[0].translations[0].dfn, 'White & cold.');
  t.eq('krdict: error response', Krdict.parse(KRDICT_FIXTURE.error).error.code, '020');
  const merged = krdictMerge_(en.items, Krdict.parse(KRDICT_FIXTURE.ru).items);
  t.eq('krdict: affix skipped, homographs joined', merged.map(function (m) { return m.ko; }), ['사과', '눈', '국물']);
  t.eq('krdict: EN + RU glosses', [merged[0].gloss_en, merged[0].gloss_ru, merged[1].gloss_en, merged[1].krdict_code], ['apple', 'яблоко', 'eye / snow', '102,103']);
  t.eq('krdict: long definition shortened', merged[2].gloss_en.length <= 58 && /…$/.test(merged[2].gloss_en), true);
  t.eq('krdict: pronunciation kept', merged[2].pron_dict, '궁물');
  t.eq('krdict: tidy duplicates', tidyGloss_('go; travel; go; head for; be bound for'), 'go; travel; head for; be bound for');
  t.eq('krdict: tidy keeps homograph groups', tidyGloss_('душа; характер; сердце; душа / Душа; рука'), 'душа; характер; сердце / рука');
  t.eq('krdict: tidy empty', tidyGloss_(''), '');
  t.eq('krdict: headword from a later sense beats a definition', Krdict.gloss({ senses: [
    { translations: [{ word: '', dfn: 'A pronoun used to indicate the listener when he or she is the same age' }] },
    { translations: [{ word: 'you', dfn: '' }] }] }), 'you');
  t.eq('krdict: query encoding', Krdict.query({ q: '.', level: 'level1', trans_lang: 10 }), 'q=.&level=level1&trans_lang=10');
}
