# Engine — Batch 7: experience-scaled beginner volume + bodyweight-aware impact routing

Closes the two calibration risks the Levi reference case surfaced. One small,
elegant mechanism handles both: scale the **running** share of the band's aerobic
budget down for beginner and/or heavier athletes, while keeping the **total
cardio-minute** budget fixed. The reconciler already fills
`targetCardioMinutes − runningMinutes` with low-impact cardio, so the surplus
auto-routes to bike/row/ski — same aerobic stimulus, less impact.

## How it works
`runImpactFactor(runningExp, bodyWeightLbs)` in `time-budget.ts`:
- **Experience:** beginner → 0.6× the band mileage; intermediate/advanced → 1.0
  (identity, so existing intermediate snapshots are byte-identical).
- **Bodyweight:** above 185 lb the running share tapers ~0.3 %/lb, floored at 0.8
  (−20 % cap). Missing bodyweight ⇒ 1.0.

Applied to `bandStartMileage` in both `buildSkeleton` paths; **total cardio
minutes (`bandStartCardioMinutes`) are untouched**, so the difference becomes a
larger low-impact cross-training block. An explicit `startMileage` override still
wins over the auto-scale.

Example — Levi (HYROX, `h10_20` = 15 h, beginner runner, 250 lb): start mileage
auto-drops 37 → **~17.9 mi** (0.6 × 0.805), cardio stays 666 min → ~344 min of
low-impact cardio from week 1. That's the v2 reference behavior *without* setting
`startMileage` by hand.

## Snapshot safety
The band snapshot tests use **intermediate running with no bodyweight** → factor
1.0 → `bandStartMileage` unchanged → **no existing snapshot changes** (HYROX bands,
DEKA FIT bands, golden all unaffected). Only real beginner/heavier band athletes
see new volume.

## Files
- `lib/engine/types.ts` — `EngineInput.bodyWeightLbs?`.
- `lib/engine/time-budget.ts` — `runImpactFactor()` + `ExperienceLevel` import.
- `lib/engine/skeleton.ts` — apply the factor in both start-mileage paths; set
  `bodyWeightLbs` in `toEngineInput` via a new `toLbs` helper.
- `lib/engine/impact-routing.test.ts` — NEW (factor identity/scaling/floor,
  beginner-heavy starts lower with equal cardio, override wins).

## Verify (comment-free — Windows CMD safe)
    npm run build
    npm test
    git add -A
    git commit -m "engine batch 7: experience-scaled beginner volume + bodyweight impact routing"

Expect: golden + all band snapshots green with **no -u needed** (intermediate is
identity); new impact-routing tests pass. `lib/admin.test.ts` still fails on
missing env — pre-existing, unrelated.

## Ties into the app work
With Batch 7, generating a program in-app for Levi's profile (beginner runner,
250 lb, 15 h) now auto-produces the conservative, low-impact curve — so the
"generate in-app then hand-tune" plan starts from the right volume. Next up: the
structured no-code admin program editor.
