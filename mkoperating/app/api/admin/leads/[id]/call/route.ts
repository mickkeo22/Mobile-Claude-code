// Live call-state autosave from call mode (notes, chips, checklist, asked).

import { NextRequest, NextResponse } from 'next/server';
import { createCall, getCallForLead, getLead, logEvent, updateCall } from '@/lib/db';
import type { CallLive } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { live?: Partial<CallLive>; status?: 'prepped' | 'live' | 'done' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let call = await getCallForLead(lead.id);
  if (!call) call = await createCall(lead.id, {});
  if (!call) return NextResponse.json({ error: 'Storage failed' }, { status: 500 });

  const live: CallLive = {
    ...call.live,
    ...(body.live ?? {}),
  };

  const startingCall = body.status === 'live' && call.status !== 'live';
  if (startingCall) {
    live.started_at = live.started_at || new Date().toISOString();
    await logEvent(lead.id, 'call_started', {});
  }

  const updated = await updateCall(call.id, {
    live,
    ...(body.status ? { status: body.status } : {}),
  });
  return NextResponse.json({ call: updated });
}
