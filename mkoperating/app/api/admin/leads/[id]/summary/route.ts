// End-of-call: generate the summary + recommended scope, mark the call done,
// and advance the lead to call_done.

import { NextResponse } from 'next/server';
import { getCallForLead, getLead, logEvent, updateCall, updateLead } from '@/lib/db';
import { aiConfigured, generateCallSummary } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
  }

  const call = await getCallForLead(lead.id);
  if (!call) return NextResponse.json({ error: 'No call to summarize' }, { status: 409 });

  let summary;
  try {
    summary = await generateCallSummary(lead, call.brief, call.live);
  } catch (e) {
    console.error('[mk:copilot] summary generation failed:', e);
    return NextResponse.json({ error: 'Summary generation failed. Try again.' }, { status: 502 });
  }

  const updated = await updateCall(call.id, {
    summary,
    status: 'done',
    live: { ...call.live, ended_at: call.live.ended_at || new Date().toISOString() },
  });
  if (['new', 'emailed', 'booked'].includes(lead.status)) {
    await updateLead(lead.id, { status: 'call_done' });
    await logEvent(lead.id, 'status_changed', { from: lead.status, to: 'call_done' });
  }
  await logEvent(lead.id, 'call_summary', { pain: summary.pain_confirmed });
  return NextResponse.json({ call: updated });
}
