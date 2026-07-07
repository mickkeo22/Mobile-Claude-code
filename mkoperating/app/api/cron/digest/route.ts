import { NextRequest, NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron';
import { buildDigest, digestHtml, digestSubject } from '@/lib/digest';
import { emailConfigured, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!emailConfigured()) {
    console.warn('[mk:digest] skipped — Resend not configured');
    return NextResponse.json({ ok: true, skipped: 'RESEND_API_KEY / DIGEST_EMAIL_TO not configured' });
  }

  const digest = await buildDigest();
  const result = await sendEmail({
    subject: digestSubject(digest),
    html: digestHtml(digest),
  });

  return NextResponse.json({
    ok: result.ok,
    error: result.error,
    leads: digest.newLeads.length,
    booked: digest.booked.length,
    chase: digest.chase.length,
  });
}
