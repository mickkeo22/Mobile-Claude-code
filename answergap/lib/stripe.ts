import Stripe from 'stripe'

export const FIX_PACK_PRICE_CENTS = Number(process.env.FIX_PACK_PRICE_CENTS || 2900)
export const FIX_PACK_CURRENCY = process.env.FIX_PACK_CURRENCY || 'usd'

let cached: Stripe | null = null

/** Returns null when no key is configured, so the app still runs. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) cached = new Stripe(key)
  return cached
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** True when the configured key is a live-mode key rather than a test key. */
export function isLiveMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_')
}

export function appUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (req) {
    try {
      const u = new URL(req.url)
      return `${u.protocol}//${u.host}`
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:3005'
}

export function formatPrice(cents: number, currency = FIX_PACK_CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}
