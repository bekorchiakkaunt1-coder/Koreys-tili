// Builds the korean-vendor IIFE (D-06/D-29) once per library upgrade and writes
// byte-identical copies for Apps Script and the Mini App. Run: npm run build:vendor
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

export const VENDOR_VER = '1';
const root = new URL('..', import.meta.url);
const out = new URL(`web/js/vendor/korean-vendor.${VENDOR_VER}.js`, root);

await build({
  entryPoints: [new URL('tools/vendor-entry.js', root).pathname],
  bundle: true,
  format: 'iife',
  globalName: 'HV',
  target: 'es2019',
  minify: true,
  legalComments: 'inline',
  outfile: out.pathname,
});
writeFileSync(new URL('gas/00_vendor.js', root), readFileSync(out));
console.log(`korean-vendor.${VENDOR_VER}.js: ${readFileSync(out).length} bytes → web/js/vendor + gas/00_vendor.js`);
