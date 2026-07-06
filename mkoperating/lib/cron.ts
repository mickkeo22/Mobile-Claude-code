import type { NextRequest } from 'next/server';
import { env } from './env';

/** Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when configured. */
export function cronAuthorized(req: NextRequest): boolean {
  const header = req.headers.get('authorization') ?? '';
  if (env.cronSecret) return header === `Bearer ${env.cronSecret}`;
  // Without a secret configured, only allow outside production (local testing).
  return process.env.NODE_ENV !== 'production';
}
