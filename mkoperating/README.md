# MK Operating — funnel + growth system

The mkoperating.com lead-gen funnel (7-question AI audit → GHL booking)
rebuilt on Next.js 14, plus the operator growth system:

- **Bulletproof capture** — every audit durably stored in Supabase, early
  email capture saves mid-wizard abandons, robust GHL push with retries
  and a per-lead delivery log.
- **/admin command center** — leads, statuses, funnel analytics, morning
  digest email.
- **Discovery copilot** — pre-call brief, full-screen call mode, AI call
  summary + recommended scope.
- **Proposal generator** — one click from a lead to a branded, editable
  one-pager with a tracked share link and PDF export.
- **Outbound module** — CSV import → personalized teaser + email drafts
  (manual send).
- **Trust pages** — /our-work, /testimonials (managed from admin),
  /sample-audit.

**Start here → [HANDOFF.md](./HANDOFF.md)** for deployment, env vars, and
the GHL setup checklist.

```bash
npm install
DEMO_MODE=1 ADMIN_PASSWORD=test npm run dev   # full local demo, no keys needed
```
