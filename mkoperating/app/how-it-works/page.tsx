import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { BUCKET_META } from '@/lib/wizard';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    "Three categories: automation systems we stand up fast, back-office work we run for you, and custom builds. Here's how MK Operating turns your answers into a ranked plan.",
};

const DETAIL = {
  ghl: 'The systems we stand up fast — the ones that catch leads, follow up, and keep customers warm without you lifting a finger. Most of the ready-now items can be live in about a week.',
  plugin:
    "The recurring work that keeps slipping when you're busy on the job — we run it for you in the background, on a schedule, and hand you the results. Not limited to any one tool.",
  build:
    'When something is specific to how your business runs, we build it once — a tool, a workflow, a connection between the things you already use — and then it just works.',
} as const;

export default function HowItWorksPage() {
  const buckets = Object.keys(BUCKET_META) as Array<keyof typeof BUCKET_META>;

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="container-page pb-12 pt-14 sm:pt-20">
          <p className="eyebrow text-signal-700">How it works</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] text-ink sm:text-5xl">
            You answer seven questions. We hand you a ranked plan.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
            No discovery calls to sit through, no jargon. The audit reads your actual answers and
            sorts the fixes into three buckets — your biggest leak first.
          </p>
        </section>

        {/* Flow diagram */}
        <section className="container-page pb-14">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-10">
            <div className="flex items-start gap-4">
              <span className="font-display text-2xl font-extrabold text-ink/30">01</span>
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Your answers go in</h2>
                <p className="mt-1 text-ink/70">Seven plain questions about how the business runs.</p>
              </div>
            </div>

            <p className="my-6 text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-ink/50">
              ↓ sorted into three lanes ↓
            </p>

            <div className="grid gap-4 lg:grid-cols-3">
              {buckets.map((key, i) => {
                const b = BUCKET_META[key];
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-ink/10 p-5"
                    style={{ backgroundColor: b.tint }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-extrabold text-ink/30">
                        0{i + 2}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: b.color }}
                      >
                        {b.tag}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{b.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/75">{b.blurb}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-paper p-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal">
                <Check className="h-4 w-4 text-ink" aria-hidden />
              </span>
              <p className="font-medium text-ink">
                You get a ranked plan — your biggest leak first, with the ready-now items live in
                about a week.
              </p>
            </div>
          </div>
        </section>

        {/* Bucket detail */}
        <section className="border-y border-ink/10 bg-white py-14">
          <div className="container-page space-y-10">
            {buckets.map((key) => {
              const b = BUCKET_META[key];
              return (
                <div key={key} className="grid gap-4 sm:grid-cols-[200px,1fr] sm:gap-10">
                  <div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: b.color }}
                    >
                      {b.tag}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-extrabold text-ink">{b.label}</h2>
                    <p className="mt-3 max-w-2xl leading-relaxed text-ink/70">{DETAIL[key]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why we keep the specifics */}
        <section className="container-page py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-ink">
              Why we keep the specifics for your audit
            </h2>
            <p className="mt-4 leading-relaxed text-ink/70">
              Generic feature lists don&apos;t help you. The right moves depend on how you actually
              take leads, what you already use, and where you&apos;re bleeding time and money. So
              the exact systems, services, and builds we&apos;d recommend show up in your
              personalized audit — ranked by what would move the needle for <em>you</em>, not a
              brochure.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/audit" className="btn-primary">
                Get your free audit <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/book" className="btn-outline">
                Book a call
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
