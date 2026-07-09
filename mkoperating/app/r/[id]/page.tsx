// The lead's online report — the "view your interactive report" link in the
// audit email. Unlisted: the id is an unguessable uuid and the page is
// noindexed.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLead } from '@/lib/db';
import { SiteFooter, SiteHeader } from '@/components/site/SiteChrome';
import { AuditReport } from '@/components/audit/AuditReport';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const lead = await getLead(params.id);
  return {
    title: lead?.audit ? `Your audit — ${lead.business_name ?? 'MK Operating'}` : 'Report',
    robots: { index: false, follow: false },
  };
}

export default async function OnlineReportPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead?.audit) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <AuditReport
            audit={lead.audit}
            businessName={lead.business_name}
            firstName={lead.first_name}
            lastName={lead.last_name}
            phone={lead.phone}
            email={lead.email}
            leadId={lead.id}
            createdAt={lead.created_at}
            answers={lead.answers}
            showBooking
            navTop="top-16"
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
