# Duravel — Session Handoff

**Saved:** 2026-07-20 (Mon) 3:22pm ET · **Session type:** Backlog build — #14, #19 + #17 assessment
**Continues:** `Duravel_Handoff_07-20-26_3.02pm.md`. #15/#16 confirmed deployed + verified by Levi (migration 0030 applied, ADMIN_EMAILS set, /admin gating works).

---

## 1. Headline

**#14 and #19 shipped + cloud-verified.** Only **#17 remains** — and its headline piece (scraping hyresult.com) is a legal/ToS decision that's Levi's to make, and its push-notification piece is a separate infrastructure build. Details + options in §4.

**2 unpushed commits** (`eb22237` #14, `2ad6d9e` #19).

Full backlog status: **#7 ✅(already built) · #8 ✅ · #9 ✅ · #10 ✅ · #12 ✅ · #13 ✅ · #14 ✅ · #15/#16 ✅ · #18 ✅ · #19 ✅ · #11 dropped · #17 ⏸ (decision needed).**

---

## 2. What shipped this session

- **`eb22237`** — #14 generation-cost analytics. `lib/generation-cost.ts` (PURE, 6 tests): `rollupGenerationCost` — avg token cost per run, split by kind (create vs recalculate) and correlated with program type / length / race count / input-data volume. `lib/admin-metrics.ts` joins `generation_events` (usage already stamped by migrations 0003/0004/0012) with program attributes. `/admin/metrics` page (admin-gated). Linked from `/admin`.
- **`2ad6d9e`** — #19 Race for Impact donation tracker. Migration `0031_fundraiser` (single editable row, public-read RLS). `lib/fundraiser.ts` (PURE, 4 tests: progress %, cents↔dollars). Public **`/impact`** progress page (raised/goal/bar/donate button — for the IG bio link). Admin editor at **`/admin/impact`** (`updateFundraiser` service-role action). Linked from `/admin`.

Both need **migration 0031 applied** (only #19 adds one) + `git push`.

---

## 3. GO-LIVE
1. **Apply migration `0031_fundraiser.sql`** (Supabase) — for #19.
2. **`git push origin main`** (`eb22237`, `2ad6d9e`).
3. #19: open `/admin/impact`, set goal + raised + donate link; then `/impact` is your public tracker.
4. #14: `/admin/metrics` populates as programs generate (uses already-stamped usage).

---

## 4. #17 — decomposition + what's blocking (DECISION NEEDED)

Task #17 bundles five separate things:

1. **hyresult.com race-result lookup by name (HYROX/DEKA/Ironman) + confirm flow** — ⚠️ **BLOCKED on a legal/ToS decision.** Scraping a third-party site into the production app can create liability + breaks if their markup changes; the cloud sandbox also can't fetch arbitrary sites. **Needs Levi's call:** (a) check hyresult's ToS / ask them for an API or permission, or (b) skip auto-lookup and use manual entry. Recommend confirming permission before any scraper is written.
2. **Manual race-time / benchmark entry** — ✅ **largely already exists** (`ProfileSchema.benchmarks`: mile/5K/10K, 5RM lifts, ski/row 2k, bike cals, CSS, FTP, DEKA anchors). A dedicated "past race finish time" benchmark could be added if wanted.
3. **Days/week can train vs currently train** — partially exists (`trainingDays` = which days). "How many you currently train" (baseline) is a small profile addition that could seed starting volume.
4. **Equipment available** — genuine gap. Worth adding to onboarding + threading into the generation prompt so sessions fit the athlete's equipment. Touches `ProfileSchema` + a migration (profiles column) + `onboarding-form.tsx` (41 KB) + `lib/ai/prompts.ts` (would update the prompt snapshot — fine, a deliberate change, unlike the sacred golden-HYROX).
5. **Push-notification workout reminders** — a separate infrastructure build. Native push is part of the iOS lane (APNs, gated on Apple Developer enrollment); web push (service worker + Web Push API + VAPID) is a standalone build. **Needs a scope decision.**

**Recommendation:** build #17.3 + #17.4 (training-frequency + equipment, wired into generation) as a clean self-contained slice; get a ToS/permission answer before touching #17.1 (hyresult); scope push (#17.5) with the iOS lane. Awaiting Levi's direction.

---

## 5. Where things live
- #14: `lib/generation-cost.ts` (+test), `lib/admin-metrics.ts`, `app/admin/metrics/page.tsx`.
- #19: `supabase/migrations/0031_fundraiser.sql`, `lib/fundraiser.ts` (+test), `lib/fundraiser-data.ts`, `app/impact/page.tsx`, `app/admin/impact/{page,actions}.ts(x)`, `components/admin/fundraiser-editor.tsx`.
- Git-bridge gotcha unchanged (mv `.git/*.lock`+`tmp_obj_*` aside; push needs Levi). Commits authored as Levi, no AI-vendor references.
