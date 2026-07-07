import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE, verifyPassword } from '@/lib/auth';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

// crude in-memory throttle: 5 bad attempts per 15 min per IP (single region
// deploy; resets on cold start — good enough for a single-operator admin)
const attempts = new Map<string, { count: number; until: number }>();

export async function POST(req: NextRequest) {
  if (!env.adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not configured on the server.' },
      { status: 503 }
    );
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const gate = attempts.get(ip);
  if (gate && gate.count >= 5 && Date.now() < gate.until) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  let password = '';
  try {
    const body = await req.json();
    password = String(body.password ?? '');
  } catch {
    /* fallthrough */
  }

  if (!verifyPassword(password)) {
    const cur = attempts.get(ip) ?? { count: 0, until: 0 };
    attempts.set(ip, { count: cur.count + 1, until: Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }

  attempts.delete(ip);
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
