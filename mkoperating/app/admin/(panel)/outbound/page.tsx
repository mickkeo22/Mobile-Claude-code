import { listProspects } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { OutboundClient } from '@/components/admin/OutboundClient';

export const dynamic = 'force-dynamic';

export default async function OutboundPage() {
  const prospects = await listProspects({ limit: 1000 });
  const batches = [...new Set(prospects.map((p) => p.batch))].sort().reverse();

  return (
    <main className="px-4 py-6 sm:px-8">
      <PageHeader
        title="Outbound"
        sub="Import local businesses, generate personalized teasers + drafts, send manually from your inbox."
      />
      <OutboundClient prospects={prospects} batches={batches} />
    </main>
  );
}
