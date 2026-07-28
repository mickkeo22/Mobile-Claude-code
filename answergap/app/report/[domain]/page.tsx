import { runAudit, AuditInputError } from '@/lib/audit'
import { generateFixPack } from '@/lib/fixpack/generate'
import { getStripe } from '@/lib/stripe'
import FixPackView from '@/components/FixPackView'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'Your Fix Pack',
  robots: { index: false, follow: false },
}

type Search = { session_id?: string; preview?: string }

async function hasAccess(domain: string, search: Search): Promise<{ ok: boolean; reason?: string }> {
  // Owner preview path, so the deliverable can be reviewed without a purchase.
  const previewToken = process.env.PREVIEW_TOKEN
  if (previewToken && search.preview && search.preview === previewToken) return { ok: true }

  const sessionId = search.session_id
  if (!sessionId) return { ok: false, reason: 'no-session' }

  const stripe = getStripe()
  if (!stripe) return { ok: false, reason: 'not-configured' }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const paid = session.payment_status === 'paid' || session.status === 'complete'
    if (!paid) return { ok: false, reason: 'unpaid' }
    // Bind the receipt to the domain it was bought for.
    if (session.metadata?.domain && session.metadata.domain !== domain) {
      return { ok: false, reason: 'mismatch' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'invalid-session' }
  }
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<Search>
}) {
  const { domain: rawDomain } = await params
  const search = await searchParams
  const domain = decodeURIComponent(rawDomain).toLowerCase()

  const access = await hasAccess(domain, search)

  if (!access.ok) {
    return (
      <div className="wrap py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">This Fix Pack is locked</h1>
          <p className="mt-3 leading-relaxed text-white/60">
            {access.reason === 'unpaid'
              ? 'That checkout was not completed. If you were charged, reply to your receipt and we will sort it out.'
              : access.reason === 'mismatch'
                ? 'That receipt was issued for a different domain.'
                : access.reason === 'not-configured'
                  ? 'Payments are not configured on this deployment yet.'
                  : 'Run the free scan first, then unlock the Fix Pack from the results.'}
          </p>
          <a href={`/scan/${encodeURIComponent(domain)}`} className="btn-primary mt-6">
            Run the free scan for {domain}
          </a>
        </div>
      </div>
    )
  }

  let result
  try {
    result = await runAudit(domain)
  } catch (err) {
    const message = err instanceof AuditInputError ? err.message : 'We could not re-scan this site.'
    return (
      <div className="wrap py-16">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">We couldn&rsquo;t rebuild your report</h1>
          <p className="mt-3 text-white/60">{message}</p>
          <p className="mt-3 text-sm text-white/40">
            Your purchase is safe — this link keeps working. Try again in a few minutes.
          </p>
        </div>
      </div>
    )
  }

  const pack = generateFixPack(result)
  return <FixPackView result={result} pack={pack} />
}
