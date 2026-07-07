import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { listTestimonials } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Testimonials',
  description: 'What owner-operators say about working with MK Operating.',
};

export const revalidate = 300;

export default async function TestimonialsPage() {
  const items = await listTestimonials(true);

  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-14 sm:py-20">
        <p className="eyebrow text-signal-700">Testimonials</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] text-ink sm:text-5xl">
          Owners like you, hours back every week.
        </h1>

        {items.length === 0 ? (
          <div className="mt-10 max-w-2xl rounded-2xl border border-ink/10 bg-white p-8">
            <h2 className="font-display text-xl font-bold text-ink">
              We&apos;d rather show you nothing than show you fluff.
            </h2>
            <p className="mt-2 leading-relaxed text-ink/70">
              Reviews from our first clients go here as the results land — with real names and real
              numbers. Until then, judge us by the audit: it&apos;s free, tailored, and takes two
              minutes.
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
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {items.map((t) => (
              <figure key={t.id} className="card flex flex-col">
                {t.result ? (
                  <p className="font-display text-lg font-extrabold text-signal-700">{t.result}</p>
                ) : null}
                <blockquote className="mt-3 flex-1 text-lg leading-relaxed text-ink/85">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-ink/10 pt-4">
                  <p className="font-display font-bold text-ink">{t.author}</p>
                  <p className="text-sm text-ink/55">
                    {[t.role, t.company].filter(Boolean).join(', ')}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <Link href="/audit" className="btn-primary">
            Get your free audit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
