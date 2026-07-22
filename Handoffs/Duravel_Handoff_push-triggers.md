# Duravel Handoff — Push Reminder Triggers

## Session focus
Wired the web-push pipeline into the daily lifecycle cron so notifications actually **fire on their own** (the test button already proved the plumbing). Two triggers, opt-in via the existing subscription, idempotent. Golden-HYROX untouched (no engine logic). All in the working tree, **UNCOMMITTED**.

## What's new / changed

**New**
- `supabase/migrations/0037_push_sends.sql` — `push_sends` dedup ledger `(user_id, dedup_key UNIQUE, kind, created_at)`. The cron claims a send by inserting its dedup key with ON CONFLICT DO NOTHING, so a re-run/partial run never double-notifies. RLS on, no policies (service-role only, like `email_sends`/`science_leads`).
- `lib/push/triggers.ts` — pure, unit-tested detection: `unloggedSessionsToday(week, dayKey, logs)`, `weekHasActivity(weekNumber, logs)`, `DAY_KEYS`. No date/TZ math (the orchestrator supplies week + weekday), so the tests are deterministic.
- `lib/push/triggers.test.ts` — 9 unit tests (rest day, all-logged, partial, cross-week isolation, activity check).
- `lib/push/reminders.ts` — `runPushRemindersFlow(admin, nowMs)` (server-only). For each user with a web subscription + an active in-progress program (picked exactly like the dashboard "This week" card), builds up to two reminders, claims each in `push_sends`, and dispatches via `sendPushToUser`. Returns a summary `{ subscribers, activePrograms, workoutDue, weekReview, sent, skippedDup, noSubscription, failed }`.

**Edited**
- `app/api/cron/lifecycle/route.ts` — calls `runPushRemindersFlow` after the email flows; its summary is added to the JSON response. Push is independent of `EMAIL_ENABLED`.

## The two triggers
- **workout_due** — unlogged sessions scheduled for **today** exist. Body: "You have N session(s) on today's plan for {program}. Tap to log." → `/program/{id}`. Dedup `workout_due:{userId}:{YYYY-MM-DD}` (once per user per UTC day).
- **week_review** — it's **Monday** (program weeks start Monday), the program is on week ≥2, and the week that just ended had ≥1 logged session. Body: "Week N review is ready…" → `/program/{id}`. Dedup `week_review:{userId}:{programId}:{priorWeek}` (once per program week).

Both can fire the same Monday (distinct dedup keys) — intentional; two morning pings a week at most.

## Design notes
- **Opt-in = the subscription.** No redundant preference column: turning "Workout reminders" off in Settings deletes the row, so the flow finds nothing to send. `sendPushToUser` already scopes to a user's web subscriptions and prunes dead endpoints.
- **Timing** comes from the cron schedule (14:00 UTC, `vercel.json`). Per-user **quiet hours** are a deliberate follow-up — there's no `profiles.timezone` column yet (the codebase notes this in the 00xx adaptation migration). Add that column to land local-time quiet hours + a smarter send time.
- **One active program per user** (newest ready + in-progress), matching `components/dashboard/this-week-card.tsx` exactly, so "current week / today" is consistent with what the user sees in-app.

## Verify + apply + commit (Windows CMD)
```
cd C:\dev\duravel
npm run build       # type-check
npm test            # +9 tests in lib/push/triggers.test.ts; golden-HYROX unaffected, no snapshot changes
```
Apply the migration (Supabase SQL editor or CLI): `supabase/migrations/0037_push_sends.sql`
```
git add supabase/migrations/0037_push_sends.sql ^
        lib/push/triggers.ts lib/push/triggers.test.ts lib/push/reminders.ts ^
        app/api/cron/lifecycle/route.ts ^
        Handoffs/Duravel_Handoff_push-triggers.md
git commit -m "feat: web-push workout reminders wired into lifecycle cron (workout_due + week_review)"
git push
```
(Lock → `del .git\index.lock`.)

## Testing it end-to-end
- The cron runs daily at 14:00 UTC. To test on demand, hit it manually with the secret:
  `curl -H "Authorization: Bearer <CRON_SECRET>" https://app.duravel.app/api/cron/lifecycle`
  The JSON response includes a `pushReminders` summary (subscribers / activePrograms / workoutDue / weekReview / sent / skippedDup / failed). If you have reminders on and an unlogged session scheduled today, you'll get the notification and `sent: 1`.
- Idempotent: run it twice — the second run reports `skippedDup` instead of re-sending.

## Next (deferred)
- **Quiet hours + smarter send time** — needs a `profiles.timezone` column; then gate on local hour and compute "today" per user.
- **streak_at_risk** trigger — "your N-week streak needs one more session" late in the week (reuse `adherenceStreak`). Left out to avoid false positives without a clear heuristic.
- **Native APNs** — once the iOS app ships, register the device token to the same `push_subscriptions` with `platform:'ios'`; the dispatcher already keys on platform.
- A dedicated **per-category preference** UI if you later add more notification types (right now the subscription is the single on/off).
