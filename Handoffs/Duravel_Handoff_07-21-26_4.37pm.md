# Duravel Handoff — 07-21-26 4.37pm

## Session focus
Guardrail auto-cap + Phase-1 loose ends + marketing polish + iOS/push plan. All in the working tree (UNCOMMITTED). HEAD: `b7f0127` (guardrails).

## ⚠️ Snapshot regen required before this commits clean
The impact auto-cap changes the HYROX **h20_30 / h30_40** band skeletons (lower running mileage), so `time-budget-skeleton.test.ts` snapshots must be regenerated:
```
npm test            # expect ONLY the 2 HYROX band snapshots (20–30h, 30–40h) to fail — mileage dropped, cardio ~same
npm test -- -u      # (or: npx vitest run -u) regenerate + eyeball the diff
npm run build       # type-check must pass
```
golden-HYROX is UNAFFECTED (auto-cap is gated by weeklyHours). No new migration this batch.

## 1. Guardrail auto-cap (impact routing; golden-safe)
- `lib/engine/time-budget.ts` — capped high-band **running** mileage (`BAND_START_MILEAGE` h20_30 60→48, h30_40 87→55) and added `BAND_START_CARDIO_MIN` + `bandStartCardioMinutes` so total aerobic volume stays high while the surplus routes to **low-impact cardio** (the reconciler fills non-running cardio). Low/mid budgets unchanged (cardio == mileage×18 there).
- `lib/engine/skeleton.ts` — band programs now take `startCa` from `bandStartCardioMinutes` (decoupled from capped mileage), in both build fns. Guarded by weeklyHours.
- `lib/engine/time-budget.test.ts` — added an impact-cap assertion (high-band cardio > mileage×18).
- Remaining guardrails stay ADVISORY (Safety tab): long-run jump, volume spike, concurrent. Next candidate to auto-apply: strength-volume trim at high endurance hours (touches sessionCounts).

## 2. Phase-1 loose ends
- **Edit-mode prefill**: `app/program/[id]/edit/page.tsx` now sets `weeklyHours: p.weeklyHours` on EditInitial (form already defaults from it).
- **DEKA ATLAS/ULTRA copy**: added to `app/onboarding/onboarding-form.tsx` and the shared `lib/time-budget-copy.ts` (starts the copy dedupe — shared module is the canonical source).
- **tri_olympic test**: `lib/engine/sports/tri-olympic.test.ts` (registration + per-discipline volume + skeleton zones sum 100).

## 3. Marketing polish
- **/admin/leads** — `app/admin/leads/page.tsx` (ADMIN_EMAILS-gated; service-role read of `science_leads`; total + unique + latest 500). Linked from `app/admin/page.tsx`.
- **Deferred (with reason):** Resend PDF-delivery on capture (needs live email infra + EMAIL_ENABLED; can't verify from sandbox) and the full onboarding-form copy-dedupe (cosmetic refactor of a working file). DEKA copy was folded into the shared module as the first step.

## 4. iOS + push — plan, not code
`docs/iOS_and_Push_Implementation_Plan.md`. iOS integration requires a **Mac/Xcode** (hard constraint) + Apple prerequisites (D-U-N-S, signing, APNs .p8, billing decision); the doc has the full on-Mac integration sequence for the generated `Apple\` parts. Push: recommends **web-push now** (buildable, ~1 session, no Apple dependency — VAPID keys + `push_subscriptions` table + service worker + subscribe route + send helper + cron triggers) then **native APNs** on the shared path after the iOS app lands. The Workout view's native gate lights up automatically once Capacitor is in the shell.

## Commit (from Windows CMD) — AFTER `npm test -- -u` passes
```
cd C:\dev\duravel
git add lib/engine/time-budget.ts lib/engine/skeleton.ts lib/engine/time-budget.test.ts ^
        lib/engine/__snapshots__/time-budget-skeleton.test.ts.snap ^
        lib/engine/sports/tri-olympic.test.ts ^
        "app/program/[id]/edit/page.tsx" app/onboarding/onboarding-form.tsx lib/time-budget-copy.ts ^
        app/admin/leads/page.tsx app/admin/page.tsx docs/iOS_and_Push_Implementation_Plan.md ^
        Handoffs/Duravel_Handoff_07-21-26_4.37pm.md
git commit -m "feat: impact auto-cap + phase-1 loose ends + admin leads + iOS/push plan"
```
(Push still needs Levi. Lock → `del .git\index.lock`.)
