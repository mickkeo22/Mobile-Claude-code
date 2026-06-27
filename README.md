# Aether

**Aether is the AI agency operating platform for small businesses.** It lets a solo operator or a small team run a real "AI agency" — capturing and qualifying leads with AI, answering customers 24/7 with an embeddable support agent, generating content, and running back-office automations — across many client workspaces from one multi-tenant dashboard. It is built so you can **run it today with zero API keys** (everything degrades into a polished demo mode) and flip features to "live" one env var at a time.

## What's inside

- **Marketing site** — home, services, pricing, and contact pages to sell your agency.
- **Supabase auth** — email/password sign up and login; a profile row is auto-created on signup.
- **Multi-tenant dashboard** — manage many `clients` (your customers), each an isolated workspace with its own brand color and AI agent persona.
- **Leads inbox + AI qualification** — inbound leads are scored 0–100 on buying intent and fit, given a one-line rationale, and a ready-to-send follow-up is drafted automatically.
- **AI support agent + embeddable widget** — a per-client chat agent grounded in that client's knowledge base, deployable on any website with a one-line `<script>` tag.
- **Content studio** — draft posts and content items per client with AI assistance.
- **Automations** — back-office automations per client (lead follow-up, content, reporting) with run history.
- **Billing** — Stripe subscriptions across three plans (Starter / Growth / Scale).
- **Outbound messaging** — instant email follow-up (Resend) and SMS follow-up (Twilio).

> Aether is multi-tenant by design: an agency owner (`auth.users`) owns `clients`, and every downstream record is scoped to a client and protected by **Row Level Security**, so an agency can only ever see its own data.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth + database | Supabase (Postgres + RLS, `@supabase/ssr`) |
| AI | Anthropic Claude via `@anthropic-ai/sdk` + the Vercel `ai` SDK |
| Billing | Stripe (`stripe` SDK) |
| Email | Resend |
| SMS | Twilio |
| Validation | Zod |
| Hosting | Vercel (recommended) |

## Quick start

```bash
git clone <your-repo-url> aether
cd aether
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

**It runs fully in DEMO MODE with zero keys.** The `.env.local` you just copied is empty, and that's intentional — every integration in Aether checks whether its keys are present and degrades gracefully:

- No Supabase keys → the dashboard is populated with rich, realistic demo data (clients like *Brightside Dental* and *Apex Plumbing Co.*) so you can click through every screen and run live client demos.
- No Anthropic key → lead scoring and the support agent fall back to a built-in heuristic, so the pipeline still works end-to-end.
- No Stripe keys → billing renders in preview.
- No Resend / Twilio keys → outbound messages are logged as drafts instead of sent.

This is what lets you ship today and turn features on as you add keys.

## Going live

Each capability stays in demo mode until **its** keys are present. Add only what you need. Variable names below are exact matches to `.env.example`.

| Capability | Required env vars | Where to get it |
|---|---|---|
| **Auth + database** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | [Supabase dashboard](https://supabase.com/dashboard) → Project → Settings → API. The service role key is server-only — never expose it to the browser. |
| **AI (support agent, lead scoring, content)** | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | [Anthropic console](https://console.anthropic.com/settings/keys). `ANTHROPIC_MODEL` defaults to `claude-opus-4-8`. |
| **Billing** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICE_STARTER`, `NEXT_PUBLIC_STRIPE_PRICE_GROWTH`, `NEXT_PUBLIC_STRIPE_PRICE_SCALE` | [Stripe dashboard](https://dashboard.stripe.com/apikeys) for keys; create three products and copy their **price IDs**; webhook secret from the webhook endpoint config. |
| **Email follow-up** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | [Resend](https://resend.com) → API Keys. Verify your sending domain first. |
| **SMS follow-up** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | [Twilio console](https://console.twilio.com). Buy a number for `TWILIO_FROM_NUMBER`. |
| **App URL / branding** | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` | Set `NEXT_PUBLIC_APP_URL` to your production domain — it's used to build the widget snippet. |
| **Automations / cron auth** | `CRON_SECRET` | Generate your own: `openssl rand -hex 32`. Protects the automation runner endpoint. |

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full production walkthrough (Stripe products, webhooks, cron).

## Database setup

Aether ships its schema as a single migration: `supabase/migrations/0001_init.sql`. It creates `profiles`, `clients`, `knowledge_docs`, `conversations`, `messages`, `leads`, `content_items`, `automations`, `automation_runs`, and `subscriptions`, plus indexes and an auth trigger that auto-creates a profile on signup.

Run it one of two ways:

**Option A — Supabase SQL editor (fastest):**
1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql`.
3. Run.

**Option B — Supabase CLI:**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Row Level Security is enabled on every table.** Each policy scopes rows to the owning agency via `auth.uid()`, so a logged-in agency owner can only read or write their own clients and the records beneath them. Do not disable RLS.

## Deploy

Aether is designed for **Vercel**. The full guide — env vars, Supabase migration, Stripe products + webhook, Resend domain verification, Twilio number, and a Vercel Cron entry hitting the automation runner — lives in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Project structure

```
.
├── README.md
├── .env.example
├── package.json
├── public/
│   └── widget.js                 # embeddable chat widget loader (served at /widget.js)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql         # full schema + RLS policies
├── docs/
│   ├── DEPLOYMENT.md
│   ├── SALES_PLAYBOOK.md
│   └── ONBOARDING.md
└── src/
    ├── app/
    │   ├── (marketing)/          # public site: home, services, pricing, contact
    │   ├── (auth)/               # login, signup
    │   ├── (dashboard)/          # the operator app
    │   │   └── dashboard/        # overview, clients, clients/[slug], leads, agent
    │   └── api/                  # widget chat, stripe webhook, automations runner
    └── lib/
        ├── ai/                   # agent, client, content, leads (Claude wrappers)
        ├── auth/                 # auth server actions
        ├── billing/              # plans.ts, stripe.ts
        ├── messaging/            # email (Resend) + SMS
        ├── supabase/             # client / server / middleware helpers
        ├── types/                # database types
        ├── data.ts               # data access (live + demo)
        ├── demo.ts               # demo-mode seed data
        └── env.ts                # central env access + feature flags
```

## The embeddable widget

Every client workspace gets a one-line install snippet (shown in the dashboard for each client). Paste it before `</body>` on the client's site:

```html
<script src="https://YOURDOMAIN/widget.js" data-client="CLIENT_SLUG" async></script>
```

- `widget.js` is served from your deployment (`/widget.js`).
- `data-client` is the client's **slug** (e.g. `brightside-dental`). The widget talks to the per-client AI support agent, grounded in that client's knowledge base.
- Replace `YOURDOMAIN` with your `NEXT_PUBLIC_APP_URL` host.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the local dev server (<http://localhost:3000>). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run Next.js / ESLint checks. |
| `npm run typecheck` | TypeScript type-check (`tsc --noEmit`). |
| `npm run stripe:listen` | Forward Stripe webhooks to `localhost:3000/api/stripe/webhook` for local billing testing. |

## License

Proprietary. © You. All rights reserved. (Swap in MIT/your license of choice if you intend to open-source it.)

## Disclaimer

Metrics, prices, sample clients, and ROI figures referenced in this repository and its docs are **illustrative**. Aether is software you operate; **you** run the agency business, sign the clients, and are responsible for the service you deliver, your contracts, and compliance (including messaging consent for email/SMS). Demo mode produces representative — not real — data.
