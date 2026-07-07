import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { listWorkItems } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Our work',
  description:
    'Real builds for real local service businesses: the problem, what we stood up, and what changed.',
};

export const revalidate = 300;

export default async function OurWorkPage() {
  const items = await listWorkItems(true);

  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-14 sm:py-20">
        <p className="eyebrow text-signal-700">Our work</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] text-ink sm:text-5xl">
          The problem, the build, the result.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
          No logos wall, no vague case studies — what was leaking, what we stood up, and what
          changed.
        </p>

        {items.length === 0 ? (
          <div className="mt-10 max-w-2xl rounded-2xl border border-ink/10 bg-white p-8">
            <h2 className="font-display text-xl font-bold text-ink">
              First cohort in progress.
            </h2>
            <p className="mt-2 leading-relaxed text-ink/70">
              We&apos;re documenting our current builds properly — numbers, not adjectives — and
              they&apos;ll land here as they wrap. Meanwhile, the sample audit shows exactly how we
              think about a business like yours.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/sample-audit" className="btn-outline">
                See a sample audit
              </Link>
              <Link href="/audit" className="btn-primary">
                Get your free audit <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {items.map((w) => (
              <article key={w.id} className="card flex flex-col">
                <p className="eyebrow text-ink/50">
                  {[w.niche, w.town].filter(Boolean).join(' · ')}
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">{w.title}</h2>
                <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                  <div>
                    <dt className="font-display text-xs font-bold uppercase tracking-[0.12em] text-red-700/70">
                      The leak
                    </dt>
                    <dd className="mt-1 text-ink/75">{w.problem}</dd>
                  </div>
                  <div>
                    <dt className="font-display text-xs font-bold uppercase tracking-[0.12em] text-ink/50">
                      What we built
                    </dt>
                    <dd className="mt-1 text-ink/75">{w.built}</dd>
                  </div>
                </dl>
                {w.result ? (
                  <p className="mt-4 rounded-xl border-2 border-signal/40 bg-signal/10 p-4 font-display font-bold text-ink">
                    {w.result}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <Link href="/audit" className="btn-primary">
            See what we&apos;d build for you <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
