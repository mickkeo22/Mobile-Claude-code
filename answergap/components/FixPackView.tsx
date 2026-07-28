'use client'

import { useState } from 'react'
import type { AuditResult } from '@/lib/audit/types'
import type { FixPack, FixStep } from '@/lib/fixpack/generate'
import { ScoreRing } from './Results'

const IMPACT: Record<FixStep['impact'], { cls: string; label: string }> = {
  critical: { cls: 'border-flare-500/30 bg-flare-500/10 text-flare-300', label: 'Critical' },
  high: { cls: 'border-amberish-400/30 bg-amberish-400/10 text-amberish-400', label: 'High impact' },
  medium: { cls: 'border-white/15 bg-white/5 text-white/60', label: 'Medium' },
  low: { cls: 'border-white/[0.12] bg-white/[0.03] text-white/45', label: 'Nice to have' },
}

function CopyBox({ filename, body, note }: { filename: string; body: string; note?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }
  function download() {
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.09] bg-ink-950/70">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
        <span className="mono text-white/70">{filename}</span>
        <div className="no-print flex gap-2">
          <button onClick={copy} className="rounded-lg border border-white/[0.12] px-2.5 py-1 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white">
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={download} className="rounded-lg border border-white/[0.12] px-2.5 py-1 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white">
            Download
          </button>
        </div>
      </div>
      <pre className="max-h-[26rem] overflow-auto px-4 py-3 text-[0.76rem] leading-relaxed text-white/80">
        <code>{body}</code>
      </pre>
      {note && <p className="border-t border-white/[0.07] px-4 py-2.5 text-xs text-white/45">{note}</p>}
    </div>
  )
}

export default function FixPackView({ result, pack }: { result: AuditResult; pack: FixPack }) {
  const totalMinutes = pack.steps.reduce((a, s) => a + s.minutes, 0)

  return (
    <div className="wrap py-10 sm:py-14">
      {/* Header */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <ScoreRing score={result.score} grade={result.grade} />
          <div className="min-w-0 flex-1">
            <span className="chip border-pulse-400/30 bg-pulse-400/10 text-pulse-300">Fix Pack · unlocked</span>
            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-[2rem]">
              {pack.businessName}
            </h1>
            <p className="mono mt-1 text-white/45">{pack.domain}</p>
            <p className="mt-4 leading-relaxed text-white/65">{pack.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip text-white/60">{pack.steps.length} steps</span>
              <span className="chip text-white/60">~{totalMinutes} minutes total</span>
              <span className="chip text-white/60">{pack.artifacts.length} files included</span>
            </div>
          </div>
        </div>
        <p className="no-print mt-6 text-xs text-white/35">
          Bookmark this page — the link stays valid and re-scans your site each time you open it, so you
          can use it to confirm your fixes worked.
        </p>
      </div>

      {/* Steps */}
      <section className="mt-8">
        <h2 className="px-1 text-lg font-semibold tracking-tight">Do these in order</h2>
        <p className="mt-1 px-1 text-sm text-white/45">
          Ordered by impact. The first item is worth more than everything below it.
        </p>

        <div className="mt-4 space-y-4">
          {pack.steps.map((step) => {
            const impact = IMPACT[step.impact]
            return (
              <div key={step.order} className="card p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.04] text-sm font-semibold">
                    {step.order}
                  </span>
                  <h3 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <span className={`chip ${impact.cls}`}>{impact.label}</span>
                  <span className="chip text-white/45">~{step.minutes} min</span>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="label mb-1.5">Why it matters</p>
                  <p className="text-sm leading-relaxed text-white/65">{step.why}</p>
                </div>

                <p className="label mt-5 mb-2">How to fix it</p>
                <ol className="space-y-2">
                  {step.how.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/70">
                      <span className="mono mt-0.5 shrink-0 text-white/30">{String(i + 1).padStart(2, '0')}</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ol>

                {step.artifact && (
                  <CopyBox filename={step.artifact.filename} body={step.artifact.body} />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* All artifacts */}
      <section className="mt-10">
        <h2 className="px-1 text-lg font-semibold tracking-tight">Every file, in one place</h2>
        <p className="mt-1 px-1 text-sm text-white/45">
          Generated from your live site. Anything written in CAPITALS needs your real details before it
          goes live — wrong structured data is worse than none.
        </p>
        <div className="mt-4 space-y-5">
          {pack.artifacts.map((a) => (
            <div key={a.filename} className="card p-5 sm:p-6">
              <CopyBox filename={a.filename} body={a.body} note={a.note} />
            </div>
          ))}
        </div>
      </section>

      <div className="no-print mt-10 flex flex-wrap gap-3">
        <a href={`/scan/${encodeURIComponent(pack.domain)}`} className="btn-ghost">
          Re-run the free scan
        </a>
        <button onClick={() => window.print()} className="btn-ghost">
          Print / save as PDF
        </button>
      </div>
    </div>
  )
}
