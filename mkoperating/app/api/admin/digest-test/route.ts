// "Send me the digest now" — same content as the cron, triggered from admin.
// GET returns a browser preview of the HTML; POST sends it.

import { NextResponse } from 'next/server';
import { buildDigest, digestHtml, digestSubject } from '@/lib/digest';
import { emailConfigured, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const digest = await buildDigest();
  return new NextResponse(digestHtml(digest), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST() {
  if (!emailConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Resend is not configured (RESEND_API_KEY / DIGEST_EMAIL_TO).' },
      { status: 409 }
    );
  }
  const digest = await buildDigest();
  const result = await sendEmail({ subject: digestSubject(digest), html: digestHtml(digest) });
  return NextResponse.json(result);
}
