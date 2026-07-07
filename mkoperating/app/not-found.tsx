import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-24 text-center">
        <p className="eyebrow text-signal-700">404</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold">
          That page slipped through the cracks.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-ink/70">
          Unlike your leads, we can&apos;t get this one back. The audit, though — that&apos;s two
          minutes and free.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-outline">
            Back home
          </Link>
          <Link href="/audit" className="btn-primary">
            Get your free audit →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
