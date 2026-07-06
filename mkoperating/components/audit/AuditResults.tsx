// The rendered audit. Server-safe (no hooks) so it's shared by the public
// results view, /sample-audit, and the admin lead detail. Layout, copy and
// colors match the live funnel.

import { BUCKET_META } from '@/lib/wizard';
import type { AuditResult, AuditItem, BucketKey } from '@/lib/types';
import { GHLCalendarEmbed } from './GHLCalendarEmbed';

function RecCard({ rec, bucket }: { rec: AuditItem; bucket: BucketKey }) {
  const meta = BUCKET_META[bucket];
  return (
    <div
      className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm"
      style={{ borderLeft: `5px solid ${meta.color}` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="font-display text-xl font-bold text-ink">{rec.title}</h4>
        <span
          className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide"
          style={{ backgroundColor: meta.tint, color: meta.color }}
        >
          {rec.impact}
        </span>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ink/70">
            What it is
          </p>
          <p className="mt-1.5 leading-relaxed text-ink/80">{rec.what}</p>
        </div>
        <div>
          <p
            className="font-display text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: meta.color }}
          >
            How it helps your business
          </p>
          <p className="mt-1.5 leading-relaxed text-ink/80">{rec.how}</p>
        </div>
      </div>
    </div>
  );
}

export function AuditResults({
  audit,
  prefillEmail,
  showBooking = true,
  compact = false,
}: {
  audit: AuditResult;
  prefillEmail?: string;
  showBooking?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? '' : 'animate-fade-up'} aria-label="Your audit results">
      <header className="rounded-2xl bg-ink p-7 text-paper sm:p-10">
        <p className="eyebrow text-signal">Your tailored audit</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.1] sm:text-4xl">
          {audit.headline}
        </h2>
        {audit.pain_named ? (
          <div className="mt-7 rounded-xl border-l-4 border-signal bg-ink-700/70 p-5">
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-signal">
              Your biggest leak
            </p>
            <p className="mt-2 text-lg font-medium leading-relaxed text-paper">{audit.pain_named}</p>
          </div>
        ) : null}
        {audit.summary ? (
          <p className="mt-6 max-w-2xl leading-relaxed text-paper/75">{audit.summary}</p>
        ) : null}
      </header>

      <div className="mt-10 space-y-10">
        {audit.buckets.map(({ bucket, items }) => {
          const meta = BUCKET_META[bucket];
          if (!meta || !items?.length) return null;
          return (
            <section key={bucket} aria-labelledby={`bucket-${bucket}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                <h3 id={`bucket-${bucket}`} className="font-display text-xl font-extrabold text-ink">
                  {meta.label}
                </h3>
                <span
                  className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.tag}
                </span>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {items.map((rec, i) => (
                  <RecCard key={`${bucket}-${i}`} rec={rec} bucket={bucket} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {audit.first_move ? (
        <div className="mt-10 rounded-2xl border-2 border-signal/40 bg-signal/10 p-7">
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-signal-700">
            Start here — your first move
          </p>
          <p className="mt-2 text-lg font-medium leading-relaxed text-ink">{audit.first_move}</p>
        </div>
      ) : null}

      {showBooking ? (
        <section className="mt-12 rounded-2xl bg-paper-200 p-7 sm:p-10" aria-labelledby="book-cta">
          <h3 id="book-cta" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            Book a call and I&apos;ll show you how the ready-now items can be live in about a week.
          </h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink/70">
            We&apos;ll walk your audit together, line by line, and map the fastest path to plugging
            your biggest leak. No pressure, no jargon.
          </p>
          <div className="mt-6">
            <GHLCalendarEmbed prefillEmail={prefillEmail} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
