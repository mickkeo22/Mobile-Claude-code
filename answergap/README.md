# AnswerGap

**Find out whether AI assistants can actually read your business.**

A growing share of buying decisions starts with a question to an assistant rather than a search
box. A surprising number of sites answer those assistants with `403 Forbidden` — usually because a
CDN bot rule was switched on by someone else, months ago. The site loads perfectly in a browser, so
nobody notices.

AnswerGap detects that, and four other classes of AI-invisibility, by measurement rather than
inference.

## The check nothing else does

Most "AI SEO" tools read your `robots.txt` and stop. That misses the common failure entirely,
because the block usually isn't in `robots.txt` — it's at the edge.

AnswerGap requests your homepage **once as a real browser** and **once as each AI crawler**, then
compares the responses. A live example from development:

| Requested as | Response |
|---|---|
| Real browser (control) | `200 OK` |
| GPTBot | `403 Forbidden` |
| OAI-SearchBot | `403 Forbidden` |
| ClaudeBot | `403 Forbidden` |

That site has clean `LocalBusiness` schema, an `llms.txt`, a sitemap, 1,478 words of
server-rendered copy — and a `robots.txt` that blocks nothing. By every ordinary measure it looks
healthy. It is invisible to ChatGPT and Claude, and the owner has no way to see it.

The browser control is what makes this trustworthy: a site that refuses *everyone* is a hardened
site, not an AI-specific block, and is never reported as one.

## What it measures

| Check | Weight | What it answers |
|---|---|---|
| AI crawler access | 34 | Can each crawler actually fetch the page, compared to a browser? |
| Readable without JavaScript | 16 | How much content exists before JS runs? Crawlers don't run it. |
| `robots.txt` rules | 14 | Parsed per RFC 9309 — groups, longest-match, Allow-wins ties. |
| Structured data | 14 | Does the JSON-LD parse, and does it describe the business entity? |
| Answer-ready content | 12 | Are the quotable facts present — services, contact, address, FAQs? |
| Crawl hygiene | 6 | Stray `noindex`, canonical, sitemap, language. |
| `llms.txt` | 4 | Is there a self-authored summary for assistants? |

### Accuracy decisions that matter

- **A hard block caps the score.** Perfect markup can't offset a crawler that never receives a
  byte, so averaging is misleading. The uncapped score is always shown alongside the capped one.
- **`429` is throttling, not refusal.** It's retried once and never triggers the cap.
- **`Google-Extended` and `Applebot-Extended` aren't probed.** They're robots.txt control tokens
  with no crawler behind them, so probing them would be theatre. They're read from the file.
- **Soft-404s are rejected.** Many sites serve their SPA shell for `/llms.txt` with a `200`.
- **Nothing is cached or looked up.** Every number is measured at request time.

## The paid Fix Pack — $29, one time

The scan diagnoses. The Fix Pack repairs, generated from what the scan just measured:

- Unblock instructions naming the **actual** edge provider answering for the domain (Cloudflare,
  Sucuri, Imperva, Akamai, nginx…) and the specific screens to change.
- A `robots.txt` welcoming all eight crawlers that **preserves existing `Disallow` rules**.
- JSON-LD populated with the real business name, phone, email and full postal address scraped from
  the page — not a blank template.
- An `llms.txt` drafted from the site's own content.
- FAQ schema plus the questions that decide recommendations (pricing, service area, hours).
- A prioritised plan with time estimates.

Anything the scan couldn't determine is written in `CAPITALS` so it's obvious what needs a human.
Fabricated structured data is worse than none.

## Running it

```bash
npm install
npm run dev      # http://localhost:3005
```

**No API keys are required.** The scanner is pure HTTP and DNS. Copy `.env.example` to `.env.local`
only when you want to enable payments.

Preview the paid deliverable without paying by setting `PREVIEW_TOKEN`, then visiting
`/report/<domain>?preview=<token>`.

## Enabling payments

Set `STRIPE_SECRET_KEY`. That is the whole configuration — Checkout uses inline `price_data`, so
there is no product or price to create first.

Access to a Fix Pack is granted by verifying the Stripe Checkout session server-side and confirming
its `metadata.domain` matches the report being opened. There is no database: the report re-runs the
scan on each visit, which is also what lets a buyer use the same link to confirm their fixes
landed.

A `sk_test_` key exercises the full flow with Stripe's test cards without moving money. Real
charges require a `sk_live_` key from an activated account.

## Safety

The domain comes from an untrusted input, so the fetcher refuses IP literals, credentials in the
host, `localhost`, `.local`/`.internal` suffixes, and any hostname that resolves to a private,
loopback, link-local or carrier-grade-NAT address. Responses are size-capped and time-bounded, and
scans are rate-limited per IP.

## Layout

```
lib/audit/
  fetcher.ts    SSRF-guarded fetch, soft-404 detection
  robots.ts     RFC 9309 parser — groups, wildcards, longest-match
  crawlers.ts   Crawler registry + browser-controlled differential probe
  page.ts       HTML fact extraction, business-name inference
  index.ts      Orchestration, findings, weighted scoring, score cap
lib/fixpack/
  generate.ts   Edge-provider detection + artefact generation
```
