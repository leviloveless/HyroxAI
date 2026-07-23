# Duravel Handoff — Web Push LIVE (2026-07-22)

## 🌅 First thing tomorrow — one open item (~5 min)
**Verify the daily cron actually fires the push reminders in production.** Everything is built, deployed, and the send pipeline is proven working (a test notification reached a real device). The only thing not yet confirmed is that the *scheduled* job dispatches them. Two ways to check:

1. **Vercel dashboard (easiest, no secret):** Project → **Settings → Cron Jobs** (or the **Crons** tab) → find `/api/cron/lifecycle` → **Run** it. Vercel injects `CRON_SECRET` for you.
2. **curl:** use your **real production domain** (NOT `app.duravel.app` — that's the iOS-shell subdomain and returns `DEPLOYMENT_NOT_FOUND`) and your **real** `CRON_SECRET` value:
   ```
   curl -H "Authorization: Bearer <real CRON_SECRET>" https://<real-domain>/api/cron/lifecycle
   ```

**What to look for:** the JSON response has a `pushReminders` block:
`{ subscribers, activePrograms, workoutDue, weekReview, sent, skippedDup, noSubscription, failed }`.
- With reminders on + an unlogged session scheduled today → `sent: 1` and a notification arrives.
- If today is already logged or a rest day → `workoutDue: 0`, no send. **That's correct, not a bug.**
- Run it twice → the second run shows `skippedDup` (idempotency working).

If `CRON_SECRET` isn't set in Vercel, the endpoint returns 401 — set it and redeploy. (Note: the daily 14:00 UTC schedule already runs on its own; this is just to confirm now instead of waiting.)

---

## Where things stand — Web push is DONE and in production
The whole web-push feature shipped across this session and is live on `main`:

**Pipeline (verified working):**
- `push_subscriptions` table (migration `0036`), `public/sw.js` service worker, `/api/push/subscribe|unsubscribe|test` routes, `lib/push/send.ts` (dynamic `web-push` import, VAPID-key normalization, best-effort with real error surfacing), and the **Workout reminders** toggle in Settings → Connections.
- VAPID keys configured in Vercel (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`); `web-push` installed. `serverExternalPackages: ["web-push"]` in `next.config.ts` so it bundles into the serverless function.

**Triggers (deployed, pending the verify above):**
- `lib/push/reminders.ts` — `runPushRemindersFlow`, called from `app/api/cron/lifecycle/route.ts` (daily 14:00 UTC).
  - **workout_due** — unlogged session scheduled today → once per user per UTC day.
  - **week_review** — Monday, program on week ≥2, prior week had logged activity → once per program week.
- Dedup ledger `push_sends` (migration `0037`), idempotent claim (ON CONFLICT DO NOTHING).
- Pure detection unit-tested: `lib/push/triggers.ts` + `lib/push/triggers.test.ts` (9 tests). Golden-HYROX untouched.

**Design notes:** opt-in = the subscription itself (toggle off deletes the row → nothing sends), so no redundant preference column. "Current week / today" matches the dashboard "This week" card exactly. Timing = cron schedule (14:00 UTC).

## Migrations to confirm applied in prod Supabase
- `0036_push_subscriptions.sql` — applied (subscribe worked).
- `0037_push_sends.sql` — **confirm this one is applied** in the production Supabase project. If the cron test above reports an error or `sent`/`skippedDup` never move, an unapplied `0037` is the first thing to check.

## Debugging aids left in place (keep them)
`lib/push/send.ts` + `/api/push/test` now report the true reason for any zero-send: `web-push unavailable`, `Could not read subscriptions (...)`, `Found N subscription(s) but all sends failed (host/status/body)`, or `No active subscriptions`. Harmless in normal use; invaluable if keys ever drift.

## Deferred / next (not started)
- **Quiet hours + smarter per-user send time** — needs a `profiles.timezone` column; then gate on local hour and compute "today" per user (currently UTC).
- **streak_at_risk** trigger — "your N-week streak needs one more session" late in the week (reuse `adherenceStreak`). Left out to avoid false positives without a clear heuristic.
- **Native APNs** — after the iOS app ships; register the device token to the same `push_subscriptions` with `platform:'ios'` (the dispatcher already keys on platform).
- **Per-category preference UI** — only if more notification types are added (subscription is the single on/off today).

## Roadmap updated
`docs/iOS_and_Push_Implementation_Plan.md` — Part B now carries a "✅ STATUS — Web push SHIPPED & wired" block with the same open-verify note and deferred list.
