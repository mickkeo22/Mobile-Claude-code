'use client';

// The audit rendered as an interactive professional report — the approved
// template. Used on the wizard results, /sample-audit, /r/[id] (the emailed
// "view online" link), and the admin lead detail. Handles any audit length:
// recommendations collapse by default, so more detail reads as depth, not
// scroll.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Mail, Printer, Star } from 'lucide-react';
import clsx from 'clsx';
import { BUCKET_META } from '@/lib/wizard';
import type { AuditResult, BucketKey, MultiAnswer, WizardAnswers } from '@/lib/types';
import { GHLCalendarEmbed } from './GHLCalendarEmbed';

interface AuditReportProps {
  audit: AuditResult;
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string;
  leadId?: string | null;
  createdAt?: string;
  answers?: Partial<WizardAnswers>;
  showBooking?: boolean;
  /** Tailwind top-offset for the sticky section nav (below the page's own
      sticky header where one exists). */
  navTop?: 'top-0' | 'top-16';
  sampleNote?: boolean;
}

const SECTION_ORDER: { id: string; label: string; bucket?: BucketKey }[] = [
  { id: 'summary', label: '01 Summary' },
  { id: 'bucket-ghl', label: '02 Ready now', bucket: 'ghl' },
  { id: 'bucket-plugin', label: '03 Run by us', bucket: 'plugin' },
  { id: 'bucket-build', label: '04 Builds', bucket: 'build' },
  { id: 'first-move', label: '05 First move' },
];

function bookHref(
  email?: string,
  firstName?: string | null,
  lastName?: string | null,
  phone?: string | null
): string {
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  const name = [firstName, lastName].filter(Boolean).join(' ');
  if (name) params.set('name', name);
  if (phone) params.set('phone', phone);
  const qs = params.toString();
  return qs ? `/book?${qs}` : '/book';
}

function toldUsChips(answers?: Partial<WizardAnswers>): string[] {
  if (!answers) return [];
  const multi = (a?: MultiAnswer) => a?.picks ?? [];
  return [
    ...multi(answers.what_you_do),
    ...multi(answers.lead_flow),
    ...multi(answers.losing_money),
    ...multi(answers.time_sink),
  ].slice(0, 8);
}

export function AuditReport({
  audit,
  businessName,
  firstName,
  lastName,
  phone,
  email,
  leadId,
  createdAt,
  answers,
  showBooking = true,
  navTop = 'top-16',
  sampleNote = false,
}: AuditReportProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['0-0']));
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [active, setActive] = useState('summary');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const rootRef = useRef<HTMLDivElement>(null);

  const buckets = audit.buckets.filter((b) => BUCKET_META[b.bucket] && b.items.length > 0);
  const total = buckets.reduce((acc, b) => acc + b.items.length, 0);
  const countOf = (k: BucketKey) => buckets.find((b) => b.bucket === k)?.items.length ?? 0;
  const chips = useMemo(() => toldUsChips(answers), [answers]);

  const dateLabel = new Date(createdAt ?? Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const reportRef = leadId ? `MK-${leadId.replaceAll('-', '').slice(0, 4).toUpperCase()}` : 'MK-SAMPLE';

  const sections = SECTION_ORDER.filter((s) => !s.bucket || countOf(s.bucket) > 0);

  // Scrollspy for the section nav.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = sections
      .map((s) => root.querySelector<HTMLElement>(`#${s.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    const spy = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(en.target.id);
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    targets.forEach((t) => spy.observe(t));
    return () => spy.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleIn(set: Set<string>, key: string): Set<string> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  async function emailMe() {
    if (!leadId || !email || emailState === 'sending') return;
    setEmailState('sending');
    try {
      const res = await fetch('/api/audit-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, email }),
      });
      setEmailState(res.ok ? 'sent' : 'error');
    } catch {
      setEmailState('error');
    }
  }

  let prio = 0;

  return (
    <div ref={rootRef} className="animate-fade-up">
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        {/* ── Cover ── */}
        <div className="report-cover bg-ink p-6 text-paper sm:p-10">
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-paper/15 pb-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal font-display text-sm font-extrabold text-ink">
                MK
              </span>
              <div>
                <p className="font-display text-sm font-extrabold leading-tight">MK Operating Company</p>
                <p className="text-[11px] text-paper/50">mkoperating.com</p>
              </div>
            </div>
            <p className="text-right font-display text-[10px] font-bold uppercase leading-relaxed tracking-[0.2em] text-signal">
              AI &amp; Automation
              <br />
              Audit
            </p>
          </div>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-signal">
            {sampleNote ? 'Sample report · built from sample answers' : 'Prepared from your answers'}
          </p>
          <h2 className="mt-3 max-w-[20ch] font-display text-3xl font-extrabold leading-[1.08] sm:text-4xl">
            {audit.headline}
          </h2>
          <p className="mt-4 text-[13.5px] text-paper/60">
            Prepared for <span className="font-semibold text-paper">{firstName || businessName || 'you'}</span>
            {businessName && firstName ? <span className="mx-2 text-paper/30">·</span> : null}
            {businessName && firstName ? businessName : null}
            <span className="mx-2 text-paper/30">·</span>
            {dateLabel}
            <span className="mx-2 text-paper/30">·</span>
            Report <span className="font-semibold text-paper">{reportRef}</span>
          </p>
        </div>

        {/* ── Sticky section nav ── */}
        <div className={clsx('no-print sticky z-30 border-b border-ink/10 bg-white/95 backdrop-blur', navTop)}>
          <div className="flex items-center gap-0.5 overflow-x-auto px-3 scrollbar-hide">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={clsx(
                  'flex shrink-0 items-center gap-1.5 border-b-[2.5px] px-2.5 py-3 font-display text-[11.5px] font-bold uppercase tracking-wide',
                  active === s.id ? 'border-signal text-ink' : 'border-transparent text-ink/45 hover:text-ink'
                )}
              >
                {s.bucket ? (
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: BUCKET_META[s.bucket].color }} />
                ) : null}
                {s.label}
              </a>
            ))}
            <div className="ml-auto flex shrink-0 gap-1.5 py-2 pl-2">
              <button onClick={() => window.print()} className="btn-outline !gap-1.5 !px-2.5 !py-1.5 !text-[11px]">
                <Printer className="h-3 w-3" /> PDF
              </button>
              {leadId && email ? (
                <button
                  onClick={() => void emailMe()}
                  disabled={emailState === 'sending' || emailState === 'sent'}
                  className="btn-primary !gap-1.5 !px-2.5 !py-1.5 !text-[11px]"
                >
                  <Mail className="h-3 w-3" />
                  {emailState === 'sent' ? 'Sent!' : emailState === 'sending' ? 'Sending…' : emailState === 'error' ? 'Retry email' : 'Email me this'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-10 sm:pt-8">
          {/* ── 01 Executive summary ── */}
          <section id="summary" className="scroll-mt-28">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[13px] font-extrabold tracking-wider text-signal-700">01</span>
              <h3 className="font-display text-2xl font-extrabold text-ink">Executive summary</h3>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-xl border border-ink/10 bg-paper/70 p-5 sm:p-6">
                <p className="leading-relaxed text-ink/85">{audit.summary}</p>
              </div>
              <div className="rounded-xl border-l-[5px] border-signal bg-ink p-5 text-paper sm:p-6">
                <p className="font-display text-[10.5px] font-bold uppercase tracking-[0.18em] text-signal">
                  Your biggest leak
                </p>
                <p className="mt-2 font-medium leading-relaxed">{audit.pain_named}</p>
              </div>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { n: total, label: 'fixes recommended', bg: 'var(--tw-paper, #F6F5F2)', color: '#13212E' },
                { n: countOf('ghl'), label: 'live within ~a week', bg: BUCKET_META.ghl.tint, color: BUCKET_META.ghl.color },
                { n: countOf('plugin'), label: 'run for you monthly', bg: BUCKET_META.plugin.tint, color: BUCKET_META.plugin.color },
                { n: countOf('build'), label: countOf('build') === 1 ? 'custom build' : 'custom builds', bg: BUCKET_META.build.tint, color: BUCKET_META.build.color },
              ].map((f) => (
                <div key={f.label} className="rounded-xl border border-ink/10 px-4 py-3" style={{ backgroundColor: f.bg }}>
                  <p className="font-display text-[22px] font-extrabold tabular-nums" style={{ color: f.color }}>
                    {f.n}
                  </p>
                  <p className="text-[11.5px]" style={{ color: f.color, opacity: 0.75 }}>
                    {f.label}
                  </p>
                </div>
              ))}
            </div>
            {chips.length > 0 ? (
              <div className="mt-4 rounded-xl bg-paper-200/70 px-4 py-3.5 sm:px-5">
                <p className="font-display text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink/50">
                  What you told us
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <span key={c} className="rounded-full border border-ink/10 bg-white px-2.5 py-1 text-xs text-ink/70">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Bucket sections ── */}
          {buckets.map((group, gi) => {
            const meta = BUCKET_META[group.bucket];
            const secNo = String(gi + 2).padStart(2, '0');
            return (
              <section key={group.bucket} id={`bucket-${group.bucket}`} className="mt-11 scroll-mt-28">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-display text-[13px] font-extrabold tracking-wider text-signal-700">{secNo}</span>
                  <h3 className="font-display text-2xl font-extrabold text-ink">{meta.label}</h3>
                  <span
                    className="rounded-full px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.tag}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[62ch] text-sm text-ink/60">{meta.blurb}</p>

                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`;
                  const isOpen = open.has(key);
                  const flagged = flags.has(key);
                  prio += 1;
                  const number = prio;
                  return (
                    <div key={key} className="report-rec mt-3 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
                      <button
                        className="flex w-full items-center gap-3.5 p-4 text-left sm:px-5"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(toggleIn(open, key))}
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-display text-[15px] font-extrabold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[16.5px] font-bold leading-snug text-ink">
                            {item.title}
                          </span>
                          <span
                            className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold"
                            style={{ backgroundColor: meta.tint, color: meta.color }}
                          >
                            {item.impact}
                          </span>
                        </span>
                        <ChevronDown
                          className={clsx('h-[18px] w-[18px] shrink-0 text-ink/40 transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')}
                        />
                      </button>
                      <div className={clsx('report-rec-body px-4 pb-4 sm:px-5 sm:pl-[74px]', isOpen ? 'block' : 'hidden')}>
                        <p className="field-label !text-ink/45">What it is</p>
                        <p className="mt-1 max-w-[62ch] text-[14.5px] leading-relaxed text-ink/85">{item.what}</p>
                        <p className="field-label mt-3.5" style={{ color: meta.color }}>
                          How it helps your business
                        </p>
                        <p className="mt-1 max-w-[62ch] text-[14.5px] leading-relaxed text-ink/85">{item.how}</p>
                        {item.rollout ? (
                          <>
                            <p className="field-label mt-3.5 !text-ink/45">What getting it looks like</p>
                            <p className="mt-1 max-w-[62ch] text-[14.5px] leading-relaxed text-ink/85">{item.rollout}</p>
                          </>
                        ) : null}
                        <button
                          onClick={() => setFlags(toggleIn(flags, key))}
                          className={clsx(
                            'no-print mt-4 inline-flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 font-display text-xs font-bold transition-colors',
                            flagged
                              ? 'border-signal-700 bg-signal/15 text-signal-700'
                              : 'border-dashed border-ink/20 text-ink/60 hover:border-ink/40'
                          )}
                        >
                          <Star className={clsx('h-3.5 w-3.5', flagged && 'fill-current')} />
                          {flagged ? 'On your call list' : 'Add to my call list'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}

          {/* ── First move ── */}
          <section id="first-move" className="mt-11 scroll-mt-28">
            <div className="rounded-2xl border-2 border-signal/50 bg-signal/10 p-6 sm:p-7">
              <p className="font-display text-[10.5px] font-bold uppercase tracking-[0.18em] text-signal-700">
                0{sections.length} · Start here — your first move
              </p>
              <p className="mt-2 max-w-[58ch] text-[17px] font-semibold leading-relaxed text-ink">{audit.first_move}</p>
              <ol className="mt-4 space-y-2">
                {[
                  ['Ask me anything about it — free.', '15 minutes, we walk the report together, you leave with straight answers.'],
                  ['Pick your starting point', '— most owners start with the ready-now items above.'],
                  ['Keep this report either way', "— it's yours, no obligation."],
                ].map(([bold, rest], i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink/70">
                    <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-ink font-display text-[11px] font-extrabold text-signal">
                      {i + 1}
                    </span>
                    <span>
                      <b className="font-semibold text-ink">{bold}</b> {rest}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── CTA ── */}
          <div className="mt-11 rounded-2xl bg-ink p-7 text-paper sm:p-8">
            <h3 className="font-display text-2xl font-extrabold leading-tight">
              Questions about any of this? Ask me — it&apos;s free.
            </h3>
            <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-paper/70">
              Grab 15 minutes and I&apos;ll walk your report with you: what each fix actually looks like in
              your business, what&apos;s worth starting with, and what to skip. Straight answers, no pitch, no
              obligation — the report is yours either way.
            </p>
            {showBooking ? (
              <div className="no-print mt-5 rounded-xl bg-paper p-2 sm:p-4">
                <GHLCalendarEmbed
                  prefillEmail={email}
                  prefillFirstName={firstName ?? undefined}
                  prefillLastName={lastName ?? undefined}
                  prefillPhone={phone ?? undefined}
                />
              </div>
            ) : (
              <a href={bookHref(email, firstName, lastName, phone)} className="btn-primary mt-5">
                Get your questions answered — free →
              </a>
            )}
          </div>
        </div>

        <footer className="border-t border-ink/10 px-5 py-5 text-[12.5px] leading-relaxed text-ink/45 sm:px-10">
          Prepared by MK Operating Company for {firstName ? `${firstName} at ` : ''}
          {businessName || 'your business'}, from the answers you gave on mkoperating.com. Based only on what
          you told us — no invented numbers. No obligation; the report is yours to keep either way.
        </footer>
      </div>

      {/* ── Flagged tray ── */}
      <div
        className={clsx(
          'no-print fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-ink py-2 pl-5 pr-2 text-[13px] text-paper shadow-2xl transition-transform motion-reduce:transition-none',
          flags.size > 0 ? 'translate-y-0' : 'invisible translate-y-24'
        )}
        role="status"
      >
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-signal" />
          <b className="font-display tabular-nums text-signal">{flags.size}</b>
          {flags.size === 1 ? 'fix' : 'fixes'} on your list
        </span>
        <a
          href="#first-move"
          className="rounded-full bg-signal px-3.5 py-1.5 font-display text-xs font-extrabold text-ink"
        >
          Ask about them — free →
        </a>
      </div>
    </div>
  );
}
