// Hourly sweep: re-push leads whose GHL delivery failed or is still pending
// (including leads captured while GHL_WEBHOOK_URL was unset). Partial leads
// are only pushed once they've sat untouched for an hour, so we never push
// someone who is mid-wizard.

import { NextRequest, NextResponse } from 'next/server';
import { leadsNeedingGhlRetry } from '@/lib/db';
import { pushLeadToGhl } from '@/lib/ghl';
import { env } from '@/lib/env';
import { cronAuthorized } from '@/lib/cron';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!env.ghlWebhookUrl) {
    return NextResponse.json({ ok: true, skipped: 'GHL_WEBHOOK_URL not configured' });
  }

  const candidates = await leadsNeedingGhlRetry(25);
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const due = candidates.filter(
    (l) => l.stage === 'completed' || new Date(l.updated_at).getTime() < hourAgo
  );

  let sent = 0;
  let failed = 0;
  for (const lead of due) {
    const ok = await pushLeadToGhl(lead, { attempts: 2 });
    if (ok) sent++;
    else failed++;
  }

  return NextResponse.json({ ok: true, considered: candidates.length, pushed: sent, failed });
}
