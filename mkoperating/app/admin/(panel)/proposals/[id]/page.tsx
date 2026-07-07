import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getLead, getProposal } from '@/lib/db';
import { ProposalEditor } from '@/components/admin/ProposalEditor';

export const dynamic = 'force-dynamic';

export default async function ProposalEditPage({ params }: { params: { id: string } }) {
  const proposal = await getProposal(params.id);
  if (!proposal) notFound();
  const lead = await getLead(proposal.lead_id);

  return (
    <main className="px-4 py-6 sm:px-8">
      <Link
        href={`/admin/leads/${proposal.lead_id}`}
        className="mb-4 inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {lead?.business_name || 'Lead'}
      </Link>
      <ProposalEditor proposal={proposal} />
    </main>
  );
}
