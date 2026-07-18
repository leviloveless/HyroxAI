# Duravel — Multi-Source Wearable & Health Integrations: Design & Build Spec

**Status:** Preparatory design for a future phase. Research + design only — no code, migrations, or deployment changes are made by this document.
**Scope:** Import each user's **activities** and **daily health metrics** (HRV, sleep, resting HR, readiness/recovery) from **Apple Health, WHOOP, Oura**, plus an assessment of **Aura** — all normalizing into the same shared ingestion pipeline that Garmin was designed to feed.
**Date:** 2026-07-18
**Owner:** Levi (solo founder) · **Repo:** `C:\dev\duravel` (Next.js 16 App Router, React 19, TS strict, Supabase, Vercel)
**Companion doc:** `docs/future-phases/11-garmin.md` (the Garmin build spec — this doc reuses its shared-pipeline design and its hard-won corrections).
**Trigger for this doc:** The **Garmin Connect Developer Program was paused to new applications on 2026-07-18** with no announced reopen date. Rather than block the entire wearable/readiness strategy on Garmin's clock, this spec pivots to the other viable sources so the readiness engine still gets fed.

---

## 0. The thesis (unchanged from Garmin): build the foundation once

Every provider here is a source of the **same two things**: completed **activities** and daily **wellness signals**. The engine does not care where a run or an HRV reading came from. So we build the canonical ingestion layer **once** and make each provider a **thin adapter** that maps its payloads into our canonical shapes. This is the exact spine from the Garmin spec (§0/§1 there); Garmin being paused does not change the architecture, only which adapter we build first.

- **Activities** reuse the proven Strava contract: a synced activity becomes a `workout_log` write → feeds ACWR / monotony / readiness with **zero `lib/engine/*` changes**.
- **Daily health metrics** (HRV, sleep, resting HR, readiness/recovery) are the genuinely new plumbing — one `wearable_daily_metrics` table, provider-keyed, **column-merge upsert** (never blind whole-row upsert, or one provider's partial push nulls another's columns — Garmin spec §0.3).

> **Naming note:** the roadmap calls the canonical layer "`sessions` + `wellness_daily`." In the repo today the activity side is `wearable_activities` (migration `0016`) + link table (`0017`). This spec keeps the existing `wearable_activities` for activities and adds `wearable_daily_metrics` for wellness. Treat "sessions/wellness_daily" and "wearable_activities/wearable_daily_metrics" as the same concept.

---

## 1. Shared ingestion architecture (built once, used by every provider)

This section is provider-agnostic. Each provider in §3 only supplies an adapter that fills these shapes.

### 1.1 Canonical data model (additions continue from Garmin's `0019`)
- **`wearable_connections`** — generalize the Garmin spec's `garmin_connections` into one table with a `provider` column (`'strava' | 'garmin' | 'whoop' | 'oura' | 'apple_health'`). Columns: `user_id`, `provider`, `provider_user_id`, `access_token_enc`, `refresh_token_enc`, `token_nonce`, `access_expires_at`, `refresh_expires_at`, `scopes text[]`, `health_ingest_on bool`, `status`, `last_sync_at`. PK `(user_id, provider)`. Apple Health is the exception — it has no server tokens (see §3A), so it stores only `provider='apple_health'`, `status`, `health_ingest_on`, `last_sync_at`.
- **`wearable_activities`** (exists, `0016`) — add `provider`, `external_id`, `raw_payload` if not present. Unique `(user_id, provider, external_id)`, built `CONCURRENTLY` with a dedup/backfill first (Garmin spec §0.4).
- **`wearable_daily_metrics`** (new) — `(user_id, provider, date)` PK; nullable columns for `hrv_ms`, `resting_hr`, `sleep_total_min`, `sleep_deep_min`, `sleep_rem_min`, `sleep_light_min`, `sleep_awake_min`, `sleep_score`, `readiness_score`, `respiratory_rate`, `vo2max`, `raw_payload jsonb`. **Column-merge upsert only.**
- **`wearable_oauth_states`** — generalize Garmin's `garmin_oauth_states` (PKCE/state, verifier server-only, short TTL) for all OAuth providers.
- All RLS-protected; owner may **read** own rows; **service-role only** for writes (webhook/callback context has no user session).

### 1.2 Token security (all cloud providers)
App-level **envelope encryption (AES-256-GCM)**, key in Vercel env, ciphertext in `wearable_connections`; refresh **rotates** stored tokens. Never store plaintext refresh tokens. (Garmin spec §0.7.)

### 1.3 Async / freshness primitive
Primary: Next.js 16 **`after()`** to pull detail / validate / upsert *after* the 200 response inside the same invocation. Webhook ping-inbox table as a **durability/retry backstop** reconciled by a low-frequency job — **not** a daily Vercel Cron as the hot path (Garmin spec §0.2). Apple Health is the exception (on-device push, not webhook — §3A).

### 1.4 Cross-provider dedup (mandatory once >1 activity source is live)
The same run can arrive from Strava **and** Whoop **and** Apple Health. Dedup key = `(user, sport, start_time±window, duration±window)` collapsing to one canonical activity, preferring the richest source. This is already flagged as mandatory in the Garmin spec; with 2–4 activity sources it is non-negotiable. Health metrics do **not** dedup across providers — keep them provider-separate and let the readiness layer pick a priority source per metric (see §1.5).

### 1.5 Readiness mapping (how wellness feeds the engine)
Readiness auto-fill pre-populates `readiness_checkins` with objective signals; the human still confirms. When multiple providers report the same metric (e.g. HRV from both Oura and Whoop), apply a **per-metric source priority** (configurable; sensible default: a dedicated HRV wearable > watch). Purely additive; never overwrites user input.

### 1.6 Privacy, disconnect, delete (all providers)
- Per-provider **disconnect** deregisters/revokes at the provider, purges tokens, and offers **"delete my health data."**
- Independent **"keep activities, stop health ingest"** toggle (`health_ingest_on`).
- Privacy policy already updated (2026-07-18) to name Strava, Garmin, and Apple Health — **add WHOOP and Oura to that list** when they ship.
- Feature flag **`WEARABLES_ENABLED`** (or per-provider flags `WHOOP_ENABLED`, `OURA_ENABLED`, `HEALTHKIT_ENABLED`) gates each surface independently of billing.

---

## 2. Provider comparison at a glance

| | **Apple Health** | **WHOOP** | **Oura** | **Aura** |
|---|---|---|---|---|
| **Gives activities** | ✅ (HKWorkout) | ✅ (workout) | ✅ (workout) | ❌ (no API) |
| **Gives HRV / sleep / RHR** | ✅ (sparse, Watch) | ✅ (recovery/sleep) | ✅ (richest) | ❌ |
| **Access model** | On-device only (no cloud API) | Cloud REST v2 + OAuth | Cloud REST v2 + OAuth | **No public API** |
| **Needs the iOS app** | ✅ yes | ❌ no | ❌ no | n/a |
| **Webhooks** | n/a (on-device push) | ✅ HMAC-signed | ✅ subscription + challenge | n/a |
| **Dev access** | Apple Dev acct + HealthKit entitlement | Self-serve; **10-user cap until app approval** | Self-serve; verification review for scale | None |
| **Rate limit** | n/a | 100/min · 10k/day (per app) | 5,000 / 5 min (per app) | n/a |
| **Cost** | Apple Dev ($99/yr) | Free to register | Free to register | n/a |
| **Biggest catch** | Custom native plugin needed | ToS: no permanent copies / cache limits | Refresh tokens single-use (rotate) | Data **sink**, not source |
| **Feasibility now** | Gated on iOS app | **Ready to build** | **Ready to build** | **Skip — use Strava** |
| **Recommended priority** | With iOS build | 2nd (start approval early) | **1st (cleanest)** | Dropped |

---

## 3. Per-provider adapters

### 3A. Apple Health (HealthKit)

**Reality check — on-device only.** HealthKit has **no server/cloud API**. You cannot pull a user's Apple Health data from Supabase. All reads happen **inside the native iOS app**, then get pushed to the backend. This makes Apple Health **dependent on the iOS app** (already on the roadmap) — it cannot ship as a pure web integration like Oura/Whoop.

**Data types to request (read-only):**
- HRV — `heartRateVariabilitySDNN` (ms; irregular sampling, clustered overnight).
- Sleep — `sleepAnalysis` category; stages on iOS 16+ (`asleepCore`, `asleepDeep`, `asleepREM`, `awake`, `inBed`). Arrives as many overlapping segments → **stitch server-side**.
- Resting HR — `restingHeartRate` (bpm, ~1/day).
- Workouts — `HKWorkout` via `HKAnchoredObjectQuery` on `workoutType()`; includes activity type, duration, energy, distance, route.
- VO2max — `vo2Max` (sparse, ~weekly); Respiratory rate — `respiratoryRate` (sleep-captured).

**Sync design:**
- Incremental: `HKAnchoredObjectQuery` + persisted `HKQueryAnchor` per type → send only deltas (handles deletions too).
- Background: `HKObserverQuery` + `enableBackgroundDelivery(frequency:)` (`.hourly`/`.daily`); on wake run the anchored query, POST to Supabase, then **call the observer completion handler** (mandatory). Requires the `com.apple.developer.healthkit.background-delivery` entitlement + HealthKit background mode.
- Foreground anchored sync on every app launch as the reliable baseline (background delivery is best-effort / throttled ~hourly).

**App Store review rules (Guideline 5.1.3 / HealthKit):** no HealthKit data to iCloud; never for advertising; never sold; privacy policy must name HealthKit (done). Syncing to **your own** disclosed backend is allowed. Info.plist: `NSHealthShareUsageDescription` (required; read-only, so `NSHealthUpdateUsageDescription` optional).

**Capacitor plugin gap (important build cost):** As of 2026, no off-the-shelf plugin (`@capgo/capacitor-health`, `mley/capacitor-health`, `perfood/capacitor-healthkit`) covers the full set (HRV + sleep stages + RHR + VO2max + respiratory) **and** none expose observer / background-delivery / anchored-sync. **Plan for a custom native Swift Capacitor plugin** — cheapest path is forking `@capgo/capacitor-health` and adding the missing identifiers, anchored incremental queries (return the anchor to JS), and observer + background-delivery registration.

**Gotchas:** read authorization is opaque (iOS won't tell you a read was denied — detect by empty results, tolerate missing streams); no historical-backfill guarantee; metrics need an Apple **Watch** (iPhone-only users have almost none); Simulator has no Health data (QA on real device + Watch); read units explicitly (`HKUnit`).

---

### 3B. WHOOP

**API:** base `https://api.prod.whoop.com/developer/`, **v2** (v1 legacy; v1 webhooks removed 2025-11-01). OAuth 2.0 auth-code; authorize `…/oauth/oauth2/auth`, token `…/oauth/oauth2/token`. `state` required (≥8 chars). Access token ~1h; **refresh only if `offline` scope requested** (refresh rotates tokens). **PKCE unconfirmed — plan for confidential-client (server-side secret)**, which fits our Next.js/Supabase backend.

**Scopes / endpoints:** `read:recovery`, `read:sleep`, `read:workout`, `read:cycles`, `read:profile` (+ `offline`).
- Recovery — `v2/recovery` and `v2/cycle/{id}/recovery`: `recovery_score`, **`hrv_rmssd_milli` (HRV)**, **`resting_heart_rate`**, `spo2`, `skin_temp`, `score_state`.
- Sleep — `v2/activity/sleep`: stage durations, `respiratory_rate`, `sleep_performance_percentage`.
- Workout — `v2/activity/workout`: `strain`, avg/max HR, `zone_durations`, distance.
- Cycle — `v2/cycle`: strain/HR (a "cycle" = a WHOOP physiological day). **No cycle webhook — poll.**
- v2 IDs for sleep/workout are **UUIDs** — schema accordingly.

**Webhooks:** `recovery.updated/deleted`, `workout.updated/deleted`, `sleep.updated/deleted`. Payload = IDs only (`{user_id, id, type, trace_id}`) → follow-up authenticated GET. Verify with `X-WHOOP-Signature` + timestamp = **HMAC-SHA256(timestamp + raw_body, client_secret)**, base64. Retries 5×/~1h. (In v2, recovery webhooks key off the **sleep UUID**.)

**Access & limits:** self-serve dashboard, up to 5 apps, free. **Dev apps capped at 10 WHOOP members** until **app approval** (Typeform: accept API terms, privacy policy URL, brand guidelines). **Start the approval process early** — it gates real multi-user testing. Rate limit **100/min · 10,000/day per app** (not per user) — request an increase before scaling.

**⚠️ ToS decision (the single biggest issue):** WHOOP terms restrict "building databases / permanent copies" and caching **beyond the cache-header window**, and prohibit selling/sharing data with third parties **even with user consent**. A naive "import everything into Supabase forever" design likely conflicts. **Confirm the permitted retention window and design refresh/retention around it before building — may need legal/partner clarification.** Also: hard-delete on disconnect/revocation; encrypt in transit + at rest; display WHOOP attribution.

**Gotchas:** `score_state` can be `PENDING_SCORE`/`UNSCORABLE` (score object absent — handle nulls); webhooks are ID-only (every event → a GET, budget against 100/min); PKCE + refresh-lifetime + exact cache window all **to confirm**.

---

### 3C. Oura

**Cleanest of the three — recommend first.** Self-serve, free, open OAuth, richest readiness/HRV data.

**API:** data base `https://api.ouraring.com/v2/usercollection/…`. OAuth 2.0 auth-code (multi-user): authorize `https://cloud.ouraring.com/oauth/authorize`, token `https://api.ouraring.com/oauth/token`. **Refresh tokens are single-use / rotating — persist the new one each refresh.** Use OAuth (not Personal Access Tokens, which are single-account and being deprecated). Scopes: `daily`, `heartrate`, `workout`, `session`, `personal`, `spo2`, `tag`.

**Endpoints / where HRV & RHR live:**
- `daily_readiness` — `score` + contributors (`hrv_balance`, `resting_heart_rate` as 0–100 sub-scores, not raw).
- `sleep` (detailed) — **raw values here:** `average_hrv` (ms), `average_heart_rate`, **`lowest_heart_rate` (nightly resting proxy)**, stage durations, 5-min HRV/HR series.
- `daily_sleep` — score + contributors only.
- `daily_activity` — steps, calories, activity minutes, MET.
- `workout` — discrete workouts (activity, start/end, intensity, calories, distance).
- `heartrate` — day/night 5-min bpm series (needs `heartrate` scope).
- **RHR:** no single bpm field — use `sleep.lowest_heart_rate`; use the readiness contributor for normalized trend.

**Webhooks:** subscription API (list/create/update/renew/delete) per `data_type` + `event_type` (`create`/`update`/`delete`); callback **challenge/verification handshake** (echo a token). Payload is a pointer → still GET the record. Subscriptions expire → renew. Pair with a periodic reconciliation poll. *(Exact handshake headers unconfirmed — verify in portal.)*

**Access & limits:** self-serve OAuth apps at **developer.ouraring.com**, free; sandbox with sample data. Rate limit **5,000 / 5-min window per app**. Unverified apps limited to a small number of test users until a **verification review** — *(exact cap unconfirmed; verify — affects rollout).*

**Gotchas:** ring-not-worn → absent records (nulls, don't interpolate); data latency several hours (fetch ~7–10 AM local; use `update` events for late rescoring — **treat records as mutable, upsert by `id`**); insufficient scope → **empty arrays, not errors** (verify granted scopes at connect); per-record timezones (normalize per user); app-wide rate limit → prefer webhooks + windowed pulls over per-user polling.

---

### 3D. Aura (shareaura.app) — **do not build; covered by Strava**

**Finding: Aura has no public developer API, OAuth, or export.** "Share Aura: Track & Create" (Aura Movement Technology, Inc.; founder Zach Pogrob; iOS-only, launched Aug 2025) is a **content-creation / social-sharing** app that turns activities into stylized posts. Critically, its integrations (Strava, Garmin, Wahoo, Zwift, Suunto) are **inbound** — Aura **consumes** activities from those services. **Aura is a data sink, not a data source:** there is nothing to import *from*, no GPX export, no read API.

**Recommendation:** **Skip Aura.** The same activities a user pipes into Aura already live in **Strava**, which Duravel already integrates via a mature public OAuth API. Offering "Connect Strava" (already live) captures the identical data with a supported API. Revisit Aura only if it later ships a public API; to request one you'd cold-contact the founder (no published API/partnership channel exists). *(Aura's site is a JS SPA, so a hidden endpoint can't be 100% ruled out — but none is advertised or discoverable; treat "no public API" as the working assumption.)*

---

## 4. Recommended sequencing (given Garmin is paused)

1. **Oura first.** Self-serve, free, open OAuth, richest HRV/sleep/readiness. Lowest friction, no app dependency, no ToS landmine. Ship the shared pipeline (§1) with Oura as the first cloud adapter.
2. **WHOOP second — but start the app-approval Typeform now** (it gates >10 users) **and resolve the retention/ToS question first** (§3B). Strong endurance-athlete overlap; worth it once the ToS path is clear.
3. **Apple Health alongside the iOS build.** Highest reach (every Apple Watch user) but gated on the native app + a **custom Capacitor plugin** — sequence it with the iOS lane, not before it.
4. **Aura: dropped** — Strava already covers those activities.
5. **Garmin: parked** — spec `11-garmin.md` stays ready; re-submit the instant the program reopens (weekly reminder set). Because everything here uses the same pipeline, Garmin becomes just another adapter when it returns.

Net: building §1 once means Oura, Whoop, Apple Health (and Garmin later) are each a small adapter, not a rebuild. Duravel gets HRV/sleep/readiness flowing into the engine **now** via Oura, without waiting on Garmin.

---

## 5. Legal / ToS watch-items (confirm before shipping each)
- **WHOOP:** no permanent copies / cache-window retention limit; no data sharing even with consent; hard-delete on disconnect; attribution. **← resolve before building.**
- **Oura:** API Terms (consent-scoped use, deletion honor, no reselling raw data, attribution); confirm storage/retention clauses.
- **Apple Health:** no iCloud storage, no ads, no sale; privacy policy names HealthKit (done).
- **All:** update the privacy policy's "Connected services & wearables" section to add WHOOP + Oura when they ship.

## 6. Open questions to confirm (from research, flagged honestly)
- WHOOP: PKCE support; refresh-token lifetime; **exact cache/retention window**; full v1 REST sunset date.
- Oura: webhook verification handshake specifics; exact unverified-app user cap + verification process; precise Terms storage clauses.
- Apple Health: final confirmation of background-delivery entitlement + `HKUpdateFrequency` caps against live Apple docs at build time; scope of custom-plugin work.

---

*Research basis (2026): developer.apple.com HealthKit docs + Capacitor health plugins; developer.whoop.com (API v2, OAuth, webhooks, app-approval, rate limits, terms); cloud.ouraring.com / developer.ouraring.com (API v2, OAuth, webhooks); shareaura.app + App Store listing for Aura. Items that could not be confirmed from a primary source are flagged inline as "unconfirmed / verify."*
