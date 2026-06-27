# Aether Sales Playbook

> The goal of this document: **sign your first paying client this week.** Everything here is built to be used, not admired. Steal the scripts verbatim.

---

## 1. The offer & positioning

You are not selling "AI." You are selling an **outcome**:

> **Never miss a lead. Answer every customer, 24/7. Follow up before your competitor wakes up.**

What you actually deploy for a client with Aether:
- A **24/7 AI support agent** on their website (one-line widget install) that answers FAQs, captures intent, and never sleeps.
- **AI lead capture + qualification** — every inbound is scored 0–100, qualified with a one-line rationale, and gets an **instant, personalized follow-up** by email/SMS within seconds.
- **Back-office automations** — follow-up sequences, content drafting, and a weekly report so the owner sees the value.

**Positioning line (use this everywhere):**
> "I install an AI front desk on your website. It answers every customer instantly, captures every lead, and texts them back before they call your competitor — so you stop losing jobs you never even knew came in."

**Why small businesses say yes:** the typical SMB misses 20–40% of inbound calls/forms and replies hours later (often the next day). Speed-to-lead is the whole game — responding in minutes vs. hours is the difference between booking the job and losing it. You're selling recovered revenue, not software.

---

## 2. Three ideal-client niches

Pick **one** to start. Niching down makes your outreach, demo, and knowledge base reusable. (Aether's own demo data already models a dental practice and a plumbing co — these are deliberate.)

### A. Dental / medical / aesthetic practices
- **Pain:** front desk is slammed; after-hours inquiries go to voicemail; new-patient forms sit unanswered; no-shows.
- **What lands:** "Your front desk can't answer the phone and the website at the same time. The AI handles the website 24/7 and books the consult."
- **Value anchor:** one new patient is worth hundreds to thousands over their lifetime. Recovering even 2–3/month dwarfs your fee.

### B. Home services (plumbing / HVAC / electrical / roofing)
- **Pain:** owner is on a job, can't answer; emergencies go to whoever replies first; lead forms ignored till evening.
- **What lands:** "When someone's water heater is leaking at 9pm, they call the first company that answers. Now that's you — automatically."
- **Value anchor:** an emergency job is $300–$3,000+. One saved job/month pays your retainer many times over.

### C. Fitness / wellness / med-spa / studios
- **Pain:** website inquiries about classes/pricing/availability go cold; lots of "just looking" leads that need nurturing.
- **What lands:** "Every 'how much is a membership?' gets an instant, friendly answer and a follow-up — instead of silence."
- **Value anchor:** a membership is recurring revenue. A few extra sign-ups/month is pure margin.

> Honorable mentions with the same playbook: law firms (intake), real estate (lead speed), auto repair, and local professional services.

---

## 3. Packaging & pricing — what to charge YOUR clients

This is **separate** from the Aether SaaS plan you pay (Starter $49 / Growth $149 / Scale $399, in `src/lib/billing/plans.ts`). That's your cost. Below is your **revenue**.

Standard agency model: **one-time setup fee + monthly retainer.** Setup covers building the knowledge base, persona, widget install, and follow-up config. Retainer covers hosting, monitoring, tuning, and reporting.

| Tier | Setup fee | Monthly retainer | Best for |
|---|---|---|---|
| **Essential** | $500–$750 | **$297/mo** | Solo operators, single-location, simple FAQ |
| **Pro** | $750–$1,500 | **$497–$697/mo** | Busy practices/home-services with SMS follow-up + weekly reports |
| **Done-for-you** | $1,500–$2,500 | **$997–$1,500/mo** | Multi-location, white-label, content + full automations |

**Pricing rationale — anchor every number to ROI:**
- Frame against the value of a single new customer. "If this brings you **one** new patient/job a month, it's paid for several times over. Everything after that is profit."
- Your hard cost per client is a fraction of one Aether SaaS seat (Growth = $149/mo covers up to 15 client workspaces → ~$10/client). At a $497 retainer your gross margin is ~95%.
- **Never sell hourly.** Sell the outcome and the peace of mind.
- Offer **monthly, cancel-anytime** to kill risk objections, but pitch a 90-day commitment as the fair window to see results. Annual prepay = 1–2 months free.

**Quick math to say out loud on the call:**
> "You're at $497 a month. Your average job is ~$600. So the moment this saves you **one** job a month, we're even — and it's working every hour of every day."

---

## 4. The 7-day "sign your first client" plan

| Day | Action |
|---|---|
| **1** | Pick **one** niche. Build a 30-prospect list (Google Maps for your city + that niche; note name, site, phone, owner if findable). Spin up a **demo workspace in Aether** for that niche using your real product — brand color, persona, a few FAQs. |
| **2** | Send **10 cold emails** + **10 DMs** (scripts in §5). Personalize the first line per prospect (mention their site). |
| **3** | **Cold call 10** prospects using the opener in §5. Goal: book 3 discovery calls, not close on the call. Follow up day-1 emails. |
| **4** | Run discovery calls (§6). For anyone interested, build a **personalized demo** — load *their* FAQs/services into a workspace so the agent talks like their business. |
| **5** | Deliver demos. Wow them with the live widget + a fake lead getting scored and instantly followed up (demo script in §7). Send the one-page proposal (§8) same day. |
| **6** | Follow up everyone (sequence in §5). Handle objections (§6). Offer to "go live by Monday." |
| **7** | Close. Take the setup fee + first month, then onboard immediately (`docs/ONBOARDING.md`). Ask the new client for **1 referral** before you even start. |

> If you do this honestly, 30 touches → ~3–6 conversations → 1 client is a realistic week-one outcome. Volume fixes everything.

---

## 5. Outreach scripts

### Cold email #1 — the "missed lead" angle
> **Subject:** quick question about [Business]'s website
>
> Hi [First name],
>
> I looked at [Business]'s site — when someone fills out the contact form or messages at night, how fast do they hear back?
>
> I install an AI assistant that answers your website visitors instantly, 24/7, and texts new leads back within seconds — so you stop losing jobs to whoever replies first.
>
> Want me to build a free demo using [Business]'s own info so you can see it answer like *your* team? Takes me 10 minutes.
>
> [Your name]

### Cold email #2 — the "after-hours" angle
> **Subject:** who answers [Business] at 9pm?
>
> Hi [First name],
>
> Half of customer inquiries come in after hours — and most get a callback the next day, if at all. By then they've booked someone else.
>
> I set up a 24/7 AI front desk on your website that answers questions, captures the lead, and follows up instantly by text and email. No new hire, no extra work for your team.
>
> Reply "demo" and I'll show you a version trained on [Business] this week.
>
> [Your name]

### Cold-call opener (15-second version)
> "Hi [First name], this is [Your name] — I'll be quick. I help [niche] businesses in [city] stop losing website leads. When someone messages your site after hours, what happens to that lead right now? … Got it. That's exactly what I fix — I put a 24/7 AI assistant on your site that answers and follows up instantly. Can I build you a free demo with your own info and show you Thursday?"

### DM (Instagram / Facebook / LinkedIn)
> Hey [First name] — love what [Business] is doing. Quick one: when people DM or fill your site form after hours, how fast do they hear back? I install an AI assistant that replies instantly 24/7 and texts new leads back in seconds. Happy to build you a free demo trained on your business — want to see it?

### Follow-up sequence (no reply)
- **+2 days:** "Hi [First name] — bumping this up. Still happy to build that free demo so you can see it answer like your team. Worth 10 minutes?"
- **+4 days:** "Quick math: if this catches **one** new [patient/job] a month, it pays for itself many times over. Want me to just build the demo and send a 60-sec video?"
- **+7 days (breakup):** "I'll stop here so I'm not a pest. If reducing missed leads ever becomes a priority, I'm one reply away. — [Your name]"

---

## 6. Discovery call script + objection handling

**Structure (15–20 min):**
1. **Frame (30s):** "I want to learn how leads come in today, then show you something — sound good?"
2. **Diagnose (5 min). Ask:**
   - "How do new customers usually find and contact you — calls, form, DMs?"
   - "When a form comes in after hours, what happens?"
   - "Roughly how fast does someone get a reply?"
   - "What's a new [customer/job] worth to you, ballpark?"
   - "If you could wave a wand, what would you fix about how you handle inquiries?"
3. **Reflect the pain:** "So leads come in at night, sit till morning, and some book elsewhere. That's lost revenue you can't even see."
4. **Show, don't tell:** run the live demo (§7).
5. **Pitch the package** (§3) anchored to their per-customer value.
6. **Close for next step:** "I can have this live on your site by [day]. Want me to get started?"

### Objection handling

**"It's too expensive / I don't have the budget."**
> "Totally fair. Let's check the math — what's one new [job/patient] worth? … So at $497/month, this only has to save you **one** a month to pay for itself, and it works 24/7. The expensive option is the leads you're losing right now."

**"We already have a website."**
> "Perfect — this isn't a new website, it's a one-line add-on to the one you have. Your site looks great; the problem is it doesn't *talk back*. This makes it answer and follow up the second someone reaches out."

**"Does the AI sound robotic / will it embarrass us?"**
> "Great question — that's exactly why I tune it to your business. I'll show you right now: it speaks in your tone [for dental: 'a friendly front-desk coordinator who calms nervous patients'], only answers from the info you give it, and hands off to your team for anything it shouldn't handle. You approve the persona before it ever goes live."

**"How do I know it works / I don't trust AI."**
> "Don't take my word for it — I'll build a demo on *your* business for free, you test it yourself, and you only pay if you like it. Plus it's month-to-month, cancel anytime, and I send you a weekly report showing exactly how many leads it caught and answered."

**"I need to think about it / talk to my partner."**
> "Makes sense. So I make it easy — I'll send a one-page summary and a 60-second video of the demo you can forward. Can we pencil in 10 minutes Thursday to decide? I can still hit a Monday go-live."

---

## 7. One-page proposal + demo script

### One-page proposal template

> **AI Front Desk for [Business]** — prepared by [Your Agency]
>
> **The problem:** Inquiries come in 24/7, but get answered hours late (or never). Missed and slow leads = lost revenue.
>
> **The solution:** A 24/7 AI assistant on your website that:
> - Answers customer questions instantly, in your tone, from your info.
> - Captures every lead and scores it for buying intent.
> - Follows up automatically by email and text within seconds.
> - Sends you a weekly report of leads caught and answered.
>
> **What you get:**
> - Custom-trained AI agent + website widget (one-line install)
> - Instant lead follow-up (email/SMS)
> - Automations + weekly reporting
>
> **Investment:** Setup **$[750]** (one-time) + **$[497]/month**. Month-to-month, cancel anytime.
>
> **Go-live:** within [3–5] business days of kickoff.
>
> **ROI:** Pays for itself with **one** new [customer/job] per month.
>
> ☐ Approve → reply "let's go" and I'll send the intake form and an invoice.

### Live demo script (this is where you win)

1. **Open the client's site widget** (or your niche demo workspace) on screen-share.
2. Type a real customer question: *"Do you have any availability this week and how much is a [service]?"* — let the AI answer instantly, in the client's persona. Pause. "Notice it answered in their voice, only using their info."
3. **Drop in a fake lead** and show it land in the **Leads inbox**: scored (e.g. 0–100), a one-line qualification rationale, and a **ready-to-send personalized follow-up** drafted automatically. "This happens in seconds — while your competitor's form is still sitting unread."
4. Show the **per-client install snippet**: `<script src="https://YOURDOMAIN/widget.js" data-client="their-slug" async></script>`. "That's the entire install. One line, before your closing body tag. Live today."
5. Tie it back: "Imagine this catching every after-hours lead this month. What's that worth to you?"

> Pro move: pre-build the demo on **their** business before the call. Walking in and watching the AI already speak like their company is the single most effective close.

---

## 8. Onboarding handoff

The moment they say yes: collect the setup fee + first month, then run **`docs/ONBOARDING.md`** to stand up their workspace, load the knowledge base, install the widget, and configure follow-up. Aim to go live within 3–5 business days — fast onboarding is your best churn insurance.

---

## 9. KPIs to report (so they keep paying)

Send a simple weekly/monthly report. Make the value undeniable.

| Metric | Why it keeps them paying |
|---|---|
| **Leads captured** | Raw proof the system is catching inquiries. |
| **Conversations handled by AI** | Volume the owner didn't have to staff. |
| **Avg. response time** | "Seconds, 24/7" vs. their old "hours/next day." |
| **Qualified leads (score ≥ threshold)** | Shows quality, not just quantity. |
| **After-hours leads caught** | Pure recovered revenue they'd otherwise miss. |
| **Follow-ups sent (email/SMS)** | Demonstrates the instant follow-up working. |
| **Estimated revenue influenced** | leads × their stated per-customer value = the ROI headline. |

**Reporting cadence:** automate a weekly summary (Aether's reporting automation), and once a month send a short note: *"This month the AI caught X leads, Y after hours, and followed up Z times — at your ~$[value]/customer, that's roughly $[X·value] in pipeline it touched. Anything you want it to handle better?"* That last question keeps you a partner, not a vendor.
