import { NextRequest, NextResponse } from 'next/server';
import { getLead, logEvent, updateLead } from '@/lib/db';
import type { LeadStatus } from '@/lib/types';

export const runtime = 'nodejs';

const STATUSES: LeadStatus[] = ['new', 'emailed', 'booked', 'call_done', 'proposal_sent', 'won', 'lost'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.status) {
    if (!STATUSES.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const updated = await updateLead(lead.id, { status: body.status as LeadStatus });
    if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    await logEvent(lead.id, 'status_changed', { from: lead.status, to: body.status });
    return NextResponse.json({ lead: updated });
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
