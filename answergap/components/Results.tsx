'use client'

import { useState } from 'react'
import type { AuditResult, Finding, Severity } from '@/lib/audit/types'

const GRADE_TONE: Record<string, { ring: string; text: string; chip: string }> = {
  A: { ring: '#3ed3a3', text: 'text-pulse-300', chip: 'border-pulse-400/30 bg-pulse-400/10 text-pulse-300' },
  B: { ring: '#7ee3c0', text: 'text-pulse-300', chip: 'border-pulse-400/30 bg-pulse-400/10 text-pulse-300' },
  C: { ring: '#f5c451', text: 'text-amberish-400', chip: 'border-amberish-400/30 bg-amberish-400/10 text-amberish-400' },
  D: { ring: '#ff8a6b', text: 'text-flare-300', chip: 'border-flare-500/30 bg-flare-500/10 text-flare-300' },
  F: { ring: '#f2653f', text: 'text-flare-300', chip: 'border-flare-500/30 bg-flare-500/10 text-flare-300' },
}

const SEV_TONE: Record<Severity, { dot: string; label: string; cls: string }> = {
  critical: { dot: '#f2653f', label: 'Critical', cls: 'border-flare-500/30 bg-flare-500/10 text-flare-300' },
  warning: { dot: '#f5c451', label: 'Needs work', cls: 'border-amberish-400/30 bg-amberish-400/10 text-amberish-400' },
  pass: { dot: '#3ed3a3', label: 'Pass', cls: 'border-pulse-400/30 bg-pulse-400/10 text-pulse-300' },
  info: { dot: '#7a8598', label: 'Optional', cls: 'border-white/15 bg-white/5 text-white/50' },
}

export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const R = 52
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(100, score)) / 100
  const tone = GRADE_TONE[grade] ?? GRADE_TONE.C
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={R}
          fill="none"
          stroke={tone.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          className="ring-draw"
          style={{ ['--circumference' as string]: `${C}` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.4rem] font-semibold leading-none tracking-tight">{score}</span>
        <span className={`mt-1 text-xs font-semibold tracking-widest ${tone.text}`}>GRADE {grade}</span>
      </div>
    </div>
  )
}

export default function Results({ result }: { result: AuditResult }) {
  const tone = GRADE_TONE[result.grade] ?? GRADE_TONE.C
  const blocked = result.crawlers.filter((c) => c.blocked)

  return (
    <div className="fade-up">
      {/* Verdict */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <ScoreRing score={result.score} grade={result.grade} />
          <div className="min-w-0 flex-1">
            <p className="label">Scanned {result.domain}</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-[2rem]">
              {result.headline}
            </h1>
            <p className="mt-3 leading-relaxed text-white/60">{result.subhead}</p>

            {result.scoreCap && (
              <div className="mt-5 rounded-xl border border-flare-500/25 bg-flare-500/[0.07] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-flare-300">
                  Score capped at {result.scoreCap.cap}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{result.scoreCap.reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Crawler evidence — the headline proof */}
      <section className="mt-6">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <div>
              <h2 className="font-semibold tracking-tight">Who can actually reach you</h2>
              <p className="mt-0.5 text-sm text-white/45">
                Each crawler requested your homepage. A real browser is the control.
              </p>
            </div>
            <span className={`chip ${blocked.length ? tone.chip : GRADE_TONE.A.chip}`}>
              {blocked.length ? `${blocked.length} blocked` : 'All clear'}
            </span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            <div className="flex items-center gap-3 px-5 py-3 sm:px-7">
              <Dot color="#3ed3a3" />
              <div className="min-w-0 flex-1">
                <span className="mono text-white/80">Real browser</span>
                <span className="ml-2 text-xs text-white/35">control</span>
              </div>
              <span className="mono text-pulse-300">HTTP {result.humanBaseline.status ?? '—'}</span>
            </div>

            {result.crawlers.map((c) => (
              <div key={c.key} className="flex items-center gap-3 px-5 py-3 sm:px-7">
                <Dot color={c.blocked ? '#f2653f' : '#3ed3a3'} />
                <div className="min-w-0 flex-1">
                  <span className="mono text-white/85">{c.name}</span>
                  <span className="ml-2 text-xs text-white/35">{c.operator}</span>
                  <p className="mt-0.5 truncate text-xs text-white/40">{c.powers}</p>
                </div>
                <span className={`mono shrink-0 ${c.blocked ? 'text-flare-300' : 'text-pulse-300'}`}>
                  {c.status !== null
                    ? `HTTP ${c.status}`
                    : c.robotsDisallowed
                      ? 'robots.txt'
                      : c.error
                        ? 'no reply'
                        : 'allowed'}
                </span>
              </div>
            ))}
          </div>
          <p className="border-t border-white/[0.07] px-5 py-3 text-xs leading-relaxed text-white/35 sm:px-7">
            Google-Extended and Applebot-Extended have no separate crawler to test — they are
            control tokens, so their status is read from robots.txt rather than probed.
          </p>
        </div>
      </section>

      {/* Findings */}
      <section className="mt-6">
        <h2 className="px-1 text-lg font-semibold tracking-tight">All seven checks</h2>
        <div className="mt-3 space-y-3">
          {[...result.findings]
            .sort((a, b) => rank(a) - rank(b))
            .map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
        </div>
      </section>
    </div>
  )
}

function rank(f: Finding) {
  const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2, pass: 3 }
  return order[f.severity] * 100 - f.weight
}

function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(finding.severity === 'critical')
  const sev = SEV_TONE[finding.severity]
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] sm:px-6"
      >
        <span className="mt-1.5">
          <Dot color={sev.dot} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold tracking-tight">{finding.title}</span>
            <span className={`chip ${sev.cls}`}>{sev.label}</span>
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-white/55">{finding.summary}</span>
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          className={`mt-1 shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M4.5 7l4.5 4.5L13.5 7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 sm:px-6">
          <p className="text-sm leading-relaxed text-white/60">{finding.detail}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
            {finding.evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 border-b border-white/[0.05] px-4 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="text-sm text-white/50">{e.label}</span>
                <span
                  className={`mono break-all sm:text-right ${
                    e.state === 'good'
                      ? 'text-pulse-300'
                      : e.state === 'bad'
                        ? 'text-flare-300'
                        : e.state === 'warn'
                          ? 'text-amberish-400'
                          : 'text-white/60'
                  }`}
                >
                  {e.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span className="block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
}
