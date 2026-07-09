// Text renderings of wizard answers and audits (for prompts, GHL payloads,
// and email), plus the realistic sample audit used on /sample-audit and as
// the DEMO_MODE canned response.

import { BUCKET_META } from './wizard';
import type {
  AuditResult,
  CallBrief,
  CallSummary,
  OutboundTeaser,
  ProposalContent,
  WizardAnswers,
} from './types';

export function answersToText(answers: Partial<WizardAnswers>): string {
  const multi = (label: string, a?: { picks: string[]; detail: string }) => {
    if (!a || (!a.picks?.length && !a.detail)) return `${label}: (not answered)`;
    const picks = a.picks?.length ? a.picks.join('; ') : '(none picked)';
    return `${label}: ${picks}${a.detail ? ` — in their words: "${a.detail}"` : ''}`;
  };
  return [
    `Business name: ${answers.business_name || '(not given)'}`,
    `Owner name: ${answers.name || answers.first_name || '(not given)'}`,
    `Email: ${answers.email || '(not given)'}`,
    multi('What they do', answers.what_you_do),
    multi('What happens when a new lead reaches out', answers.lead_flow),
    multi('Tools they run on today', answers.tools),
    multi('Where they think money is leaking', answers.losing_money),
    multi('What eats their time each week', answers.time_sink),
  ].join('\n');
}

/** Flatten an audit into one plain-text blob (GHL can't consume arrays). */
export function toAuditText(audit: AuditResult, businessName?: string | null): string {
  const lines: string[] = [];
  lines.push(`AI AUDIT — ${businessName || 'your business'}`.toUpperCase());
  lines.push('');
  lines.push(audit.headline);
  lines.push('');
  lines.push(`YOUR BIGGEST LEAK: ${audit.pain_named}`);
  lines.push('');
  lines.push(audit.summary);
  for (const group of audit.buckets) {
    const meta = BUCKET_META[group.bucket];
    if (!meta || !group.items.length) continue;
    lines.push('');
    lines.push(`--- ${meta.label.toUpperCase()} (${meta.tag}) ---`);
    for (const item of group.items) {
      lines.push('');
      lines.push(`* ${item.title} [${item.impact}]`);
      lines.push(`  What it is: ${item.what}`);
      lines.push(`  How it helps: ${item.how}`);
      if (item.rollout) lines.push(`  What getting it looks like: ${item.rollout}`);
    }
  }
  lines.push('');
  lines.push(`START HERE — YOUR FIRST MOVE: ${audit.first_move}`);
  return lines.join('\n');
}

// ── Sample audit (public /sample-audit page + demo mode) ───────────────────

export const SAMPLE_ANSWERS: WizardAnswers = {
  business_name: 'Summit Tree & Land',
  first_name: 'Dave',
  email: 'dave@summittreeandland.com',
  what_you_do: {
    picks: ['Tree service / removal', 'Landscaping / lawn care'],
    detail: 'Tree removal, trimming, and lot clearing for homeowners. Two crews in season.',
  },
  lead_flow: {
    picks: ["I miss calls when I'm on a job", 'I book an estimate, then follow up', 'Some leads slip through the cracks'],
    detail: 'Phone rings while I am up a tree. I try to call back at night but some never pick up again.',
  },
  tools: {
    picks: ['Just my phone', 'QuickBooks', 'Google Calendar / Workspace'],
    detail: '',
  },
  losing_money: {
    picks: ['Missed calls', 'Slow follow-up on estimates', 'Few or bad online reviews'],
    detail: 'I quote jobs and never hear back. I know I am losing some of those.',
  },
  time_sink: {
    picks: ['Answering calls and texts', 'Quotes and estimates', 'Invoicing and chasing payments'],
    detail: '',
  },
};

export const SAMPLE_AUDIT: AuditResult = {
  headline: 'Summit Tree & Land: stop losing jobs you already earned.',
  pain_named:
    "Missed calls while you're on a job, and quotes that go quiet. Between the two, you're paying to generate leads you never get paid for.",
  summary:
    "Your answers show a healthy two-crew operation with a phone problem, not a demand problem. Calls come in while you're up a tree, some never get returned, and estimates leave your hands without a follow-up system behind them. The plan below plugs the two leaks first, then takes the invoice chasing off your plate.",
  first_move:
    'Turn on missed-call text-back. It answers every call you physically can’t, in seconds, and it’s live within a week — everything else builds on it.',
  buckets: [
    {
      bucket: 'ghl',
      items: [
        {
          title: 'Missed-call text-back',
          what: 'When a call rings out, the caller instantly gets a text from your business number: "Up a tree right now — how can we help?"',
          impact: 'Recovers 2–5 missed jobs a month',
          how: 'You said you miss calls on the job and some leads slip through. This catches them the moment it happens instead of that night.',
          rollout:
            'We set it up on your existing business number — you approve the message wording, we flip it on. Nothing changes about how you answer calls; it only fires when you can’t. Live within the week.',
        },
        {
          title: 'Estimate follow-up sequence',
          what: 'Every quote you send gets an automatic, polite follow-up by text and email on day 2, day 5, and day 10 until they answer.',
          impact: 'Closes 10–20% more of quotes you already wrote',
          how: 'You quote jobs and never hear back. Most of those homeowners just got busy — a nudge on day 2 wins the ones a competitor would have taken.',
          rollout:
            'You keep quoting exactly how you do today; we wire the follow-ups behind it. You approve the three messages once, and every quote after that gets the sequence automatically. The moment they reply, it stops.',
        },
        {
          title: 'Review engine',
          what: 'After each finished job, the customer gets one text asking for a Google review, with a direct link.',
          impact: 'Steady 5-star reviews without asking in person',
          how: 'You flagged thin reviews. Tree work photographs well and happy customers leave reviews when it takes one tap.',
          rollout:
            'We connect it to your Google Business Profile and set the ask to go out a few hours after you mark a job done. You’ll see the first new reviews within a couple of weeks of turning it on.',
        },
      ],
    },
    {
      bucket: 'plugin',
      items: [
        {
          title: 'Invoice chasing, handled',
          what: 'We watch your QuickBooks invoices and run the reminder cadence on overdue ones — friendly, firm, consistent.',
          impact: 'Saves ~3 hrs/week and shortens time-to-paid',
          how: 'Chasing payments is on your time-sink list. You stay the good guy; the system plays bad cop.',
          rollout:
            'One-time read-only connection to your QuickBooks, then we run the cadence weekly. You get a short note whenever something needs your call — everything else just happens.',
        },
        {
          title: 'Weekly numbers snapshot',
          what: 'Every Monday you get one text: jobs booked, quotes outstanding, invoices overdue, reviews gained.',
          impact: 'The whole business on one screen, weekly',
          how: 'You run on your phone and QuickBooks. This pulls the numbers you actually steer by into one glance.',
          rollout:
            'Rides on the same QuickBooks connection as the invoice chasing — no extra setup on your side. First snapshot lands the Monday after we switch it on.',
        },
      ],
    },
    {
      bucket: 'build',
      items: [
        {
          title: 'Photo-first estimate intake',
          what: 'A simple form on your site: homeowner uploads photos of the tree, you quote simple jobs from your phone without driving out.',
          impact: 'Cuts drive-time on small quotes to zero',
          how: 'Quotes and estimates eat your week. Half your small jobs can be priced from four photos — this gets them to you without a site visit.',
          rollout:
            'We build the form to match how you price (tree size, access, haul-away), put it on your site, and route submissions straight to your phone. One-time build — typically ready inside two weeks.',
        },
      ],
    },
  ],
};

// ── Demo-mode canned objects (dev without an API key) ──────────────────────

export const DEMO_AUDIT = SAMPLE_AUDIT;

export const DEMO_BRIEF: CallBrief = {
  snapshot:
    'Two-crew tree service running on a personal phone, QuickBooks, and Google Calendar. Demand is fine; capture and follow-through leak. Owner answers what he can, quotes go quiet, reviews are thin.',
  pains: [
    'Missed calls while on jobs go to voicemail and die there.',
    'Written estimates get no systematic follow-up.',
    'Invoice chasing eats evenings.',
    'Review count lags the quality of the work.',
  ],
  objections: [
    {
      objection: '"I don\'t want robot texts going to my customers."',
      response: 'Everything sends from your number in your words — show the exact message and offer to tweak it live on the call.',
    },
    {
      objection: '"I tried software before and stopped using it."',
      response: 'This is done-for-you, not software to learn. If he touches nothing, it still runs.',
    },
    {
      objection: '"What does this cost?"',
      response: 'Anchor to one recovered removal job per month vs. the monthly fee; then walk the proposal.',
    },
  ],
  questions: [
    { q: 'When you miss a call on the job, what happens to that caller today?', why: 'Sizes the leak' },
    { q: 'Roughly how many estimates do you write a month, and how many close?', why: 'Quote follow-up value' },
    { q: 'Who chases the overdue invoices right now — and when?', why: 'Back-office fit' },
    { q: 'What would a Saturday off actually require?', why: 'Emotional driver' },
    { q: 'If we only fixed one thing in 30 days, which would you pick?', why: 'Priority + closing anchor' },
  ],
  quick_wins: ['Missed-call text-back live in under a week', 'Estimate follow-up on his next 10 quotes'],
};

export const DEMO_SUMMARY: CallSummary = {
  summary:
    'Strong call. Confirmed missed calls and quiet quotes as the money leaks; invoice chasing is the time leak. Ready to move on the ready-now items; wants pricing before committing to the back-office service.',
  pain_confirmed: 'Missed calls while on jobs, and estimates that never get a follow-up.',
  scope: [
    { title: 'Missed-call text-back', bucket: 'ghl', note: 'Named it his #1 — wants it before storm season.' },
    { title: 'Estimate follow-up sequence', bucket: 'ghl', note: 'Writes ~20 quotes/month, closes ~8. Big upside.' },
    { title: 'Invoice chasing, handled', bucket: 'plugin', note: 'Interested, wants to see it run for a month first.' },
  ],
  next_steps: ['Send proposal with the two ready-now items priced', 'Follow up Thursday if unopened'],
  risks: ['Price-sensitive until first recovered job lands'],
};

export const DEMO_PROPOSAL: ProposalContent = {
  title: 'Growth system proposal for Summit Tree & Land',
  intro:
    "Dave — your audit found two leaks: calls you can't answer and quotes that go quiet. This plugs both inside two weeks, without you learning any software.",
  scope: [
    {
      title: 'Missed-call text-back',
      description: 'Every missed call gets an instant text from your number. Conversations land in one inbox you can run from the truck.',
      tag: 'Ready now',
    },
    {
      title: 'Estimate follow-up sequence',
      description: 'Every estimate gets a day-2 / day-5 / day-10 nudge until they answer. You write the quote; the system does the remembering.',
      tag: 'Ready now',
    },
    {
      title: 'Review engine',
      description: 'One text after each finished job with a direct Google review link.',
      tag: 'Ready now',
    },
  ],
  timeline: [
    { phase: 'Week 1 — Stop the bleeding', window: 'Days 1–7', detail: 'Missed-call text-back live and tested on your real number.' },
    { phase: 'Week 2 — Follow-through', window: 'Days 8–14', detail: 'Estimate follow-up and review engine running on real jobs.' },
  ],
  pricing: [
    { item: 'Setup (all three systems)', price: '$___', cadence: 'one-time' },
    { item: 'Run + monitor + tweak', price: '$___', cadence: 'monthly' },
  ],
  terms:
    'Kickoff within 3 business days of a yes. We need 30 minutes of your time and access to your business number. Month-to-month — if it isn’t paying for itself, cancel and keep everything we set up.',
};

export const DEMO_OUTREACH: { teaser: OutboundTeaser; subject: string; body: string } = {
  teaser: {
    hook: 'Riverside Pressure Pros has strong before/after photos but no way to catch a call when the crew is mid-driveway.',
    leaks: ['Missed calls during jobs in peak season', 'No follow-up on quoted driveways and roofs'],
    fix: 'Missed-call text-back on the main line, live within a week.',
  },
  subject: 'missed calls at riverside pressure pros',
  body: 'Saw your before/after work around town — good stuff. Quick question: when a homeowner calls while the crew is mid-job, what happens to that call?\n\nMost outfits your size are losing 2–5 jobs a month to voicemail. We fix that (and quiet quotes) for local service businesses.\n\nIf you want to see where your money is leaking, run our free 2-minute audit: https://mkoperating.com/audit — it builds you a ranked plan on the spot.\n\nMick',
};
