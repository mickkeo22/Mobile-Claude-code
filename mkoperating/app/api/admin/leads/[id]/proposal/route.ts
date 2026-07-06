// One-click proposal: drafts branded proposal content from the lead's audit
// (+ call summary when one exists) and creates the shareable record.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createProposal, getCallForLead, getLead, getProposalForLead, logEvent } from '@/lib/db';
import { aiConfigured, generateProposalDraft } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

function slug(): string {
  // short, unguessable, url-friendly
  return randomUUID().replaceAll('-', '').slice(0, 20);
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 503 });
  }

  const existing = await getProposalForLead(lead.id);
  if (existing) return NextResponse.json({ proposal: existing, existed: true });

  const call = await getCallForLead(lead.id);
  let content;
  try {
    content = await generateProposalDraft(lead, call?.summary ?? null);
  } catch (e) {
    console.error('[mk:proposal] generation failed:', e);
    return NextResponse.json({ error: 'Proposal generation failed. Try again.' }, { status: 502 });
  }

  const proposal = await createProposal({
    id: randomUUID(),
    lead_id: lead.id,
    slug: slug(),
    content,
    status: 'draft',
    view_count: 0,
    first_viewed_at: null,
  });
  if (!proposal) return NextResponse.json({ error: 'Storage failed' }, { status: 500 });
  await logEvent(lead.id, 'proposal_created', { proposal_id: proposal.id });
  return NextResponse.json({ proposal });
}
