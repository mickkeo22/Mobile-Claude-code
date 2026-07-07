import Link from 'next/link';
import { PhoneMissed, MailWarning, FileStack, ArrowRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { BUCKET_META } from '@/lib/wizard';
import { listTestimonials } from '@/lib/db';

export const revalidate = 300;

const HOURS_GO = [
  {
    icon: PhoneMissed,
    title: 'Hours on the phone',
    body: 'Answering, calling back, chasing the ones you missed — time you could be on the job.',
  },
  {
    icon: MailWarning,
    title: 'Follow-up by hand',
    body: 'Every estimate and reminder, typed out one at a time, whenever you remember to.',
  },
  {
    icon: FileStack,
    title: 'The back-office grind',
    body: 'Quoting, scheduling, invoicing — the admin that keeps you up at night.',
  },
];

export default async function HomePage() {
  const testimonials = (await listTestimonials(true)).slice(0, 2);

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="container-page pb-16 pt-14 sm:pb-20 sm:pt-20">
          <p className="eyebrow text-signal-700">Free AI audit</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] text-ink sm:text-6xl">
            See where AI fits in your business — and{' '}
            <span className="relative whitespace-nowrap">
              <span className="absolute inset-x-0 bottom-1 h-3 bg-signal/40 sm:bottom-2 sm:h-4" aria-hidden />
              <span className="relative">save hours</span>
            </span>{' '}
            of manual work every week.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
            Take a free, tailored audit and we&apos;ll show you exactly what you can hand off to
            automation — and what we&apos;d run for you in the background. Built for
            owner-operators, not startups.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/audit" className="btn-primary !px-7 !py-3.5 !text-base">
              Get your free audit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/how-it-works" className="btn-outline !px-7 !py-3.5 !text-base">
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink/55">
            Free · about 2 minutes · no credit card · your audit on the page in about a minute.
          </p>
          <p className="mt-2 text-sm text-ink/55">
            Want to see one first?{' '}
            <Link href="/sample-audit" className="font-bold text-signal-700 underline hover:text-ink">
              View a sample audit →
            </Link>
          </p>
        </section>

        {/* What you get, free */}
        <section className="border-y border-ink/10 bg-white py-14 sm:py-16">
          <div className="container-page">
            <p className="eyebrow text-ink/60">What you get, free</p>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                {
                  n: '1',
                  t: 'Answer a few quick questions',
                  b: 'Tap what fits, add detail if you want. Two minutes.',
                },
                {
                  n: '2',
                  t: 'Get a tailored audit on the page',
                  b: 'Exactly where AI fits your business, ranked by impact.',
                },
                {
                  n: '3',
                  t: 'Book a call if it lands',
                  b: 'We map the fastest path — and what to automate first.',
                },
              ].map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-extrabold text-signal">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">{s.t}</h3>
                    <p className="mt-1 text-ink/70">{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Where the hours go */}
        <section className="container-page py-14 sm:py-16">
          <p className="eyebrow text-ink/60">Where the hours go</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {HOURS_GO.map((c) => (
              <div key={c.title} className="card">
                <c.icon className="h-6 w-6 text-signal-700" aria-hidden />
                <h2 className="mt-4 font-display text-xl font-bold text-ink">{c.title}</h2>
                <p className="mt-2 leading-relaxed text-ink/70">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How we help */}
        <section className="border-y border-ink/10 bg-white py-14 sm:py-16">
          <div className="container-page">
            <p className="eyebrow text-ink/60">How we help</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Three ways AI fits into your week.
            </h2>
            <p className="mt-3 max-w-2xl text-ink/70">
              Every business is different, so the specifics come from your audit. But everything we
              do falls into three buckets:
            </p>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {(Object.keys(BUCKET_META) as Array<keyof typeof BUCKET_META>).map((key) => {
                const b = BUCKET_META[key];
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-ink/10 p-6"
                    style={{ backgroundColor: b.tint }}
                  >
                    <span
                      className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: b.color }}
                    >
                      {b.tag}
                    </span>
                    <h3 className="mt-4 font-display text-xl font-extrabold text-ink">{b.label}</h3>
                    <p className="mt-2 leading-relaxed text-ink/75">{b.blurb}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-6">
              <Link
                href="/how-it-works"
                className="font-display text-sm font-bold text-signal-700 hover:text-ink"
              >
                How it works, in detail →
              </Link>
            </p>
          </div>
        </section>

        {/* Social proof (only renders once real entries exist) */}
        {testimonials.length > 0 && (
          <section className="container-page py-14 sm:py-16">
            <p className="eyebrow text-ink/60">From owners like you</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="card">
                  {t.result ? (
                    <p className="font-display text-lg font-extrabold text-signal-700">{t.result}</p>
                  ) : null}
                  <blockquote className="mt-3 leading-relaxed text-ink/80">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-medium text-ink/60">
                    {t.author}
                    {t.company ? ` · ${t.company}` : ''}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-6">
              <Link
                href="/testimonials"
                className="font-display text-sm font-bold text-signal-700 hover:text-ink"
              >
                More testimonials →
              </Link>
            </p>
          </section>
        )}

        {/* Final CTA */}
        <section className="container-page py-16 sm:py-20">
          <div className="rounded-2xl bg-ink p-8 text-paper sm:p-12">
            <h2 className="max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              See where AI can save you hours every week.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-paper/75">
              The audit is free, tailored to your answers, and on your screen in about a minute. No
              call required to see it.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/audit" className="btn-primary">
                Get your free audit <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-paper/30 px-5 py-3 font-display text-sm font-bold text-paper transition-colors hover:bg-paper/10"
              >
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
