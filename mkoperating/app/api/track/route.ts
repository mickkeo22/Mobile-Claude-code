// Funnel analytics beacon. Tiny, fire-and-forget, never errors loudly.

import { NextRequest, NextResponse } from 'next/server';
import { logFunnelEvent } from '@/lib/db';

export const runtime = 'nodejs';

const EVENTS = new Set(['view', 'complete', 'submit', 'audit_ready', 'audit_error']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body.session_id ?? '').slice(0, 64);
    const step = String(body.step ?? '').slice(0, 40);
    const event = String(body.event ?? '');
    if (!sessionId || !step || !EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await logFunnelEvent({
      session_id: sessionId,
      step,
      event: event as 'view' | 'complete' | 'submit' | 'audit_ready' | 'audit_error',
      lead_id: typeof body.lead_id === 'string' ? body.lead_id : null,
    });
  } catch {
    // never block the funnel over analytics
  }
  return NextResponse.json({ ok: true });
}
