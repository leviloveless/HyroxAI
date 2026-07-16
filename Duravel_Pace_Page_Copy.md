# Duravel — Free Pacing Tool (`/pace`) Page Copy

_Created: July 14, 2026 · Companion to `Duravel_Phase3_Lifecycle_Email_Build_Plan.md`_
_This is the copy deck for the free goal-time / pacing calculator — the QR destination and top of the funnel. Voice: knowledgeable training partner, not marketer. Swap bracketed placeholders; tune to brand._

---

## SEO / metadata

- **URL:** `duravel.app/pace`
- **Title tag:** `HYROX Pacing Calculator — Free Goal-Time Splits | Duravel`
- **Meta description:** `Free HYROX pacing calculator. Enter your benchmarks and get the exact run splits and station targets to hit your goal finish time. No account needed.`
- **H1:** Know your HYROX splits before the gun.
- **OG image:** the card front / a splits-table preview.
- **Target keywords:** hyrox pacing calculator, hyrox goal time, hyrox run splits, hyrox pacing strategy, how to pace hyrox.

---

## 1. Hero

**Eyebrow:** FREE HYROX PACING TOOL

**H1:** Know your HYROX splits before the gun.

**Subhead:** Enter a few benchmarks and get the exact run splits and station targets to hit your goal finish — in about 60 seconds. No account, no fluff.

**Primary CTA (scrolls to calculator):** Get my splits →

**Trust line under CTA:** Free. Built by an amateur who got tired of guessing.

---

## 2. How it works (3 steps, above or beside the form)

1. **Enter your numbers.** Recent run benchmark, target finish, division. That's it.
2. **Get your race plan.** Per-run splits, station pacing, and where the time actually hides.
3. **Keep going (optional).** Want the training block that gets you there? Start a free trial.

---

## 3. The calculator form

**Section heading:** Your race, your numbers

**Intro microcopy:** The more honest your inputs, the sharper your splits. Estimates are fine — you can refine later.

**Fields**

- **Division** — `Open · Pro · Doubles · Relay` _(select)_
  microcopy: _Sets your station standards (e.g. sled and wall-ball loads)._
- **Sex** — `Female · Male` _(select)_
  microcopy: _Used for pacing and heart-rate math, not shown publicly._
- **Goal finish time** — `H : MM : SS` _(time input)_
  microcopy: _Your target for this race. Shoot honest — we'll tell you if the splits are realistic._
- **Recent run benchmark** — `distance + time` (e.g. 5 km in 22:30) _(paired input)_
  microcopy: _Any recent hard run. This anchors your run pacing._
- **Experience** — `First HYROX · A few races · Competitive` _(select)_
  microcopy: _Tunes how aggressively to pace the compromised runs._

**Submit button:** Calculate my splits →

**Below the form (reassurance):** No spam, no account to see your result. We'll email you a copy so you have it on race day.

---

## 4. Email-capture gate (shown with/just before the result)

**Heading:** Where should we send your splits?

**Body:** Drop your email and we'll send your pacing plan so it's in your pocket on race morning — plus the occasional training tip that's actually useful. Unsubscribe anytime.

- **First name** _(optional)_ — `First name`
- **Email** — `you@email.com`
- **Consent (required checkbox, unchecked):** Email me my splits and occasional HYROX training tips from Duravel.

**Button:** Send me my splits →

**Fine print:** We'll never sell your email. One-click unsubscribe in every message.

> _Build note: `src`/`race_tag` comes from the QR's `?src=` param; store with the lead (see build plan §8)._

---

## 5. The result screen

**Heading:** Your plan for a [GOAL_TIME] finish

**Lead line:** Here's how to pace it. The runs are where most amateurs lose the race — hold these and you'll pass people on the back half.

**Splits table (columns):** Segment · Target pace / time · Note

- Example rows: `Run 1 → [pace] → Bank nothing, this feels too easy`, `Compromised runs → [pace] → Expect +[x]s after stations, that's normal`, each station → target effort/time.

**Reality-check callout (dynamic):**
- If realistic: **This is an aggressive-but-achievable plan.** Nail the first two runs at pace and you've got margin.
- If a stretch: **Heads up — this goal needs the runs to hold under fatigue.** Doable, but it's a training problem, not a race-day one. (Then the trial CTA lands harder.)

**Conversion block (the bridge to the product):**

**Heading:** Splits are the *what*. Here's the *how*.
**Body:** Knowing your splits is step one. Hitting them takes a block built for it — easy days truly easy, hard days that rehearse the compromised runs, volume that ramps without breaking you. Duravel builds that block around these exact numbers and adapts it every week from what you log.
**Primary CTA:** Build my training plan — free for 14 days →
**Secondary CTA (ghost):** Email me my splits and I'll think about it
**Trust line:** No credit card. Cancel in two clicks. Keep your splits either way.

---

## 6. Why trust this (credibility strip)

**Heading:** Not another generic calculator

- **Station-aware, not just running.** Most calculators pace your runs and ignore the sleds, burpees, and wall balls that wreck your run pacing. This accounts for the compromised runs.
- **Built on your numbers.** Splits come from your benchmark and division standards, not a one-size table.
- **Made by someone who races.** Duravel is built by an amateur HYROX athlete for the same — [add: races completed / PBs / "training for SLC, Boston, and Dallas this year"].

---

## 7. FAQ

**Is it really free?**
Yes. The pacing tool is free and needs no account. We ask for your email only so you have your splits on race day; the full training app is a separate 14-day free trial.

**What's the difference between the tool and the app?**
The tool tells you *how to pace* a race you're already trained for. The app *gets you trained* — a full periodized HYROX block that adapts to how you actually perform.

**Do I need a credit card for the trial?**
No. Fourteen days, no card, cancel anytime.

**How accurate are the splits?**
They're as good as your inputs. Use an honest recent benchmark and they'll be a strong race-day anchor. They're a plan, not a promise — races have weather, sleds, and bad mornings.

**Will you spam me?**
No. You get your splits, a short run of genuinely useful training tips, and — if you're racing an event we're at — a race-week note. One-click unsubscribe always.

---

## 8. Footer CTA (page bottom)

**Heading:** Your next race is a training problem, not a mystery.
**Body:** Get your splits now. When you're ready to actually hit them, the plan's right here.
**CTA:** Get my splits → &nbsp;·&nbsp; Start free trial →

---

## Microcopy bank (reuse across states)

- Empty benchmark: _Add any recent hard run — even a rough estimate works._
- Loading: _Crunching your splits…_
- Success toast: _Splits sent. Check your inbox (and spam, just in case)._
- Error: _Couldn't send that — check the email and try again._
- Unsubscribe confirmation: _Done — you're off the list. Your splits are still yours to keep._
