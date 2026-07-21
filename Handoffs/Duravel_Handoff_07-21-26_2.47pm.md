# Duravel Handoff — 07-21-26 2.47pm

## Session focus
**Phase 1** (band → volume + intensity scaling) + **email-gate** for the science PDF. All written to the repo working tree (NOT committed, NOT pushed). Prior commit this day: `268ff97` (Phase 0 + Science page).

## ⚠️ Verify locally before committing
```
npm test          # NEW: time-budget.test.ts, time-budget-skeleton.test.ts (auto-creates snapshots on first run)
                  # golden-hyrox MUST stay green (Phase 1 is guarded by weeklyHours; legacy path untouched)
npm run build
```
- **Review the auto-generated snapshots** (`lib/engine/__snapshots__/time-budget-skeleton.test.ts.snap`) once — sanity-check that volume/zones scale sensibly across bands, then they're frozen.
- `admin.test.ts` still fails without env vars loaded (pre-existing, not ours).
- **Apply the migration** before the gate works: `supabase db push` (or your migration flow) to create `science_leads`. The route uses `SUPABASE_SERVICE_ROLE_KEY` (already set — Stripe webhook uses it).

## Phase 1 — engine now CONSUMES the weeklyHours band (opt-in, golden-safe)
Guarded everywhere by `input.weeklyHours` presence → no band = byte-identical legacy path.
- **NEW `lib/engine/time-budget.ts`** — pure mapping:
  - `BAND_START_MILEAGE` (single-currency start mileage: 10/20/37/60/87 for the 5 bands; h0_5≈beginner … h10_20≈advanced, then elite). Cardio derives via existing ×avgMinPerMile.
  - `BAND_TRI_HOURS` ([base,peak] hours: [3,5]/[6,10]/[10,16]/[18,26]/[26,36]).
  - `applyBandZoneShift(base, band)` — monotone transform on the 5-zone dist. `BAND_MIDDLE_DELTA` = +8/+4/0/−3/−6 points added to the middle (z3+z4), taken from easy (z1+z2), z5 held. Provably sum-preserving (splitProportional). h10_20 = neutral anchor. Encodes: low volume → more threshold; high volume → polarized.
- **`lib/engine/skeleton.ts`** — `startMi` now uses `bandStartMileage(weeklyHours)` when present (explicit `startMileage` override still wins); `zoneTargets` per week run through `applyBandZoneShift`. Applied in BOTH `buildSkeleton` and `buildRotationSkeleton` (general fitness).
- **`lib/engine/ironman/index.ts`** — tri `hours` now uses `bandTriHours(weeklyHours)` when present (else the level lookup); tri week `zoneTargets` run through `applyBandZoneShift`.
- **Tests:** `time-budget.test.ts` (monotonicity, sum-to-100, no-negative, z5-held, neutral anchor). `time-budget-skeleton.test.ts` (per-(sport,band) snapshots + peak-volume-increases-with-budget assertions).

**Design note:** 5-zone engine ↔ Seiler 3-zone (report). Transform acts on the middle/easy pools; z5 held. Numbers are conservative + tunable — the snapshots are the review gate. Next tuning pass: consider nudging z5 up slightly at the lowest band (intensity substitution) if the snapshots look too flat.

## Email-gate — science PDF is now a lead magnet (full paper still free on-site)
- **NEW migration `supabase/migrations/0034_science_leads.sql`** — `science_leads` table (email, source, sport, created_at). RLS on, no anon/auth policies → service-role only (same pattern as `subscriptions`). **Must be applied.**
- **NEW `app/api/leads/science/route.ts`** — public POST, zod-validated email, inserts via `createAdminClient()`. Never blocks the download on a storage error (returns `ok:true, stored:false`).
- **NEW `components/science/paper-gate.tsx`** — client form: email → POST → reveals the PDF download. Passes `sport` through when provided.
- **`app/science/page.tsx`** — hero "Download the PDF" → in-page `#get-report`; new gated `#get-report` section with `<PaperGate/>`. Full paper still linked free.
- **`app/science/volume-intensity/page.tsx`** — bottom "Download the PDF" → `/science#get-report`.

**Not built (easy follow-ups):** emailing the PDF via Resend on capture (currently on-page reveal only — no EMAIL_ENABLED dependency); dedupe/rate-limit on the leads route; an `/admin` view of `science_leads`.

## Commit (from Windows CMD)
```
cd C:\dev\duravel
git add lib/engine/time-budget.ts lib/engine/time-budget.test.ts lib/engine/time-budget-skeleton.test.ts ^
        lib/engine/skeleton.ts lib/engine/ironman/index.ts ^
        supabase/migrations/0034_science_leads.sql app/api/leads components/science/paper-gate.tsx ^
        app/science/page.tsx app/science/volume-intensity/page.tsx ^
        Handoffs/Duravel_Handoff_07-21-26_2.47pm.md
git commit -m "feat: Phase 1 time-budget volume+intensity scaling + science PDF email gate"
```
(Push needs Levi — cloud egress blocked. If lock error: `del C:\dev\duravel\.git\index.lock`.)
