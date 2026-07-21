# Duravel Handoff — Web-Push Groundwork

## Session focus
Built the **web-push notification groundwork** (Part B of the iOS/Push plan — the one push piece buildable now, no Apple dependency). All in the working tree, **UNCOMMITTED**. Golden-HYROX unaffected (no engine logic touched). No snapshot regen needed.

## What's new / changed

**New files**
- `supabase/migrations/0036_push_subscriptions.sql` — `push_subscriptions` table: `(user_id, platform 'web'|'ios', endpoint, p256dh, auth, user_agent, created_at)`, unique `(user_id, endpoint)`, index on `user_id`. RLS: own-rows select/insert/delete (mirrors `workout_logs`); service-role reads all when sending. `platform` column is future-proofing for native iOS APNs on the same table + send path.
- `public/sw.js` — service worker. Handles `push` (renders `{title, body, url?, tag?}` with `/favicon.ico` icon) and `notificationclick` (focuses an open Duravel tab and routes it, else opens a window; default target `/dashboard`).
- `lib/push/send.ts` — `sendPushToUser(userId, payload)` fan-out + `pushConfigured()`. **Build-safe**: `web-push` is imported dynamically via a variable specifier, and its shape is a local `WebPushLike` type (NOT `typeof import("web-push")`), so the app type-checks and builds *before* `npm i web-push` and without `@types/web-push`. Best-effort: no-ops (zero sent) if VAPID unset or package missing; prunes 404/410 (dead) endpoints.
- `app/api/push/subscribe/route.ts` — POST, auth'd, zod-validated; upserts the browser subscription on `(user_id, endpoint)`.
- `app/api/push/unsubscribe/route.ts` — POST, auth'd; deletes the caller's row by endpoint.
- `app/api/push/test/route.ts` — POST; sends a test notification to the caller's own devices (verifies SW→subscribe→send→show end-to-end from Settings). 503 if unconfigured, 409 if no subscriptions.
- `components/settings/push-toggle.tsx` — `"use client"` "Workout reminders" toggle. Registers the SW, `pushManager.subscribe({applicationServerKey})`, POSTs to `/api/push/subscribe`; off → unsubscribe + `/api/push/unsubscribe`. Shows a "Send a test notification" link when on. Degrades to a hint where the Push API is unavailable (e.g. iOS Safari outside an installed PWA).

**Edited**
- `lib/env.ts` — added 4 optional vars to both `EnvSchema` and `rawEnv`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `app/settings/connections/page.tsx` — renders `<PushToggle>` (below the Strava toggle), gated by `env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` so it stays hidden until keys are configured.
- `.env.example`, `.env.local.example` — documented the 4 VAPID vars + the generate/install steps.

## ⚠️ Before this builds — 3 owner steps (all quick, all yours)
```
cd C:\dev\duravel
npx web-push generate-vapid-keys      # prints a Public + Private key
npm i web-push                        # runtime dependency (send.ts)
```
Then put the keys in `.env.local` (public key goes in BOTH VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY):
```
VAPID_PUBLIC_KEY=<public>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:support@duravel.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
```
Apply the migration (Supabase SQL editor or CLI):
```
supabase/migrations/0036_push_subscriptions.sql
```
(Toggle stays hidden until `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set, and sends no-op until `web-push` is installed + keys present — so the app builds and runs fine even if you commit before doing the above.)

## Verify + commit (from Windows CMD)
```
npm run build        # type-check must pass (build-safe before web-push install)
npm test             # unchanged; golden-HYROX unaffected, no new/changed snapshots

git add lib/env.ts lib/push/send.ts ^
        app/api/push/subscribe/route.ts app/api/push/unsubscribe/route.ts app/api/push/test/route.ts ^
        components/settings/push-toggle.tsx app/settings/connections/page.tsx ^
        public/sw.js supabase/migrations/0036_push_subscriptions.sql ^
        .env.example .env.local.example ^
        Handoffs/Duravel_Handoff_web-push.md
git commit -m "feat: web-push groundwork (subscriptions table, SW, subscribe/test routes, send helper, reminders toggle)"
```
(Lock → `del .git\index.lock`.)

## Manual smoke test (after keys + migration + build)
1. `npm run dev`, sign in, go to Settings → Connections → toggle **Workout reminders** on → grant permission.
2. Click **Send a test notification** → a "Duravel" notification should appear; clicking it opens/focuses `/dashboard`.
3. Toggle off → row removed; test send returns 409.

## Next (deferred — the real re-engagement value)
- **Triggers**: wire `sendPushToUser` into the existing `app/api/cron/lifecycle` cron — "workout due today", "week review ready", "streak at risk". Gate behind a per-user preference (mirror the Strava opt-out) + quiet hours. This is the payoff; the groundwork above is what makes it a small follow-up.
- **Native APNs**: after the iOS app lands — Capacitor `@capacitor/push-notifications` registers and hands its APNs token to the SAME `/api/push/subscribe` with `platform: 'ios'`; one dispatcher fans out by platform.
