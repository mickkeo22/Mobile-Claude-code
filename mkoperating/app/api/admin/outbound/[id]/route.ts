import { NextRequest, NextResponse } from 'next/server';
import { getProspect, updateProspect } from '@/lib/db';
import type { ProspectStatus } from '@/lib/types';

export const runtime = 'nodejs';

const STATUSES: ProspectStatus[] = ['new', 'drafted', 'sent', 'replied', 'converted', 'dead'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prospect = await getProspect(params.id);
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { status?: string; email_subject?: string; email_body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.status) {
    if (!STATUSES.includes(body.status as ProspectStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.email_subject === 'string') patch.email_subject = body.email_subject.slice(0, 300);
  if (typeof body.email_body === 'string') patch.email_body = body.email_body.slice(0, 5000);
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const updated = await updateProspect(prospect.id, patch);
  return NextResponse.json({ prospect: updated });
}
