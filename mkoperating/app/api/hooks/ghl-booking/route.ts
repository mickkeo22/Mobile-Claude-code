// Optional inbound hook from GHL: when a booking is created, a GHL workflow
// can POST { email } here (with ?token=GHL_BOOKING_TOKEN) and the lead is
// automatically marked "booked" — keeps admin analytics honest without
// manual status flips. Wiring instructions live in HANDOFF.md.

import { NextRequest, NextResponse } from 'next/server';
import { findLeadByEmail, logEvent, updateLead } from '@/lib/db';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!env.ghlBookingToken) {
    return NextResponse.json({ error: 'Not configured' }, { status: 404 });
  }
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (token !== env.ghlBookingToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let email = '';
  try {
    const body = await req.json();
    email = String(body.email ?? body.contact_email ?? '').trim().toLowerCase();
  } catch {
    /* fallthrough */
  }
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const lead = await findLeadByEmail(email);
  if (!lead) return NextResponse.json({ ok: true, matched: false });

  // Only move the status forward — never downgrade a further-along lead.
  if (lead.status === 'new' || lead.status === 'emailed') {
    await updateLead(lead.id, { status: 'booked' });
  }
  await logEvent(lead.id, 'booked_webhook', { email });
  return NextResponse.json({ ok: true, matched: true });
}
