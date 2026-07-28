import { NextResponse } from 'next/server'
import { getStripe, appUrl, FIX_PACK_PRICE_CENTS, FIX_PACK_CURRENCY } from '@/lib/stripe'
import { normaliseDomain } from '@/lib/audit/fetcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          'Checkout is not configured on this deployment yet. Add STRIPE_SECRET_KEY to enable purchases.',
      },
      { status: 503 },
    )
  }

  let domainInput = ''
  try {
    const body = (await req.json()) as { domain?: unknown }
    domainInput = typeof body.domain === 'string' ? body.domain : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const norm = normaliseDomain(domainInput)
  if ('error' in norm) return NextResponse.json({ error: norm.error }, { status: 400 })
  const domain = norm.domain

  const base = appUrl(req)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Stripe emails the receipt, and it doubles as the recovery link for the pack.
      customer_creation: 'always',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: FIX_PACK_CURRENCY,
            unit_amount: FIX_PACK_PRICE_CENTS,
            product_data: {
              name: `AnswerGap Fix Pack — ${domain}`,
              description:
                'A prioritised AI-visibility repair plan plus generated robots.txt, JSON-LD, FAQ schema and llms.txt, built from a live scan of this domain.',
            },
          },
        },
      ],
      metadata: { domain },
      payment_intent_data: { metadata: { domain } },
      success_url: `${base}/report/${encodeURIComponent(domain)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/scan/${encodeURIComponent(domain)}`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('checkout failed', err)
    const message = err instanceof Error ? err.message : 'Checkout failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
