import { NextResponse } from 'next/server'
import { runAudit, AuditInputError } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Per-instance throttle. Serverless means this is best-effort rather than a
 * hard guarantee, but it is enough to stop a single client hammering the
 * scanner in a loop.
 */
const hits = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 8

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'That is a lot of scans in one minute. Give it a moment and try again.' },
      { status: 429 },
    )
  }

  let domain = ''
  try {
    const body = (await req.json()) as { domain?: unknown }
    domain = typeof body.domain === 'string' ? body.domain : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const result = await runAudit(domain)
    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    })
  } catch (err) {
    if (err instanceof AuditInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('scan failed', err)
    return NextResponse.json(
      { error: 'The scan failed unexpectedly. Try again in a moment.' },
      { status: 500 },
    )
  }
}
