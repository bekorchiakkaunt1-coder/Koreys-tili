# DECISIONS.md — Hangang Protocol (ADR-lite)

Format: id · date · decision · alternatives · reason · status.
Reopen only with new evidence via an explicit "supersede D-xx".

## D-01 … D-19 — accepted 2026-10-03
Accepted as written in the master prompt §4 (hangang-protocol-prompt-v2.md).
Amendments: D-06 amended by D-29; D-09 default superseded by D-22.

---

## D-20 · 2026-10-05 · First target sitting
- **Decision:** 110th TOPIK PBT, Sun 2027-01-10, TOPIK I (Korea). Floor = 1급 (≥ 80/200), stretch = 2급 (≥ 140/200). Sunday leave from work: confirmed possible.
- **Alternatives:** 17th IBT 2027-02-20 (would supersede D-02/D-03); spring–summer 2027 PBT for 2급.
- **Reason:** cheapest real-exam feedback (40,000원), hard deadline drives the habit. ≈ 165 study h until T; classroom benchmark for 2급 is 215–400 h → 2급 is a low-probability stretch; the diagnostic recalibrates. The real 2급 attempt = spring–summer 2027 PBT.
- **Ladder:** Jan 2027 TOPIK I (1급) → Apr–Jul 2027 TOPIK I (2급) → Oct/Nov 2027 TOPIK II (3급) → 2028 TOPIK II (4급) → 2029+ (5급).
- **Status:** accepted.

## D-21 · 2026-10-05 · No study during shifts; two-block day keyed by next morning
- **Decision:** All study happens in a morning block and a night block. Break micro-sets are removed (user: studying during the shift is not possible). Night-block length is set by **tomorrow's** get-ready time, not by today's weekday. Fixed wake times (proposed, user to confirm in week 1): Mon–Fri 09:15, Sat–Sun 08:15.

| Block | When (KST) | Min | Content |
|---|---|---|---|
| Weekday morning (Mon–Fri) | 09:40–11:00 | 80 | Hardest task: Ibrat lesson(s) + new cards; or timed reading / one past-paper section + transcript; mocks only here (full mock: wake 08:45, 09:15–10:55). |
| Weekend morning (Sat–Sun) | 08:30–09:05 | 35 | SRS + 1 listening item. |
| Long night (Sun–Thu nights; next start 11:10) | 01:15–01:55 | 40 | Remaining reviews incl. today's new cards; 5 dictation sentences or 1 shadowing track; mistakes (5). Sunday night: weekly review + re-plan. |
| Short night (Fri–Sat nights; next start 09:10) | 01:15–01:35 | 20 | SRS only. Lights out by ~01:50. |

  Weekly ≈ 710 min ≈ 11.8 h (≈ 1.7 h/day). MVD (8 min SRS + 4 min listening) unchanged.
- **Alternatives:** original §7 templates with ≈ 25 min/day of break micro-sets.
- **Reason:** user constraint; the original weekend template put the heaviest night block before a 09:10 start (≈ 6 h sleep).
- **Consequences:** R10 reminders = 2/day (wake-time plan + 01:15 night); mid-shift nudge dropped. Break UX (`addToHomeScreen` resumable 3-min set) → backlog. Hangang capture stays chat-only and optional (≤ 10 s voice/text if ever possible, else recalled in the night block).
- **Status:** accepted (wake times pending week-1 confirmation).

## D-22 · 2026-10-05 · Single new-cards setting (supersedes D-09 default)
- **Decision:** one `config.new_per_day`, default **12**; all throttles in §6.2 still apply; no new cards from T−14d (2026-12-27).
- **Alternatives:** 15 (D-09), 10–15 (R3), 10–20 (P1), ~12 (§5.7) — four inconsistent values.
- **Reason:** at 15/day the month-3 forecast (≈ 28 min SRS) collides with the phase-mix SRS cap; 12/day × ~80 days ≈ 950 words ≥ the ~800-word 1급 descriptor.
- **Status:** accepted.

## D-23 · 2026-10-05 · Phase mix is the single source for the SRS cap (R2 amended)
- **Decision:** R2 uses the phase-mix SRS share as its cap. For the TOPIK I target, P1 and P2 merge into "Foundation+Format" (2026-10-12 → 2026-12-06):

| Phase | Dates | SRS | Grammar+reading (Ibrat) | Listening | Drills+mistakes | Mocks+analysis | Hangang |
|---|---|---|---|---|---|---|---|
| P0 Diagnose | 10-05 → 10-11 | 30 | 25 | 10 | 0 | 35 | 0 |
| P1+P2 Foundation+Format | 10-12 → 12-06 | 35 | 30 | 15 | 15 | 5 (mock every 2 weeks) | 0 |
| P3 Mock | 12-06 → 01-03 | 25 | 5 | 15 | 25 | 30 (1 mock/week) | 0 |
| P4 Taper | 01-04 → 01-10 | 40 | 0 | 20 | 30 | 10 (half-mock T−5d) | 0 |

- **Alternatives:** R2 fixed 35% vs phase mix 25%/20% (contradictory in the prompt).
- **Reason:** at 1급 level vocabulary is the binding constraint; a 25% SRS share in P2 would zero new cards from 2026-10-18.
- **Status:** accepted.

## D-24 · 2026-10-05 · Paper budget allocation (TOPIK I)
- **Decision:** diagnostic = 35th; section practice = 36th, 37th; P2 mocks = 41st, 47th, 52nd, 60th; spare/half-mock = 64th; P3 reserved (newest 4) = 83rd, 91st, 96th, 102nd. Source preference: topik.go.kr 기출문제 (PDF + MP3 + key) → private Drive (D-12). All rounds from the 35th onward use the current TOPIK I format.
- **Alternatives:** 3 reserved papers (prompt §5.8) — insufficient for 4 weekly P3 mocks.
- **Reason:** P3 = 4 weeks × 1 mock. Availability of each round **[verify while downloading]**.
- **Status:** accepted.

## D-25 · 2026-10-05 · Reduced build scope until freeze (2026-12-06)
- **Decision:** before freeze build only Phase 1, Phase 2 and **Phase 3-lite** (daily plan message from D-21 templates, MVD/active days, `/build start|stop`, reminders R10, Sunday summary text). Full readiness dashboard, Phase 4 (Hangang pipeline), Phase 5 (drills/TTS) → after 2027-01-10.
  Target timeline: Phase 1 build 10-06 → 10-12 (≤ 8 h) · in use 10-13 → 10-19 · Phase 2 build from 10-20 (≤ 3 h/week) → in use ≈ 11-02 · Phase 3-lite ≈ 11-09 → 11-22 · freeze 12-06.
  Until Phase 2 is live, the diagnostic and mocks are scored by hand.
- **Alternatives:** Phases 1–3 full + 4 before freeze (does not fit G3/G4).
- **Reason:** G3/G4 make the full scope impossible before T−5w; the mock runner matters more for the Jan target than the dashboard.
- **Status:** accepted.

## D-26 · 2026-10-05 · Client platform = iPhone 16 Pro, latest iOS + Telegram
- **Decision:** target iOS Telegram WebView first. DeviceStorage (9.0+) is the primary offline queue. `speechSynthesis` exists on iOS but stays an optional fallback only (D-10 unchanged). Card-front audio may need a user gesture on iOS (autoplay policy) → design "tap to play" as the default **[UNVERIFIED — spike: open an `<audio autoplay>` test page in the Mini App]**. In-Mini-App mic on iOS unverified → backlog.
- **Status:** accepted.

## D-27 · 2026-10-05 · Defaults accepted by user
- Audio: Phase 1 uses krdict headword audio only if its licence allows; TTS decided in Phase 5 (default Gemini TTS + local conversion, no billing).
- Glosses: store krdict EN and RU; show EN as pivot; my own Uzbek meaning is primary.
- AI: off until Phase 4; Gemini free-tier key later; paid-model cap = 0.
- **Status:** accepted.

## D-28 · 2026-10-05 · Pre-app study (G1) and Ibrat pace
- **Decision:** no Anki (user has none; AnkiMobile is paid on iOS). Until Phase 1 is live, new words go into iPhone Notes in the bot's bulk-add format (`사과 - olma`, one per line) and are self-tested from the list; on day 1 of Phase 1 the list is pasted into the bot. Ibrat pace: ≈ 2 lessons per weekday morning (≈ 10–14/week; user's estimate "≈ 20" exceeds what the new-card quota can absorb). Lessons 1–40 (redo) by ≈ 10-25, course finished by ≈ 12-06. Words beyond the daily quota queue as inactive notes.
- **Status:** accepted (pace to be adjusted after week 1).

## D-29 · 2026-10-05 · Vendor bundle entry (amends D-06)
- **Decision:** `getPronunciation` is not exported from `@dongsa/conjugation` main entry; it lives in the `./pronunciation` subpath. Bundle entry:
  ```js
  export * as fsrs from 'ts-fsrs';
  export * as hangul from 'es-hangul';
  export * as conj from '@dongsa/conjugation';
  export { getPronunciation } from '@dongsa/conjugation/pronunciation';
  ```
  Exposed as `HV.fsrs`, `HV.hangul`, `HV.conj`, `HV.getPronunciation`. `@dongsa/conjugation` 1.0.0 licence = MIT (package.json).
- **Reason:** found in the local spike (2026-10-05).
- **Status:** accepted.
