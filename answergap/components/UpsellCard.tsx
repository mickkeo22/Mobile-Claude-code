'use client'

import { useState } from 'react'
import type { AuditResult } from '@/lib/audit/types'

export default function UpsellCard({ result }: { result: AuditResult }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const blocked = result.crawlers.filter((c) => c.blocked)
  const edge = (result.page.server || '').toLowerCase()
  const edgeName = edge.includes('cloudflare')
    ? 'Cloudflare'
    : edge.includes('nginx')
      ? 'nginx'
      : edge.includes('apache')
        ? 'Apache'
        : edge.includes('vercel')
          ? 'Vercel'
          : ''

  const problems = result.findings.filter((f) => f.severity === 'critical' || f.severity === 'warning').length

  async function buy() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain: result.domain }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error || 'Could not start checkout.')
      if (data.url) window.location.href = data.url
      else throw new Error('Checkout did not return a URL.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  if (problems === 0) {
    return (
      <div className="card mt-6 p-6 text-center sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Nothing to fix — nice work</h2>
        <p className="mx-auto mt-2 max-w-lg text-white/55">
          Every check passed. Re-run this scan after any redesign, host migration or CDN change, since
          those are what usually introduce a block.
        </p>
        <a href="/" className="btn-ghost mt-6">
          Scan another site
        </a>
      </div>
    )
  }

  return (
    <div className="card mt-6 overflow-hidden border-pulse-400/20">
      <div className="border-b border-white/[0.07] bg-pulse-400/[0.05] px-6 py-5 sm:px-8">
        <span className="chip border-pulse-400/30 bg-pulse-400/10 text-pulse-300">The Fix Pack</span>
        <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
          Now fix it — {result.domain} specifically
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-white/60">
          The scan tells you what is wrong. The Fix Pack is the repair: an ordered plan plus the actual
          files, generated from what we just measured on your site.
        </p>
      </div>

      <div className="grid gap-0 sm:grid-cols-2">
        <div className="border-b border-white/[0.07] p-6 sm:border-b-0 sm:border-r sm:p-8">
          <p className="label mb-4">What you get</p>
          <ul className="space-y-3 text-sm">
            {[
              blocked.length
                ? {
                    h: `Exact steps to unblock ${blocked
                      .slice(0, 2)
                      .map((b) => b.name)
                      .join(' and ')}`,
                    p: edgeName
                      ? `Written for ${edgeName}, which is what is answering for your domain — the specific screens and toggles, in order.`
                      : 'Written for the bot-protection product actually sitting in front of your site.',
                  }
                : {
                    h: 'Crawler access hardening',
                    p: 'How to keep access open through your next redesign or CDN change.',
                  },
              {
                h: 'A robots.txt written for your site',
                p: 'Explicitly welcomes all eight AI crawlers, declares your sitemap, and preserves every Disallow rule you already have.',
              },
              {
                h: 'JSON-LD filled in with your real details',
                p: 'Built from the business name, phone, address and description we found on your page — not a blank template.',
              },
              {
                h: 'An llms.txt drafted from your content',
                p: 'Your own summary of the business, in the one place you get to write it yourself.',
              },
              {
                h: 'FAQ schema + the questions to answer',
                p: 'The pricing and service-area questions that decide whether an assistant recommends you or a competitor.',
              },
              {
                h: 'A prioritised plan with time estimates',
                p: 'Ordered by impact, so the highest-value fix is first and you can hand the rest to a developer.',
              },
            ].map((f) => (
              <li key={f.h} className="flex gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0" aria-hidden>
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    stroke="#3ed3a3"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  <span className="font-medium text-white/85">{f.h}</span>
                  <span className="mt-0.5 block text-white/50">{f.p}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight">$29</span>
            <span className="text-white/45">one time</span>
          </div>
          <p className="mt-2 text-sm text-white/50">
            For {result.domain}. No subscription, no account.
          </p>

          <button onClick={buy} disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? 'Opening checkout…' : 'Get the Fix Pack'}
          </button>

          {error && <p className="mt-3 text-sm text-flare-400">{error}</p>}

          <p className="mt-4 text-xs leading-relaxed text-white/35">
            Instant access after payment. If the pack does not identify a fix for your site, reply to
            your receipt and we will refund it.
          </p>

          <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-xs leading-relaxed text-white/45">
              <span className="font-semibold text-white/70">Why this is not a subscription:</span> most
              of these are one-time repairs. Re-run the free scan any time to confirm they held.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
