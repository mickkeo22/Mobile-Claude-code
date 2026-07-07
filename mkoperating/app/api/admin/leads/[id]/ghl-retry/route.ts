import { NextResponse } from 'next/server';
import { getLead } from '@/lib/db';
import { pushLeadToGhl } from '@/lib/ghl';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!env.ghlWebhookUrl) {
    return NextResponse.json(
      { ok: false, error: 'GHL_WEBHOOK_URL is not configured yet.' },
      { status: 409 }
    );
  }
  const ok = await pushLeadToGhl(lead, { attempts: 3 });
  const fresh = await getLead(params.id);
  return NextResponse.json({ ok, lead: fresh });
}
