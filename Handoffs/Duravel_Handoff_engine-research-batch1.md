# Duravel Handoff — Engine↔Research Alignment, Batch 1 (intensity axis)

Goal: make generated programs match the volume-vs-intensity research. Doing it in
build-verified batches. **Batch 1 = the core: scale true VO2/high-intensity by the
weekly-hours budget, and make VO2 + threshold guaranteed weekly anchors.** All gated
by `input.weeklyHours` → the golden-HYROX (no-band) path stays byte-identical.

## What changed (Findings 1 & 2 of the gap analysis)
- **`lib/engine/time-budget.ts`** — new `ThreeZone` type + `bandPhaseZoneTargets(phase, band, table)`.
  Converts a sport's research 3-zone target {easy,gray,hard} into the engine's 5-zone,
  with a per-phase tilt (Base easier, Peak more intense) that keeps the program average on
  the budget's target. `hard` (research Z3) maps to engine **z5** — so VO2/high-intensity now
  scales with hours instead of being held flat.
- **`lib/engine/sports/types.ts`** — `SportConfig.bandZone3Z?` (per-band research 3-zone table).
- **`lib/engine/sports/hyrox.ts`** — HYROX `bandZone3Z` from Section 6.3
  (5h 55/25/**20** · 10h 70/15/**15** · 20h 80/8/**12** · 30h 85/4/**11** · 40h 88/3/**9**).
- **`lib/engine/skeleton.ts`** — when `weeklyHours` is set AND the sport has a `bandZone3Z`,
  zone targets come from `bandPhaseZoneTargets` (else the old `applyBandZoneShift`, else flat).
  Also sets `counts.guaranteeQuality = !!weeklyHours && !!cfg.bandZone3Z`.
- **`lib/engine/slots.ts`** — `SessionCountTables.guaranteeQuality`; `buildRunSlots` seeds
  `threshold` + `interval` (VO2) before the filler pool when guaranteed — so a VO2 and a
  threshold run appear **every quality week, in every phase, including Base** (was: no
  interval/threshold in Base at all).
- **`lib/engine/time-budget.test.ts`** — unit tests (sums to 100; z5 scales up and is higher at
  lower budgets; peak > base).

## Effect (HYROX, band-present)
- z5 (true VO2/hard) now ~11–25% depending on budget/phase (was 3–8% flat). A 10h HYROX
  athlete lands near **70/15/15**; a 5h athlete gets the intensity-dense ~55/25/20.
- Every quality week now carries a threshold + a VO2 session from week 1.

## Build / verify / commit
```
cd C:\dev\duravel
npm run build          # type-check
npm test               # EXPECT: HYROX band cases in time-budget-skeleton.test.ts fail (intended:
                       #         zone targets + run composition changed). golden-hyrox stays green.
npm test -- -u         # regenerate snapshots; eyeball the diff (z5 up; threshold+interval each week)
```
Confirm `lib/engine/golden-hyrox.test.ts` is UNCHANGED/green (proves the no-band path is byte-identical).
```
git add lib/engine/time-budget.ts lib/engine/time-budget.test.ts lib/engine/sports/types.ts ^
        lib/engine/sports/hyrox.ts lib/engine/skeleton.ts lib/engine/slots.ts ^
        lib/engine/__snapshots__ Handoffs/Duravel_Handoff_engine-research-batch1.md
git commit -m "feat(engine): scale VO2/intensity by weekly-hours budget + guarantee VO2/threshold anchors (HYROX)"
```

## Remaining batches (after this builds green)
- **Batch 1b:** add `bandZone3Z` tables to the DEKA formats (6.4) so DEKA also scales intensity.
- **Batch 2 (strength, Finding 3 / item #6):** for HYROX ≤~10h drop to 2 lifts {heavy, power};
  make the power session first-class and keep it through Peak (currently 3 lifts upper/lower/full,
  power is a plyo add-on that vanishes in Peak/Taper).
- **Batch 3 (scheduling, items #1/#2):** no two lifts on the same day; pair a lower-body lift with
  easy Z1–Z2 cardio on the same day.
- **Batch 4:** reconcile session COUNT against the hours budget (~5–6 anchors, not 8–10 fragments,
  Finding 4); model the "long compromised run" as a named HYROX/DEKA session (Finding 5).
