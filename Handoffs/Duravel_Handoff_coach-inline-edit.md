# Admin — inline "Save as Coach" editing on the athlete view

Adds click-to-edit on the athlete program page (`/program/[id]`) for admins:
click **Edit** on any session → a modal opens with the session's fields → change
specifics (e.g. an easy run 3.3 → 4.3 mi) → **Save as Coach** persists just that
session and **recomputes that week's running mileage + cardio minutes**, then the
page refreshes so the weekly totals reflect the edit.

## Why the cardio number moves too
Cardio time is driven by a run's `durationMin`, not its distance. So the shared
run editor now **syncs duration from distance × pace** (and vice versa): bump the
easy run to 4.3 mi and its duration rises at its pace, which is what makes the
week's `totalCardioMinutes` increase alongside `totalMileage`. The recompute uses
the canonical `weekMileage` / `weekCardioMinutes` from `lib/session-volume.ts`
(the same functions assembly uses), so the numbers match the engine exactly.
`zoneDistribution` is the engine's phase target and is left unchanged.

## Files
- `components/admin/session-fields.tsx` — NEW. Shared per-kind session field
  editors (extracted from the bulk editor) + the run distance↔duration↔pace sync.
- `components/admin/program-form-editor.tsx` — now imports the shared fields
  (no behavior change; de-duplicated).
- `components/program/coach-session-edit.tsx` — NEW. The "Edit" button + modal +
  "Save as Coach" (calls the action, then `router.refresh()`).
- `app/admin/actions.ts` — NEW `saveCoachSession(programId, weekNumber, day,
  sessionIndex, sessionJson)`: admin-gated, validates the session, replaces it,
  recomputes the week's mileage/cardio, re-validates the whole program, saves,
  revalidates both views. Returns the new weekly totals.
- `components/program/week-card.tsx` — renders the Edit control per session in
  both desktop table and mobile list when in coach mode.
- `components/program/program-view.tsx` — threads a `coach` prop to WeekCard.
- `app/program/[id]/page.tsx` — `getAdmin()` → passes `coach` to ProgramView, so
  only admins see the Edit controls (and the action is admin-gated server-side).

## Behavior
- Non-admin athletes: no Edit buttons, no change to their view.
- Admin viewing any athlete's program: an "Edit" chip on every session; the modal
  reuses the same field editor as the bulk admin editor (all 8 session kinds).
- Save is schema-validated end-to-end; a bad edit is rejected, never written.

## Verify (comment-free — Windows CMD safe)
    npm run build
    git add -A
    git commit -m "admin: inline Save-as-Coach session editing + weekly recompute"

Frontend + one server action; `npm run build` type-checks/lints it. The weekly
recompute reuses already-tested `session-volume` math, so no new unit tests.
`lib/admin.test.ts` still fails on missing env — pre-existing.

## Try it (your example)
Open the program at `/program/<id>` as an admin, click **Edit** on Monday's Easy
run, change 3.3 → 4.3 mi, **Save as Coach** — the week's Running mileage rises ~1
mi and Cardio time rises by that run's added minutes.
