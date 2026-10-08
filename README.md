# Koreys-tili — Hangang Protocol

Telegram bot + Mini App for TOPIK I prep (target: 110th PBT, 2027-01-10).

- `docs/STATE.md` — current state, next steps, pending spikes
- `docs/DECISIONS.md` — decisions D-20 … D-29 (D-01 … D-19 live in the master prompt)
- `docs/BACKLOG.md` — reviewed on Sundays only
- `vendor/entry.js` → `dist/hv.min.js` — vendor bundle (D-29), global `HV`

```sh
npm ci
npm run build:vendor   # esbuild → dist/hv.min.js (~89.8 KB min / ~26.6 KB gzip)
npm run check:vendor   # FSRS / pronunciation / josa vectors in a module-less vm sandbox
```
