# Duravel — Field Marketing & Race Activation

### Implementation-Ready Playbook & Asset Inventory

**Author:** Growth (prep phase) · **Date:** 2026-07-15 · **Status:** Final — assets built, ready to execute · **Owner:** Levi (solo founder) · **Repo:** `C:\dev\duravel` · **Feeds:** spec `12` (acquisition funnel)

> **Scope note.** This is the **physical / field** half of acquisition — how Duravel turns fixed-date HYROX races into tagged, opted-in leads. It is mostly *operational* (print, host, hand out, follow up) with a thin code dependency: the `?src=` source tagging consumed by spec `12`. Unlike the product bets in this pack, its schedule is **externally fixed by the race calendar** — the earliest date (DekaFit, Jul 25) is imminent, so a capture surface must be live *now*, even if it's the stopgap rather than the full `/pace` tool.

---

## 1. Goal & why it's not deferrable

Stand in front of the single most concentrated audience of the exact ICP — serious HYROX amateurs — that exists (a race start line) and convert scans into leads that spec `12` then nurtures to trial. The forcing function: **race dates are immovable.** You cannot "do the DekaFit activation in Q4." Either the funnel catches that traffic on the day or the traffic is gone. This is why a minimal capture surface (the stopgap, §4) ships ahead of the full product build.

**Confirmed race calendar (Levi competing):**
| Race | Date (2026) | Role in plan |
|---|---|---|
| DekaFit | Jul 25 | Recon + soft launch (pre-tool) |
| HYROX Salt Lake City | Sep 19 | **Primary activation** (flagship) |
| HYROX Boston | Oct 10 | Second activation, refined playbook |
| HYROX Dallas | Nov 21 | Q4 scale activation |

Cross-references: the same calendar drives spec `12`'s `lib/email/races.ts` and the `race_week`/`post_race` triggers, and the "Race Activation Schedule" tab of `Duravel_Launch_Calendar_and_Revenue_Model.xlsx`.

---

## 2. Assets already produced (inventory)

All committed to the repo; ready to use. (Marketing assets are intentionally **untracked** in git per the handoff §6 — keep them out of code commits.)

| Asset | Path | Purpose |
|---|---|---|
| Per-race QR cards (4 variants, print-ready 6×4in) | `marketing/Duravel_Race_QR_Cards_AllRaces.html` | Front hook + QR tagged `?src=<race>`; back = 3-step "what you get" |
| Single generic QR card | `Duravel_Race_QR_Card.html` (root) | Generic `?src=race` version |
| Standalone tagged QR PNGs | `marketing/qr/Duravel_QR_{dekafit,slc,bos,dal}.png` | Drop into any design; high error-correction |
| HYROX Pacing Guide (lead magnet) | `marketing/Duravel_HYROX_Pacing_Guide.pdf` | 2-page PDF; the promise fulfilled at capture. Accurate to official 25/26 loads |
| Stopgap capture page | `marketing/Duravel_Pace_Capture_Landing.html` | Interim capture before `/pace` ships (see §4) |
| `/pace` page copy | `Duravel_Pace_Page_Copy.md` (root) | Full copy deck for the real tool (spec `12`) |
| Lifecycle email templates | `Duravel_Email_Templates.html` (root) | The 7 nurture emails (spec `12` §2.3) |
| Launch calendar + revenue model | `Duravel_Launch_Calendar_and_Revenue_Model.xlsx` (root) | 90-day plan, race activation tab, email-sequence tab |
| Go-live runbook (capture page) | `Duravel_GoLive_Runbook_CapturePage.md` (root) | Host + connect the stopgap in ~30 min |
| Deliverability runbook (Resend) | `Duravel_Resend_Deliverability_Runbook.md` (root) | `send.duravel.app` DNS + warm-up |

---

## 3. The activation playbook (per race)

**Pre-race (T-4 to T-1 wk)**
- Print that race's card variant (`marketing/Duravel_Race_QR_Cards_AllRaces.html`, print the pair double-sided). Rush/local print if the date is close.
- Confirm the capture surface is live and the QR resolves to it (`duravel.app/pace?src=<race>`).
- Schedule race-week content; pre-book any ambassador meetups.

**On-site**
- Hand out cards. The flow is: **scan → free tool (or stopgap) → email capture → 60-second live demo** of the app building a plan.
- Recruit ambassadors (athletes/coaches) in person.
- Every signup is tagged by race via the QR's `?src=`, so attribution is automatic.

**Post-race (T+1–2 days)**
- Spec `12`'s `post_race` email fires automatically ("How'd it go? → next block").
- Repurpose footage/testimonials into content and into spec `04` (social proof).
- Measure per-race capture→trial (the `email_subscribers.source` join from spec `12` §2.4).

---

## 4. The DekaFit stopgap (interim capture surface)

Because DekaFit (Jul 25) predates the full `/pace` build, `marketing/Duravel_Pace_Capture_Landing.html` is a **self-contained** capture page (no backend): mobile-first, `?src=` race-badge aware, honeypot-protected, POSTs JSON to a form backend (Formspree/Getform/Basin — see the go-live runbook). It promises the **pacing guide PDF**, not live splits (honest, since the calculator isn't built).

**Go-live:** follow `Duravel_GoLive_Runbook_CapturePage.md` — set `FORM_ENDPOINT`, fill the CAN-SPAM mailing address, host at `duravel.app/pace` (as `public/pace.html` + a `next.config.ts` rewrite keeps it on-domain so the QR works), test on a phone, arrange guide delivery.

**Retirement:** when spec `12` Phase A ships the real capture, retire the stopgap and import its opted-in leads into `email_subscribers` with the right `source`.

---

## 5. Dependencies & sequencing

- **Hard dependency:** a live capture surface — spec `12` Phase A **or** the §4 stopgap. Nothing else here works without one.
- **Soft dependency:** spec `12`'s `?src=` tagging + race triggers for full attribution and race-week/post-race automation. Without them the stopgap still captures (just with coarser attribution).
- **Feeds:** spec `04` (race testimonials → social proof), spec `12` (leads → nurture).
- **Effort:** near-zero engineering (the code is spec `12`'s); the work is print + host + show up + follow up. The only recurring build cost is regenerating a tagged QR per new race (one command; PNGs already exist for the four 2026 races).

## 6. Risks
- **Capture surface not live by race day** → the whole activation is wasted. Mitigation: the stopgap exists precisely to de-risk this; get it hosted before DekaFit.
- **Form-backend volume cap** → Formspree free is 50 submissions/mo; a big race can exceed it. Upgrade for the race month or use the unlimited Google-Sheet route (runbook §A-alt).
- **Deliverability on a cold domain** → start the Resend warm-up (deliverability runbook) weeks before SLC, not the week of.
- **Print lead time** → mailed print runs need ~1–2 weeks; DekaFit will need local/rush printing.

## 7. Definition of done (per race)
Card printed and tagged; QR resolves to a live capture surface; a test scan on a phone captures a tagged lead and delivers the guide; post-race follow-up fires (automated once spec `12` is live, manual for the DekaFit stopgap).
