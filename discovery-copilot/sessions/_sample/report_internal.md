# Internal Build Notes — Hartwell Home Furnishings

*Internal only. Companion to the client audit for Hartwell Home Furnishings.*

## ⚠️ Red flags / handle with care

- Gun-shy from two prior burns: a $400/mo marketing agency (cancelled after 8 months of stock photos) and a $4,500 trade-show 'retail management system' that never got past the barcode labels — lead with small, cancel-anytime pieces and proof, never a big platform pitch.
- Ellie is the de-facto operator and veto: 'if Ellie hates a system it dies.' Get her in the demo; design admin flows around her three days a week.
- Books must be cleaned before any money reporting or AR automation is presented as trustworthy — don't promise dashboards on top of QuickBooks Desktop 2019 data.
- Budget temperature: frugal but not broke — she immediately reframed $164/mo of shelfware as '$2,000 a year for nothing.' ROI framing in her own numbers will land; vague 'growth' pitches will not.
- Emotional landmine: quote follow-up was her late husband's ritual — position it as 'the system does what he used to do' with care, or avoid the comparison entirely.

## Recommendations — implementation detail

### 1. Missed-Call Text-Back

- **Bucket:** Automation Systems
- **Effort tier:** Quick win
- **Client-facing problem:** When the phone rings out, callers hit a full answering machine and "just call the next store." Dana knows sales are leaking but can't say how many.
- **Implementation path:** GHL snapshot: missed-call text-back workflow on a tracked local number layered in front of the store line. Shared conversation inbox for Dana + Ellie (mobile app).
- **Components:**
  - GHL sub-account + local number (call forwarding from existing line)
  - Missed-call text-back workflow
  - Shared inbox + mobile app setup for 2 users
- **Estimated build:** 3–6 hours
- **Monthly maintenance:** Near zero once live; check the inbox is being answered during week 1.
- **Dependencies & risks:**
  - 10DLC/A2P registration for the texting number — allow 1–2 weeks lead time
  - Store line forwarding must be configured with the current phone carrier
- **Pricing anchor** (pricing.yaml · Quick win): setup $500–$1,500, monthly $50–$250

### 2. Delivery Scheduling + Reminder Texts

- **Bucket:** Automation Systems
- **Effort tier:** Standard build
- **Client-facing problem:** Two trucks run off a paper calendar plus Marcus's notes app — this morning both trucks hit the same house while the Hendersons got nothing. ~1 in 5 deliveries bounce because nobody was home.
- **Implementation path:** GHL calendar + SMS reminder workflows for delivery slots; Marcus gets view/edit access from his phone. Reply-to-confirm updates the appointment status; unconfirmed stops appear on a morning checklist.
- **Components:**
  - GHL calendar configured for 2 trucks (Tue/Fri slots)
  - Booking confirmation + day-before reminder SMS workflows
  - Reply-to-confirm automation + unconfirmed-stop morning digest
  - 30-min training for Marcus and Ellie
- **Estimated build:** 8–15 hours
- **Monthly maintenance:** Light — occasional slot/template tweaks; monitor reminder deliverability.
- **Dependencies & risks:**
  - Same 10DLC number as text-back (shared dependency)
  - Adoption risk: Marcus must book into the calendar, not his notes app — Ellie owning enforcement makes or breaks it
- **Pricing anchor** (pricing.yaml · Standard build): setup $1,500–$5,000, monthly $150–$500

### 3. Order-Status Text Updates

- **Bucket:** Automation Systems
- **Effort tier:** Standard build
- **Client-facing problem:** "'Where's my order' is probably a third of the phone traffic some weeks" — each answer takes ~20 minutes of digging through the special-orders binder.
- **Implementation path:** GHL pipeline (stages = order statuses) with SMS-on-stage-change; orders entered once at the counter. Optional later: Make scenario to email the manufacturer rep for status nudges at week 4/8.
- **Components:**
  - GHL pipeline for special orders with 5 status stages
  - Stage-change SMS templates
  - Counter-side entry form (2 minutes per order)
  - Status lookup link
- **Estimated build:** 10–18 hours
- **Monthly maintenance:** Ellie moves cards between stages as manufacturer updates arrive — minutes per day.
- **Dependencies & risks:**
  - Depends on orders being entered at the counter — keep the paper ticket as backup during transition
  - Manufacturer lead-time data is only as good as the rep's updates
- **Pricing anchor** (pricing.yaml · Standard build): setup $1,500–$5,000, monthly $150–$500

### 4. Review Requests After Delivery

- **Bucket:** Automation Systems
- **Effort tier:** Quick win
- **Client-facing problem:** ~40 Google reviews (with two old delivery complaints on top) vs. ~900 at Ashley up the road — because asking felt tacky, so nobody ever asks.
- **Implementation path:** GHL review-request workflow triggered off the delivery calendar's 'completed' status; negative-sentiment reply routes to the shared inbox.
- **Components:**
  - Post-delivery SMS workflow with Google review link
  - Private feedback catch for unhappy replies
- **Estimated build:** 2–4 hours
- **Monthly maintenance:** None beyond glancing at new reviews.
- **Dependencies & risks:**
  - Rides on the delivery calendar being adopted (item 2)
  - Google Business Profile access needed
- **Pricing anchor** (pricing.yaml · Quick win): setup $500–$1,500, monthly $50–$250

### 5. Books Cleanup + Monthly Close

- **Bucket:** Back-Office Services
- **Effort tier:** Larger project
- **Client-facing problem:** QuickBooks Desktop 2019 is ~3 months behind, Square sales are keyed in from printed reports, and the accountant charges an $1,100 'shoebox surcharge' every spring after two straight extension years.
- **Implementation path:** QBO migration from Desktop 2019 + Square→QBO native integration; catch-up reconciliation for the behind months; recurring monthly close service. Coordinate with Pam (keep her in the loop or transition her to reviewer).
- **Components:**
  - QuickBooks Online migration
  - Square integration + chart-of-accounts cleanup
  - 3-month catch-up reconciliation
  - Recurring monthly close + emailed P&L summary
- **Estimated build:** 20–40 hours
- **Monthly maintenance:** Ongoing bookkeeping service (recurring monthly engagement).
- **Dependencies & risks:**
  - Desktop-2019-to-QBO migrations can need data surgery — scope after seeing the file
  - Family dynamics: Pam owns the books today — position as taking work off her plate, not replacing her
  - Everything else that reports on money depends on this being trustworthy first
- **Pricing anchor** (pricing.yaml · Larger project): setup $5,000–$15,000, monthly $300–$1,000

### 6. Balance Collection on Autopilot

- **Bucket:** Back-Office Services
- **Effort tier:** Standard build
- **Client-facing problem:** Final balances are collected by memory — "a couple thousand floating out there on a sticky note" — and the biggest account pays in 60–90 days because chasing Brightview is the call Dana hates most.
- **Implementation path:** Square payment links via GHL workflows for delivery balances (Marcus can't take cards — the link solves the door problem too); invoice-reminder sequences for account customers tied to the monthly close.
- **Components:**
  - Payment-link SMS workflow on delivery day
  - 2-step unpaid-balance nudge sequence
  - AR reminder sequence for account customers (30/45/60 days)
- **Estimated build:** 6–12 hours
- **Monthly maintenance:** Review the unpaid list weekly (5 minutes).
- **Dependencies & risks:**
  - AR reminders are only trustworthy after the books cleanup (item 5)
  - Card-not-present Square fees are slightly higher — worth it vs. uncollected balances
- **Pricing anchor** (pricing.yaml · Standard build): setup $1,500–$5,000, monthly $150–$500

### 7. Past-Customer Reactivation (31 Years of Files)

- **Bucket:** Custom Builds
- **Effort tier:** Larger project
- **Client-facing problem:** Three decades of customers sit in a filing cabinet and Square history, never contacted once — in an industry where people replace furniture every 7–10 years.
- **Implementation path:** Square customer export → dedupe/clean into GHL as the list of record (cancel Constant Contact + evaluate the $89/mo website builder). Optional custom piece: simple scanning workflow for high-value paper tickets (delivery history = what they bought and when). Quarterly campaign templates Ellie can send herself.
- **Components:**
  - Square export + list cleanup/dedupe
  - GHL email/SMS list setup with opt-out handling
  - 3 reusable campaign templates
  - Optional: paper-ticket digitization pass for the last ~5 years
- **Estimated build:** 15–30 hours
- **Monthly maintenance:** Quarterly campaign send (Ellie, with templates) — under an hour each.
- **Dependencies & risks:**
  - Old contact data decays — expect a meaningful bounce rate on the first send
  - Text marketing requires proper opt-in handling; email is the safe default for the cold list
  - Scope the paper digitization tightly or it becomes an archaeology project
- **Pricing anchor** (pricing.yaml · Larger project): setup $5,000–$15,000, monthly $300–$1,000

## Suggested sequencing

- **Start with Missed-Call Text-Back + Review Requests** — Both are quick wins on the same texting number: one plugs the most obvious sales leak this week, the other starts compounding your reputation immediately — visible results before any bigger commitment.
- **Start with Delivery Scheduling + Reminder Texts** — It attacks the pain that wrecked this morning — double-booked trucks and 1-in-5 bounced deliveries — and the calendar it creates is the backbone the order-status and review automations plug into.

## Gold nuggets captured live

- Lost a $2,000 dining-set sale to Ashley because a Facebook message sat two weeks
- ~1 in 5 deliveries bounce (nobody home) and contractor Marcus bills either way
- 'Where's my order' calls = up to a third of phone traffic; each takes ~20 min of binder archaeology
- ~$2,000+ in uncollected delivery balances 'on a sticky note'
- $164/mo of shelfware: $89 website builder untouched since 2023 + $75 Constant Contact unused a year
- $1,100/yr accountant 'shoebox surcharge' + two straight years of filed extensions
- Sold out of the bestselling mattress for 5 weeks at the start of holiday season — nobody noticed
- Burned before: $400/mo agency (8 months) and $4,500 trade-show 'retail management system' never deployed — gun-shy
- 31 years of past customers in a filing cabinet; 7–10 year furniture replacement cycle; zero reactivation ever
- Ellie (daughter) must love any new system or it dies; she's been pushing to modernize for two years
