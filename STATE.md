# STATE.md — Hangang Protocol

- **Last updated:** 2026-10-09 KST
- **Current phase:** Phase 1 build (study loop MVP) — bot live; Mini App (Home/Review/Add) built, deploying to Pages
- **Target:** 110th TOPIK PBT, 2027-01-10, TOPIK I, 1급 floor / 2급 stretch (D-20) · T−97 days
- **Key dates:** P1+P2 start 2026-10-12 · freeze / P3 start 2026-12-06 · no new cards 2026-12-27 · taper 2027-01-04
- **Registration (110th):** window UNVERIFIED. January rounds open ≈ 4 weeks before (104th: 2025-12-09 → 12-15 for 2026-01-11) → expect ≈ early–mid Dec 2026. Other rounds open ≈ 10 weeks before (103rd/108th/109th). 103rd used regional staggered start days (지역별 분할 접수) → check Seoul's day. Check topik.go.kr as soon as the 110th notice appears.
- **Deployed:** GAS project `koreys_tili` (scriptId in `.clasp.json`), prod deployment `AKfycbzX20CH…Fg` @4 (2026-10-09, clasp 3.4.1); Pages via Actions from `main` (`.github/workflows/pages.yml`)

## Done
- Master prompt reviewed; contradictions resolved in D-21 … D-25.
- 2026-10-08: repo in §14 layout (`gas/`, `web/`, `tools/`); vendor bundle reproducible (`npm run build:vendor`) → byte-identical `gas/00_vendor.js` + `web/js/vendor/korean-vendor.1.js`; vectors re-checked ✓.
- 2026-10-08: Phase 1 server foundation (`gas/`): Router (tg → empty return, api → JSON), durable `update_id` dedupe, Auth (initData), Telegram, Bot (`/start`, bulk add `사과 - olma`, text/voice capture → `inbox` + situation keyboard), Repo (header-mapped, batch writes), Setup (8 Phase-1 tabs, trimmed, config defaults, WEBHOOK_KEY, setWebhook, setMenuButton), Api (`ping`), Tests.
  - `npm test` ✓: initData vector valid with `signature` in dcs, signature-excluded/tampered/wrong-token fail, expired → AUTH_EXPIRED, other user → FORBIDDEN; dedupe; add parser; end-to-end webhook sim with fakes (setup idempotent, duplicate update handled once, stranger ignored).
- krdict Open API key obtained by user (2026-10-08).
- Users' answers 2026-10-08: bot already exists (BotFather); Pages = this repo (public, Pages enabled); Apps Script project to be created by Claude via clasp; diagnostic later.
- initData test vector reproduced (Python HMAC): valid hash `b45182…` with `signature` included; excluding it gives `6974adf3…` → must fail. ✓ (not yet in GAS)
- Local spike, Node 22 module-less `vm` sandbox, bundle built with esbuild (`--format=iife --global-name=HV --target=es2019 --minify --legal-comments=inline`):
  - Bundle size: **89.8 KB min / 26.6 KB gzip** (ts-fsrs 5.4.2 + es-hangul 2.4.0 + @dongsa/conjugation 1.0.0 incl. pronunciation).
  - FSRS vectors ✓: new card Again 1 m / Hard 6 m / Good 10 m / Easy → Review S 8.30, 8 d; Good→Good(+10 m) → Review S 2.31, 2 d.
  - Day boundary ✓: no offset 08:30 → S 10.000, 10:30 → S 13.047; +4 h offset 04:30 → 10.000, 08:30 → 13.047.
  - Fuzz with `GenSeedStrategyWithCardId('card_id')`: two independent scheduler instances → identical intervals (0,2,12,49,169,503,1322,3464) ✓.
  - Conjugation vectors ✓ (도와요/도왔어요/도울 거예요, 들어요, 몰라요, 삽니다, 써요, 빨개요, 나아요, 공부했어요, 이에요).
  - josa ✓ for 사과를/책이/물로/집으로/민수예요; digit defect confirmed ("3가") → wrapper needed.
  - es-hangul `standardizePronunciation` defects confirmed: 한꾸거, 감끼, 소미불.
  - @dongsa `getPronunciation`: 궁물, 실라, 가치, 조타, 익따, 한구거, 감기, 감사함니다, 일꼬 ✓; 솜이불 → 소미불 ✗ (needs `overrides` row 솜이불→솜니불).
  - `numberToHangul(15000)` = 일만오천 → spoken-price wrapper needed (만 오천 원).
  - romanize ✓ yeouinaru / hangang / yeouido.

- 2026-10-09: bot verified live by user + Hangang DB read back: 8 tabs, config seeded once, note + recog card, 2 inbox rows (text 결제, voice file_id), logs empty, no duplicate rows. setWebhook: no last_error_message, pending 0.
- 2026-10-09: `Srs.js` adapter (FSRS-6, DR 0.90, fuzz seed = card_id, steps 1m/10m, relearn 10m, 05:00 KST boundary via +4 h offset) shared byte-identical GAS ↔ web; day-boundary vector reproduced (04:30 → S 10.000, 08:30 → 13.047). API `bootstrap`, `reviews.submit` (per-review req_id idempotent, server re-applies), `notes.add`; `Notes.js` shared by bot + Mini App. Mini App: Home (T−n, counts, latency p50/p95), Review (4 buttons + previews, batches of 5 new, learn-ahead 20 min), Add; DeviceStorage queue + localStorage mirror, flush every 10 / on hide / deactivated.
  - `npm test` ✓ incl. sim: 50 offline reviews → 50 review_log rows, re-sent → still 50; client due == server due; quota 12/day. Headless Chromium smoke (fake Telegram + mocked API): Home → 5 reviews → done → 1 batch submitted → Add; no console errors.

## In progress
- G1 study loop: diagnostic paper (35th TOPIK I) + Ibrat redo + vocab list in Notes.

## Next
1. User: after the Pages run is green → run `setMenuButton()` in the editor → open the Mini App from the bot menu; review the 사과 card; report latency line + anything odd.
2. Remaining Phase 1: Notes list/search screen; krdict import job (first 500 초급 words; key → Script Property `KRDICT_KEY`); measure real latency p50/p95; 7 real days with ≥ 5 active.
3. User: krdict Open API key application; 35th TOPIK I diagnostic (later, per user).

## Spikes pending (need the user's accounts / phone)
- [x] Webhook empty 200; `getWebhookInfo` clean (2026-10-09). Duplicate `update_id` covered by sim only.
- [ ] initData vector inside GAS; then real initData via menu button / Main Mini App.
- [x] text/plain POST from the Pages origin returns JSON through the redirect (2026-10-09, `api-probe`: live Pages in WebKit 2.1 s / Chromium 1.6 s; 302 + 200 both `access-control-allow-origin: *`). One earlier Chromium call took > 30 s (cold start?) → watch real p95.
- [x] Bundle loads in real Apps Script: 92 KB push accepted, `runAllTests()` in editor 24/24 ✓ (2026-10-09). iOS Telegram WebView part still pending.
- [ ] Fuzz determinism GAS ↔ WebView (same bundle; Node ✓ incl. client==server sim; real devices pending).
- [ ] iOS: `<audio>` MP3 playback and autoplay-without-gesture behaviour (D-26).
- [ ] Voice capture: `file_id` stored ✓ (2026-10-09); replay via sendVoice pending.
- [ ] krdict: key, licence version + audio terms, one `search?advanced=y&level=level1` parsed with `XmlService`.
- [ ] `LanguageApp.translate('사과','ko','uz')`.
- [ ] Apps Script round-trip latency p50/p95 from the Mini App.
- [ ] DeviceStorage available; Uzbek ʻ renders in the chosen font.
- [ ] Before Phase 2: 110th registration window; points per item from an official key.

## Open bugs
- B-01 fixed (2026-10-09): Mini App showed NETWORK "Load failed": `api.js` posted to `/exec` without `?route=api` → Router's empty 200 has no CORS header. Reproduced in WebKit + Chromium via `api-probe` workflow (live Pages vs real API); fixed + guard test in `tools/test-web.mjs`. Also from this: api branch always answers JSON, INFO row per authenticated call, error detail + retry in the UI.

## Time log
- Build min this week: 0 · Study min this week: —
