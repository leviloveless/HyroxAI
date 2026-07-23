# Engine ↔ Research — Batch 4 handoff

Goal: programs match the research. Batch 4 = **Finding 4: reconcile session
count against the hours budget** (gap-analysis recommendation #6). A 10 h athlete
was getting `5 runs + 2 hybrids + 3 lifts = 10` fragmented sessions; Section 6
wants ~5–6 quality anchors + easy filler. The count was derived from
phase/experience and never reconciled against the weekly-hours budget.

Scope note: the other two Batch-4-era items — the **long compromised run**
(Finding 5 / #7) and **DEKA `bandZone3Z` + `bandLiftCounts` tables** — are
deliberately deferred to **Batch 5**, because the compromised-run touches the
schema + AI content plumbing and deserves its own isolated build/verify.

## How it works (all gated on the hours band → golden untouched)
- New per-band tables in `lib/engine/time-budget.ts`:
  `BAND_SESSION_CAP` (h0_5:5, h5_10:6, h10_20:8, h20_30:10, h30_40:12) and
  `BAND_ANCHOR_RUN_FLOOR` (h0_5:2, else 3), with `bandSessionCap()` /
  `bandAnchorRunFloor()` accessors.
- `SessionCountTables` gains `weeklySessionCap?` and `anchorRunFloor?`.
- `skeleton.ts` sets both when `input.weeklyHours && cfg.bandZone3Z` (same gate
  as the research zone/lift work).
- `planWeek()` (`slots.ts`), at the end of a non-race week, trims TOTAL sessions
  to the cap: easy filler runs first (down to the anchor floor — the long run +
  threshold/VO2 are seeded first in buildRunSlots, so they survive), then, for
  run-dominant sports (`runCharacter !== "maintenance"`), surplus hybrids down to
  one. The research lift dose is never trimmed. Station-only DEKA keeps its
  hybrid density (maintenance branch skips the hybrid trim).

Result: a 10 h intermediate Build week goes 10 → 6 (3 quality runs + 2 lifts +
1 hybrid). Golden HYROX (no weeklyHours) is byte-identical.

## Files
- `lib/engine/time-budget.ts` — cap/floor tables + accessors.
- `lib/engine/slots.ts` — `SessionCountTables` fields + `planWeek` cap trim.
- `lib/engine/skeleton.ts` — import + set cap/floor for band athletes.
- `lib/engine/session-cap.test.ts` — NEW (cap hit, anchor floor preserved, lift
  dose protected, lowest-budget floor 2, golden untouched, sane band values).

## Verify (comment-free — Windows CMD safe)
    npm run build
    npm test -- -u
    git add -A
    git commit -m "engine-research batch 4: reconcile session count to hours budget"

Expect: golden green, HYROX band snapshots regenerated (fewer sessions/week),
new session-cap tests pass. `lib/admin.test.ts` still fails on missing env —
pre-existing, unrelated.

## Remaining → Batch 5
- Model the long compromised run as a named HYROX/DEKA session (Finding 5).
- Add DEKA `bandZone3Z` + `bandLiftCounts` tables.
- Deferred: build Levi's "perfect program" reference case (needs profile).
