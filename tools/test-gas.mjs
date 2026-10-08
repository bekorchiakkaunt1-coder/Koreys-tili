// Runs gas/Tests.js runAllTests() in Node: loads every gas/*.js into one vm context
// (one global scope, like Apps Script) with a minimal Utilities shim.
import { readFileSync, readdirSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import vm from 'node:vm';

const toBuf = (x) => (typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 0xff)));
const toSigned = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));

const Utilities = {
  // GAS: computeHmacSha256Signature(value, key) — both String or both Byte[]; returns signed Byte[].
  computeHmacSha256Signature(value, key) {
    if (typeof value !== typeof key) throw new Error('mixed String/Byte[] overload does not exist in GAS');
    return toSigned(createHmac('sha256', toBuf(key)).update(toBuf(value)).digest());
  },
  newBlob: (s) => ({ getBytes: () => toSigned(Buffer.from(s, 'utf8')) }),
  getUuid: () => crypto.randomUUID(),
};

const ctx = vm.createContext({ Utilities, console });
const dir = new URL('../gas/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  vm.runInContext(readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
}
process.exit(vm.runInContext('runAllTests()', ctx) ? 0 : 1);
