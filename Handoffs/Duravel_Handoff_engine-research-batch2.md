# Duravel Handoff — Engine↔Research Alignment, Batch 2 (strength retune)

Finding 3 / item #6 (strength half). All gated by `input.weeklyHours` + `cfg.bandLiftCounts`
→ golden-HYROX (no-band) path stays byte-identical.

## What changed
- **New `power` lift type** — `lib/schemas.ts` (`LiftSessionSchema.liftType` enum),
  `lib/engine/types.ts` (`LiftSlot`), `lib/engine/strength.ts` (`LiftType`). Additive enum
  extension → back-compatible; a non-band program never emits `power`.
- **Research lift dose by budget** — `SportConfig.bandLiftCounts` (`sports/types.ts`); HYROX
  supplies `{h0_5:1, h5_10:2, h10_20:2, h20_30:3, h30_40:3}` (Section 6.3: 1 heavy at 5h →
  heavy+power at 10–20h → +a third quality lift at high volume). `skeleton.ts` overrides
  `counts.lift = {base:n, build:n, peak:n, taper:max(1,n-1)}` and sets `counts.researchLifts`
  when a band athlete has this policy. Replaces the fixed 3-day upper/lower/full split.
- **Heavy/power split** — `slots.ts` `RESEARCH_LIFT_SPLIT = ["full","power","full"]` (heavy,
  power, heavy); `buildLiftSlots(count, researchSplit)` uses it when `researchLifts`. So a 10h
  HYROX week is now **1 heavy + 1 power** lift, not upper/lower/full.
- **Power session is first-class through Peak/Taper** — `strength.ts`: `powerElementFor(...,
  force)` keeps the plyometric element in Peak and Taper for a power session (added peak/taper
  plyo libs, low volume); legacy non-forced behavior (Base/Build only) is preserved exactly.
  `patternEmphasis` treats a `power` lift as `max_strength` (heavy/explosive, not hypertrophy).
- **Assembly enforces the power day** — `assemble.ts`: `daySessions` forces `liftType="power"`
  onto the matched lift when the slot is `power` (matching is by kind only, so the AI's generic
  lift would otherwise win); `applyStrengthSchemes` forces the power element for a power session;
  `patchMovementPatterns` gives a power target the heavy 5-7 rep range.
- **Sequencing** — `sequencing.ts`: a `power` lift counts as a hard-leg lift (kept off the day
  before a key run), since plyometrics are leg-intensive.
- **Test** — `lib/engine/strength-power.test.ts` (4 tests): forced power keeps plyo through
  Peak/Taper; legacy stays Base/Build; deload/race never get plyo; power => max_strength.

## Effect (HYROX, band-present)
- 5h: 1 lift (heavy). 10h: 2 lifts (heavy + power). 20–40h: 3 lifts (heavy, power, heavy).
- The power session keeps plyometrics all the way through Peak and Taper (was: plyo vanished
  after Build). The over-prescribed upper/lower hypertrophy volume is gone at ≤10h.

## Build / verify / commit
```
npm run build
npm test
```
EXPECT: HYROX band cases in `time-budget-skeleton.test.ts` fail again (lift count 3→1/2/3 and
split full/upper/lower → full/power). golden-hyrox stays green; strength / assemble / sequencing
tests stay green (no `power` slots in their fixtures); the new strength-power.test.ts passes.
```
npm test -- -u
```
Regenerate the band snapshots, eyeball the diff (fewer lifts; a `"liftType": "power"` day), then:
```
git add lib/schemas.ts lib/engine/types.ts lib/engine/sports/types.ts lib/engine/sports/hyrox.ts lib/engine/skeleton.ts lib/engine/slots.ts lib/engine/strength.ts lib/engine/strength-power.test.ts lib/generation/assemble.ts lib/engine/sequencing.ts lib/engine/__snapshots__ Handoffs/Duravel_Handoff_engine-research-batch2.md
git commit -m "feat(engine): research strength dose by budget — heavy+power lifts, power kept through peak (HYROX)"
```

## Remaining
- **Batch 3:** no two lifts on the same day (item #1); pair lower-body/power lift with easy
  Z1-Z2 cardio same day (item #2).
- **Batch 4:** reconcile session COUNT vs hours budget (Finding 4); model the long compromised
  run (Finding 5); add DEKA `bandZone3Z` + `bandLiftCounts`.
- Optional: teach the AI prompt (LIFT_GUIDANCE) about the power session so its movements lead
  explosive; today assembly post-processes a generic lift into the power session (heavy + plyo).
