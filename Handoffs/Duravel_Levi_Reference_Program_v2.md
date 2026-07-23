# Duravel Reference Program — Levi Loveless (v2: conservative running start)

*Revised from v1 with an explicit starting volume of **12 running miles /week and
300 cardio minutes /week** (the engine honors `startMileage` / `startCardioMinutes`
as overrides — `input.startMileage ?? band`). Everything structural is unchanged;
only the volume curve moves. This is the more beginner-appropriate build the v1
audit called for.*

---

## What changed vs v1 (and what didn't)

**Unchanged** — the whole architecture is band/experience/class-driven, not
volume-driven: 17-week arc (Base 1–7, Build 8–12, Peak 13–15, Taper 16–17),
7–8 sessions/week, the 3-quality-run anchor set (long-compromised + threshold +
**VO2 every week**), the **3 lifts split 2 heavy + 1 power**, the hybrids and Peak
race simulation, the zone distribution, the placement rules, and the station
priorities from your DC result. See v1 for those tables — they still hold exactly.

**Changed** — the weekly running mileage and cardio minutes now start at 12 / 300
and *build into* the 15 h budget instead of starting near it. Peak running drops
from ~55 mi (band default) to **~21 mi**, and every long run shrinks to a
beginner-appropriate length.

---

## Revised weekly volume (12 mi / 300 min start)

Progression rule: increase weeks add the greater of +1.5 mi / +7.5 % (capped at
+10 % — the cap binds at your low starting mileage, so early jumps are a gentle
~+1.2–1.5 mi) and +max(20 min, +10 %) cardio; deloads = 60 % of the held peak;
Peak phase ×0.9; A-race taper = 80 % then 60 %.

| Wk | Phase | Micro | Miles | Cardio min | of which run / cross-train |
|---:|---|---|---:|---:|---|
| 1 | Base | rebound | 12.0 | 300 | 216 / 84 |
| 2 | Base | increase | 13.2 | 330 | 238 / 92 |
| 3 | Base | increase | 14.5 | 363 | 261 / 102 |
| 4 | Base | **deload** | 8.7 | 218 | 157 / 61 |
| 5 | Base | rebound | 14.5 | 363 | 261 / 102 |
| 6 | Base | increase | 16.0 | 399 | 288 / 111 |
| 7 | Base | increase | 17.5 | 439 | 315 / 124 |
| 8 | Build | **deload** | 10.5 | 264 | 189 / 75 |
| 9 | Build | rebound | 17.5 | 439 | 315 / 124 |
| 10 | Build | increase | 19.0 | 483 | 342 / 141 |
| 11 | Build | increase | 20.5 | 531 | 369 / 162 |
| 12 | Build | **deload** | 12.3 | 319 | 221 / 98 |
| 13 | Peak | rebound ×0.9 | 18.5 | 478 | 333 / 145 |
| 14 | Peak | increase ×0.9 | 19.8 | 527 | 356 / 171 |
| 15 | Peak | increase ×0.9 | 21.3 | 579 | 383 / 196 |
| 16 | Taper | taper (−20%) | ~17.0 | ~463 | 306 / 157 |
| 17 | **Race** | race (−40%) | ~12.8 | ~347 | 230 / 117 + race |

*(round1 mileage; taper weeks are the A-race 80 % / 60 % protocol off the held
peak — exact to within rounding pending a live run.)*

**Total weekly load** climbs from ~9 h (wk 1: 300 cardio + ~150 strength + 1
hybrid) to ~13.5 h at Peak (579 + 150 + 2 hybrids) — you *build into* the 15 h
budget rather than opening at it. The band still governs zones, the 8-session
cap, and the 3-lift dose throughout.

---

## Why this start fixes both v1 risks

1. **Beginner-runner volume is now sane.** Peak running is ~21 mi over 3 runs, so
   the long-compromised run lands around 9–11 mi rather than ~18. Early weeks sit
   at 12–16 mi — a real beginner ramp. The +10 % relative cap does the right thing
   here, holding early jumps to ~1.2–1.5 mi/week.

2. **Impact is actively managed for your bodyweight.** Because 300 start-cardio
   exceeds the 216 min that 12 mi implies, the engine carries an **84-minute
   low-impact cross-training block from week 1**, and it *grows* to ~195 min by
   Peak (cardio ramps at 10 % vs running's ~7.5 %). For a 250→220 lb athlete that
   ski/row/bike buffer is exactly where the surplus aerobic volume should go —
   aerobic stimulus without the pounding. This is the behavior v1's audit wanted
   the high bands to have; here you get it directly by setting the start.

---

## Representative Build week (wk 11 — 20.5 mi / 531 min)

Same placement rules as v1 (long run Sat, no two lifts/day, leg lifts paired with
easy cardio, weekend doubles). Paces from your 26:00 5k.

| Day | Session(s) | Detail (approx) |
|---|---|---|
| Mon | Heavy strength (full) + easy run | squat/hinge/press 4×4–5 @ ~83 %; 30 min easy @ ~10:30/mi (~3 mi) |
| Tue | **VO2 intervals** | 6 × 800 m @ ~8:00/mi, 1 min jog (~3.5 mi w/ w-up) |
| Wed | Power lift + easy Z2 cross-train | jumps/throws, full recovery; 35 min bike or row (low impact) |
| Thu | **Threshold run** | 25 min @ ~8:50/mi (~4 mi w/ w-up) |
| Fri | Heavy strength (full) | posterior chain + loaded carries (your weak stations) |
| Sat | **Long compromised run** (double) | ~10 mi Z1–3, station break every ~10–15 min (sled/lunge/burpee/ski) |
| Sun | Hybrid / HYROX + easy spin | race-pace compromised running through 3–4 stations |

Weekly running ≈ 20.5 mi across those 4 runs + the hybrid run; the remaining
~160 cardio min is the Wed/Sun low-impact block.

---

## Station focus (unchanged from your DC result)

Maintain **Row, Ski, Wall Balls, Lunges**; target the weak cluster —
**Farmers Carry (#637), Sled Pull (#622), Burpee Broad Jump (#558)** — via the two
heavy days (deadlift, rows, RDLs, carries) and the compromised-run burpee/broad-
jump exposure. Running is still the limiter, which the every-week VO2 + threshold
structure attacks head-on.

---

## Notes

- To get **byte-exact** weekly numbers and the full day grid from the engine
  itself, add `startMileage: 12, startCardioMinutes: 300` to the input in the
  staged spec (`lib/engine/_levi_ref.ts.bak` → rename to `.test.ts`, `npm test`).
- With this conservative start in hand, v1's proposed **Batch 7** (auto experience-
  scaled beginner volume + bodyweight-aware impact routing) becomes optional for
  *you* specifically — you've set it manually — but it's still the right default
  so other novice/heavier athletes get this behavior without hand-tuning.
