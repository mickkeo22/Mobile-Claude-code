// GHL (GoHighLevel) lead push. GHL stays the CRM — this module's only job is
// getting every lead into it reliably and leaving an audit trail when it
// can't. Payload is flat snake_case (GHL inbound webhooks can't consume
// nested objects or arrays).

import { updateLead, logEvent } from './db';
import { env } from './env';
import type { Lead, MultiAnswer } from './types';

function joinMulti(a?: Partial<MultiAnswer>): string {
  if (!a) return '';
  const picks = (a.picks ?? []).join(', ');
  const detail = (a.detail ?? '').trim();
  if (picks && detail) return `${picks} | Detail: ${detail}`;
  return picks || detail;
}

export function buildGhlPayload(lead: Lead): Record<string, string> {
  const a = lead.answers;
  return {
    // contact basics
    first_name: lead.first_name || lead.business_name || 'there',
    email: lead.email,
    business_name: lead.business_name || '',
    // one flat field per wizard answer
    what_you_do: joinMulti(a.what_you_do),
    lead_flow: joinMulti(a.lead_flow),
    tools: joinMulti(a.tools),
    losing_money: joinMulti(a.losing_money),
    time_sink: joinMulti(a.time_sink),
    // audit fields
    audit_pain: lead.audit?.pain_named ?? '',
    audit_summary: lead.audit?.summary ?? '',
    audit_first_move: lead.audit?.first_move ?? '',
    audit_text: lead.audit_text ?? '',
    // meta
    source: lead.source,
    lead_stage: lead.stage,
    lead_id: lead.id,
    admin_url: `${env.siteUrl}/admin/leads/${lead.id}`,
    submitted_at: lead.created_at,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Push one lead to the GHL inbound webhook with in-request retries.
 * Updates the lead's ghl_* fields and writes delivery-log events. Never
 * throws — the funnel must not care whether GHL is up.
 */
export async function pushLeadToGhl(lead: Lead, opts: { attempts?: number } = {}): Promise<boolean> {
  const url = env.ghlWebhookUrl;
  const maxAttempts = opts.attempts ?? 3;

  if (!url) {
    // Not silently skipped anymore: leave status 'pending' so the hourly
    // sweep picks it up once GHL_WEBHOOK_URL is configured, log it, and the
    // admin dashboard shows a banner.
    await updateLead(lead.id, {
      ghl_status: 'pending',
      ghl_last_error: 'GHL_WEBHOOK_URL not configured',
    });
    await logEvent(lead.id, 'ghl_push_skipped', { reason: 'GHL_WEBHOOK_URL not configured' });
    console.warn('[mk:ghl] GHL_WEBHOOK_URL not configured — lead stored, push deferred', lead.id);
    return false;
  }

  const payload = buildGhlPayload(lead);
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        await updateLead(lead.id, {
          ghl_status: 'sent',
          ghl_attempts: lead.ghl_attempts + attempt,
          ghl_last_error: null,
          ghl_synced_at: new Date().toISOString(),
        });
        await logEvent(lead.id, 'ghl_push_ok', { attempt, status: res.status });
        return true;
      }
      const body = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`;
      // 4xx (except 408/429) won't heal by retrying in-request
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < maxAttempts) await sleep(500 * 2 ** (attempt - 1));
  }

  await updateLead(lead.id, {
    ghl_status: 'failed',
    ghl_attempts: lead.ghl_attempts + maxAttempts,
    ghl_last_error: lastError,
  });
  await logEvent(lead.id, 'ghl_push_failed', { error: lastError, attempts: maxAttempts });
  console.error('[mk:ghl] push failed for lead', lead.id, lastError);
  return false;
}
