'use client'

import { useEffect, useRef, useState } from 'react'
import Results from './Results'
import UpsellCard from './UpsellCard'
import type { AuditResult } from '@/lib/audit/types'

const STAGES = [
  'Resolving the domain',
  'Fetching your homepage as a real browser',
  'Requesting it again as OAI-SearchBot',
  'Requesting it again as GPTBot',
  'Requesting it again as ClaudeBot',
  'Requesting it again as PerplexityBot',
  'Reading robots.txt, sitemap.xml and llms.txt',
  'Parsing structured data and page content',
  'Comparing every response to the browser control',
  'Scoring',
]

export default function Scanner({ domain }: { domain: string }) {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const tick = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s))
    }, 1400)

    fetch('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain }),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error || 'The scan failed.')
        return data as AuditResult
      })
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => clearInterval(tick))

    return () => clearInterval(tick)
  }, [domain])

  if (error) {
    return (
      <div className="card mx-auto max-w-lg p-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight">We couldn&rsquo;t scan that site</h1>
        <p className="mt-3 text-white/60">{error}</p>
        <a href="/" className="btn-ghost mt-6">
          Try another address
        </a>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-7 sm:p-9">
          <p className="label">Scanning</p>
          <h1 className="mt-2 font-mono text-xl tracking-tight sm:text-2xl">{domain}</h1>

          <div className="relative mt-6 h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="sweeping absolute inset-0" />
          </div>

          <ul className="mt-7 space-y-2.5">
            {STAGES.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  i < stage ? 'text-white/35' : i === stage ? 'text-white' : 'text-white/20'
                }`}
              >
                <span className="w-4 shrink-0">
                  {i < stage ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                      <path
                        d="M3.5 8.5l3 3 6-7"
                        stroke="#3ed3a3"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : i === stage ? (
                    <span className="pulse-dot block h-1.5 w-1.5 rounded-full bg-pulse-400" />
                  ) : (
                    <span className="block h-1.5 w-1.5 rounded-full bg-white/15" />
                  )}
                </span>
                {s}
              </li>
            ))}
          </ul>

          <p className="mt-7 text-xs leading-relaxed text-white/30">
            We make roughly a dozen real requests to your server. Nothing is cached or looked up in a
            database — every number you are about to see was measured just now.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Results result={result} />
      <UpsellCard result={result} />
    </>
  )
}
