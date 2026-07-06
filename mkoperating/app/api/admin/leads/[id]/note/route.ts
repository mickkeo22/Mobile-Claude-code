import { NextRequest, NextResponse } from 'next/server';
import { getLead, logEvent } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let text = '';
  try {
    const body = await req.json();
    text = String(body.text ?? '').trim().slice(0, 4000);
  } catch {
    /* fallthrough */
  }
  if (!text) return NextResponse.json({ error: 'Note text required' }, { status: 400 });

  await logEvent(lead.id, 'note', { text });
  return NextResponse.json({ ok: true });
}
