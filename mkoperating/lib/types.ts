// Shared domain types for the MK Operating growth system.

export type MultiAnswer = { picks: string[]; detail: string };

export interface WizardAnswers {
  business_name: string;
  /** Legacy: old wizards collected an optional first name at step 2. */
  first_name?: string;
  /** Full name + phone, collected at the final "your details" step. */
  name?: string;
  phone?: string;
  email: string;
  what_you_do: MultiAnswer;
  lead_flow: MultiAnswer;
  tools: MultiAnswer;
  losing_money: MultiAnswer;
  time_sink: MultiAnswer;
}

export type BucketKey = 'ghl' | 'plugin' | 'build';

export interface AuditItem {
  title: string;
  what: string; // "What it is"
  how: string; // "How it helps your business"
  impact: string; // e.g. "Saves ~5 hrs/week"
  /** "What getting it looks like" — setup, what we need from them, when it's live.
      Optional so audits stored before this field existed still render. */
  rollout?: string;
}

export interface AuditResult {
  headline: string;
  pain_named: string;
  summary: string;
  first_move: string;
  buckets: { bucket: BucketKey; items: AuditItem[] }[];
}

export type LeadStatus =
  | 'new'
  | 'emailed'
  | 'booked'
  | 'call_done'
  | 'proposal_sent'
  | 'won'
  | 'lost';

export type GhlStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  business_name: string | null;
  answers: Partial<WizardAnswers>;
  audit: AuditResult | null;
  audit_text: string | null;
  status: LeadStatus;
  stage: 'partial' | 'completed';
  source: string;
  session_id: string | null;
  ghl_status: GhlStatus;
  ghl_attempts: number;
  ghl_last_error: string | null;
  ghl_synced_at: string | null;
}

export type LeadEventType =
  | 'lead_created'
  | 'step_saved'
  | 'audit_generated'
  | 'audit_failed'
  | 'audit_emailed'
  | 'audit_email_failed'
  | 'ghl_push_ok'
  | 'ghl_push_failed'
  | 'ghl_push_skipped'
  | 'status_changed'
  | 'note'
  | 'brief_generated'
  | 'call_started'
  | 'call_summary'
  | 'proposal_created'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'booked_webhook';

export interface LeadEvent {
  id: string;
  lead_id: string;
  type: LeadEventType;
  data: Record<string, unknown>;
  created_at: string;
}

// ── Discovery copilot ──────────────────────────────────────────────────────

export interface CallBrief {
  snapshot: string; // one-paragraph read on the business
  pains: string[]; // likely pain points, most likely first
  objections: { objection: string; response: string }[];
  questions: { q: string; why: string }[]; // discovery questions tailored to them
  quick_wins: string[]; // things we could have live in ~a week
}

export interface CallLive {
  notes: string;
  asked: string[]; // indices/keys of questions marked asked
  signals: string[]; // tapped quick-capture chips
  checklist: string[]; // completed checklist item keys
  started_at?: string;
  ended_at?: string;
}

export interface CallSummary {
  summary: string;
  pain_confirmed: string;
  scope: { title: string; bucket: BucketKey; note: string }[];
  next_steps: string[];
  risks: string[];
}

export interface CallRecord {
  id: string;
  lead_id: string;
  status: 'prepped' | 'live' | 'done';
  brief: CallBrief | null;
  live: CallLive;
  summary: CallSummary | null;
  created_at: string;
  updated_at: string;
}

// ── Proposals ──────────────────────────────────────────────────────────────

export interface ProposalContent {
  title: string;
  intro: string;
  scope: { title: string; description: string; tag: string }[];
  timeline: { phase: string; window: string; detail: string }[];
  pricing: { item: string; price: string; cadence: string }[];
  terms: string;
}

export interface Proposal {
  id: string;
  lead_id: string;
  slug: string;
  content: ProposalContent;
  status: 'draft' | 'sent' | 'viewed';
  view_count: number;
  first_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Outbound ───────────────────────────────────────────────────────────────

export type ProspectStatus = 'new' | 'drafted' | 'sent' | 'replied' | 'converted' | 'dead';

export interface OutboundTeaser {
  hook: string; // the one-line personalized observation
  leaks: string[]; // 2-3 likely leaks for this niche/town
  fix: string; // what we'd fix first
}

export interface Prospect {
  id: string;
  batch: string;
  name: string;
  niche: string;
  town: string;
  website: string | null;
  email: string | null;
  status: ProspectStatus;
  teaser: OutboundTeaser | null;
  email_subject: string | null;
  email_body: string | null;
  created_at: string;
  updated_at: string;
}

// ── Content (trust pages) ──────────────────────────────────────────────────

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  company: string;
  role: string;
  result: string; // headline metric, e.g. "Booked 9 extra jobs in 30 days"
  published: boolean;
  sort: number;
  created_at: string;
}

export interface WorkItem {
  id: string;
  title: string;
  niche: string;
  town: string;
  problem: string;
  built: string;
  result: string;
  published: boolean;
  sort: number;
  created_at: string;
}

// ── Funnel analytics ───────────────────────────────────────────────────────

export interface FunnelEvent {
  id: string;
  session_id: string;
  step: string; // wizard step key or 'results'
  event: 'view' | 'complete' | 'submit' | 'audit_ready' | 'audit_error';
  lead_id: string | null;
  created_at: string;
}
