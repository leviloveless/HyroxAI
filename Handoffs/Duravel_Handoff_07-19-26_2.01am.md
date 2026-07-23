# Duravel — Session Handoff

**Saved:** 2026-07-19 (Sun) 2:01am ET · **Session type:** reconciliation + shipping + planning
**Covers:** the 2026-07-18 working session (ran past midnight into 07-19).
**Supersedes:** `Duravel_Handoff_07-18-26_2.56pm.md` (that one only covered the early reconciliation; this one is the full session).
**Naming standard (mandatory):** `Duravel_Handoff_MM-DD-YY_H.MMam/pm` in `C:\dev\duravel\Handoffs` (fallback: OneDrive `Training Program App\Handoffs` + notify). See CLAUDE.md and memory `duravel-handoff-rule`.

---

## 1. What shipped this session (all committed + pushed to `main`)

1. **Reconciled the scattered handoffs** against the real repo. Big corrections: **triathlon (70.3 + 140.6) is already built and live on `main`** (9-sport engine), and the **$119.99 copy fix was already in the working tree**.
2. **$119.99 pricing is LIVE** — committed (`2f2287d`) + pushed + deployed. `pricing-plans.tsx` + `TrialEnding.tsx` show $119.99 / "$10/mo" / "Save 50%". Resolved the long-standing price mismatch.
3. **Fixed a broken Vercel build** — committing the `Apple/` iOS artifacts (which contain `.ts` files importing `@capacitor/*`) broke `next build`'s type-check; added `Apple` to `tsconfig.json` `exclude` (alongside `_phase3_draft`). Build green.
4. **Privacy policy updated** — added a "Connected services & wearables" section (Strava, Garmin, Apple Health) with no-sale/no-ads + disconnect/delete language, and filled in the legal entity **Duravel LLC**. This was a Garmin-review prerequisite; it also closed a gap where Strava was live but undisclosed.
5. **Garmin application submitted, then the program PAUSED.** Applied as Duravel LLC (Activity + Health API). Garmin then **paused the Connect Developer Program to new applications (no reopen date)** — so Garmin is now externally blocked.
6. **Built a combined multi-provider integration spec** → `docs/future-phases/20-multi-source-health-integrations.md` (Apple Health, WHOOP, Oura, + Aura assessment) — the pivot away from Garmin.
7. **Set the mandatory handoff-naming rule** (memory + CLAUDE.md), built the **living roadmap** (`Duravel_Roadmap_Planned_vs_Actuals.html`), and filed the previously-loose artifacts into the repo (`docs/artifacts/`, `Apple/Duravel_iOS_HANDOFF.md`, older handoffs into `Handoffs/`).

---

## 2. Wearable strategy after the Garmin pause (key decision)

All providers feed **one shared ingestion pipeline** (canonical `wearable_activities` + new `wearable_daily_metrics`, column-merge upsert, AES-GCM token encryption, `after()` async, cross-provider dedup). Each provider is a thin adapter. Full detail + endpoints + gotchas in `docs/future-phases/20-…`.

- **Oura — BUILD FIRST.** Self-serve free OAuth, richest HRV/sleep/readiness, no app/approval gate. Raw HRV + resting-HR live in the detailed `sleep` endpoint. Refresh tokens rotate (single-use).
- **WHOOP — 2nd.** Self-serve API v2 + webhooks (HMAC-SHA256). **Two catches:** 10-user cap until app approval (Typeform — start early), and a **ToS that restricts permanent copies / caching and forbids sharing even with consent → resolve the retention question before building.**
- **Apple Health — with the iOS app.** On-device only (no cloud API); read in the native app, push to backend. **No off-the-shelf Capacitor plugin covers HRV+sleep-stages+RHR+VO2max+background delivery → custom Swift plugin required.** Gated on the iOS lane.
- **Aura — DROPPED.** No public API; it's a content app that *consumes* activities from Strava/Garmin (a data sink). Same activities already arrive via the live Strava integration → use Strava. Revisit only if Aura ships an API.

---

## 3. Reconciled status

**DONE / LIVE:** Stripe billing ($19.99/mo · $119.99/yr, copy now correct + deployed); Resend email infra; auth confirm + forgot-password; HYROX engine (byte-identical gate); 5 DEKA formats; **triathlon 70.3 + 140.6**; General Fitness; DekaFit `/deka`; wearables Strava import; `daily_metrics` layer (mig 0026); lifecycle email system built+committed (**gated off**); privacy-policy wearables disclosure; multi-provider integration spec; living roadmap.

**IN PROGRESS / PARTIAL:** shared ingestion foundation (~40%); Strava→pipeline refactor + dedup (~25%); result-card wiring into app flows (~30%); triathlon full-MVP polish + live QA (~70%); multi-sport strength/cardio specs (drafted, not in repo ~20%); **Oura adapter (spec ready, ~10%)**.

**NOT STARTED:** lifecycle-email go-live wiring (webhook/unsub/pref-center/welcome+receipt) + `EMAIL_ENABLED`; iOS integration (Parts 1–7 generated only) + build/TestFlight/submit; WHOOP + Apple Health adapters; Strava branded activity-write; cards→iOS share sheet; self-validation race season.

**BLOCKED (external):** **Garmin Dev Program — PAUSED to new apps (no reopen date).** Apple Developer enrollment / D-U-N-S — not started; **now the top long-lead gate.**

---

## 4. Reminders set 2026-07-18 (push + email)

- **Garmin reopen check** — weekly Wednesdays — `trig_01D6JKaEDc5tQJuxUZUV3who`
- **Apple Dev + D-U-N-S status** — Mon/Wed/Fri (practical "every other business day") — `trig_011VBDDmd9h7kZEs5iFSiJuo`
- **Mercury bank re-apply** — one-shot Jul 31 — `trig_01LUaYCtgP6wAsGGcx4hTGv6`

---

## 5. Next actions (highest leverage first)

1. **Build the Oura integration** on the shared pipeline — the near-term win now that Garmin is paused. Spec ready.
2. **Start Apple Developer / D-U-N-S enrollment** — now the top long-lead gate (blocks the whole iOS lane + Apple Health).
3. **WHOOP:** start the app-approval Typeform early **and resolve the ToS retention question** before building.
4. **Mercury:** re-apply Jul 31 (reminder set) — have LLC docs, EIN letter, proof of address ready.
5. Then: lifecycle-email go-live wiring + `EMAIL_ENABLED`; result-card wiring; iOS integration once enrolled.

---

## 6. Constraints / gotchas (don't relearn)

- **Cloud device-bridge writes to `C:\dev\duravel`** reached the native Windows repo this session (verified via `git status`), but history says it's intermittent — **always verify with `git status` after cloud writes.**
- Cloud session can `git push` but **cannot open PRs** (add_repo gate) — open manually at `github.com/leviloveless/Duravel/compare/main...<branch>?expand=1`.
- **Windows `cmd.exe`, not bash:** one command per line, no `\` continuation, no `$` escaping needed.
- **Never break the golden-HYROX byte-identical test.**
- iOS archive/sign/upload is **macOS/Xcode or Codemagic only.**
- iOS billing model (Apple IAP vs external Stripe link) is an **open decision** — confirm before wiring the paywall.
- **Anything with a `.ts`/`.tsx` extension gets type-checked by `next build`** unless under an excluded dir (`Apple`, `_phase3_draft`) — keep future non-app artifacts there.
- **Do NOT reference Claude / AI vendor in Levi's public artifacts or commit messages** (his instruction — not advertising Claude).

---

## 7. Where things live

- **Living roadmap:** `C:\dev\duravel\Duravel_Roadmap_Planned_vs_Actuals.html` (artifact `duravel-roadmap-planned-vs-actuals`) — update `ROWS`/`MILESTONES` each session.
- **Wearable integration spec:** `docs/future-phases/20-multi-source-health-integrations.md`. Garmin spec (parked): `docs/future-phases/11-garmin.md`.
- **iOS build artifacts:** `Apple/` (Parts 1–7 + `Duravel_iOS_HANDOFF.md`, `Duravel_iOS_Morning_ToDo.md`).
- **Handoffs:** `Handoffs/`. **Artifact PDFs:** `docs/artifacts/`.
- **Project memory:** desktop persistent memory (`MEMORY.md` + topic files incl. `duravel-wearable-integrations`, `duravel-handoff-rule`).
