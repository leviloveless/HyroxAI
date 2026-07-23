# Engine ↔ Research — Batch 3 handoff

Goal: make programs match the research. Batch 3 covers the two scheduling rules
from the gap analysis:
  1. No two weight sessions on the same day.
  2. Every hard-leg lift day (lower / full / power) is paired with easy Z1–Z2
     cardio on the SAME day.

Both are **gated on `counts.researchLifts`** (only real users, who supply
weeklyHours). The golden-HYROX oracle has no weeklyHours → guards never fire →
golden stays byte-identical. Band snapshots (`time-budget-skeleton`) WILL change
and must be regenerated with `-u`.

## Files changed
- `lib/engine/sequencing.ts` — appended `separateLifts()` and
  `pairLegLiftWithCardio()` plus helpers (`isCardio`, `isEasyRun`,
  `conflictsWithKeyRun`, `pickNoLiftDay`, `pickEasyRunSource`). Best-effort and
  session-count-preserving: they only relocate existing sessions onto
  unprotected days, never create/drop a session, never move the long run or a
  quality run, and never park a hard-leg lift on/next-to a key run.
- `lib/engine/slots.ts` — import extended; after `applySequencingGuards(...)`,
  inside the `if (!(race && microWeek === "race"))` block:
    `if (counts.researchLifts) { separateLifts(...); pairLegLiftWithCardio(...); }`
- `lib/engine/sequencing-guards.test.ts` — NEW unit tests (lift separation,
  protected-day + key-run avoidance, count preservation; leg-lift pairing,
  already-paired no-op, don't-unpair-another-leg-lift, upper-lift ignored, long
  run never moved).

## Verify (comment-free — Windows CMD safe)
    npm run build
    npm test -- -u
    git add -A
    git commit -m "engine-research batch 3: one lift/day + pair leg lifts with easy cardio"

Expect: golden green, band snapshots regenerated, new sequencing-guards tests
pass. `lib/admin.test.ts` still fails on missing env — pre-existing, unrelated.

## Remaining (Batch 4)
- Reconcile session COUNT vs hours budget (~5–6 anchors, not 8–10).
- Model the long *compromised* run as a named session.
- Add DEKA `bandZone3Z` + `bandLiftCounts` tables.
- Deferred: build Levi's "perfect program" reference case (needs profile).
