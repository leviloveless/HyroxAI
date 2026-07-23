# Engine ↔ Research — Batch 5 handoff

Two things: the **long compromised run** (gap-analysis Finding 5 / #7) and a
**latent schema bug fix** found along the way.

## 1. Long compromised run (Section 6 keystone)
The research's signature anchor is one long run threaded with station
transitions — the direct antidote to HYROX's compromised-running problem. The
engine had a `long` run and, separately, `hybrid` sessions, but never a long run
that is itself compromised. Now modeled as a named session via a `compromised`
flag on the long-run slot, set only for band athletes (gated on
`input.weeklyHours && cfg.bandZone3Z` → golden untouched).

Plumbing (mirrors the existing `simulation` flag):
- `lib/engine/types.ts` — `RunSlot.compromised?: boolean`.
- `lib/engine/slots.ts` — `SessionCountTables.compromisedLong`; `buildRunSlots`
  gains a `compromisedLong` param that flags the long run; call site passes it.
- `lib/engine/skeleton.ts` — sets `counts.compromisedLong = true` in the band block.
- `lib/generation/assemble.ts` — carries the flag onto the placeholder AND
  enforces it on an AI-matched run (engine owns the designation); `describeRuns`
  swaps in a dedicated compromised-run description.
- `lib/engine/run-descriptions.ts` — new `compromisedLongDescription()` (run in
  Z1–3, break every ~10–15 min for a race station, then resume).
- `lib/schemas.ts` + `lib/engine/skeleton-schema.ts` — `compromised` optional on
  the run session/slot so it validates and round-trips.
- `components/program/format.ts` — labels it "Long compromised run" in the
  session line and the weekly table.

## 2. Bug fix — power liftType missing from the skeleton schema
Batch 2 added `"power"` to the liftType enum in `types.ts` and `lib/schemas.ts`
but NOT in `lib/engine/skeleton-schema.ts` (the Zod schema that validates a
persisted skeleton on read-back). A stored program containing a power lift would
have failed validation (500) on the weekly-adaptation path. Added `"power"` to
that enum. (No test hit it because the round-trip test uses a golden/no-band
skeleton, which never produces a power lift.)

## Files
Changed: `lib/engine/types.ts`, `lib/engine/slots.ts`, `lib/engine/skeleton.ts`,
`lib/engine/skeleton-schema.ts`, `lib/schemas.ts`, `lib/engine/run-descriptions.ts`,
`lib/generation/assemble.ts`, `components/program/format.ts`.
New test: `lib/engine/compromised-long.test.ts` (long flagged only when set;
golden path unflagged; maintenance sports seed no long; description mentions
stations).

## Verify (comment-free — Windows CMD safe)
    npm run build
    npm test -- -u
    git add -A
    git commit -m "engine-research batch 5: long compromised run + skeleton-schema power fix"

Expect: golden green; HYROX band skeleton snapshots regenerate (long run now
carries compromised:true, plus the session-cap change from batch 4 if not yet
snapshotted); new compromised-long tests pass. `lib/admin.test.ts` still fails on
missing env — pre-existing, unrelated.

## Remaining → Batch 6
- Add DEKA `bandZone3Z` + `bandLiftCounts` tables (FIT / MILE / ULTRA only; the
  station-only STRONG/ATLAS keep their strength-event structure).
- Deferred: build Levi's "perfect program" reference case (needs profile).
