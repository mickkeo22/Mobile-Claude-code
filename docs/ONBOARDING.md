# Client Onboarding Playbook

Operator's step-by-step for taking a signed client from "yes" to "live and getting value" inside Aether. Target: **live within 3–5 business days.** Fast onboarding is your best defense against churn.

> Prereq: Aether is deployed and live keys are set (`docs/DEPLOYMENT.md`). If you're still in demo mode, you can rehearse this entire flow against demo data first.

---

## At a glance

```
1. Create the client workspace
2. Set brand color + agent persona
3. Load the knowledge base (FAQ, services, pricing, hours)
4. Install the widget on their site
5. Configure lead follow-up (email / SMS)
6. Turn on automations
7. Test end-to-end, then run the first-week success plan
```

---

## Step 1 — Create the client workspace

In **Dashboard → Clients → New client**, create the workspace. Fields map directly to the `clients` table:

- **Name** — the business name (e.g. *Brightside Dental*).
- **Slug** — the URL-safe identifier (e.g. `brightside-dental`). **This is what goes in the widget's `data-client` attribute — keep it stable.**
- **Website**, **Industry**, **Contact email**, **Contact phone**.
- **Monthly value** — what they pay you (helps you track book value).
- **Status** — starts as `onboarding`; flip to `active` once live.

> Watch your plan's client limit: Starter = 3, Growth = 15, Scale = 100 workspaces. Upgrade before you hit the cap.

---

## Step 2 — Set brand color + agent persona

- **Brand color** — set the client's hex (defaults to `#6d4aff`). The widget uses this so it looks native on their site.
- **Agent persona** — one or two sentences describing how the AI should sound. This is the single biggest lever on quality. Examples from real niches:
  - Dental: *"a friendly, reassuring front-desk coordinator who calms nervous patients."*
  - Home services: *"a no-nonsense, helpful dispatcher who quickly figures out if it's an emergency and gets details."*
  - Fitness: *"an upbeat membership advisor who makes people excited to book a first class."*

Write the persona in the client's voice, name what it should and shouldn't do (e.g. "never quote exact prices for custom work — offer to have the team call"), and get the client to approve it before go-live.

---

## Step 3 — Load the knowledge base

The support agent answers **only** from what you load here (each entry becomes a `knowledge_docs` row tied to the client). Garbage in, garbage out — this step earns the retainer.

For each topic, add a knowledge doc with a clear **title** and **content**:
- **Services / what we offer** — plain-language descriptions.
- **Pricing** — ranges or "starting at" language if exact pricing varies; tell the agent how to handle "how much?" gracefully.
- **Hours & location** — including after-hours / emergency policy.
- **FAQ** — the 10–20 questions the front desk answers daily.
- **Booking / next steps** — exactly how a lead should be routed (call this number, fill this form, "the team will follow up").
- **What NOT to do** — e.g. don't give medical/legal advice, don't promise availability, hand off edge cases.

Pull this content straight from the intake questionnaire (bottom of this doc) and their existing website. Test the agent after loading: ask it the top 10 FAQs and confirm the answers and tone.

---

## Step 4 — Install the widget on their site

Each client's install snippet appears in their workspace (Dashboard → Clients → [client], and on the Agent page). It's one line:

```html
<script src="https://YOURDOMAIN/widget.js" data-client="CLIENT_SLUG" async></script>
```

- `YOURDOMAIN` = your `NEXT_PUBLIC_APP_URL` host.
- `CLIENT_SLUG` = this client's slug from Step 1.

**Place it** right before the closing `</body>` tag.
- **WordPress:** a header/footer scripts plugin, or theme footer.
- **Squarespace/Wix:** site-wide custom code / footer injection.
- **Webflow:** Project Settings → Custom Code → Footer.
- **Shopify:** `theme.liquid` before `</body>`.

If the client can't edit their site, ask for temporary CMS access or send the one line to their web person. After install, load the site in an incognito window and confirm the widget appears and chats.

---

## Step 5 — Configure lead follow-up (email / SMS)

When a lead comes in, it's scored and gets an **instant, personalized follow-up draft**. Configure how it's delivered:

- **Email (Resend):** confirm `RESEND_API_KEY` + a verified `RESEND_FROM_EMAIL` are set. Decide whether follow-ups send automatically or queue for the client's approval at first.
- **SMS (Twilio):** confirm `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` are set. **Get explicit consent language** in place before texting leads (compliance is on you and the client).
- Set where lead notifications go (the client's contact email/phone) so the owner sees activity.
- Review the first few AI-drafted follow-ups together so the client trusts the tone before you let them auto-send.

> No messaging keys yet? Follow-ups are logged as drafts rather than sent — fine for staging and for showing the client what *will* go out.

---

## Step 6 — Turn on automations

In the client's workspace, enable the automations that fit their plan (each is an `automations` row; runs are logged to `automation_runs`):

- **Instant lead follow-up** — the core one; turn on first.
- **Nurture / follow-up sequence** — re-touch leads that didn't reply.
- **Content / social drafts** — if they bought a content package.
- **Weekly client report** — auto-summary of the week's leads and conversations. Turn this on for **every** client — it's what makes the value visible and keeps them paying.

Automations are fired on schedule by the runner at `/api/automations/run` (Vercel Cron + `CRON_SECRET`; see `docs/DEPLOYMENT.md`). Confirm the cron is live so automations actually execute in production.

---

## Step 7 — Test end-to-end, then go live

Before flipping status to `active`:

- [ ] Widget appears on the live site and answers the top FAQs in the right tone.
- [ ] A test inquiry creates a **lead**, gets **scored**, and produces a **follow-up draft**.
- [ ] Follow-up email actually delivers (and SMS, if enabled).
- [ ] Weekly report automation is on.
- [ ] Client has seen and approved the persona + a sample follow-up.
- [ ] Set client **status → active**.

---

## First-week success plan

| When | Do |
|---|---|
| **Day 1 (go-live)** | Flip to live. Send the client a short "you're live" note with their widget confirmed working and one sample AI answer. Ask for a referral. |
| **Days 2–3** | Monitor the leads inbox and conversations. Fix any weak/wrong answers by adding or editing knowledge docs. Tune the persona if tone is off. |
| **Day 4** | Send a quick mid-week pulse: "Here's what it's caught so far." Even small numbers build trust early. |
| **Day 7** | Send the **first weekly report** (leads captured, conversations handled, response time, after-hours leads, follow-ups sent, estimated revenue influenced — see `docs/SALES_PLAYBOOK.md` §9). Book a 10-min check-in. Ask: "Anything you want it to handle better?" |
| **Day 30** | Monthly value recap tied to their per-customer value. This is your renewal/upsell moment — propose SMS, content, or more automations if they're on a lower tier. |

---

## Knowledge base intake questionnaire (send to the client)

Copy/paste this and send it the moment they sign. The better their answers, the better the agent — and the less back-and-forth.

> **[Business] — AI Assistant Setup Form**
>
> **1. Basics**
> - Business name (exactly as you want it shown):
> - Website URL:
> - Main contact name, email, and phone for lead alerts:
> - Brand color (hex, if you know it):
>
> **2. Voice & tone**
> - In one sentence, how should the assistant sound? (friendly, professional, upbeat, calm…)
> - Anything it should **never** say or do?
>
> **3. Services**
> - List your services/products with a 1–2 sentence description of each:
> - Which do you most want new customers for?
>
> **4. Pricing**
> - Prices or "starting at" ranges you're comfortable sharing publicly:
> - For custom pricing, how should the assistant respond? (e.g. "the team will follow up")
>
> **5. Hours & location**
> - Business hours:
> - Address / service area:
> - After-hours or emergency policy:
>
> **6. Booking & next steps**
> - How should a new lead be handled? (call this number / fill this form / team follows up)
> - Online booking link, if any:
>
> **7. Your top FAQs**
> - List the 10–20 questions customers ask most, with the answers you'd give:
>
> **8. Follow-up**
> - OK to text leads (SMS), or email only?
> - Anything specific you want included in the first follow-up message?
>
> **9. Anything else we should know about your business?**

When this comes back, it maps almost 1:1 onto Steps 2, 3, and 5 above — load it, test it, ship it.
