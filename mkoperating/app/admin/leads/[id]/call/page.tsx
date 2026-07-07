import { notFound } from 'next/navigation';
import { getCallForLead, getLead } from '@/lib/db';
import { CallMode } from '@/components/admin/CallMode';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Call mode', robots: { index: false, follow: false } };

export default async function CallModePage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) notFound();
  const call = await getCallForLead(lead.id);
  return <CallMode lead={lead} call={call} />;
}
