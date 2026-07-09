import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { AuditReport } from '@/components/audit/AuditReport';
import { SAMPLE_AUDIT, SAMPLE_ANSWERS } from '@/lib/audit-content';

export const metadata: Metadata = {
  title: 'Sample audit',
  description:
    'A real example of the free AI audit: a two-crew tree service, its biggest leak named, and a ranked plan across automation, back-office, and custom builds.',
};

export default function SampleAuditPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow text-signal-700">Sample audit</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-ink">
            This is what you actually get.
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-ink/70">
            Below is an example report for a two-crew tree service —{' '}
            <strong>{SAMPLE_ANSWERS.business_name}</strong> — built from the same eight questions
            you&apos;d answer. Names changed; the leaks are the ones we see every week. Yours goes
            deeper: every fix is written from your actual answers, and it lands in your inbox too.
          </p>

          <div className="mt-8">
            <AuditReport
              audit={SAMPLE_AUDIT}
              businessName={SAMPLE_ANSWERS.business_name}
              firstName={SAMPLE_ANSWERS.first_name}
              answers={SAMPLE_ANSWERS}
              showBooking={false}
              navTop="top-16"
              sampleNote
            />
          </div>

          <div className="mt-10 rounded-2xl bg-ink p-7 text-paper sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Yours will read like this — about your business.
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-paper/75">
              Eight questions, about two minutes, and the plan is on your screen. Free, no call
              required to see it.
            </p>
            <Link href="/audit" className="btn-primary mt-6">
              Get your free audit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
