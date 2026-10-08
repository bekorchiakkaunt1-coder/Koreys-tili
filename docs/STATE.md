# STATE.md — Hangang Protocol

- **Last updated:** 2026-10-05 22:00 KST
- **Current phase:** Phase 0 (decisions + target + spikes) — decisions done, local spikes done, device/account spikes pending
- **Target:** 110th TOPIK PBT, 2027-01-10, TOPIK I, 1급 floor / 2급 stretch (D-20) · T−97 days
- **Key dates:** P1+P2 start 2026-10-12 · freeze / P3 start 2026-12-06 · no new cards 2026-12-27 · taper 2027-01-04
- **Registration (110th):** window UNVERIFIED. January rounds open ≈ 4 weeks before (104th: 2025-12-09 → 12-15 for 2026-01-11) → expect ≈ early–mid Dec 2026. Other rounds open ≈ 10 weeks before (103rd/108th/109th). 103rd used regional staggered start days (지역별 분할 접수) → check Seoul's day. Check topik.go.kr as soon as the 110th notice appears.
- **Deployed:** none (GAS version —, Pages commit —)

## Done
- Master prompt reviewed; contradictions resolved in D-21 … D-25.
- 2026-10-08: repo set up; vendor bundle reproducible (`npm run build:vendor`, 89.8 KB min) and spike vectors re-checked (`npm run check:vendor`) ✓.
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

## In progress
- G1 study loop: diagnostic paper (35th TOPIK I) + Ibrat redo + vocab list in Notes.

## Next
1. User: download 35th TOPIK I (PDF + MP3 + key) from topik.go.kr → private Drive; do the timed diagnostic (wake 08:45, 09:15–10:55) and hand-score it.
2. User account prep (≈ 20 min, counts as build time): BotFather bot (+ note token), empty Apps Script project, GitHub repo for Pages, krdict Open API key application (may need approval time — do first).
3. Phase 1 build session (after MVD): Setup, Router/Auth/Telegram, webhook, vendor bundle, Srs adapter, Review/Add screens.

## Spikes pending (need the user's accounts / phone)
- [ ] Webhook empty 200; duplicate `update_id` handled once; `getWebhookInfo` clean.
- [ ] initData vector inside GAS; then real initData via menu button / Main Mini App.
- [ ] text/plain POST from the Pages origin returns JSON through the redirect.
- [ ] Bundle loads in real Apps Script (file size limit, global scope) and in the iOS Telegram WebView; vectors match.
- [ ] Fuzz determinism GAS ↔ WebView (same bundle; Node result above).
- [ ] iOS: `<audio>` MP3 playback and autoplay-without-gesture behaviour (D-26).
- [ ] Voice capture: `file_id` stored and replayed.
- [ ] krdict: key, licence version + audio terms, one `search?advanced=y&level=level1` parsed with `XmlService`.
- [ ] `LanguageApp.translate('사과','ko','uz')`.
- [ ] Apps Script round-trip latency p50/p95 from the Mini App.
- [ ] DeviceStorage available; Uzbek ʻ renders in the chosen font.
- [ ] Before Phase 2: 110th registration window; points per item from an official key.

## Open bugs
- none

## Time log
- Build min this week: 0 · Study min this week: —
