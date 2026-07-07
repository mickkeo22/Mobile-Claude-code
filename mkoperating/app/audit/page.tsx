import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { AuditExperience } from '@/components/audit/AuditExperience';

export const metadata: Metadata = {
  title: 'Your free AI audit',
  description:
    'Answer seven plain questions and get a tailored audit of what your service business can automate — your biggest leak named, with fixes ranked by impact.',
};

export default function AuditPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <AuditExperience />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
