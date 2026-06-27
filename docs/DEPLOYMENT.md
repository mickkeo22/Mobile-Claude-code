# Deploying Aether to production

This guide takes Aether from a local demo to a live, multi-tenant agency platform on **Vercel + Supabase + Stripe + Anthropic + Resend + Twilio**. Do the steps in order. You can stop after any block — every integration that isn't configured stays in demo mode rather than breaking the app.

All variable names below match `.env.example` exactly.

---

## 0. Prerequisites

- A GitHub (or GitLab/Bitbucket) repo with this code.
- Accounts: [Vercel](https://vercel.com), [Supabase](https://supabase.com), [Stripe](https://stripe.com), [Anthropic](https://console.anthropic.com), [Resend](https://resend.com), [Twilio](https://twilio.com).
- A domain you control (for the app and for email verification).

---

## 1. Vercel deploy

1. **Import the repo** into Vercel ("Add New… → Project").
2. **Framework preset:** Next.js (auto-detected).
3. **Build settings** (defaults are correct):
   - Build command: `next build` (`npm run build`)
   - Output: managed by Next.js — leave default.
   - Install command: `npm install`
   - Node.js version: **20.x or newer** (the repo requires `node >= 20`).
4. **Set environment variables** (Project → Settings → Environment Variables). Add them to **Production** (and Preview if you want previews live). Start with the App + Supabase + Anthropic block; add billing/messaging later.

```
NEXT_PUBLIC_APP_URL=https://app.youragency.com
NEXT_PUBLIC_APP_NAME=Aether

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-opus-4-8

STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PRICE_STARTER=...
NEXT_PUBLIC_STRIPE_PRICE_GROWTH=...
NEXT_PUBLIC_STRIPE_PRICE_SCALE=...

RESEND_API_KEY=...
RESEND_FROM_EMAIL="Aether <hello@youragency.com>"

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

CRON_SECRET=...
```

> **`NEXT_PUBLIC_*` vars are baked at build time.** If you change one, redeploy. Server-only vars (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `TWILIO_*`, `CRON_SECRET`) are never shipped to the browser — keep them out of any `NEXT_PUBLIC_` name.

5. Deploy, then add your custom domain (Project → Settings → Domains) and point `NEXT_PUBLIC_APP_URL` at it.

---

## 2. Supabase project + migration

1. Create a new Supabase project. Pick a strong DB password and a region near your customers.
2. **Settings → API** gives you the three values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Run the migration.** SQL Editor → New query → paste all of `supabase/migrations/0001_init.sql` → Run. (Or `supabase link --project-ref <ref>` then `supabase db push`.)
4. **Verify RLS.** The migration enables Row Level Security on every table and creates owner-scoped policies. In Database → Tables, confirm RLS shows "Enabled" on `clients`, `leads`, `conversations`, etc. Do not disable it.
5. **Auth.** Authentication → URL Configuration: set the Site URL to your `NEXT_PUBLIC_APP_URL` and add it to redirect allow-list. Enable Email provider. (A `profiles` row is auto-created on signup by the `on_auth_user_created` trigger.)

---

## 3. Stripe — products, prices, and webhook

Aether's plans live in `src/lib/billing/plans.ts`. Create three **monthly recurring** products in Stripe to match, then paste the resulting **price IDs** into env vars.

| Plan | Monthly price | Env var for the price ID |
|---|---|---|
| Starter | **$49** | `NEXT_PUBLIC_STRIPE_PRICE_STARTER` |
| Growth | **$149** | `NEXT_PUBLIC_STRIPE_PRICE_GROWTH` |
| Scale | **$399** | `NEXT_PUBLIC_STRIPE_PRICE_SCALE` |

> These prices are what **you pay** to operate Aether (per the plan tiers). What you charge your own clients is separate — see `docs/SALES_PLAYBOOK.md`.

**Create them:**
1. Stripe Dashboard → **Products** → Add product. Name "Aether Starter", price $49/month recurring. Repeat for Growth ($149) and Scale ($399).
2. Open each price and copy its **API ID** (`price_...`). Paste into the matching env var above.
3. **Keys:** Developers → API keys → copy the secret key (`STRIPE_SECRET_KEY`) and publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

**Webhook:**
1. Developers → **Webhooks** → Add endpoint.
2. Endpoint URL: `https://app.youragency.com/api/stripe/webhook`
3. Subscribe to at least: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
4. Copy the **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
5. Redeploy so the new env vars take effect.

**Local billing testing** (optional): `npm run stripe:listen` forwards events to `localhost:3000/api/stripe/webhook` and prints a temporary signing secret to use locally.

---

## 4. Anthropic (the AI brain)

1. [console.anthropic.com](https://console.anthropic.com/settings/keys) → create an API key → `ANTHROPIC_API_KEY`.
2. Leave `ANTHROPIC_MODEL=claude-opus-4-8` unless you have a reason to change it. The lead-scoring path uses a fast model internally.
3. Set up billing/usage limits in the Anthropic console so a runaway widget can't surprise you.

Without this key, the support agent and lead qualifier run on a built-in heuristic (still functional, just not LLM-quality).

---

## 5. Resend — email follow-up

1. Create a Resend API key → `RESEND_API_KEY`.
2. **Verify your sending domain** (Resend → Domains → add `youragency.com`, then add the DKIM/SPF/return-path DNS records it gives you). Email won't deliver reliably until the domain is verified.
3. Set `RESEND_FROM_EMAIL` to a verified address, e.g. `"Aether <hello@youragency.com>"`.

Without a key, outbound emails are logged as drafts (`[email:demo]`) instead of sent — useful for staging.

---

## 6. Twilio — SMS follow-up

1. Twilio Console → copy **Account SID** (`TWILIO_ACCOUNT_SID`) and **Auth Token** (`TWILIO_AUTH_TOKEN`).
2. Buy a phone number (SMS-capable) → `TWILIO_FROM_NUMBER` in E.164 format (`+15551234567`).
3. For US/Canada A2P traffic, register your brand/campaign (A2P 10DLC) to avoid carrier filtering. Always collect consent before texting leads.

SMS stays in demo mode until all three Twilio vars are present.

---

## 7. Automations cron

The automation runner is exposed at **`/api/automations/run`** and is protected by `CRON_SECRET`. Schedule it with Vercel Cron.

1. Generate a secret: `openssl rand -hex 32` → `CRON_SECRET` (set in Vercel env).
2. Add a `vercel.json` at the repo root (this is application config, outside the docs — create it when you're ready to wire cron):

```json
{
  "crons": [
    {
      "path": "/api/automations/run",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

3. Vercel Cron invokes the path on schedule. The endpoint authorizes the request using `CRON_SECRET` (e.g. an `Authorization: Bearer <CRON_SECRET>` header / matching secret), so only your scheduler can trigger runs. Adjust `schedule` to taste — `*/15 * * * *` runs every 15 minutes; `0 * * * *` hourly.

> If you ever trigger the runner from outside Vercel Cron (a manual curl, an external scheduler), include the same secret so the request is authorized.

---

## 8. Production readiness checklist

- [ ] App deployed on Vercel with a custom domain; `NEXT_PUBLIC_APP_URL` points to it.
- [ ] Supabase project created; `0001_init.sql` migration run successfully.
- [ ] RLS confirmed **Enabled** on all tables.
- [ ] Supabase Auth Site URL + redirect URLs set to the production domain.
- [ ] `ANTHROPIC_API_KEY` set; a test lead scores and the agent responds with real AI.
- [ ] Three Stripe products created at **$49 / $149 / $399**; price IDs pasted into the three `NEXT_PUBLIC_STRIPE_PRICE_*` vars.
- [ ] Stripe webhook endpoint `…/api/stripe/webhook` created; `STRIPE_WEBHOOK_SECRET` set; a test checkout updates the `subscriptions` table.
- [ ] Resend domain verified; a test follow-up email actually delivers.
- [ ] Twilio number live; a test SMS delivers; A2P registration done (US/CA).
- [ ] `CRON_SECRET` set; `vercel.json` cron added; `/api/automations/run` fires on schedule and writes `automation_runs`.
- [ ] `widget.js` loads from `https://YOURDOMAIN/widget.js` and a `data-client="<slug>"` widget chats successfully on a test page.
- [ ] `npm run build`, `npm run lint`, and `npm run typecheck` all pass in CI / locally.
- [ ] Secrets are server-only (no secret accidentally under a `NEXT_PUBLIC_` name).
- [ ] Stripe in **live** mode (not test) before charging real customers.

Once these are green, you're live. Next: sign clients (`docs/SALES_PLAYBOOK.md`) and onboard them (`docs/ONBOARDING.md`).
