// Server-side Anthropic integration. Every generator returns a typed object
// via structured outputs (JSON schema), with a defensive fallback to plain
// JSON prompting if the API rejects output_config, and canned DEMO_MODE
// responses for local testing without a key.

import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';
import type {
  AuditResult,
  CallBrief,
  CallLive,
  CallSummary,
  Lead,
  OutboundTeaser,
  ProposalContent,
  Prospect,
  WizardAnswers,
} from './types';
import {
  DEMO_AUDIT,
  DEMO_BRIEF,
  DEMO_OUTREACH,
  DEMO_PROPOSAL,
  DEMO_SUMMARY,
  answersToText,
} from './audit-content';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicKey });
  return _client;
}

export function aiConfigured(): boolean {
  return Boolean(env.anthropicKey) || env.demoMode;
}

const SYSTEM = `You are the audit and sales engine for MK Operating Company (mkoperating.com).

Who we are: MK Operating helps local, owner-operated service businesses (tree work, pressure washing, landscaping, cleaning, roofing, HVAC/plumbing/electrical, and similar) stop leaking money to missed calls, slow follow-up, and back-office drag. We sell done-for-you automation, not software seats.

Everything we offer falls into exactly three buckets:
- "ghl" — Automation systems (tag: Ready now): systems we stand up fast that catch leads, follow up, and keep customers warm automatically. Examples: missed-call text-back, instant lead reply, estimate follow-up sequences, review requests, database reactivation, appointment reminders. Most can be live in about a week.
- "plugin" — Back-office handled by us (tag: Run by us): recurring work we run for the owner in the background. Examples: invoice chasing, weekly numbers snapshot, schedule tending, lead-list upkeep.
- "build" — Custom builds (tag: One-time build): bespoke one-time tools for the specific way the business runs. Examples: a quote calculator for their pricing rules, a job-photo intake form, a simple crew dispatch board.

Voice: plain, direct, owner-to-owner. No jargon, no hype, no exclamation marks. Talk about their hours and their dollars. Use their own words from their answers when possible. Be specific to their trade and situation — never generic.`;

async function generateObject<T>(opts: {
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  system?: string;
}): Promise<T> {
  const { user, schema, schemaName, maxTokens = 4096, system = SYSTEM } = opts;
  try {
    const params = {
      model: env.anthropicModel,
      max_tokens: maxTokens,
      system,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }],
    } as unknown as Anthropic.MessageCreateParamsNonStreaming;
    const res = await client().messages.create(params);
    return parseJsonResponse<T>(res);
  } catch (e: unknown) {
    // Older API surface or schema rejection — fall back to prompted JSON.
    const msg = e instanceof Error ? e.message : String(e);
    if (/output_config|json_schema|format/i.test(msg)) {
      console.warn(`[mk:ai] structured output rejected for ${schemaName}, falling back to prompted JSON`);
      const res = await client().messages.create({
        model: env.anthropicModel,
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: 'user',
            content: `${user}\n\nRespond with ONLY a valid JSON object matching this JSON schema (no markdown fences, no commentary):\n${JSON.stringify(schema)}`,
          },
        ],
      });
      return parseJsonResponse<T>(res);
    }
    throw e;
  }
}

function parseJsonResponse<T>(res: Anthropic.Message): T {
  if (res.stop_reason === 'refusal') {
    throw new Error('Model refused the request');
  }
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model response');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// ── Audit generation ───────────────────────────────────────────────────────

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'pain_named', 'summary', 'first_move', 'buckets'],
  properties: {
    headline: {
      type: 'string',
      description:
        "Audit headline addressed to the business by name, naming the core opportunity. e.g. 'Summit Tree & Land: stop losing jobs you already earned.'",
    },
    pain_named: {
      type: 'string',
      description:
        'One or two sentences naming their single biggest leak, grounded in their own answers. This is the "Your biggest leak" callout.',
    },
    summary: {
      type: 'string',
      description:
        'Two to four sentences summarizing what their answers show and what the plan below does about it. Written to the owner.',
    },
    first_move: {
      type: 'string',
      description:
        'One or two sentences: the single thing to do first and why it pays back fastest. This is the "Start here — your first move" callout.',
    },
    buckets: {
      type: 'array',
      description:
        'The ranked plan, grouped by bucket, ordered by impact (biggest leak first). Include only buckets that have at least one item. 2-3 items for ghl, 1-2 for plugin, 0-2 for build.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bucket', 'items'],
        properties: {
          bucket: { type: 'string', enum: ['ghl', 'plugin', 'build'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'what', 'how', 'impact'],
              properties: {
                title: { type: 'string', description: 'Short name of the fix, e.g. "Missed-call text-back"' },
                what: { type: 'string', description: '"What it is" — 1-2 plain sentences.' },
                how: {
                  type: 'string',
                  description:
                    '"How it helps your business" — 1-2 sentences tied to THEIR answers (their trade, their leak, their tools).',
                },
                impact: {
                  type: 'string',
                  description: 'Short impact estimate, e.g. "Recovers 2-5 missed jobs a month" or "Saves ~4 hrs/week".',
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export async function generateAudit(answers: WizardAnswers): Promise<AuditResult> {
  if (env.demoMode && !env.anthropicKey) return DEMO_AUDIT;
  return generateObject<AuditResult>({
    schemaName: 'audit',
    schema: AUDIT_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 6000,
    user: `A local service business owner just completed our 7-question audit. Their answers:

${answersToText(answers)}

Build their tailored audit. Rank fixes by impact on THEIR stated leaks and time sinks. Reference their trade and their own words. Do not recommend tools they already use as if they were new — build on what they have. Keep every field within its described length.`,
  });
}

// ── Discovery copilot ──────────────────────────────────────────────────────

const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['snapshot', 'pains', 'objections', 'questions', 'quick_wins'],
  properties: {
    snapshot: { type: 'string', description: 'One paragraph: who they are, how they run today, where it hurts.' },
    pains: { type: 'array', items: { type: 'string' }, description: '3-5 likely pain points, most likely first, each one sentence.' },
    objections: {
      type: 'array',
      description: '3-4 objections this specific owner is likely to raise, with a suggested response.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['objection', 'response'],
        properties: {
          objection: { type: 'string' },
          response: { type: 'string', description: 'How to answer it, one or two sentences, owner-to-owner tone.' },
        },
      },
    },
    questions: {
      type: 'array',
      description: '6-8 discovery questions specific to their business, ordered for the call.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['q', 'why'],
        properties: {
          q: { type: 'string', description: 'The question, phrased naturally to say out loud.' },
          why: { type: 'string', description: 'What the answer tells us, a few words.' },
        },
      },
    },
    quick_wins: { type: 'array', items: { type: 'string' }, description: '2-4 things we could have live within a week for them.' },
  },
} as const;

export async function generateBrief(lead: Lead): Promise<CallBrief> {
  if (env.demoMode && !env.anthropicKey) return DEMO_BRIEF;
  return generateObject<CallBrief>({
    schemaName: 'brief',
    schema: BRIEF_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 4000,
    user: `Prepare a pre-call brief for a discovery call with this lead. They completed the audit; we're about to walk it with them and map next steps.

LEAD ANSWERS:
${answersToText(lead.answers as WizardAnswers)}

THEIR GENERATED AUDIT:
${lead.audit_text || '(audit not generated)'}

Make everything specific to this business — the pains, the objections, the questions. Phrase questions to be read aloud mid-call by someone glancing at a screen.`,
  });
}

const SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'pain_confirmed', 'scope', 'next_steps', 'risks'],
  properties: {
    summary: { type: 'string', description: 'One tight paragraph: how the call went and where things stand.' },
    pain_confirmed: { type: 'string', description: 'The pain that actually matters to them, as confirmed/updated on the call.' },
    scope: {
      type: 'array',
      description: 'Recommended engagement scope, ready-now items first. 2-5 items.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'bucket', 'note'],
        properties: {
          title: { type: 'string' },
          bucket: { type: 'string', enum: ['ghl', 'plugin', 'build'] },
          note: { type: 'string', description: 'Why it made the scope, tied to the call.' },
        },
      },
    },
    next_steps: { type: 'array', items: { type: 'string' }, description: '2-4 concrete next steps with owners.' },
    risks: { type: 'array', items: { type: 'string' }, description: '0-3 deal risks worth remembering.' },
  },
} as const;

export async function generateCallSummary(lead: Lead, brief: CallBrief | null, live: CallLive): Promise<CallSummary> {
  if (env.demoMode && !env.anthropicKey) return DEMO_SUMMARY;
  return generateObject<CallSummary>({
    schemaName: 'call_summary',
    schema: SUMMARY_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 3000,
    user: `Summarize a discovery call and recommend an engagement scope.

LEAD:
${answersToText(lead.answers as WizardAnswers)}

THEIR AUDIT:
${lead.audit_text || '(none)'}

PRE-CALL BRIEF PAINS: ${brief ? brief.pains.join(' | ') : '(none)'}

WHAT HAPPENED ON THE CALL (operator's live capture):
- Signals tapped: ${live.signals.length ? live.signals.join(', ') : '(none)'}
- Checklist done: ${live.checklist.length ? live.checklist.join(', ') : '(none)'}
- Questions asked: ${live.asked.length ? live.asked.join(' | ') : '(none)'}
- Notes: ${live.notes || '(none)'}

Recommend scope from the "ready now" items first. Only include what the call actually supports.`,
  });
}

// ── Proposal generation ────────────────────────────────────────────────────

const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'intro', 'scope', 'timeline', 'pricing', 'terms'],
  properties: {
    title: { type: 'string', description: 'e.g. "Growth system proposal for Summit Tree & Land"' },
    intro: {
      type: 'string',
      description:
        "2-3 sentences addressed to the owner by first name where known: the leak we found, what this proposal plugs, why it's fast.",
    },
    scope: {
      type: 'array',
      description: '2-5 scope items, ready-now first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'tag'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string', description: '1-2 sentences of what we deliver, in their terms.' },
          tag: { type: 'string', enum: ['Ready now', 'Run by us', 'One-time build'] },
        },
      },
    },
    timeline: {
      type: 'array',
      description: '2-4 phases.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['phase', 'window', 'detail'],
        properties: {
          phase: { type: 'string', description: 'e.g. "Week 1 — Stop the bleeding"' },
          window: { type: 'string', description: 'e.g. "Days 1-7"' },
          detail: { type: 'string' },
        },
      },
    },
    pricing: {
      type: 'array',
      description: 'One row per scope item or bundle. Prices are placeholders the operator fills in.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'price', 'cadence'],
        properties: {
          item: { type: 'string' },
          price: { type: 'string', description: 'Always exactly "$___" — operator fills this in.' },
          cadence: { type: 'string', enum: ['one-time', 'monthly', ''] },
        },
      },
    },
    terms: { type: 'string', description: 'Short, friendly terms: kickoff, what we need from them, cancel-anytime posture.' },
  },
} as const;

export async function generateProposalDraft(lead: Lead, callSummary: CallSummary | null): Promise<ProposalContent> {
  if (env.demoMode && !env.anthropicKey) return DEMO_PROPOSAL;
  return generateObject<ProposalContent>({
    schemaName: 'proposal',
    schema: PROPOSAL_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 4000,
    user: `Draft a one-page proposal for this lead.

LEAD:
${answersToText(lead.answers as WizardAnswers)}

THEIR AUDIT:
${lead.audit_text || '(none)'}

CALL OUTCOME:
${callSummary ? JSON.stringify(callSummary) : '(no call yet — scope from the audit ready-now items)'}

Scope from the "ready now" items${callSummary ? ' confirmed on the call' : ''}. Keep it one page: tight intro, concrete scope, honest timeline, pricing rows with "$___" placeholders.`,
  });
}

// ── Outbound ───────────────────────────────────────────────────────────────

const OUTREACH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['teaser', 'subject', 'body'],
  properties: {
    teaser: {
      type: 'object',
      additionalProperties: false,
      required: ['hook', 'leaks', 'fix'],
      properties: {
        hook: { type: 'string', description: 'One personalized observation about THIS business (from its niche/town/site).' },
        leaks: { type: 'array', items: { type: 'string' }, description: '2-3 likely money leaks for this specific niche+town.' },
        fix: { type: 'string', description: 'The one fix we would stand up first for them.' },
      },
    },
    subject: { type: 'string', description: 'Email subject, lowercase-casual, specific, no clickbait. e.g. "missed calls at {name}"' },
    body: {
      type: 'string',
      description:
        'Short cold email (under 120 words), plain text. Personal opener from the hook, one or two leaks, one-line offer, link to the free audit at https://mkoperating.com/audit, soft sign-off "Mick". No placeholders except the audit link.',
    },
  },
} as const;

export async function generateOutreach(
  prospect: Prospect,
  siteText: string | null
): Promise<{ teaser: OutboundTeaser; subject: string; body: string }> {
  if (env.demoMode && !env.anthropicKey) return DEMO_OUTREACH;
  return generateObject({
    schemaName: 'outreach',
    schema: OUTREACH_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 2000,
    user: `Write a personalized mini-audit teaser and outreach email draft for this cold prospect. It will be reviewed and sent manually by Mick (the operator) — do not mention automation or AI.

PROSPECT:
- Business: ${prospect.name}
- Niche: ${prospect.niche}
- Town: ${prospect.town}
- Website: ${prospect.website || '(none listed)'}
${siteText ? `\nTHEIR WEBSITE SAYS (excerpt):\n${siteText.slice(0, 3000)}` : ''}

Ground the hook in something real (their site if provided, otherwise their niche+town reality). Never invent specifics like review counts or years in business unless the site text states them.`,
  });
}
