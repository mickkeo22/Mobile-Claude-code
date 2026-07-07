// Outbound email via Resend. Chosen because it's the simplest reliable
// mechanism on Vercel for a single-operator app: one env var, a plain HTTPS
// call (no SDK), a generous free tier, and a default sender
// (onboarding@resend.dev) that works before any domain setup.

import { env } from './env';

export function emailConfigured(): boolean {
  return Boolean(env.resendKey && env.digestTo);
}

export async function sendEmail(opts: {
  subject: string;
  html: string;
  text?: string;
  to?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!env.resendKey) return { ok: false, error: 'RESEND_API_KEY not configured' };
  const to = opts.to || env.digestTo;
  if (!to) return { ok: false, error: 'DIGEST_EMAIL_TO not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.digestFrom,
        to: [to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[mk:email] send failed', res.status, body.slice(0, 300));
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[mk:email] send failed', msg);
    return { ok: false, error: msg };
  }
}
