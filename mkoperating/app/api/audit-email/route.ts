// "Email me this report" — public endpoint, so it only sends when the
// caller already knows BOTH the lead id (unguessable uuid) and the exact
// email stored on that lead. Light in-memory rate limit per lead.

import { NextRequest, NextResponse } from 'next/server';
import { getLead } from '@/lib/db';
import { auditEmailEnabled, sendAuditReportEmail } from '@/lib/audit-email';

export const runtime = 'nodejs';
export const maxDuration = 30;

const recent = new Map<string, { count: number; until: number }>();

export async function POST(req: NextRequest) {
  let body: { lead_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const leadId = String(body.lead_id ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!leadId || !email) return NextResponse.json({ error: 'lead_id and email required' }, { status: 400 });

  if (!auditEmailEnabled()) {
    return NextResponse.json(
      { error: 'Email delivery is not configured yet.' },
      { status: 503 }
    );
  }

  const gate = recent.get(leadId);
  if (gate && gate.count >= 3 && Date.now() < gate.until) {
    return NextResponse.json({ error: 'Already sent — check your inbox (and spam).' }, { status: 429 });
  }

  const lead = await getLead(leadId);
  if (!lead || !lead.audit || lead.email !== email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ok = await sendAuditReportEmail(lead);
  const cur = recent.get(leadId) ?? { count: 0, until: 0 };
  recent.set(leadId, { count: cur.count + 1, until: Date.now() + 60 * 60 * 1000 });

  if (!ok) return NextResponse.json({ error: 'Send failed — try again shortly.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
