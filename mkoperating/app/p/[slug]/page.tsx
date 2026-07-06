// Public proposal share page. Unlisted (noindex), unguessable slug.
// Every non-preview load is tracked: view_count, first_viewed_at, timeline
// event, and status flips to "viewed" once it has been sent.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProposalBySlug, recordProposalView } from '@/lib/db';
import { ProposalDoc } from '@/components/proposal/ProposalDoc';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const proposal = await getProposalBySlug(params.slug);
  return {
    title: proposal?.content.title ?? 'Proposal',
    robots: { index: false, follow: false },
  };
}

export default async function ProposalSharePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { preview?: string };
}) {
  const isPreview = searchParams.preview === '1';
  const proposal = isPreview
    ? await getProposalBySlug(params.slug)
    : await recordProposalView(params.slug);
  if (!proposal) notFound();

  return (
    <main className="min-h-screen bg-paper px-4 py-8 sm:py-12">
      <div className="no-print mx-auto mb-5 flex max-w-3xl items-center justify-between gap-3">
        <p className="text-sm text-ink/50">Prepared by MK Operating Company</p>
        <PrintButton />
      </div>
      <ProposalDoc content={proposal.content} />
      <p className="no-print mx-auto mt-6 max-w-3xl text-center text-xs text-ink/40">
        This proposal is for the named recipient. Prices hold for 14 days.
      </p>
    </main>
  );
}
