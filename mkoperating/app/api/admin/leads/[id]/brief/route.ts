// Generate (or regenerate) the pre-call brief for a lead.

import { NextResponse } from 'next/server';
import { createCall, getCallForLead, getLead, logEvent, updateCall } from '@/lib/db';
import { generateBrief, aiConfigured } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
  }

  let brief;
  try {
    brief = await generateBrief(lead);
  } catch (e) {
    console.error('[mk:copilot] brief generation failed:', e);
    return NextResponse.json({ error: 'Brief generation failed. Try again.' }, { status: 502 });
  }

  let call = await getCallForLead(lead.id);
  if (call) {
    call = await updateCall(call.id, { brief });
  } else {
    call = await createCall(lead.id, { brief, status: 'prepped' });
  }
  await logEvent(lead.id, 'brief_generated', {});
  return NextResponse.json({ call });
}
