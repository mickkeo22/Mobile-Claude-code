import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { GHLCalendarEmbed } from '@/components/audit/GHLCalendarEmbed';
import { splitFullName } from '@/lib/wizard';

export const metadata: Metadata = {
  title: 'Book a call',
  description:
    "Book a call with MK Operating. We'll walk your audit and map the fastest path to plugging your biggest leak — ready-now items can be live in about a week.",
  robots: { index: false, follow: true },
};

export default function BookPage({
  searchParams,
}: {
  searchParams: { email?: string; name?: string; phone?: string };
}) {
  const email = typeof searchParams.email === 'string' ? searchParams.email : undefined;
  const phone = typeof searchParams.phone === 'string' ? searchParams.phone : undefined;
  const { first, last } = splitFullName(
    typeof searchParams.name === 'string' ? searchParams.name : null
  );

  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow text-signal-700">Book a call</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            Let&apos;s plug the leak.
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-ink/70">
            Grab a time below. We&apos;ll walk your audit together and map the fastest path — most
            ready-now items can be live in about a week.
          </p>

          <div className="card mt-8 !p-3 sm:!p-5">
            <GHLCalendarEmbed
              prefillEmail={email}
              prefillFirstName={first ?? undefined}
              prefillLastName={last ?? undefined}
              prefillPhone={phone}
            />
          </div>

          <p className="mt-6 text-ink/70">
            Haven&apos;t run your audit yet?{' '}
            <Link href="/audit" className="font-bold text-signal-700 underline hover:text-ink">
              Do that first
            </Link>{' '}
            — you&apos;ll get more out of the call.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
