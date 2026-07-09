// Partial-lead capture. Called fire-and-forget by the wizard as soon as the
// visitor gives an email (step 2) and again after every later step, so a
// mid-wizard abandon still lands in the database as a partial lead.

import { NextRequest, NextResponse } from 'next/server';
import { createLead, findLeadBySession, logEvent, updateLead } from '@/lib/db';
import { isValidEmail, splitFullName } from '@/lib/wizard';
import type { WizardAnswers } from '@/lib/types';

export const runtime = 'nodejs';

interface LeadUpsertBody {
  session_id?: string;
  email?: string;
  /** Full name from the final wizard step; split into first/last on save. */
  name?: string;
  phone?: string;
  first_name?: string; // legacy clients
  business_name?: string;
  answers?: Partial<WizardAnswers>;
  step?: string;
}

export async function POST(req: NextRequest) {
  let body: LeadUpsertBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  const { first, last } = splitFullName(body.name?.slice(0, 160));
  const phone =
    typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim().slice(0, 40) : null;

  const existing = await findLeadBySession(sessionId);

  if (existing) {
    const updated = await updateLead(existing.id, {
      first_name: first ?? body.first_name?.slice(0, 120) ?? existing.first_name,
      last_name: last ?? existing.last_name,
      phone: phone ?? existing.phone,
      business_name: body.business_name?.slice(0, 200) ?? existing.business_name,
      email: email && isValidEmail(email) ? email : existing.email,
      answers: { ...existing.answers, ...(body.answers ?? {}) },
    });
    if (updated && body.step) {
      await logEvent(updated.id, 'step_saved', { step: body.step });
    }
    return NextResponse.json({ lead_id: updated?.id ?? existing.id });
  }

  // First save requires a valid email — that's the point of capturing early.
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const lead = await createLead({
    email,
    session_id: sessionId,
    first_name: first ?? body.first_name?.slice(0, 120) ?? null,
    last_name: last,
    phone,
    business_name: body.business_name?.slice(0, 200) ?? null,
    answers: body.answers ?? {},
    stage: 'partial',
  });
  if (lead) {
    await logEvent(lead.id, 'lead_created', { stage: 'partial', step: body.step ?? 'contact' });
  }
  return NextResponse.json({ lead_id: lead?.id ?? null });
}
