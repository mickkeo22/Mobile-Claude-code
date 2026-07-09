// The heart of the funnel: answers in → tailored audit out.
//
// Reliability contract (in priority order):
//   1. The visitor gets their audit whenever the model call succeeds —
//      storage or GHL failures never surface to the funnel.
//   2. Every completed audit is durably saved to Supabase.
//   3. The lead is pushed to GHL with retries; failures are logged per-lead
//      and swept hourly by /api/cron/ghl-retry.

import { NextRequest, NextResponse } from 'next/server';
import { generateAudit, aiConfigured } from '@/lib/ai';
import { toAuditText } from '@/lib/audit-content';
import {
  createLead,
  findLeadBySession,
  logEvent,
  logFunnelEvent,
  updateLead,
} from '@/lib/db';
import { pushLeadToGhl } from '@/lib/ghl';
import { sendAuditReportEmail } from '@/lib/audit-email';
import { isValidEmail } from '@/lib/wizard';
import type { Lead, WizardAnswers } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { answers?: WizardAnswers; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answers = body.answers;
  const sessionId = typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : '';

  if (!answers?.business_name?.trim()) {
    return NextResponse.json({ error: 'Business name is required.' }, { status: 400 });
  }
  if (!answers.email || !isValidEmail(answers.email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!aiConfigured()) {
    console.error('[mk:audit] ANTHROPIC_API_KEY is not configured');
    return NextResponse.json(
      { error: 'The audit service is not available right now. Please try again shortly.' },
      { status: 503 }
    );
  }

  // 1) Generate the audit (the only step allowed to fail the request).
  let audit;
  try {
    audit = await generateAudit(answers);
  } catch (e) {
    console.error('[mk:audit] generation failed:', e);
    if (sessionId) {
      const partial = await findLeadBySession(sessionId);
      if (partial) await logEvent(partial.id, 'audit_failed', { error: String(e).slice(0, 500) });
      await logFunnelEvent({ session_id: sessionId, step: 'results', event: 'audit_error', lead_id: partial?.id ?? null });
    }
    return NextResponse.json(
      { error: 'Something went wrong building your audit. Please try again.' },
      { status: 502 }
    );
  }

  const auditText = toAuditText(audit, answers.business_name);

  // 2) Durable save (upsert onto the partial lead when we have one).
  let lead: Lead | null = null;
  try {
    const existing = sessionId ? await findLeadBySession(sessionId) : null;
    if (existing) {
      lead = await updateLead(existing.id, {
        email: answers.email.trim().toLowerCase(),
        first_name: answers.first_name || existing.first_name,
        business_name: answers.business_name,
        answers,
        audit,
        audit_text: auditText,
        stage: 'completed',
      });
    } else {
      lead = await createLead({
        email: answers.email,
        first_name: answers.first_name || null,
        business_name: answers.business_name,
        answers,
        audit,
        audit_text: auditText,
        stage: 'completed',
        session_id: sessionId || null,
      });
      if (lead) await logEvent(lead.id, 'lead_created', { stage: 'completed' });
    }
    if (lead) await logEvent(lead.id, 'audit_generated', {});
  } catch (e) {
    console.error('[mk:audit] durable save failed (funnel continues):', e);
  }

  // 3) Push to GHL (never blocks the response on failure).
  if (lead) {
    try {
      await pushLeadToGhl(lead, { attempts: 2 });
    } catch (e) {
      console.error('[mk:ghl] unexpected push error (funnel continues):', e);
    }
  }

  // 4) Email the lead their report (approved template; skips gracefully
  //    until Resend + AUDIT_EMAIL_FROM are configured).
  if (lead) {
    try {
      await sendAuditReportEmail(lead);
    } catch (e) {
      console.error('[mk:audit-email] unexpected send error (funnel continues):', e);
    }
  }

  if (sessionId) {
    await logFunnelEvent({
      session_id: sessionId,
      step: 'results',
      event: 'audit_ready',
      lead_id: lead?.id ?? null,
    });
  }

  return NextResponse.json({ audit, lead_id: lead?.id ?? null });
}
