# Koreys-tili — Hangang Protocol

Telegram bot + Mini App for TOPIK I prep (target: 110th PBT, 2027-01-10).
Stack (D-05): Apps Script V8 web app + one Google Sheet + GitHub Pages Mini App (vanilla JS).

```
gas/    Apps Script (clasp rootDir): Router, Auth, Bot, Telegram, Repo, Setup, Api, Tests, 00_vendor.js
web/    GitHub Pages Mini App (js/vendor/korean-vendor.<ver>.js = byte-identical copy of gas/00_vendor.js)
tools/  build-vendor, vendor-check, test-gas (unit), sim-gas (webhook end-to-end with fakes)
STATE.md · DECISIONS.md · BACKLOG.md
```

```sh
npm ci
npm test               # GAS unit suites + webhook simulation + vendor vectors
npm run build:vendor   # only when a pinned library changes
```

Apps Script editor: `setup()` → set Script Properties `BOT_TOKEN`, `WEBAPP_URL` → `setWebhook()` → `setMenuButton()`;
`/start` in the bot prints your id → `OWNER_ID`. `runAllTests()` runs the same suites as `npm test`.
