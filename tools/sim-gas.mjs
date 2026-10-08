// End-to-end webhook simulation with in-memory fakes for SpreadsheetApp, PropertiesService,
// LockService, CacheService, UrlFetchApp (Telegram). Checks Phase 1 acceptance items that
// don't need a real deployment: empty return on route=tg, dedupe, add syntax, capture keyboard.
import { readFileSync, readdirSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const toBuf = (x) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 0xff)));
const toSigned = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));

class FakeSheet {
  constructor(name) { this.name = name; this.grid = Array.from({ length: 1000 }, () => Array(26).fill('')); this.frozen = 0; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  getMaxRows() { return this.grid.length; }
  getMaxColumns() { return this.grid[0].length; }
  getLastRow() { for (let r = this.grid.length - 1; r >= 0; r--) if (this.grid[r].some((v) => v !== '')) return r + 1; return 0; }
  getLastColumn() { let m = 0; for (const row of this.grid) for (let c = row.length - 1; c >= m; c--) if (row[c] !== '') { m = c + 1; break; } return m; }
  setFrozenRows(n) { this.frozen = n; }
  insertColumnsAfter(_, n) { this.grid.forEach((r) => r.push(...Array(n).fill(''))); }
  deleteRows(start, n) { this.grid.splice(start - 1, n); }
  deleteColumns(start, n) { this.grid.forEach((r) => r.splice(start - 1, n)); }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    const ensure = () => { while (sh.grid.length < r - 1 + nr) sh.grid.push(Array(sh.getMaxColumns()).fill('')); };
    const range = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (sh.grid[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: (vals) => { ensure(); vals.forEach((row, i) => row.forEach((v, j) => { sh.grid[r - 1 + i][c - 1 + j] = v; })); return range; },
      setValue: (v) => { ensure(); sh.grid[r - 1][c - 1] = v; return range; },
      setFontWeight: () => range,
      setNumberFormat: () => range,
    };
    return range;
  }
}
class FakeSS {
  constructor() { this.sheets = [new FakeSheet('Sheet1')]; }
  getId() { return 'ss1'; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/ss1'; }
  getSheets() { return this.sheets; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.push(s); return s; }
  deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
}

const ss = new FakeSS();
const props = {};
const sent = [];
const cache = {};
const globals = {
  console: { log() {}, warn() {}, error: (...a) => console.error(...a) },
  Utilities: {
    computeHmacSha256Signature: (v, k) => toSigned(createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
    newBlob: (s) => ({ getBytes: () => toSigned(Buffer.from(s, 'utf8')) }),
    getUuid: () => randomUUID(),
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
  SpreadsheetApp: { create: () => ss, openById: () => ss },
  ContentService: { createTextOutput: (s) => ({ body: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: (s) => s },
  UrlFetchApp: {
    fetch: (url, opt) => {
      sent.push({ method: url.split('/').pop(), payload: JSON.parse(opt.payload) });
      return { getContentText: () => '{"ok":true,"result":{}}', getResponseCode: () => 200 };
    },
  },
};
const ctx = vm.createContext(globals);
const dir = new URL('../gas/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) vm.runInContext(readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
const run = (code) => vm.runInContext(code, ctx);

run('setup()');
run('setup()'); // idempotent
props.BOT_TOKEN = 'x:y';
const key = props.WEBHOOK_KEY;
assert.equal(key.length, 64);
const tab = (n) => ss.getSheetByName(n);
assert.deepEqual(ss.sheets.map((s) => s.name), ['config', 'notes', 'cards', 'review_log', 'inbox', 'daily_stats', 'jobs', 'logs']);
assert.equal(tab('config').getLastRow(), 1 + 8, 'config seeded once');
assert.ok(tab('notes').getMaxRows() <= 2 && tab('notes').getMaxColumns() === 25, 'notes trimmed');

let uid = 100;
const post = (update, k = key) => {
  ctx.__e = { parameter: { route: 'tg', key: k }, postData: { contents: JSON.stringify(update) } };
  return run('doPost(__e)');
};
const msg = (text, extra = {}) => ({ update_id: ++uid, message: { message_id: uid, chat: { id: 42, type: 'private' }, from: { id: 42 }, text, ...extra } });

// No OWNER_ID yet → /start tells me my id
assert.equal(post(msg('/start')), undefined, 'route=tg returns nothing');
assert.match(sent.at(-1).payload.text, /Sizning id: 42/);
props.OWNER_ID = '42';

// Wrong key → nothing processed, nothing sent
const n0 = sent.length;
post(msg('/start'), 'bad');
assert.equal(sent.length, n0);

// Bulk add
post(msg('사과 - olma\n책 - kitob\nxato qator'));
assert.match(sent.at(-1).payload.text, /2 ta so‘z qo‘shildi[\s\S]*Tushunilmadi \(1\)/);
assert.equal(tab('notes').getLastRow(), 3);
assert.equal(tab('cards').getLastRow(), 3);

// Same update twice → handled once
const dup = msg('물 - suv');
post(dup); post(dup);
assert.equal(tab('notes').getLastRow(), 4, 'duplicate update_id ignored');
post(msg('사과 - olma'));
assert.match(sent.at(-1).payload.text, /0 ta[\s\S]*Bor edi \(1\): 사과/);

// Capture + situation callback
post(msg('카드 돼요?'));
const kb = sent.at(-1).payload.reply_markup.inline_keyboard;
assert.equal(kb.flat().length, 6);
const data = kb[0][1].callback_data; // 결제
post({ update_id: ++uid, callback_query: { id: 'cq', from: { id: 42 }, data, message: { message_id: 9, chat: { id: 42 } } } });
const inboxRow = tab('inbox').grid[1];
assert.equal(inboxRow[2], '카드 돼요?');
assert.equal(inboxRow[4], '결제');
assert.ok(sent.some((s) => s.method === 'editMessageText' && /결제/.test(s.payload.text)));

// Voice capture
post(msg(undefined, { voice: { file_id: 'VOICE1' } }));
assert.equal(tab('inbox').grid[2][3], 'VOICE1');

// Stranger ignored
const n1 = sent.length;
post({ update_id: ++uid, message: { message_id: 1, chat: { id: 7, type: 'private' }, from: { id: 7 }, text: '/start' } });
assert.equal(sent.length, n1);

// API: bad auth → JSON error, before any sheet access
ctx.__e = { parameter: { route: 'api' }, postData: { contents: JSON.stringify({ action: 'ping', initData: 'hash=00' }) } };
assert.equal(JSON.parse(run('doPost(__e)').body).error.code, 'AUTH_INVALID');

// --- Mini App API with a freshly signed initData (owner 42) ---
const sign = (fields, token) => {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(dcs).digest('hex');
  return Object.entries({ ...fields, hash }).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
};
const initData = sign({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 42, first_name: 'K' }), signature: 'x' }, props.BOT_TOKEN);
const api = (action, payload) => {
  ctx.__e = { parameter: { route: 'api' }, postData: { contents: JSON.stringify({ action, initData, reqId: 'r', payload }) } };
  return JSON.parse(run('doPost(__e)').body);
};
assert.equal(api('ping').ok, true);

// 50 words via the Add screen action
const words = Array.from({ length: 50 }, (_, i) => `단어${i} - so'z${i}`).join('\n');
const added = api('notes.add', { text: words });
assert.equal(added.data.added, 50);

let boot = api('bootstrap');
assert.equal(boot.ok, true);
assert.equal(boot.data.counts.new_left, 12, 'new_per_day = 12');
assert.equal(boot.data.fresh.length, 12);
assert.equal(boot.data.fresh[0].ko, '사과');

// Grade 50 reviews "offline" (client-side Srs), submit, then re-send the same batch
const srs = run('Srs.create({desired_retention: 0.9, day_start_hour: 5})');
const t0 = Date.now() - 60 * 60000;
const reviews = [];
const local = {};
boot.data.fresh.forEach((c) => { local[c.card_id] = c; });
let ts = t0;
for (let i = 0; reviews.length < 50; i++) {
  const c = boot.data.fresh[i % 12];
  const rating = [3, 1, 3, 4, 2][i % 5];
  ts += 20000;
  local[c.card_id] = srs.apply(local[c.card_id], rating, ts).row;
  reviews.push({ req_id: 'q' + i, card_id: c.card_id, rating, ts, duration_ms: 6000 });
}
const r1 = api('reviews.submit', { reviews });
assert.equal(r1.data.accepted, 50, JSON.stringify(r1));
assert.equal(tab('review_log').getLastRow() - 1, 50);
const r2 = api('reviews.submit', { reviews });
assert.equal(r2.data.accepted, 0);
assert.equal(r2.data.duplicates, 50);
assert.equal(tab('review_log').getLastRow() - 1, 50, 're-sent batch → still 50 rows');
// Server state equals the client's local grading (same bundle, same fuzz seed)
r1.data.cards.forEach((c) => assert.equal(c.due, local[c.card_id].due, 'client/server due match'));

boot = api('bootstrap');
assert.equal(boot.data.counts.new_today, 12);
assert.equal(boot.data.counts.new_left, 0, 'quota used up today');
assert.equal(boot.data.counts.reviews_today, 50);
const stats = tab('daily_stats').grid[1];
assert.equal(stats[1], 50);
assert.equal(stats[2], 12);

// Bad input
assert.equal(api('reviews.submit', { reviews: [{ req_id: 'z', card_id: 'nope', rating: 3, ts: Date.now() }] }).data.rejected[0].reason, 'unknown card');
assert.equal(api('nope').error.code, 'BAD_REQUEST');
assert.equal(api('notes.add', { text: 'salom' }).error.code, 'BAD_REQUEST');

console.log('sim ok: setup idempotent, empty 200, dedupe, add, capture, callback, voice, stranger, api auth, bootstrap quota, 50 offline reviews idempotent, client=server');
