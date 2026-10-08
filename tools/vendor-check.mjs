// Loads gas/00_vendor.js in a module-less vm sandbox (like Apps Script global scope)
// and re-checks the Phase 0 spike vectors recorded in docs/STATE.md.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../gas/00_vendor.js', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(src, ctx);
const HV = ctx.HV;

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

// FSRS: new card, no fuzz
const { fsrs, createEmptyCard, generatorParameters, Rating, State } = HV.fsrs;
const f = fsrs(generatorParameters({ enable_fuzz: false }));
const t0 = new Date('2026-10-12T00:30:00Z'); // 09:30 KST
const card = createEmptyCard(t0);
const rec = f.repeat(card, t0);
const mins = (r) => Math.round((r.card.due - t0) / 60000);
eq('new Again (min)', mins(rec[Rating.Again]), 1);
eq('new Hard (min)', mins(rec[Rating.Hard]), 6);
eq('new Good (min)', mins(rec[Rating.Good]), 10);
const easy = rec[Rating.Easy].card;
eq('new Easy → Review, S, days', [easy.state === State.Review, +easy.stability.toFixed(2), easy.scheduled_days], [true, 8.3, 8]);
const t1 = new Date(t0.getTime() + 10 * 60000);
const gg = f.next(rec[Rating.Good].card, t1, Rating.Good).card;
eq('Good→Good(+10m) → Review, S, days', [gg.state === State.Review, +gg.stability.toFixed(2), gg.scheduled_days], [true, 2.31, 2]);

// Conjugation (D-29 entry)
const { conjugate } = HV.conj;
eq('conj exported', typeof conjugate, 'function');

// Pronunciation
const pr = (w) => HV.getPronunciation(w);
for (const [w, want] of [['국물','궁물'],['신라','실라'],['같이','가치'],['좋다','조타'],['읽다','익따'],['한국어','한구거'],['감기','감기'],['감사합니다','감사함니다'],['읽고','일꼬']]) {
  eq(`pron ${w}`, pr(w), want);
}

// Hangul utils
eq('josa 사과 을/를', HV.hangul.josa('사과', '을/를'), '사과를');
eq('josa 집 으로/로', HV.hangul.josa('집', '으로/로'), '집으로');
eq('romanize 한강', HV.hangul.romanize('한강'), 'hangang');

console.log(fails ? `\n${fails} failed` : '\nall vectors ok');
process.exit(fails ? 1 : 0);
