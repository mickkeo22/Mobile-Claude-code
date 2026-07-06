import { NextRequest, NextResponse } from 'next/server';
import { getProposal, logEvent, updateLead, getLead, updateProposal } from '@/lib/db';
import type { ProposalContent } from '@/lib/types';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const proposal = await getProposal(params.id);
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { content?: ProposalContent; status?: 'draft' | 'sent' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.content) patch.content = body.content;
  if (body.status === 'sent' || body.status === 'draft') patch.status = body.status;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await updateProposal(proposal.id, patch);
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

  if (body.status === 'sent' && proposal.status !== 'sent') {
    await logEvent(proposal.lead_id, 'proposal_sent', { proposal_id: proposal.id });
    const lead = await getLead(proposal.lead_id);
    if (lead && ['new', 'emailed', 'booked', 'call_done'].includes(lead.status)) {
      await updateLead(lead.id, { status: 'proposal_sent' });
    }
  }
  return NextResponse.json({ proposal: updated });
}
