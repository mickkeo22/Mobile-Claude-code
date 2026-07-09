// Data access layer. Backed by Supabase (service role, server-only) with an
// in-process memory fallback for local dev when no credentials are set.
//
// Design rule: reads return empty values and writes return null on failure —
// callers on the public funnel never throw because storage hiccuped. Every
// failure is logged loudly to the server console.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { env } from './env';
import type {
  CallRecord,
  FunnelEvent,
  Lead,
  LeadEvent,
  LeadEventType,
  LeadStatus,
  Proposal,
  Prospect,
  Testimonial,
  WorkItem,
} from './types';

const T = {
  leads: 'mk_leads',
  events: 'mk_lead_events',
  calls: 'mk_calls',
  proposals: 'mk_proposals',
  prospects: 'mk_outbound_prospects',
  funnel: 'mk_funnel_events',
  testimonials: 'mk_testimonials',
  work: 'mk_work_items',
} as const;

// ── Client ─────────────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function supabase(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  if (!_client) {
    _client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export function storageMode(): 'supabase' | 'memory' {
  return supabase() ? 'supabase' : 'memory';
}

// ── Memory fallback (dev only) ─────────────────────────────────────────────

type Mem = {
  leads: Map<string, Lead>;
  events: LeadEvent[];
  calls: Map<string, CallRecord>;
  proposals: Map<string, Proposal>;
  prospects: Map<string, Prospect>;
  funnel: FunnelEvent[];
  testimonials: Map<string, Testimonial>;
  work: Map<string, WorkItem>;
  warned: boolean;
};

const g = globalThis as unknown as { __mkMem?: Mem };
function mem(): Mem {
  if (!g.__mkMem) {
    g.__mkMem = {
      leads: new Map(),
      events: [],
      calls: new Map(),
      proposals: new Map(),
      prospects: new Map(),
      funnel: [],
      testimonials: new Map(),
      work: new Map(),
      warned: false,
    };
  }
  if (!g.__mkMem.warned) {
    g.__mkMem.warned = true;
    console.warn(
      '[mk:db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory storage (dev only, data is lost on restart).'
    );
  }
  return g.__mkMem;
}

function now() {
  return new Date().toISOString();
}

function fail(op: string, error: unknown) {
  console.error(`[mk:db] ${op} failed:`, error);
}

// ── Leads ──────────────────────────────────────────────────────────────────

export async function createLead(fields: Partial<Lead> & { email: string }): Promise<Lead | null> {
  const lead: Lead = {
    id: randomUUID(),
    created_at: now(),
    updated_at: now(),
    email: fields.email.trim().toLowerCase(),
    first_name: fields.first_name ?? null,
    last_name: fields.last_name ?? null,
    phone: fields.phone ?? null,
    business_name: fields.business_name ?? null,
    answers: fields.answers ?? {},
    audit: fields.audit ?? null,
    audit_text: fields.audit_text ?? null,
    status: fields.status ?? 'new',
    stage: fields.stage ?? 'partial',
    source: fields.source ?? 'audit_wizard',
    session_id: fields.session_id ?? null,
    ghl_status: fields.ghl_status ?? 'pending',
    ghl_attempts: fields.ghl_attempts ?? 0,
    ghl_last_error: null,
    ghl_synced_at: null,
  };
  const sb = supabase();
  if (!sb) {
    mem().leads.set(lead.id, lead);
    return lead;
  }
  try {
    const { data, error } = await sb.from(T.leads).insert(lead).select().single();
    if (error) throw error;
    return data as Lead;
  } catch (e) {
    fail('createLead', e);
    return null;
  }
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const clean = { ...patch, updated_at: now() };
  delete (clean as Record<string, unknown>).id;
  const sb = supabase();
  if (!sb) {
    const cur = mem().leads.get(id);
    if (!cur) return null;
    const next = { ...cur, ...clean } as Lead;
    mem().leads.set(id, next);
    return next;
  }
  try {
    const { data, error } = await sb.from(T.leads).update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data as Lead;
  } catch (e) {
    fail('updateLead', e);
    return null;
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  const sb = supabase();
  if (!sb) return mem().leads.get(id) ?? null;
  try {
    const { data, error } = await sb.from(T.leads).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Lead) ?? null;
  } catch (e) {
    fail('getLead', e);
    return null;
  }
}

export async function findLeadBySession(sessionId: string): Promise<Lead | null> {
  if (!sessionId) return null;
  const sb = supabase();
  if (!sb) {
    for (const l of mem().leads.values()) if (l.session_id === sessionId) return l;
    return null;
  }
  try {
    const { data, error } = await sb
      .from(T.leads)
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Lead) ?? null;
  } catch (e) {
    fail('findLeadBySession', e);
    return null;
  }
}

export async function findLeadByEmail(email: string): Promise<Lead | null> {
  const needle = email.trim().toLowerCase();
  const sb = supabase();
  if (!sb) {
    const all = [...mem().leads.values()].filter((l) => l.email === needle);
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return all[0] ?? null;
  }
  try {
    const { data, error } = await sb
      .from(T.leads)
      .select('*')
      .eq('email', needle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Lead) ?? null;
  } catch (e) {
    fail('findLeadByEmail', e);
    return null;
  }
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | 'all';
  stage?: 'partial' | 'completed' | 'all';
  limit?: number;
}

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const { search, status, stage, limit = 200 } = filters;
  const sb = supabase();
  if (!sb) {
    let rows = [...mem().leads.values()];
    if (status && status !== 'all') rows = rows.filter((l) => l.status === status);
    if (stage && stage !== 'all') rows = rows.filter((l) => l.stage === stage);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.email.includes(q) ||
          (l.business_name ?? '').toLowerCase().includes(q) ||
          (l.first_name ?? '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return rows.slice(0, limit);
  }
  try {
    let q = sb.from(T.leads).select('*').order('created_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') q = q.eq('status', status);
    if (stage && stage !== 'all') q = q.eq('stage', stage);
    if (search) {
      const s = search.replaceAll('%', '').replaceAll(',', ' ');
      q = q.or(`email.ilike.%${s}%,business_name.ilike.%${s}%,first_name.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data as Lead[]) ?? [];
  } catch (e) {
    fail('listLeads', e);
    return [];
  }
}

export async function listLeadsBetween(fromIso: string, toIso: string): Promise<Lead[]> {
  const sb = supabase();
  if (!sb) {
    return [...mem().leads.values()]
      .filter((l) => l.created_at >= fromIso && l.created_at < toIso)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  try {
    const { data, error } = await sb
      .from(T.leads)
      .select('*')
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Lead[]) ?? [];
  } catch (e) {
    fail('listLeadsBetween', e);
    return [];
  }
}

/** Completed leads whose GHL push failed (or is pending with attempts made) — retry sweep. */
export async function leadsNeedingGhlRetry(limit = 25): Promise<Lead[]> {
  const sb = supabase();
  if (!sb) {
    return [...mem().leads.values()]
      .filter((l) => l.ghl_status === 'failed' || l.ghl_status === 'pending')
      .slice(0, limit);
  }
  try {
    const { data, error } = await sb
      .from(T.leads)
      .select('*')
      .in('ghl_status', ['failed', 'pending'])
      .lt('ghl_attempts', 10)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Lead[]) ?? [];
  } catch (e) {
    fail('leadsNeedingGhlRetry', e);
    return [];
  }
}

// ── Lead events (timeline + delivery log) ──────────────────────────────────

export async function logEvent(
  leadId: string,
  type: LeadEventType,
  data: Record<string, unknown> = {}
): Promise<void> {
  const ev: LeadEvent = {
    id: randomUUID(),
    lead_id: leadId,
    type,
    data,
    created_at: now(),
  };
  const sb = supabase();
  if (!sb) {
    mem().events.push(ev);
    return;
  }
  try {
    const { error } = await sb.from(T.events).insert(ev);
    if (error) throw error;
  } catch (e) {
    fail('logEvent', e);
  }
}

export async function listEvents(leadId: string): Promise<LeadEvent[]> {
  const sb = supabase();
  if (!sb) {
    return mem()
      .events.filter((e) => e.lead_id === leadId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  try {
    const { data, error } = await sb
      .from(T.events)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data as LeadEvent[]) ?? [];
  } catch (e) {
    fail('listEvents', e);
    return [];
  }
}

export async function listEventsBetween(fromIso: string, toIso: string): Promise<LeadEvent[]> {
  const sb = supabase();
  if (!sb) {
    return mem().events.filter((e) => e.created_at >= fromIso && e.created_at < toIso);
  }
  try {
    const { data, error } = await sb
      .from(T.events)
      .select('*')
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .limit(1000);
    if (error) throw error;
    return (data as LeadEvent[]) ?? [];
  } catch (e) {
    fail('listEventsBetween', e);
    return [];
  }
}

// ── Calls (discovery copilot) ──────────────────────────────────────────────

export async function getCallForLead(leadId: string): Promise<CallRecord | null> {
  const sb = supabase();
  if (!sb) {
    const all = [...mem().calls.values()].filter((c) => c.lead_id === leadId);
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return all[0] ?? null;
  }
  try {
    const { data, error } = await sb
      .from(T.calls)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as CallRecord) ?? null;
  } catch (e) {
    fail('getCallForLead', e);
    return null;
  }
}

export async function createCall(leadId: string, fields: Partial<CallRecord>): Promise<CallRecord | null> {
  const call: CallRecord = {
    id: randomUUID(),
    lead_id: leadId,
    status: fields.status ?? 'prepped',
    brief: fields.brief ?? null,
    live: fields.live ?? { notes: '', asked: [], signals: [], checklist: [] },
    summary: fields.summary ?? null,
    created_at: now(),
    updated_at: now(),
  };
  const sb = supabase();
  if (!sb) {
    mem().calls.set(call.id, call);
    return call;
  }
  try {
    const { data, error } = await sb.from(T.calls).insert(call).select().single();
    if (error) throw error;
    return data as CallRecord;
  } catch (e) {
    fail('createCall', e);
    return null;
  }
}

export async function updateCall(id: string, patch: Partial<CallRecord>): Promise<CallRecord | null> {
  const clean = { ...patch, updated_at: now() };
  delete (clean as Record<string, unknown>).id;
  const sb = supabase();
  if (!sb) {
    const cur = mem().calls.get(id);
    if (!cur) return null;
    const next = { ...cur, ...clean } as CallRecord;
    mem().calls.set(id, next);
    return next;
  }
  try {
    const { data, error } = await sb.from(T.calls).update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data as CallRecord;
  } catch (e) {
    fail('updateCall', e);
    return null;
  }
}

// ── Proposals ──────────────────────────────────────────────────────────────

export async function createProposal(p: Omit<Proposal, 'created_at' | 'updated_at'>): Promise<Proposal | null> {
  const row: Proposal = { ...p, created_at: now(), updated_at: now() };
  const sb = supabase();
  if (!sb) {
    mem().proposals.set(row.id, row);
    return row;
  }
  try {
    const { data, error } = await sb.from(T.proposals).insert(row).select().single();
    if (error) throw error;
    return data as Proposal;
  } catch (e) {
    fail('createProposal', e);
    return null;
  }
}

export async function updateProposal(id: string, patch: Partial<Proposal>): Promise<Proposal | null> {
  const clean = { ...patch, updated_at: now() };
  delete (clean as Record<string, unknown>).id;
  const sb = supabase();
  if (!sb) {
    const cur = mem().proposals.get(id);
    if (!cur) return null;
    const next = { ...cur, ...clean } as Proposal;
    mem().proposals.set(id, next);
    return next;
  }
  try {
    const { data, error } = await sb.from(T.proposals).update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data as Proposal;
  } catch (e) {
    fail('updateProposal', e);
    return null;
  }
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const sb = supabase();
  if (!sb) return mem().proposals.get(id) ?? null;
  try {
    const { data, error } = await sb.from(T.proposals).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Proposal) ?? null;
  } catch (e) {
    fail('getProposal', e);
    return null;
  }
}

export async function getProposalBySlug(slug: string): Promise<Proposal | null> {
  const sb = supabase();
  if (!sb) {
    for (const p of mem().proposals.values()) if (p.slug === slug) return p;
    return null;
  }
  try {
    const { data, error } = await sb.from(T.proposals).select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return (data as Proposal) ?? null;
  } catch (e) {
    fail('getProposalBySlug', e);
    return null;
  }
}

export async function getProposalForLead(leadId: string): Promise<Proposal | null> {
  const sb = supabase();
  if (!sb) {
    const all = [...mem().proposals.values()].filter((p) => p.lead_id === leadId);
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return all[0] ?? null;
  }
  try {
    const { data, error } = await sb
      .from(T.proposals)
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Proposal) ?? null;
  } catch (e) {
    fail('getProposalForLead', e);
    return null;
  }
}

/** Public share-page view: bump counters, flip status to viewed, log event. */
export async function recordProposalView(slug: string): Promise<Proposal | null> {
  const proposal = await getProposalBySlug(slug);
  if (!proposal) return null;
  const patch: Partial<Proposal> = {
    view_count: proposal.view_count + 1,
    first_viewed_at: proposal.first_viewed_at ?? now(),
  };
  if (proposal.status !== 'draft') patch.status = 'viewed';
  const updated = await updateProposal(proposal.id, patch);
  if (proposal.view_count === 0) {
    await logEvent(proposal.lead_id, 'proposal_viewed', { proposal_id: proposal.id });
  }
  return updated ?? proposal;
}

// ── Outbound prospects ─────────────────────────────────────────────────────

export async function insertProspects(rows: Prospect[]): Promise<number> {
  const sb = supabase();
  if (!sb) {
    for (const r of rows) mem().prospects.set(r.id, r);
    return rows.length;
  }
  try {
    const { error } = await sb.from(T.prospects).insert(rows);
    if (error) throw error;
    return rows.length;
  } catch (e) {
    fail('insertProspects', e);
    return 0;
  }
}

export async function listProspects(filters: { batch?: string; status?: string; limit?: number } = {}): Promise<Prospect[]> {
  const { batch, status, limit = 500 } = filters;
  const sb = supabase();
  if (!sb) {
    let rows = [...mem().prospects.values()];
    if (batch && batch !== 'all') rows = rows.filter((p) => p.batch === batch);
    if (status && status !== 'all') rows = rows.filter((p) => p.status === status);
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return rows.slice(0, limit);
  }
  try {
    let q = sb.from(T.prospects).select('*').order('created_at', { ascending: false }).limit(limit);
    if (batch && batch !== 'all') q = q.eq('batch', batch);
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Prospect[]) ?? [];
  } catch (e) {
    fail('listProspects', e);
    return [];
  }
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const sb = supabase();
  if (!sb) return mem().prospects.get(id) ?? null;
  try {
    const { data, error } = await sb.from(T.prospects).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Prospect) ?? null;
  } catch (e) {
    fail('getProspect', e);
    return null;
  }
}

export async function updateProspect(id: string, patch: Partial<Prospect>): Promise<Prospect | null> {
  const clean = { ...patch, updated_at: now() };
  delete (clean as Record<string, unknown>).id;
  const sb = supabase();
  if (!sb) {
    const cur = mem().prospects.get(id);
    if (!cur) return null;
    const next = { ...cur, ...clean } as Prospect;
    mem().prospects.set(id, next);
    return next;
  }
  try {
    const { data, error } = await sb.from(T.prospects).update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data as Prospect;
  } catch (e) {
    fail('updateProspect', e);
    return null;
  }
}

// ── Funnel analytics ───────────────────────────────────────────────────────

export async function logFunnelEvent(ev: Omit<FunnelEvent, 'id' | 'created_at'>): Promise<void> {
  const row: FunnelEvent = { ...ev, id: randomUUID(), created_at: now() };
  const sb = supabase();
  if (!sb) {
    mem().funnel.push(row);
    return;
  }
  try {
    const { error } = await sb.from(T.funnel).insert(row);
    if (error) throw error;
  } catch (e) {
    fail('logFunnelEvent', e);
  }
}

export async function listFunnelEvents(sinceIso: string): Promise<FunnelEvent[]> {
  const sb = supabase();
  if (!sb) return mem().funnel.filter((e) => e.created_at >= sinceIso);
  try {
    const { data, error } = await sb
      .from(T.funnel)
      .select('*')
      .gte('created_at', sinceIso)
      .limit(20000);
    if (error) throw error;
    return (data as FunnelEvent[]) ?? [];
  } catch (e) {
    fail('listFunnelEvents', e);
    return [];
  }
}

// ── Content: testimonials + work items ─────────────────────────────────────

export async function listTestimonials(publishedOnly: boolean): Promise<Testimonial[]> {
  const sb = supabase();
  if (!sb) {
    let rows = [...mem().testimonials.values()];
    if (publishedOnly) rows = rows.filter((t) => t.published);
    return rows.sort((a, b) => a.sort - b.sort);
  }
  try {
    let q = sb.from(T.testimonials).select('*').order('sort', { ascending: true });
    if (publishedOnly) q = q.eq('published', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Testimonial[]) ?? [];
  } catch (e) {
    fail('listTestimonials', e);
    return [];
  }
}

export async function upsertTestimonial(t: Partial<Testimonial>): Promise<Testimonial | null> {
  const row: Testimonial = {
    id: t.id || randomUUID(),
    quote: t.quote ?? '',
    author: t.author ?? '',
    company: t.company ?? '',
    role: t.role ?? '',
    result: t.result ?? '',
    published: t.published ?? false,
    sort: t.sort ?? 100,
    created_at: t.created_at ?? now(),
  };
  const sb = supabase();
  if (!sb) {
    mem().testimonials.set(row.id, row);
    return row;
  }
  try {
    const { data, error } = await sb.from(T.testimonials).upsert(row).select().single();
    if (error) throw error;
    return data as Testimonial;
  } catch (e) {
    fail('upsertTestimonial', e);
    return null;
  }
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return mem().testimonials.delete(id);
  try {
    const { error } = await sb.from(T.testimonials).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    fail('deleteTestimonial', e);
    return false;
  }
}

export async function listWorkItems(publishedOnly: boolean): Promise<WorkItem[]> {
  const sb = supabase();
  if (!sb) {
    let rows = [...mem().work.values()];
    if (publishedOnly) rows = rows.filter((w) => w.published);
    return rows.sort((a, b) => a.sort - b.sort);
  }
  try {
    let q = sb.from(T.work).select('*').order('sort', { ascending: true });
    if (publishedOnly) q = q.eq('published', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as WorkItem[]) ?? [];
  } catch (e) {
    fail('listWorkItems', e);
    return [];
  }
}

export async function upsertWorkItem(w: Partial<WorkItem>): Promise<WorkItem | null> {
  const row: WorkItem = {
    id: w.id || randomUUID(),
    title: w.title ?? '',
    niche: w.niche ?? '',
    town: w.town ?? '',
    problem: w.problem ?? '',
    built: w.built ?? '',
    result: w.result ?? '',
    published: w.published ?? false,
    sort: w.sort ?? 100,
    created_at: w.created_at ?? now(),
  };
  const sb = supabase();
  if (!sb) {
    mem().work.set(row.id, row);
    return row;
  }
  try {
    const { data, error } = await sb.from(T.work).upsert(row).select().single();
    if (error) throw error;
    return data as WorkItem;
  } catch (e) {
    fail('upsertWorkItem', e);
    return null;
  }
}

export async function deleteWorkItem(id: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return mem().work.delete(id);
  try {
    const { error } = await sb.from(T.work).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    fail('deleteWorkItem', e);
    return false;
  }
}
