// The branded one-page proposal. Server-safe; used by the public share page,
// the admin editor preview, and the print/PDF output.

import type { ProposalContent } from '@/lib/types';

const TAG_COLOR: Record<string, string> = {
  'Ready now': '#1F6F4F',
  'Run by us': '#2563EB',
  'One-time build': '#7C3AED',
};

export function ProposalDoc({ content }: { content: ProposalContent }) {
  return (
    <article className="print-page mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-white p-8 shadow-sm sm:p-12">
      {/* Letterhead */}
      <header className="flex items-center justify-between gap-4 border-b-2 border-ink pb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-display text-sm font-extrabold text-signal">
            MK
          </span>
          <div>
            <p className="font-display text-sm font-extrabold leading-tight text-ink">
              MK Operating Company
            </p>
            <p className="text-xs text-ink/50">mkoperating.com</p>
          </div>
        </div>
        <p className="eyebrow text-signal-700">Proposal</p>
      </header>

      <h1 className="mt-8 font-display text-3xl font-extrabold leading-tight text-ink">
        {content.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink/75">{content.intro}</p>

      {/* Scope */}
      <section className="mt-9">
        <h2 className="eyebrow text-ink/60">What we&apos;ll stand up</h2>
        <div className="mt-4 space-y-3">
          {content.scope.map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-ink/10 p-5"
              style={{ borderLeft: `4px solid ${TAG_COLOR[s.tag] ?? '#13212E'}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-ink">{s.title}</h3>
                <span
                  className="rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: TAG_COLOR[s.tag] ?? '#13212E' }}
                >
                  {s.tag}
                </span>
              </div>
              <p className="mt-2 leading-relaxed text-ink/75">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mt-9">
        <h2 className="eyebrow text-ink/60">Timeline</h2>
        <div className="mt-4 space-y-0">
          {content.timeline.map((t, i) => (
            <div key={i} className="relative flex gap-4 pb-5">
              {i < content.timeline.length - 1 ? (
                <span className="absolute left-[7px] top-5 h-full w-px bg-ink/15" aria-hidden />
              ) : null}
              <span className="relative mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-signal bg-white" />
              <div>
                <p className="font-display font-bold text-ink">
                  {t.phase} <span className="ml-1 text-xs font-medium text-ink/45">{t.window}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/70">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mt-6">
        <h2 className="eyebrow text-ink/60">Investment</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full text-left text-sm">
            <tbody>
              {content.pricing.map((p, i) => (
                <tr key={i} className={i % 2 ? 'bg-paper/60' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium text-ink">{p.item}</td>
                  <td className="px-4 py-3 text-right font-display font-extrabold text-ink">
                    {p.price}
                    {p.cadence ? (
                      <span className="ml-1 text-xs font-medium text-ink/50">
                        {p.cadence === 'monthly' ? '/mo' : p.cadence === 'one-time' ? ' one-time' : ''}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Terms */}
      <section className="mt-9 rounded-xl bg-paper-200/70 p-5">
        <h2 className="eyebrow text-ink/60">How we work</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">{content.terms}</p>
      </section>

      <footer className="mt-9 border-t border-ink/10 pt-5 text-sm text-ink/50">
        Questions? Reply to the email this came with, or book a time at{' '}
        <span className="font-bold text-signal-700">mkoperating.com/book</span>.
      </footer>
    </article>
  );
}
