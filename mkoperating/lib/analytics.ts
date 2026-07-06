// Funnel + lead analytics for the admin dashboard and morning digest.
// Aggregation happens in JS over recent rows — boringly fine at this traffic.

import { listFunnelEvents, listLeads } from './db';
import { WIZARD_STEPS } from './wizard';
import type { Lead } from './types';

export interface StepStat {
  key: string;
  label: string;
  views: number;
  completes: number;
}

export interface FunnelStats {
  days: number;
  sessions: number;
  steps: StepStat[];
  submits: number;
  auditsReady: number;
  auditErrors: number;
}

export async function funnelStats(days = 14): Promise<FunnelStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const events = await listFunnelEvents(since);

  const sessions = new Set(events.map((e) => e.session_id)).size;
  // Count unique sessions per step/event so refreshes don't inflate numbers.
  const bucket = new Map<string, Set<string>>();
  for (const e of events) {
    const k = `${e.step}:${e.event}`;
    if (!bucket.has(k)) bucket.set(k, new Set());
    bucket.get(k)!.add(e.session_id);
  }
  const count = (step: string, event: string) => bucket.get(`${step}:${event}`)?.size ?? 0;

  return {
    days,
    sessions,
    steps: WIZARD_STEPS.map((s) => ({
      key: s.key,
      label: s.label,
      views: count(s.key, 'view'),
      completes: count(s.key, 'complete'),
    })),
    submits: count('results', 'submit'),
    auditsReady: count('results', 'audit_ready'),
    auditErrors: count('results', 'audit_error'),
  };
}

export interface LeadKpis {
  total: number;
  last7: number;
  completed: number;
  partial: number;
  booked: number;
  won: number;
  byStatus: Record<string, number>;
  ghlPending: number;
  ghlFailed: number;
}

export function computeLeadKpis(leads: Lead[]): LeadKpis {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const byStatus: Record<string, number> = {};
  let booked = 0;
  let won = 0;
  let completed = 0;
  let partial = 0;
  let last7 = 0;
  let ghlPending = 0;
  let ghlFailed = 0;
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    if (['booked', 'call_done', 'proposal_sent', 'won'].includes(l.status)) booked++;
    if (l.status === 'won') won++;
    if (l.stage === 'completed') completed++;
    else partial++;
    if (new Date(l.created_at).getTime() > weekAgo) last7++;
    if (l.ghl_status === 'pending') ghlPending++;
    if (l.ghl_status === 'failed') ghlFailed++;
  }
  return { total: leads.length, last7, completed, partial, booked, won, byStatus, ghlPending, ghlFailed };
}

export interface ChaseItem {
  lead: Lead;
  reason: string;
}

/** Leads worth chasing right now, most urgent first. */
export function whoToChase(leads: Lead[]): ChaseItem[] {
  const out: ChaseItem[] = [];
  const now = Date.now();
  const hours = (iso: string) => (now - new Date(iso).getTime()) / 36e5;

  for (const l of leads) {
    if (l.status === 'won' || l.status === 'lost') continue;
    const ageH = hours(l.created_at);
    if (l.stage === 'completed' && l.status === 'new' && ageH > 24) {
      out.push({ lead: l, reason: `Audit ${Math.floor(ageH / 24)}d ago, never contacted` });
    } else if (l.status === 'emailed' && hours(l.updated_at) > 72) {
      out.push({ lead: l, reason: 'Emailed 3+ days ago, no booking' });
    } else if (l.status === 'call_done' && hours(l.updated_at) > 48) {
      out.push({ lead: l, reason: 'Call done, no proposal sent' });
    } else if (l.status === 'proposal_sent' && hours(l.updated_at) > 96) {
      out.push({ lead: l, reason: 'Proposal quiet for 4+ days' });
    } else if (l.stage === 'partial' && ageH > 2 && ageH < 24 * 14) {
      out.push({ lead: l, reason: 'Started the audit, never finished' });
    }
  }
  // Most recently touched first within urgency ordering above
  return out.slice(0, 20);
}

export async function dashboardData() {
  const [leads, funnel] = await Promise.all([listLeads({ limit: 500 }), funnelStats(14)]);
  return {
    leads,
    funnel,
    kpis: computeLeadKpis(leads),
    chase: whoToChase(leads),
  };
}
