# MK Operating — Growth System Handoff

Everything in this folder is a complete, tested Next.js 14 app: your live
funnel rebuilt 1:1 (same design, same copy, same GHL calendar) **plus** the
six growth workstreams. This doc is the 30-minute path from "code on a
branch" to "live on mkoperating.com", including the short list of things
only you can do (mostly inside GHL).

---

## 1. Ship it

The code was built in `mkoperating/` inside the `Mobile-Claude-code` repo
(this session couldn't attach the real `keoughmick768-blip/mkoperating`
repo — different GitHub owner). Two ways to deploy; **A is recommended**.

**A. Transplant into your live repo (recommended)**
1. Clone both repos locally (or do it in a Claude session opened on the
   `mkoperating` repo).
2. Delete the old app files in `mkoperating` (keep `.git/`).
3. Copy **the contents of** this `mkoperating/` folder into the repo root.
4. Commit to a branch, open the Vercel preview URL, click through the
   wizard once, then merge to `main`. Vercel auto-deploys — the live
   funnel keeps working even before you set the new env vars (leads just
   queue as "pending" until Supabase/GHL vars are in).

**B. Stage it first — no terminal needed (do this before A)**
1. Vercel dashboard → **Add New… → Project** → Import
   `mickkeo22/Mobile-Claude-code` (install the Vercel GitHub app on that
   repo if prompted).
2. Name the project `mkoperating-staging`. Set **Root Directory** to
   `mkoperating`. Framework auto-detects as Next.js. Deploy.
3. If asked for a production branch, pick
   `claude/mk-operating-growth-system-9sj40u` (or merge PR #1 first and
   use the default branch).
4. Add the env vars from §2 → Redeploy. You now have the full system live
   on a `*.vercel.app` URL, completely separate from mkoperating.com.
   When happy, do **A** for the real cutover and delete (or keep) staging.

## 2. Environment variables (Vercel → Settings → Environment Variables)

| Var | Required | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ already set | (unchanged from live app) |
| `SUPABASE_URL` | ✅ | `https://uxcxfhnthgidhxhhtanh.supabase.co` (your "Claude Code" project — schema already applied) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase dashboard → Project Settings → API keys → **service_role** (secret). Server-only; never exposed to browsers. |
| `ADMIN_PASSWORD` | ✅ | Pick a long one. This is the `/admin` login. |
| `CRON_SECRET` | ✅ | Any long random string. Vercel automatically sends it to the cron endpoints. |
| `GHL_WEBHOOK_URL` | strongly recommended | See §4 — created inside GHL. Until set, leads store durably and queue as "pending"; the admin shows a banner. **This fixes the old silent-skip bug.** |
| `RESEND_API_KEY` | recommended | resend.com → API Keys (free tier). Powers the morning digest + audit report emails. |
| `DIGEST_EMAIL_TO` | recommended | `keoughmick768@gmail.com` |
| `AUDIT_EMAIL_FROM` | recommended | Turns ON the professional audit-report email to every lead. First verify mkoperating.com in Resend (Domains → Add Domain → add the two DNS records at your registrar, ~5 min), then set e.g. `MK Operating <audit@mkoperating.com>`. Until set, leads still get the on-page report + `/r/<id>` link; no email goes out. |
| `GHL_BOOKING_TOKEN` | optional | Any random string — enables auto-"booked" status, see §4b. |
| `NEXT_PUBLIC_SITE_URL` | optional | Defaults to `https://mkoperating.com`. |

Why Resend for the digest: one env var, a plain HTTPS call (no SDK), a
default sender (`onboarding@resend.dev`) that works with zero domain setup,
and a free tier far beyond one email a day. SMTP/Gmail needs app passwords
and is flaky from serverless; sending via GHL would put your internal ops
email inside your client-nurture tool.

## 3. Supabase (done for you)

The `mk_`-prefixed tables are **already live** in your "Claude Code"
project (`uxcxfhnthgidhxhhtanh`), following the same per-app prefix
convention as your other apps (`le_`, `ao_`):

`mk_leads`, `mk_lead_events` (timeline + GHL delivery log), `mk_calls`,
`mk_proposals`, `mk_outbound_prospects`, `mk_funnel_events`,
`mk_testimonials`, `mk_work_items`.

RLS is enabled with no policies — public keys can't touch them; the app
uses the service-role key server-side only. The migration is in
`supabase/migrations/001_mk_growth_system.sql` if you ever want a
dedicated project: run it there and change the two env vars.

## 4. GHL checklist (manual — GHL stays the CRM)

**a) Inbound lead webhook (the important one)**
1. GHL → Automation → Create Workflow → trigger **Inbound Webhook**.
2. Copy the webhook URL it gives you → set as `GHL_WEBHOOK_URL` in Vercel.
3. Send yourself a test lead (finish the audit once on the live site, or
   press **Push now** on any lead in `/admin`), then map fields in GHL.
   The payload is flat snake_case, one field per answer:
   `first_name, last_name, phone, email, business_name, what_you_do,
   lead_flow, tools, losing_money, time_sink, audit_pain, audit_summary,
   audit_first_move, audit_text` (full audit as one text blob), plus
   `source, lead_stage, lead_id, admin_url, submitted_at`. Name and phone
   come from the wizard's final "your details" step, so completed leads
   arrive as full contacts — map them to the GHL contact's name and phone
   fields.
4. Workflow actions: create/update contact → add tag `audit-lead` → add to
   your pipeline → start your nurture sequence.
5. `lead_stage` is `completed` or `partial` (abandoned mid-wizard, swept
   in hourly once they're an hour old). Branch on it — partials should get
   a "your audit is one tap from done" nurture, not the full audit email.

**b) Auto-mark "booked" (optional, 5 min, recommended)**
1. Set `GHL_BOOKING_TOKEN` in Vercel to any random string.
2. GHL workflow: trigger **Appointment Booked** (calendar `nT7yoVYh91A28KZqfT8Q`)
   → action **Custom Webhook**: `POST`
   `https://mkoperating.com/api/hooks/ghl-booking?token=YOUR_TOKEN`
   with JSON body `{ "email": "{{contact.email}}" }`.
3. Leads now flip to **Booked** in `/admin` by themselves, which keeps the
   dashboard's booking conversion and the morning digest honest.

**c) Nothing else changes in GHL.** Calendar, pipelines, nurture — all as
they are today.

## 5. Crons

`vercel.json` ships **Hobby-plan-safe** daily schedules:
- `11:00 UTC` (7am ET) — morning digest email
- `11:30 UTC` — GHL retry sweep (re-pushes failed/pending leads)

If the project is on Vercel **Pro**, change the sweep to hourly
(`"30 * * * *"`) for faster healing. In-request pushes already retry 3×
with backoff, and every lead has a manual **Push now** button in admin, so
daily sweeps are an acceptable floor.

## 6. Your daily loop

1. **7am** — digest lands: yesterday's leads, who booked, who to chase.
2. **Lead comes in** — GHL runs nurture; `/admin/leads/<id>` shows their
   answers, audit, and GHL sync state.
3. **Before a call** — open the lead → **Prep the call** → skim the brief
   → **Call mode** (full-screen, tap-first, autosaves).
4. **End call → summary** — AI writes the summary + recommended scope and
   advances the lead to *Call done*.
5. **Generate proposal** — edit prices (`$___` placeholders), **Copy
   link** → send it; you'll see *viewed* the moment they open it. Print →
   Save as PDF from the share page if they want a file.
6. **Outbound** (`/admin/outbound`) — import a CSV
   (`name,niche,town,website,email`), **Draft all**, then copy/send each
   from your own inbox. Nothing auto-sends; statuses are ready for send
   automation later.
7. **Content** (`/admin/content`) — add real testimonials/work items as
   results land; they publish straight to `/testimonials` and `/our-work`.

## 7. Things added beyond the brief (all flagged)

- **Early email capture** (step 2 of 8) so abandons are saved — partial
  leads sweep into GHL tagged `lead_stage=partial`. The final step (8 of 8)
  collects name + phone + confirms email, so completed leads reach GHL as
  full contacts and the booking calendar is pre-filled for them.
- **GHL booking webhook back** (§4b) — closes the analytics loop.
- **Funnel event tracking** (anonymous, sessionStorage id) powering the
  wizard drop-off chart.
- **Sample audit page** (`/sample-audit`) linked from the homepage — a
  realistic tree-service example rendered by the real audit component.
- **Config health banners** in admin — no more silent misconfiguration.
- **Digest preview** — dashboard → "Preview morning digest".
- **DEMO_MODE=1** (dev-only) — canned AI responses for local testing
  without spending tokens. Ignored in production.

## 8. Local dev

```bash
cd mkoperating
npm install
DEMO_MODE=1 ADMIN_PASSWORD=test npm run dev
```

No env vars needed: storage falls back to in-memory (dev only, warns
loudly), AI returns the canned demo audit. Add real keys to `.env.local`
(see `.env.example`) to exercise the real paths.

## 9. Map of the system

```
Public   /  /how-it-works  /audit  /book  /sample-audit  /our-work  /testimonials  /p/<slug>
APIs     /api/audit  /api/lead  /api/track  /api/hooks/ghl-booking  /api/cron/{digest,ghl-retry}
Admin    /admin (dashboard)  /admin/leads[/<id>[/call]]  /admin/proposals/<id>
         /admin/outbound  /admin/content   — guarded by middleware + ADMIN_PASSWORD
Lib      lib/db.ts (Supabase DAL)  lib/ai.ts (Claude)  lib/ghl.ts (push+retry)
         lib/digest.ts  lib/analytics.ts  lib/wizard.ts (single source of wizard truth)
```
